const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// These guard the three production-report regressions without sending a form.
const submitter = read('src/lib/services/form-submitter.ts');
const orchestrator = read('src/lib/services/outreach-orchestrator.ts');
const contactForm = read('src/app/contact/ContactClient.tsx');
const contactFinder = read('src/lib/services/contact-page-finder.ts');
const browserWorker = read('src/lib/services/browser-worker-client.ts');

// A client-side form with no action must be held for review, not POSTed to its
// contact-page URL (the source of the reported HTTP 405).
assert.match(submitter, /diagnosticCode: 'FORM_ACTION_REVIEW_REQUIRED'/);
assert.doesNotMatch(submitter, /fetch\(contactPageUrl,\s*\{\s*method: 'POST'/);

// The detector's declared HTTP method must be part of the submission contract.
assert.match(orchestrator, /formMethod: detection\.selectedForm\.method/);
assert.match(submitter, /const declaredMethod = \(formMethod \|\| 'post'\)\.toLowerCase\(\)/);

// The local public form exposes its true POST endpoint to form detection.
assert.match(contactForm, /<form ref=\{formRef\} action="\/api\/contact" method="post"/);

// A successful HTTP response is not delivery proof by itself.
assert.match(submitter, /const verified = !outcome\.isCaptcha && outcome\.isSuccess/);

// Missing Playwright/browser runtime is an infrastructure outcome, never delivery.
assert.match(contactFinder, /'BROWSER_RUNTIME_UNAVAILABLE'/);
assert.match(browserWorker, /BROWSER_WORKER_URL/);
assert.match(browserWorker, /BROWSER_WORKER_AUTH_SECRET/);
assert.match(browserWorker, /BROWSER_WORKER_ALLOWED_DOMAINS/);
assert.match(browserWorker, /idempotency-key/);
assert.match(browserWorker, /result\.successVerified === true/);

console.log('campaign-submission regression checks passed');
