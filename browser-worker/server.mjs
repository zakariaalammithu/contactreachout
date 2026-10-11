import http from 'node:http';
import { chromium } from 'playwright';

const port = Number(process.env.PORT || 8080);
const secret = process.env.BROWSER_WORKER_AUTH_SECRET;
const allowedDomains = (process.env.BROWSER_WORKER_ALLOWED_DOMAINS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
const idempotency = new Map();
const successPattern = /thank\s*you|message\s*(has been )?(sent|received|submitted)|inquiry\s*submitted|successfully\s*(sent|submitted)/i;
const blockedPattern = /captcha|recaptcha|turnstile|hcaptcha|security check|verify you are human|access denied/i;

function send(res, status, payload) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(payload)); }
function allowed(url) { try { const host = new URL(url).hostname.toLowerCase(); return allowedDomains.some(d => host === d || host.endsWith(`.${d}`)); } catch { return false; } }
function safeSelector(selector) { return typeof selector === 'string' && selector.length > 0 && selector.length <= 500; }

http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    return send(res, secret && allowedDomains.length ? 200 : 503, {
      status: secret && allowedDomains.length ? 'ok' : 'misconfigured',
    });
  }
  if (req.method !== 'POST' || req.url !== '/submit') return send(res, 404, { error: 'Not found' });
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'Unauthorized' });
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 250_000) return send(res, 413, { error: 'Payload too large' }); }
  let job; try { job = JSON.parse(raw); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
  if (!allowed(job.contactPageUrl) || !Array.isArray(job.fields) || !job.idempotencyKey) return send(res, 400, { error: 'Invalid or disallowed target' });
  if (idempotency.has(job.idempotencyKey)) return send(res, 409, { status: 'FAILED', diagnosticCode: 'DUPLICATE_SUBMISSION_BLOCKED', successVerified: false, submitAttempted: false });
  idempotency.set(job.idempotencyKey, Date.now()); setTimeout(() => idempotency.delete(job.idempotencyKey), 24 * 60 * 60 * 1000).unref();
  const timeoutMs = Math.min(Math.max(Number(job.timeoutMs) || 25_000, 1_000), 25_000);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(job.contactPageUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    const initial = await page.content();
    if (blockedPattern.test(initial)) return send(res, 200, { status: 'CAPTCHA_DETECTED', diagnosticCode: 'CAPTCHA_DETECTED', successVerified: false, submitAttempted: false });
    for (const field of job.fields) { if (!safeSelector(field.selector)) return send(res, 400, { error: 'Unsafe selector' }); await page.locator(field.selector).fill(String(field.value), { timeout: 5_000 }); }
    const form = page.locator(job.formSelector); await form.locator('button[type="submit"], input[type="submit"]').first().click({ timeout: 5_000 });
    await page.waitForTimeout(700);
    const evidence = await page.content();
    if (blockedPattern.test(evidence)) return send(res, 200, { status: 'CAPTCHA_DETECTED', diagnosticCode: 'CAPTCHA_DETECTED', successVerified: false, submitAttempted: true });
    const match = evidence.match(successPattern);
    return send(res, 200, { status: match ? 'SUCCESS' : 'FAILED', diagnosticCode: match ? 'WORKER_SUCCESS_VERIFIED' : 'SUCCESS_VERIFICATION_FAILED', confirmationMessage: match?.[0], successVerified: Boolean(match), submitAttempted: true, fieldsFilledCount: job.fields.length });
  } catch (error) { return send(res, 200, { status: 'FAILED', diagnosticCode: 'BROWSER_WORKER_FAILURE', errorMessage: error instanceof Error ? error.message : 'Worker failure', successVerified: false, submitAttempted: false });
  } finally { await browser?.close().catch(() => {}); }
}).listen(port, () => console.log(`Browser worker listening on ${port}`));
