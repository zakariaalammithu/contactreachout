import http from 'node:http';
import { chromium } from 'playwright';
import { parseAllowedDomains, isHealthy, isTargetAllowed } from './allowlist.mjs';

const port = Number(process.env.PORT || 8080);
const secret = process.env.BROWSER_WORKER_AUTH_SECRET;
const allowedDomains = parseAllowedDomains(process.env.BROWSER_WORKER_ALLOWED_DOMAINS);
const appUrl = (process.env.CONTACTREACHOUT_APP_URL || '').trim();
const idempotency = new Map();
const successPattern = /thank\s*you|message\s*(has been )?(sent|received|submitted)|inquiry\s*submitted|successfully\s*(sent|submitted)/i;
const blockedPattern = /captcha|recaptcha|turnstile|hcaptcha|security check|verify you are human|access denied/i;

function send(res, status, payload) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(payload)); }
function safeSelector(selector) { return typeof selector === 'string' && selector.length > 0 && selector.length <= 500; }

http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    const healthy = isHealthy({ secret, staticDomains: allowedDomains, appUrl });
    return send(res, healthy ? 200 : 503, { status: healthy ? 'ok' : 'misconfigured' });
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
    const evidence = await page.content();
    if (blockedPattern.test(evidence)) return send(res, 200, { status: 'CAPTCHA_DETECTED', diagnosticCode: 'CAPTCHA_DETECTED', successVerified: false, submitAttempted: true });
    const match = evidence.match(successPattern);
    return send(res, 200, { status: match ? 'SUCCESS' : 'FAILED', diagnosticCode: match ? 'WORKER_SUCCESS_VERIFIED' : 'SUCCESS_VERIFICATION_FAILED', confirmationMessage: match?.[0], successVerified: Boolean(match), submitAttempted: true, fieldsFilledCount: job.fields.length });
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
