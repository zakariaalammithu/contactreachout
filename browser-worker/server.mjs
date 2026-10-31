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
    // Let a late-rendered form appear before filling (catch-guarded: if
    // it never becomes visible, filling below still tries as before).
    await page.locator(job.formSelector).waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    // Hydration window: React/Next.js hydration runs right after the
    // page's scripts arrive, so network quiet is a lagging indicator that
    // hydration has (usually) completed. Filling before hydration loses
    // the input events (React state stays empty) even though the DOM
    // looks filled — the guard below then cannot see the problem. Best
    // effort with a cap: a page that never goes quiet must not stall
    // the submission.
    await page.waitForLoadState('load', { timeout: 5_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => {});
    // Settle delay: hydration executes after load/network quiet, and on
    // a heavy page under a throttled CPU it can lag seconds behind.
    // Filling only after this delay gives hydration its best chance to
    // finish first. Caps keep the worst case bounded; pathological
    // slowness degrades to a client-timeout REVIEW, never a false success.
    await page.waitForTimeout(1500);
    // Fill by element type, extracted so the hydration guard below can
    // re-fill exactly the same way: plain fill() throws on <select>,
    // checkbox and radio inputs, so forms containing them failed every
    // submission even though the app maps values for them. Detect the
    // type at runtime (the job carries no type) and use the matching
    // Playwright action.
    const fillOne = async (field) => {
      if (!safeSelector(field.selector)) throw new Error('Unsafe selector');
      const locator = page.locator(field.selector);
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
    };
    for (const field of job.fields) {
      try {
        await fillOne(field);
      } catch (error) {
        // Preserve the old behavior: an unsafe selector is a 400, any
        // other fill failure aborts into the outer catch (key released).
        if (error instanceof Error && error.message === 'Unsafe selector') return send(res, 400, { error: 'Unsafe selector' });
        throw error;
      }
    }
    // Hydration guard: React/Next.js pages re-render after load with
    // their initial (empty) state, which can clear just-filled inputs
    // before submit — the form then fails client validation and never
    // posts, while the worker reports a verification failure. Read the
    // values back; if hydration cleared any, re-fill. Re-fills are
    // best-effort: a failed re-fill must not abort a submit that might
    // still work, so verification below remains the judge.
    const readValue = async (field) => {
      try {
        const locator = page.locator(field.selector);
        const tag = await locator.evaluate((el) => el.tagName.toLowerCase(), undefined, { timeout: 2_000 }).catch(() => '');
        if (tag === 'input') {
          const type = await locator.evaluate((el) => (el.type || '').toLowerCase(), undefined, { timeout: 2_000 }).catch(() => '');
          if (type === 'checkbox' || type === 'radio') {
            const checked = await locator.isChecked({ timeout: 2_000 }).catch(() => false);
            return checked ? 'true' : 'false';
          }
        }
        return await locator.inputValue({ timeout: 2_000 }).catch(() => null);
      } catch { return null; }
    };
    // A value counts as stuck when present. Text inputs count when
    // non-empty (a page formatter may trim without clearing);
    // checkbox/radio must match exactly. Selects report the option value
    // while the job may carry the label, so any non-empty selection
    // counts as stuck.
    const valueStuck = async (field) => {
      const current = await readValue(field);
      if (current === null || current === undefined || current === '') return false;
      const want = String(field.value).toLowerCase();
      if (current === 'true' || current === 'false') return current === want;
      return true;
    };
    for (let round = 0; round < 3; round++) {
      await page.waitForTimeout(round === 0 ? 800 : 1000);
      const cleared = [];
      for (const field of job.fields) {
        if (!(await valueStuck(field))) cleared.push(field);
      }
      // Require TWO consecutive clean reads: a single clean read right
      // after filling cannot catch input events lost before hydration
      // (DOM filled, React state empty), because the clearing re-render
      // may not have run yet. The second read, a second later, catches it.
      if (cleared.length === 0 && round >= 1) break;
      for (const field of cleared) {
        await fillOne(field).catch(() => {});
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
    // Diagnostic evidence: every qualifying form POST (any status), so a
    // FAILED result can say whether the form posted at all and what the
    // backend answered. Paths only, never query strings (they can carry
    // tokens); bodies stay out of this list entirely.
    const submissionPosts = [];
    const onResponse = async (response) => {
      try {
        const method = (response.request().method() || '').toUpperCase();
        if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') return;
        const url = response.url();
        let sameOrigin = false;
        try { sameOrigin = new URL(url).origin === pageOrigin; } catch { /* ignore */ }
        if (!sameOrigin && !(actionUrl && url === actionUrl)) return;
        const status = response.status();
        if (submissionPosts.length < 5) {
          let path = url;
          try { path = new URL(url).pathname; } catch { /* keep raw url */ }
          submissionPosts.push({ method, status, path });
        }
        if (status < 200 || status >= 300) return;
        let body = '';
        try { body = (await response.text()).slice(0, 50_000); } catch { /* body unavailable */ }
        submissionResponses.push(body);
      } catch { /* evidence collection must never break the submission */ }
    };
    page.on('response', onResponse);
    // Last-mile re-fill: the guard's reads cannot catch input events
    // lost before hydration (DOM filled, React state empty), and
    // hydration may complete after the guard's last read. Re-filling
    // every field immediately before the click gives the values their
    // best chance to land post-hydration; the click follows at once so
    // no re-render can intervene. Best-effort per field: a failed
    // re-fill must not abort a submit that might still work.
    for (const field of job.fields) {
      await fillOne(field).catch(() => {});
    }
    // Submit-time truth for diagnostics: re-read every field immediately
    // before the click (after the re-fill, so the evidence reports what
    // the submit actually saw). Reassigned after a retry click, below.
    let finalFields = [];
    for (const field of job.fields) {
      const stuck = await valueStuck(field).catch(() => false);
      finalFields.push({ selector: field.selector, stuck });
    }
    // Requests sent (vs responses received): the retry below is safe
    // ONLY when no request left the browser. A response listener fires
    // when the response arrives, so a slow backend would look like
    // "nothing sent" and a second click would double-send. Requests are
    // recorded the moment they are sent, whatever the backend does.
    const submissionRequests = [];
    const onRequest = (request) => {
      try {
        const method = (request.method() || '').toUpperCase();
        if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') return;
        const url = request.url();
        let sameOrigin = false;
        try { sameOrigin = new URL(url).origin === pageOrigin; } catch { /* ignore */ }
        if (!sameOrigin && !(actionUrl && url === actionUrl)) return;
        if (submissionRequests.length < 5) {
          let path = url;
          try { path = new URL(url).pathname; } catch { /* keep raw url */ }
          submissionRequests.push({ method, path });
        }
      } catch { /* evidence collection must never break the submission */ }
    };
    page.on('request', onRequest);
    const stopListening = () => { page.off('response', onResponse); page.off('request', onRequest); };
    // Submit-button fallback chain (extracted so a safe retry can click
    // exactly the same way): explicit submit controls first, then bare
    // buttons, then any button, then a native form submit.
    const clickSubmit = async () => {
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
    };
    const verified = (confirmationMessage) => send(res, 200, { status: 'SUCCESS', diagnosticCode: 'WORKER_SUCCESS_VERIFIED', confirmationMessage, successVerified: true, submitAttempted: true, fieldsFilledCount: job.fields.length });
    const captchaResult = () => send(res, 200, { status: 'CAPTCHA_DETECTED', diagnosticCode: 'CAPTCHA_DETECTED', successVerified: false, submitAttempted: true });
    // One verification check across all three signal kinds. Returns
    // CAPTCHA (fail-closed, first), a success confirmation, or NONE.
    const checkVerification = async () => {
      const evidence = await page.content().catch(() => '');
      if (blockedPattern.test(evidence)) return { kind: 'CAPTCHA' };
      // 1. Network evidence: the site's own backend accepted the submission.
      for (const body of submissionResponses) {
        let jsonSuccess = false;
        try { const parsed = JSON.parse(body); jsonSuccess = parsed && parsed.success === true; } catch { /* not JSON */ }
        if (jsonSuccess) return { kind: 'SUCCESS', confirmation: 'JSON success:true in form submission response' };
        const bodyMatch = body.match(successPattern);
        if (bodyMatch) return { kind: 'SUCCESS', confirmation: bodyMatch[0] };
      }
      // 2. Page-text evidence (unchanged behavior).
      const match = evidence.match(successPattern);
      if (match) return { kind: 'SUCCESS', confirmation: match[0] };
      // 3. Visible-text evidence (phrases, visible text only).
      let visibleText = '';
      try { visibleText = await page.evaluate(() => (document.body ? document.body.innerText : '') || ''); } catch { /* ignore */ }
      const visibleMatch = visibleText.match(visibleSuccessPattern);
      if (visibleMatch) return { kind: 'SUCCESS', confirmation: visibleMatch[0] };
      return { kind: 'NONE' };
    };
    // Attempt 1.
    await clickSubmit();
    // Mini-poll: fast successes and captchas return at once instead of
    // waiting out a fixed delay.
    for (let waited = 0; waited <= 2000; waited += 500) {
      if (waited > 0) await page.waitForTimeout(500);
      const check = await checkVerification();
      if (check.kind === 'CAPTCHA') { stopListening(); return captchaResult(); }
      if (check.kind === 'SUCCESS') { stopListening(); return verified(check.confirmation); }
    }
    // Self-correcting retry: if NO request left the browser, the first
    // click died in client validation (the classic pre-hydration case:
    // DOM filled, React state empty). By now hydration has completed,
    // so a fresh fill + immediate click lands on a live form. If ANY
    // request was sent, never retry: it may still deliver, and a second
    // click would double-send. One retry only, bounded by the poll below.
    let attempts = 1;
    if (submissionRequests.length === 0) {
      attempts = 2;
      for (const field of job.fields) {
        await fillOne(field).catch(() => {});
      }
      await clickSubmit();
      finalFields = [];
      for (const field of job.fields) {
        const stuck = await valueStuck(field).catch(() => false);
        finalFields.push({ selector: field.selector, stuck });
      }
    }
    // Full poll for a success signal: slow backends (serverless cold
    // start + email round-trip) can take seconds after the click, and a
    // single early check would misreport those genuine deliveries as
    // FAILED. Fast forms return on an early poll. The combined budget
    // (settle + fill + guard + mini-poll + possible retry + this poll)
    // stays inside the caller's 20s timeout in normal cases; pathological
    // slowness degrades to a client-timeout REVIEW, never a false success.
    for (let waited = 0; waited <= 10000; waited += 500) {
      if (waited > 0) await page.waitForTimeout(500);
      const check = await checkVerification();
      if (check.kind === 'CAPTCHA') { stopListening(); return captchaResult(); }
      if (check.kind === 'SUCCESS') { stopListening(); return verified(check.confirmation); }
    }
    stopListening();
    // Diagnostic evidence for the next campaign report: without it a
    // FAILED row cannot distinguish "no POST fired" (fill/validation
    // problem) from "backend answered 503" (site problem) — the exact
    // distinction the last retest could not make. Prefer the FORM's own
    // visible text (inline validation errors render inside/near the
    // form); fall back to the page body. Visible text only (never
    // scripts), whitespace-collapsed, truncated.
    let pageSnippet = '';
    try {
      const text = await page.evaluate((formSelector) => {
        let formEl = null;
        try { formEl = document.querySelector(formSelector); } catch { /* Playwright-only selectors (e.g. :nth-match) are not valid here */ }
        const target = formEl || document.body;
        return (target ? target.innerText : '') || '';
      }, job.formSelector);
      pageSnippet = text.replace(/\s+/g, ' ').trim().slice(0, 300);
    } catch { /* ignore */ }
    const stuckCount = finalFields.filter((f) => f.stuck).length;
    return send(res, 200, {
      status: 'FAILED', diagnosticCode: 'SUCCESS_VERIFICATION_FAILED', confirmationMessage: undefined, successVerified: false, submitAttempted: true, fieldsFilledCount: job.fields.length,
      diagnosticEvidence: {
        posts: submissionPosts,
        requestsSent: submissionRequests.length,
        attempts,
        fieldsStuck: `${stuckCount}/${job.fields.length}`,
        clearedFieldSelectors: finalFields.filter((f) => !f.stuck).map((f) => f.selector),
        pageSnippet,
      },
    });
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
