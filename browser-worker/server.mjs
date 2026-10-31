import http from 'node:http';
import { chromium } from 'playwright';
import { parseAllowedDomains, isHealthy, isTargetAllowed } from './allowlist.mjs';

const port = Number(process.env.PORT || 8080);
const secret = process.env.BROWSER_WORKER_AUTH_SECRET;
const allowedDomains = parseAllowedDomains(process.env.BROWSER_WORKER_ALLOWED_DOMAINS);
const appUrl = (process.env.CONTACTREACHOUT_APP_URL || '').trim();
const idempotency = new Map();
const successPattern = /thank\s*you|message\s*(has been )?(sent|received|submitted)|inquiry\s*submitted|successfully\s*(sent|submitted)/i;
// Visible-text-only phrases, matched against innerText (never page HTML),
// so a matching string inside a <script> cannot verify a submission.
// Mirrors the app's SUCCESS_SIGNATURES, minus bare "thanks".
const visibleSuccessPattern = /thanks for (reaching out|contacting|getting in touch)|we('ll| will) be in touch|submission received|inquiry received|request received|successfully received|we have received your message|thank you for contacting us/i;
const blockedPattern = /captcha|recaptcha|turnstile|hcaptcha|security check|verify you are human|access denied/i;

function send(res, status, payload) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(payload)); }
function safeSelector(selector) { return typeof selector === 'string' && selector.length > 0 && selector.length <= 500; }

http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    const healthy = isHealthy({ secret, staticDomains: allowedDomains, appUrl });
    return send(res, healthy ? 200 : 503, { status: healthy ? 'ok' : 'misconfigured' });
  }
  if (req.method === 'POST' && req.url === '/detect') {
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'Unauthorized' });
    let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 250_000) return send(res, 413, { error: 'Payload too large' }); }
    let job; try { job = JSON.parse(raw); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
    const targetAllowed = await isTargetAllowed({ staticDomains: allowedDomains, appUrl, secret, url: job.url });
    if (!targetAllowed || typeof job.url !== 'string') return send(res, 400, { error: 'Invalid or disallowed target' });
    const timeoutMs = Math.min(Math.max(Number(job.timeoutMs) || 15_000, 1_000), 25_000);
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      const gotoResponse = await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      // A missing path (404) cannot host a form: return at once instead
      // of waiting out the hydration window for every dead candidate.
      if (gotoResponse && gotoResponse.status() >= 400) {
        return send(res, 200, { status: 'NOT_FOUND', hasForm: false, forms: [] });
      }
      // Let client-rendered (JS) forms hydrate before extracting: static
      // HTML alone cannot see them, which is exactly why this endpoint
      // exists (the app's fetch-based detection cannot).
      await page.waitForSelector('form', { timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const content = await page.content();
      if (blockedPattern.test(content)) return send(res, 200, { status: 'CAPTCHA_DETECTED', hasForm: false, forms: [] });
      const forms = await page.evaluate(() => {
        const cssPath = (el) => {
          const parts = [];
          let node = el;
          while (node && node.nodeType === 1 && parts.length < 6) {
            let part = node.tagName.toLowerCase();
            if (node.id) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
            const parent = node.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter((s) => s.tagName === node.tagName);
              if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
            }
            parts.unshift(part);
            node = parent;
          }
          return parts.join(' > ');
        };
        const labelText = (el) => {
          if (el.id) {
            const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lab) return (lab.textContent || '').trim();
          }
          const wrap = el.closest('label');
          if (wrap) return (wrap.textContent || '').trim();
          return el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
        };
        return Array.from(document.querySelectorAll('form')).map((form, formIndex) => {
          const fields = [];
          Array.from(form.elements || []).forEach((el) => {
            const tag = (el.tagName || '').toLowerCase();
            if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;
            const type = (el.getAttribute('type') || (tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select-one' : 'text')).toLowerCase();
            if (type === 'submit' || type === 'button' || type === 'hidden') return;
            const name = el.getAttribute('name') || '';
            const id = el.getAttribute('id') || '';
            let selector;
            if (id) selector = `#${CSS.escape(id)}`;
            else if (name) selector = `[name="${name.replace(/"/g, '\\"')}"]`;
            else selector = cssPath(el);
            const field = { selector, name, tag, type, required: Boolean(el.required), label: labelText(el) };
            if (tag === 'select') {
              field.options = Array.from(el.options || []).map((o) => ({ label: (o.textContent || '').trim(), value: o.value }));
            }
            fields.push(field);
          });
          const rawAction = form.getAttribute('action') || '';
          let action = rawAction;
          try { action = rawAction ? new URL(rawAction, window.location.href).href : ''; } catch { action = rawAction; }
          return {
            selector: form.id ? `#${CSS.escape(form.id)}` : (document.querySelectorAll('form').length === 1 ? 'form' : `:nth-match(form, ${formIndex + 1})`),
            action,
            method: (form.getAttribute('method') || 'post').toLowerCase(),
            fields,
          };
        });
      });
      const withFields = forms.filter((f) => f.fields.length > 0);
      return send(res, 200, { status: withFields.length > 0 ? 'DETECTED' : 'NOT_FOUND', hasForm: withFields.length > 0, forms: withFields });
    } catch (error) {
      return send(res, 200, { status: 'NAVIGATION_FAILED', hasForm: false, forms: [], errorMessage: error instanceof Error ? error.message : 'Worker failure' });
    } finally { await browser?.close().catch(() => {}); }
  }
  if (req.method !== 'POST' || req.url !== '/submit') return send(res, 404, { error: 'Not found' });
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'Unauthorized' });
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 250_000) return send(res, 413, { error: 'Payload too large' }); }
  let job; try { job = JSON.parse(raw); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
  const targetAllowed = await isTargetAllowed({ staticDomains: allowedDomains, appUrl, secret, url: job.contactPageUrl });
  if (!targetAllowed || !Array.isArray(job.fields) || !job.idempotencyKey) return send(res, 400, { error: 'Invalid or disallowed target' });
  if (idempotency.has(job.idempotencyKey)) return send(res, 409, { status: 'FAILED', diagnosticCode: 'DUPLICATE_SUBMISSION_BLOCKED', successVerified: false, submitAttempted: false });
  idempotency.set(job.idempotencyKey, Date.now()); setTimeout(() => idempotency.delete(job.idempotencyKey), 24 * 60 * 60 * 1000).unref();
  const timeoutMs = Math.min(Math.max(Number(job.timeoutMs) || 25_000, 1_000), 25_000);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(job.contactPageUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    const initial = await page.content();
    if (blockedPattern.test(initial)) {
      // Nothing was submitted, so release the key: a retry must be allowed
      // instead of hitting the duplicate gate for 24h.
      idempotency.delete(job.idempotencyKey);
      return send(res, 200, { status: 'CAPTCHA_DETECTED', diagnosticCode: 'CAPTCHA_DETECTED', successVerified: false, submitAttempted: false });
    }
    for (const field of job.fields) {
      if (!safeSelector(field.selector)) return send(res, 400, { error: 'Unsafe selector' });
      const locator = page.locator(field.selector);
      // Fill by element type: plain fill() throws on <select>, checkbox and
      // radio inputs, so forms containing them failed every submission even
      // though the app maps values for them. Detect the type at runtime
      // (the job carries no type) and use the matching Playwright action.
      const tag = await locator.evaluate((el) => el.tagName.toLowerCase(), undefined, { timeout: 5_000 }).catch(() => '');
      if (tag === 'select') {
        const value = String(field.value);
        // Short timeouts are essential: without them a non-matching label
        // or value makes selectOption wait its 30s default before throwing,
        // twice over, which blows past the caller's 20s timeout — the caller
        // then retries and hits the idempotency gate (409) while the first
        // attempt is still running. A miss must fail fast.
        const byLabel = await locator.selectOption({ label: value }, { timeout: 3_000 }).catch(() => false);
        if (!byLabel) await locator.selectOption(value, { timeout: 3_000 }).catch(() => {});
        // If neither matched, leave the default option and continue: failing
        // the whole message over one dropdown is worse than submitting
        // with the default, and verification below still judges the outcome.
      } else if (tag === 'input') {
        const type = await locator.evaluate((el) => (el.type || '').toLowerCase(), undefined, { timeout: 5_000 }).catch(() => '');
        if (type === 'checkbox' || type === 'radio') {
          if (String(field.value).toLowerCase() === 'true') await locator.check({ timeout: 5_000 }).catch(() => {});
        } else {
          await locator.fill(String(field.value), { timeout: 5_000 });
        }
      } else {
        await locator.fill(String(field.value), { timeout: 5_000 });
      }
    }
    const form = page.locator(job.formSelector);
    // A plain <button> without a type attribute is a submit button in HTML,
    // but the old selector only matched explicit submit buttons, so forms
    // with a bare <button>Send</button> timed out here. Try explicit submit
    // controls first, then bare buttons, then any button, then a native
    // form submit as a last resort.
    // Capture form-submission responses BEFORE the click: a fetch/XHR form
    // may be accepted by the backend (2xx + success body) without ever
    // rendering a thank-you string into the page, which the page-text
    // check below would then misreport as FAILED. Only same-origin or
    // form-action POST/PUT/PATCH responses qualify, so unrelated
    // third-party beacons (which often return {success:true}) cannot
    // verify a submission. Bodies are read eagerly: after a navigation
    // they may no longer be available.
    const pageOrigin = (() => { try { return new URL(page.url()).origin; } catch { return ''; } })();
    const actionUrl = (() => { try { return job.formAction ? new URL(job.formAction, page.url()).href : ''; } catch { return ''; } })();
    const submissionResponses = [];
    const onResponse = async (response) => {
      try {
        const method = (response.request().method() || '').toUpperCase();
        if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') return;
        const url = response.url();
        let sameOrigin = false;
        try { sameOrigin = new URL(url).origin === pageOrigin; } catch { /* ignore */ }
        if (!sameOrigin && !(actionUrl && url === actionUrl)) return;
        const status = response.status();
        if (status < 200 || status >= 300) return;
        let body = '';
        try { body = (await response.text()).slice(0, 50_000); } catch { /* body unavailable */ }
        submissionResponses.push(body);
      } catch { /* evidence collection must never break the submission */ }
    };
    page.on('response', onResponse);
    const submit = form.locator('button[type="submit"], input[type="submit"], button:not([type])');
    if (await submit.count() > 0) {
      await submit.first().click({ timeout: 5_000 });
    } else {
      const anyButton = form.locator('button');
      if (await anyButton.count() > 0) {
        await anyButton.first().click({ timeout: 5_000 });
      } else {
        await form.evaluate((el) => { if (el.requestSubmit) el.requestSubmit(); else el.submit(); }).catch(() => {});
      }
    }
    // Slower thank-you pages/redirects need more than 700ms to render
    // before verification, or genuine deliveries fail verification.
    await page.waitForTimeout(2500);
    page.off('response', onResponse);
    const evidence = await page.content();
    if (blockedPattern.test(evidence)) return send(res, 200, { status: 'CAPTCHA_DETECTED', diagnosticCode: 'CAPTCHA_DETECTED', successVerified: false, submitAttempted: true });
    const verified = (confirmationMessage) => send(res, 200, { status: 'SUCCESS', diagnosticCode: 'WORKER_SUCCESS_VERIFIED', confirmationMessage, successVerified: true, submitAttempted: true, fieldsFilledCount: job.fields.length });
    // 1. Network evidence: the site's own backend accepted the submission.
    for (const body of submissionResponses) {
      let jsonSuccess = false;
      try { const parsed = JSON.parse(body); jsonSuccess = parsed && parsed.success === true; } catch { /* not JSON */ }
      if (jsonSuccess) return verified('JSON success:true in form submission response');
      const bodyMatch = body.match(successPattern);
      if (bodyMatch) return verified(bodyMatch[0]);
    }
    // 2. Page-text evidence (unchanged behavior).
    const match = evidence.match(successPattern);
    if (match) return verified(match[0]);
    // 3. Visible-text evidence (new phrases, visible text only).
    let visibleText = '';
    try { visibleText = await page.evaluate(() => (document.body ? document.body.innerText : '') || ''); } catch { /* ignore */ }
    const visibleMatch = visibleText.match(visibleSuccessPattern);
    if (visibleMatch) return verified(visibleMatch[0]);
    return send(res, 200, { status: 'FAILED', diagnosticCode: 'SUCCESS_VERIFICATION_FAILED', confirmationMessage: undefined, successVerified: false, submitAttempted: true, fieldsFilledCount: job.fields.length });
  } catch (error) {
    // The job never reached submit (fill/click/timeout failure), so release
    // the key: otherwise the caller's retry — and every retry for 24h —
    // returns 409 DUPLICATE_SUBMISSION_BLOCKED for a message that never
    // went out. Keys are kept only when submit was actually attempted, so
    // a real delivery can never be sent twice.
    idempotency.delete(job.idempotencyKey);
    return send(res, 200, { status: 'FAILED', diagnosticCode: 'BROWSER_WORKER_FAILURE', errorMessage: error instanceof Error ? error.message : 'Worker failure', successVerified: false, submitAttempted: false });
  } finally { await browser?.close().catch(() => {}); }
}).listen(port, () => console.log(`Browser worker listening on ${port}`));
