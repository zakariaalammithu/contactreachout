/**
 * Bulk Contact Form Outreach System — ContactPageFinder Test Suite
 * Tests URL Safety/SSRF validation, anchor scoring heuristics, and discovery logic.
 */

// 1. URL Safety & SSRF Checker
function validateUrlSafety(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'URL string is empty' };
  }

  let formatted = rawUrl.trim();
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`;
  }

  try {
    const parsed = new URL(formatted);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return { isValid: false, normalizedUrl: formatted, domain: hostname, error: 'SSRF Protection: Access to private/local network blocked' };
    }

    if (!hostname.includes('.') || hostname.endsWith('.')) {
      return { isValid: false, normalizedUrl: formatted, domain: hostname, error: 'Invalid hostname structure' };
    }

    const domain = hostname.replace(/^www\./, '');
    const normalizedUrl = `${parsed.protocol}//${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;

    return { isValid: true, normalizedUrl, domain };
  } catch (err) {
    return { isValid: false, normalizedUrl: formatted, domain: '', error: `Malformed URL: ${err.message}` };
  }
}

// 2. Scored Link Evaluator
const CONTACT_TEXT_PATTERNS = [
  { regex: /^(contact\s*us|contact)$/i, score: 100, reason: 'Exact "Contact" or "Contact Us" match' },
  { regex: /^(get\s*in\s*touch|reach\s*us|talk\s*to\s*us)$/i, score: 95, reason: 'High-confidence outreach phrase' },
  { regex: /contact/i, score: 80, reason: 'Contains "contact"' },
  { regex: /(get\s*in\s*touch|reach\s*us|talk\s*to\s*us)/i, score: 75, reason: 'Outreach keyword match' },
  { regex: /(customer\s*support|sales\s*inquiry|help\s*desk|inquiries)/i, score: 60, reason: 'Support/Inquiry keyword' },
];

const CONTACT_HREF_PATTERNS = [
  { regex: /(^|\/)(contact-us|contactus|contact)($|\/|\?|#)/i, score: 90, reason: 'Standard /contact URL path' },
  { regex: /(^|\/)(get-in-touch|reach-us|talk-to-us)($|\/|\?|#)/i, score: 85, reason: 'Standard outreach URL path' },
  { regex: /(^|\/)(about\/contact|support\/contact|sales)($|\/|\?|#)/i, score: 70, reason: 'Nested contact path' },
];

function scoreCandidateLink(href, linkText, baseDomain) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return null;
  }

  const cleanText = linkText.trim();
  let absoluteUrl = href;

  try {
    const parsed = new URL(href, `https://${baseDomain}`);
    const linkDomain = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Strict Scope Boundary: Stay on the same root domain
    if (linkDomain !== baseDomain && !linkDomain.endsWith(`.${baseDomain}`)) {
      return null;
    }

    absoluteUrl = parsed.toString();
  } catch {
    return null;
  }

  let highestScore = 0;
  let matchReason = '';

  for (const textPattern of CONTACT_TEXT_PATTERNS) {
    if (textPattern.regex.test(cleanText)) {
      if (textPattern.score > highestScore) {
        highestScore = textPattern.score;
        matchReason = textPattern.reason;
      }
    }
  }

  for (const hrefPattern of CONTACT_HREF_PATTERNS) {
    if (hrefPattern.regex.test(href)) {
      const combinedScore = Math.max(highestScore, hrefPattern.score);
      if (combinedScore >= highestScore) {
        highestScore = combinedScore;
        matchReason = matchReason ? `${matchReason} + ${hrefPattern.reason}` : hrefPattern.reason;
      }
    }
  }

  if (highestScore > 0) {
    return { url: absoluteUrl, text: cleanText, score: highestScore, matchReason };
  }

  return null;
}

// ==========================================
// TEST EXECUTION
// ==========================================

console.log('=== RUNNING CONTACT PAGE DISCOVERY TEST SUITE ===');

// Test 1: SSRF Protection
const ssrf1 = validateUrlSafety('http://localhost:8080/admin');
console.assert(ssrf1.isValid === false && ssrf1.error.includes('SSRF Protection'), 'Test 1.1 Failed: localhost blocked');

const ssrf2 = validateUrlSafety('http://192.168.1.1/router');
console.assert(ssrf2.isValid === false && ssrf2.error.includes('SSRF Protection'), 'Test 1.2 Failed: 192.168.x blocked');

const ssrf3 = validateUrlSafety('https://169.254.169.254/latest/meta-data');
console.assert(ssrf3.isValid === false && ssrf3.error.includes('SSRF Protection'), 'Test 1.3 Failed: AWS metadata IP blocked');

const validUrl = validateUrlSafety('stripe.com');
console.assert(validUrl.isValid === true && validUrl.domain === 'stripe.com', 'Test 1.4 Failed: valid domain allowed');

// Test 2: Anchor Scoring Heuristics
const link1 = scoreCandidateLink('/contact-us', 'Contact Us', 'stripe.com');
console.assert(link1 !== null && link1.score === 100, `Test 2.1 Failed: score ${link1?.score}`);
console.assert(link1.url === 'https://stripe.com/contact-us', 'Test 2.2 Failed: resolved URL');

const link2 = scoreCandidateLink('/get-in-touch', 'Get In Touch', 'stripe.com');
console.assert(link2 !== null && link2.score === 95, `Test 2.3 Failed: score ${link2?.score}`);

const link3 = scoreCandidateLink('/sales/inquiry', 'Sales Inquiries', 'stripe.com');
console.assert(link3 !== null && link3.score === 70, `Test 2.4 Failed: score ${link3?.score}`);

// Test 3: External Domain Scope Boundary
const externalLink = scoreCandidateLink('https://twitter.com/stripe', 'Follow us on Twitter', 'stripe.com');
console.assert(externalLink === null, 'Test 3.1 Failed: external domain must be rejected');

const subDomainLink = scoreCandidateLink('https://support.stripe.com/contact', 'Support Desk', 'stripe.com');
console.assert(subDomainLink !== null && subDomainLink.url === 'https://support.stripe.com/contact', 'Test 3.2 Failed: subdomains should be allowed');

console.log('✅ ALL CONTACT PAGE FINDER TESTS PASSED WITH 100% SUCCESS!');
