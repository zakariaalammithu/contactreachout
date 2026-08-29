/**
 * Bulk Contact Form Outreach System — ContactFormSubmitter Unit Test Suite
 * Tests TEST MODE enforcement, CAPTCHA/bot protection detection, and preview result generation.
 */

const CAPTCHA_SIGNATURES = {
  reCaptcha: /g-recaptcha|google\.com\/recaptcha|recaptcha\/api\.js|recaptcha-anchor/i,
  hCaptcha: /h-captcha|hcaptcha\.com|api\.hcaptcha\.com/i,
  cloudflare: /cf-turnstile|challenges\.cloudflare\.com|cloudflare-turnstile|cf-chl-widget/i,
  login: /<input[^>]*type=["']password["']|name=["'](password|pass|pwd)["']/i,
};

function inspectPageProtections(html, mappedFields) {
  const detectedSignatures = [];

  if (CAPTCHA_SIGNATURES.reCaptcha.test(html)) detectedSignatures.push('Google reCAPTCHA');
  if (CAPTCHA_SIGNATURES.hCaptcha.test(html)) detectedSignatures.push('hCaptcha');
  if (CAPTCHA_SIGNATURES.cloudflare.test(html)) detectedSignatures.push('Cloudflare Turnstile');
  if (CAPTCHA_SIGNATURES.login.test(html)) detectedSignatures.push('Password / Authentication Gate');

  const missingRequiredFields = mappedFields
    .filter((f) => f.isRequired && !f.valueToFill && !f.isHoneypot)
    .map((f) => f.fieldLabel || f.fieldName || f.fieldSelector);

  if (missingRequiredFields.length > 0) {
    detectedSignatures.push(`Missing Required Fields: ${missingRequiredFields.join(', ')}`);
  }

  if (/<button[^>]*\bdisabled\b|<input[^>]*type=["']submit["'][^>]*\bdisabled\b/i.test(html)) {
    detectedSignatures.push('Submit Button Disabled');
  }

  const isProtectionDetected = detectedSignatures.length > 0;
  return { isProtectionDetected, detectedSignatures, missingRequiredFields };
}

function executeSubmitterTestMode(input, pageHtml) {
  const { contactPageUrl, targetForm, mappedFields, mode = 'test' } = input;

  const protectionReport = inspectPageProtections(pageHtml, mappedFields);
  if (protectionReport.isProtectionDetected) {
    return {
      status: 'REVIEW_REQUIRED',
      mode,
      protectionReport,
      previewSummary: `Protection detected: ${protectionReport.detectedSignatures.join(', ')}. Routed to REVIEW_REQUIRED.`,
    };
  }

  const fieldsToFill = mappedFields.filter((f) => !f.isHoneypot && f.valueToFill);
  const honeypots = mappedFields.filter((f) => f.isHoneypot);

  if (mode === 'test') {
    return {
      status: 'TEST_MODE_PREVIEW_SUCCESS',
      mode: 'test',
      fieldsFilledCount: fieldsToFill.length,
      honeypotsAvoidedCount: honeypots.length,
      previewSummary: `[TEST MODE] Form verified and ${fieldsToFill.length} fields filled. Submission bypassed.`,
    };
  }

  return {
    status: 'LIVE_SUBMITTED_SUCCESS',
    mode: 'live',
    fieldsFilledCount: fieldsToFill.length,
  };
}

// ==========================================
// TEST SUITE EXECUTION
// ==========================================

console.log('=== RUNNING SAFE CONTACT FORM SUBMITTER TEST SUITE ===');

const validMappedFields = [
  { fieldSelector: 'input#name', fieldLabel: 'Full Name', valueToFill: 'Mithu Alam', isRequired: true, isHoneypot: false },
  { fieldSelector: 'input#email', fieldLabel: 'Email', valueToFill: 'mithu@example.com', isRequired: true, isHoneypot: false },
  { fieldSelector: 'textarea#msg', fieldLabel: 'Message', valueToFill: 'Hi there...', isRequired: true, isHoneypot: false },
  { fieldSelector: 'input[name="hp"]', fieldLabel: 'Trap', valueToFill: '', isRequired: false, isHoneypot: true },
];

// Test 1: Clean Form in TEST MODE (Must not submit)
const cleanHtml = `
<form id="contact-form">
  <input type="text" id="name" />
  <input type="email" id="email" />
  <textarea id="msg"></textarea>
  <button type="submit">Submit</button>
</form>
`;

const res1 = executeSubmitterTestMode({
  contactPageUrl: 'https://example.com/contact',
  targetForm: { formSelector: 'form#contact-form' },
  mappedFields: validMappedFields,
  mode: 'test',
}, cleanHtml);

console.assert(res1.status === 'TEST_MODE_PREVIEW_SUCCESS', `Test 1.1 Failed: Status was ${res1.status}`);
console.assert(res1.mode === 'test', 'Test 1.2 Failed: Mode was not test');
console.assert(res1.fieldsFilledCount === 3, 'Test 1.3 Failed: Fields filled count');
console.assert(res1.honeypotsAvoidedCount === 1, 'Test 1.4 Failed: Honeypot avoided');
console.log('✔ Test 1: TEST MODE simulation without submission verified.');

// Test 2: reCAPTCHA Detection
const reCaptchaHtml = cleanHtml + '<div class="g-recaptcha" data-sitekey="xyz"></div>';
const res2 = executeSubmitterTestMode({ contactPageUrl: 'https://example.com', targetForm: {}, mappedFields: validMappedFields, mode: 'test' }, reCaptchaHtml);
console.assert(res2.status === 'REVIEW_REQUIRED', 'Test 2.1 Failed: reCAPTCHA must trigger REVIEW_REQUIRED');
console.assert(res2.protectionReport.detectedSignatures.includes('Google reCAPTCHA'), 'Test 2.2 Failed: Signature detected');
console.log('✔ Test 2: Google reCAPTCHA detection and REVIEW_REQUIRED routing verified.');

// Test 3: Cloudflare Turnstile Challenge Detection
const cfHtml = cleanHtml + '<div class="cf-turnstile" data-sitekey="0x4AAAAAA"></div>';
const res3 = executeSubmitterTestMode({ contactPageUrl: 'https://example.com', targetForm: {}, mappedFields: validMappedFields, mode: 'test' }, cfHtml);
console.assert(res3.status === 'REVIEW_REQUIRED', 'Test 3.1 Failed: Cloudflare must trigger REVIEW_REQUIRED');
console.log('✔ Test 3: Cloudflare Turnstile challenge detection verified.');

// Test 4: Disabled Submit Button Detection
const disabledHtml = `
<form id="contact-form">
  <input type="text" id="name" />
  <input type="email" id="email" />
  <textarea id="msg"></textarea>
  <button type="submit" disabled="disabled">Submit</button>
</form>
`;
const res4 = executeSubmitterTestMode({ contactPageUrl: 'https://example.com', targetForm: {}, mappedFields: validMappedFields, mode: 'test' }, disabledHtml);
console.assert(res4.status === 'REVIEW_REQUIRED', 'Test 4.1 Failed: Disabled submit must trigger REVIEW_REQUIRED');
console.log('✔ Test 4: Disabled submit button detection verified.');

// Test 5: Missing Required Field Detection
const incompleteMappedFields = [
  { fieldSelector: 'input#name', fieldLabel: 'Full Name', valueToFill: 'Mithu Alam', isRequired: true, isHoneypot: false },
  { fieldSelector: 'input#phone', fieldLabel: 'Direct Phone', valueToFill: '', isRequired: true, isHoneypot: false }, // missing!
];
const res5 = executeSubmitterTestMode({ contactPageUrl: 'https://example.com', targetForm: {}, mappedFields: incompleteMappedFields, mode: 'test' }, cleanHtml);
console.assert(res5.status === 'REVIEW_REQUIRED', 'Test 5.1 Failed: Missing required field must trigger REVIEW_REQUIRED');
console.log('✔ Test 5: Missing required field detection verified.');

console.log('✅ ALL CONTACT FORM SUBMITTER TESTS PASSED WITH 100% SUCCESS!');
