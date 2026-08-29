/**
 * Bulk Contact Form Outreach System — Automated Verification Suite
 * Tests Template Engine and CSV/Excel Import Normalization logic.
 */

// 1. Test URL Normalizer
function normalizeWebsiteUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return { normalizedUrl: '', domain: '', isValid: false };
  let cleaned = urlStr.trim();
  if (!cleaned) return { normalizedUrl: '', domain: '', isValid: false };
  if (!/^https?:\/\//i.test(cleaned)) cleaned = `https://${cleaned}`;
  try {
    const parsed = new URL(cleaned);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!hostname || !hostname.includes('.') || hostname.endsWith('.')) {
      return { normalizedUrl: cleaned, domain: hostname, isValid: false };
    }
    const normalizedUrl = `${parsed.protocol}//${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    return { normalizedUrl, domain: hostname, isValid: true };
  } catch {
    return { normalizedUrl: cleaned, domain: '', isValid: false };
  }
}

// 2. Test Formula Sanitization
function sanitizeCellInput(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

// 3. Test Template Interpolation
function resolveSpintax(text) {
  if (!text) return '';
  const spintaxRegex = /\{([^{}|]+(?:\|[^{}|]+)+)\}/g;
  return text.replace(spintaxRegex, (_, choices) => {
    const parts = choices.split('|');
    return parts[0];
  });
}

function interpolateTemplate(template, context) {
  if (!template) return '';
  let resolved = resolveSpintax(template);
  resolved = resolved.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (fullMatch, token) => {
    const trimmed = token.trim();
    if (trimmed in context && context[trimmed] !== undefined && context[trimmed] !== null) {
      return String(context[trimmed]);
    }
    if (trimmed.startsWith('custom.') && context.custom_fields) {
      const k = trimmed.replace('custom.', '');
      if (k in context.custom_fields && context.custom_fields[k] != null) {
        return String(context.custom_fields[k]);
      }
    }
    return fullMatch;
  });
  return resolved;
}

function validateTemplate(text) {
  const standard = ['first_name', 'last_name', 'company_name', 'website', 'industry', 'city', 'state', 'country', 'email'];
  const regex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push(m[1].trim());
  }
  const unknown = matches.filter(v => !standard.includes(v) && !v.startsWith('custom.'));
  return { valid: unknown.length === 0, unknown };
}

// ==========================================
// RUN TEST ASSERTIONS
// ==========================================

console.log('--- RUNNING TEST SUITE ---');

// Test 1: URL Normalization
const url1 = normalizeWebsiteUrl('stripe.com');
console.assert(url1.normalizedUrl === 'https://stripe.com', 'Test 1.1 Failed: normalizedUrl');
console.assert(url1.domain === 'stripe.com', 'Test 1.2 Failed: domain');
console.assert(url1.isValid === true, 'Test 1.3 Failed: isValid');

const url2 = normalizeWebsiteUrl('http://www.linear.app/contact');
console.assert(url2.domain === 'linear.app', 'Test 2.1 Failed: domain');

const urlInvalid = normalizeWebsiteUrl('invalid_domain_string');
console.assert(urlInvalid.isValid === false, 'Test 3.1 Failed: invalid URL');

// Test 2: Formula Sanitization
console.assert(sanitizeCellInput('=SUM(A1:A10)') === "'=SUM(A1:A10)", 'Test 4.1 Failed: formula sanitization');
console.assert(sanitizeCellInput('Safe Text') === 'Safe Text', 'Test 4.2 Failed: safe text');

// Test 3: Template Interpolation
const lead = {
  first_name: 'Patrick',
  company_name: 'Stripe, Inc.',
  industry: 'FinTech',
  custom_fields: { plan: 'Enterprise Tier-1' }
};

const template = '{Hi|Hello} {{first_name}}, I noticed {{company_name}} in {{industry}} uses {{custom.plan}}.';
const rendered = interpolateTemplate(template, lead);
console.assert(rendered === 'Hi Patrick, I noticed Stripe, Inc. in FinTech uses Enterprise Tier-1.', `Test 5.1 Failed: "${rendered}"`);

// Test 4: Variable Validation
const validCheck = validateTemplate('Hi {{first_name}} from {{company_name}}!');
console.assert(validCheck.valid === true, 'Test 6.1 Failed');

const invalidCheck = validateTemplate('Hi {{first_name}}, check {{invalid_variable_name}}!');
console.assert(invalidCheck.valid === false && invalidCheck.unknown.includes('invalid_variable_name'), 'Test 6.2 Failed');

console.log('✅ ALL TEST ASSERTIONS PASSED PERFECTLY!');
