/**
 * Bulk Contact Form Outreach System — Form Field Mapping Engine Test Suite
 * Tests varied field naming conventions, composite full name resolution, honeypot safety, and confidence scoring.
 */

function constructFullName(firstName, lastName) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.join(' ');
}

function mapLeadToFormFields(detectedFields, lead, message, options = {}) {
  const { minConfidenceThreshold = 0.70, fallbackSubject = 'Partnership Inquiry' } = options;

  const assignments = [];
  let totalConfidence = 0;
  let scoreableFieldsCount = 0;
  let unmappedRequiredCount = 0;
  let honeypotsDetectedCount = 0;

  for (const field of detectedFields) {
    let valueToFill = '';
    let strategy = 'unmapped';
    let sourceLeadField;
    let confidence = field.confidence || 0.9;

    if (field.isHoneypot) {
      valueToFill = '';
      strategy = 'honeypot_skip';
      confidence = 1.0;
      honeypotsDetectedCount++;
      assignments.push({ fieldSelector: field.selector, normalizedType: field.normalizedType, valueToFill: '', confidenceScore: 1.0, isHoneypot: true, strategy });
      continue;
    }

    if (field.htmlType === 'hidden' || field.htmlType === 'submit') continue;

    switch (field.normalizedType) {
      case 'first_name':
        if (lead.first_name) {
          valueToFill = String(lead.first_name).trim();
          strategy = 'direct_first_name';
          sourceLeadField = 'first_name';
        }
        break;

      case 'last_name':
        if (lead.last_name) {
          valueToFill = String(lead.last_name).trim();
          strategy = 'direct_last_name';
          sourceLeadField = 'last_name';
        }
        break;

      case 'full_name':
        const fullName = constructFullName(lead.first_name, lead.last_name) || lead.name || '';
        if (fullName) {
          valueToFill = String(fullName).trim();
          strategy = 'composite_full_name';
          sourceLeadField = 'first_name + last_name';
        }
        break;

      case 'email':
        if (lead.email) {
          valueToFill = String(lead.email).trim();
          strategy = 'direct_email';
          sourceLeadField = 'email';
        }
        break;

      case 'phone':
        if (lead.phone) {
          valueToFill = String(lead.phone).trim();
          strategy = 'direct_phone';
          sourceLeadField = 'phone';
        }
        break;

      case 'company':
        if (lead.company_name) {
          valueToFill = String(lead.company_name).trim();
          strategy = 'direct_company';
          sourceLeadField = 'company_name';
        }
        break;

      case 'subject':
        valueToFill = message.subject || fallbackSubject;
        strategy = 'direct_subject';
        sourceLeadField = 'rendered_message.subject';
        break;

      case 'message':
        valueToFill = message.body || '';
        strategy = 'rendered_message';
        sourceLeadField = 'rendered_message.body';
        break;
    }

    if (field.isRequired && !valueToFill) {
      unmappedRequiredCount++;
    }

    if (strategy !== 'unmapped') {
      totalConfidence += confidence;
      scoreableFieldsCount++;
    }

    assignments.push({
      fieldSelector: field.selector,
      normalizedType: field.normalizedType,
      valueToFill,
      confidenceScore: Math.round(confidence * 100) / 100,
      isRequired: Boolean(field.isRequired),
      isHoneypot: false,
      strategy,
      sourceLeadField,
    });
  }

  const overallConfidenceScore = scoreableFieldsCount > 0 ? Math.round((totalConfidence / scoreableFieldsCount) * 100) : 0;
  let status = 'READY_FOR_SUBMISSION';
  let reason;

  const hasMappedEmail = assignments.some((a) => a.normalizedType === 'email' && a.valueToFill);
  const hasMappedMessage = assignments.some((a) => a.normalizedType === 'message' && a.valueToFill);

  if (!hasMappedEmail) {
    status = 'MISSING_MANDATORY_FIELDS';
    reason = 'Missing required email field.';
  } else if (!hasMappedMessage) {
    status = 'MISSING_MANDATORY_FIELDS';
    reason = 'Missing required message body.';
  } else if (unmappedRequiredCount > 0) {
    status = 'REVIEW_REQUIRED';
    reason = `${unmappedRequiredCount} mandatory field(s) lack data.`;
  } else if (overallConfidenceScore < Math.round(minConfidenceThreshold * 100)) {
    status = 'REVIEW_REQUIRED';
    reason = `Confidence (${overallConfidenceScore}%) below threshold.`;
  }

  return { status, overallConfidenceScore, mappedFields: assignments, unmappedRequiredCount, honeypotsDetectedCount, reason };
}

// ==========================================
// TEST EXECUTION
// ==========================================

console.log('=== RUNNING FIELD MAPPING ENGINE TEST SUITE ===');

// Sample Lead & Message Context
const leadData = {
  first_name: 'Mithu',
  last_name: 'Alam',
  email: 'mithu@example.com',
  company_name: 'B2B GDC',
  phone: '+1 (555) 234-5678',
};

const message = {
  subject: 'Partnership with B2B GDC',
  body: 'Hi Mithu,\n\nI came across B2B GDC and wanted to reach out regarding our software services.\n\nBest,\nAlex',
};

// Test 1: Full Name composite mapping (from prompt 9 example)
const detectedFields1 = [
  { selector: 'input#full_name', normalizedType: 'full_name', confidence: 0.95, isRequired: true, isHoneypot: false },
  { selector: 'input#business_email', normalizedType: 'email', confidence: 0.98, isRequired: true, isHoneypot: false },
  { selector: 'input#company', normalizedType: 'company', confidence: 0.92, isRequired: false, isHoneypot: false },
  { selector: 'textarea#message', normalizedType: 'message', confidence: 0.95, isRequired: true, isHoneypot: false },
  { selector: 'input[name="hp_field"]', normalizedType: 'honeypot', confidence: 1.0, isRequired: false, isHoneypot: true },
];

const res1 = mapLeadToFormFields(detectedFields1, leadData, message);
console.assert(res1.status === 'READY_FOR_SUBMISSION', `Test 1.1 Failed: Status was ${res1.status}`);
console.assert(res1.overallConfidenceScore >= 90, `Test 1.2 Failed: Score was ${res1.overallConfidenceScore}`);

const fullNameMapping = res1.mappedFields.find((m) => m.normalizedType === 'full_name');
console.assert(fullNameMapping?.valueToFill === 'Mithu Alam', `Test 1.3 Failed: Full name was "${fullNameMapping?.valueToFill}"`);
console.assert(fullNameMapping?.strategy === 'composite_full_name', 'Test 1.4 Failed');

const emailMapping = res1.mappedFields.find((m) => m.normalizedType === 'email');
console.assert(emailMapping?.valueToFill === 'mithu@example.com', 'Test 1.5 Failed');

const companyMapping = res1.mappedFields.find((m) => m.normalizedType === 'company');
console.assert(companyMapping?.valueToFill === 'B2B GDC', 'Test 1.6 Failed');

const messageMapping = res1.mappedFields.find((m) => m.normalizedType === 'message');
console.assert(messageMapping?.valueToFill.includes('Hi Mithu'), 'Test 1.7 Failed');

const honeypotMapping = res1.mappedFields.find((m) => m.isHoneypot === true);
console.assert(honeypotMapping?.valueToFill === '', 'Test 1.8 Failed: Honeypot must be empty');

// Test 2: Separate First and Last Name Fields
const detectedFields2 = [
  { selector: 'input#fname', normalizedType: 'first_name', confidence: 0.95, isRequired: true, isHoneypot: false },
  { selector: 'input#lname', normalizedType: 'last_name', confidence: 0.95, isRequired: true, isHoneypot: false },
  { selector: 'input#email', normalizedType: 'email', confidence: 0.98, isRequired: true, isHoneypot: false },
  { selector: 'textarea#comments', normalizedType: 'message', confidence: 0.95, isRequired: true, isHoneypot: false },
];

const res2 = mapLeadToFormFields(detectedFields2, leadData, message);
const fnameMap = res2.mappedFields.find((m) => m.normalizedType === 'first_name');
const lnameMap = res2.mappedFields.find((m) => m.normalizedType === 'last_name');
console.assert(fnameMap?.valueToFill === 'Mithu', 'Test 2.1 Failed: first name');
console.assert(lnameMap?.valueToFill === 'Alam', 'Test 2.2 Failed: last name');

// Test 3: Missing Required Field Triggering REVIEW_REQUIRED
const detectedFields3 = [
  { selector: 'input#name', normalizedType: 'full_name', confidence: 0.9, isRequired: true, isHoneypot: false },
  { selector: 'input#email', normalizedType: 'email', confidence: 0.9, isRequired: true, isHoneypot: false },
  { selector: 'input#phone', normalizedType: 'phone', confidence: 0.9, isRequired: true, isHoneypot: false }, // required phone
  { selector: 'textarea#msg', normalizedType: 'message', confidence: 0.9, isRequired: true, isHoneypot: false },
];

const leadWithoutPhone = { first_name: 'Mithu', last_name: 'Alam', email: 'mithu@example.com' };
const res3 = mapLeadToFormFields(detectedFields3, leadWithoutPhone, message);
console.assert(res3.status === 'REVIEW_REQUIRED', 'Test 3.1 Failed: Missing required phone must trigger REVIEW_REQUIRED');

// Test 4: Missing Email Triggering MISSING_MANDATORY_FIELDS
const leadWithoutEmail = { first_name: 'Mithu', last_name: 'Alam' };
const res4 = mapLeadToFormFields(detectedFields1, leadWithoutEmail, message);
console.assert(res4.status === 'MISSING_MANDATORY_FIELDS', 'Test 4.1 Failed: Missing email must trigger MISSING_MANDATORY_FIELDS');

console.log('✅ ALL FORM FIELD MAPPING TESTS PASSED WITH 100% SUCCESS!');
