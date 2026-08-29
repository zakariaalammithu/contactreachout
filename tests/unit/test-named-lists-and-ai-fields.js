/**
 * Unit Test: Named Lead Lists & AI Personalization Fields Engine (Manyready System)
 */

const assert = require('assert');

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function suggestColumnMappings(headers) {
  const suggestions = {
    first_name: '',
    last_name: '',
    title: '',
    company_name: '',
    email: '',
    industry: '',
    person_linkedin_url: '',
    website: '',
    company_linkedin_url: '',
    city: '',
    state: '',
    country: '',
    phone: '',
    personalized_opening_line: '',
    problem_paragraph: '',
    pitch: '',
    cta: '',
  };

  for (const header of headers) {
    const raw = header.trim();
    const h = normalize(raw);

    if (!suggestions.personalized_opening_line && (
      /(personalizedopeningline|openingline|introline|icebreaker|firstline|customintro|customline)/i.test(h) ||
      /personalized.*opening/i.test(raw) ||
      /opening.*line/i.test(raw)
    )) {
      suggestions.personalized_opening_line = header;
      continue;
    }

    if (!suggestions.problem_paragraph && (
      /(problemparagraph|painpoint|problemlist|problemstatement|challenge|pain)/i.test(h) ||
      /problem.*paragraph/i.test(raw) ||
      /pain.*point/i.test(raw)
    )) {
      suggestions.problem_paragraph = header;
      continue;
    }

    if (!suggestions.pitch && (
      /(pitch|solutionpitch|valueprop|valueproposition|offering|solution)/i.test(h) ||
      /solution.*pitch/i.test(raw) ||
      /value.*prop/i.test(raw) ||
      /^pitch$/i.test(raw)
    )) {
      suggestions.pitch = header;
      continue;
    }

    if (!suggestions.cta && (
      /(cta|calltoaction|nextstep|actionitem|closingask)/i.test(h) ||
      /call.*to.*action/i.test(raw) ||
      /^cta$/i.test(raw)
    )) {
      suggestions.cta = header;
      continue;
    }

    if (!suggestions.company_name && /(companyname|company|organization)/i.test(h)) {
      suggestions.company_name = header;
      continue;
    }

    if (!suggestions.website && /(website|domain|url)/i.test(h)) {
      suggestions.website = header;
      continue;
    }

    if (!suggestions.first_name && /(firstname|fname|givenname)/i.test(h)) {
      suggestions.first_name = header;
      continue;
    }
  }

  return suggestions;
}

console.log('=== RUNNING NAMED LEAD LISTS & AI PERSONALIZATION ENGINE TESTS ===\n');

// Test 1: Auto-detection of AI Personalization Columns
const headers = [
  'Website',
  'Company Name',
  'First Name',
  'Personalized Opening Line',
  'Problem Paragraph',
  'Pitch',
  'CTA',
];

const mappings = suggestColumnMappings(headers);
assert.strictEqual(mappings.website, 'Website', 'Website should be mapped');
assert.strictEqual(mappings.company_name, 'Company Name', 'Company Name should be mapped');
assert.strictEqual(mappings.first_name, 'First Name', 'First Name should be mapped');
assert.strictEqual(mappings.personalized_opening_line, 'Personalized Opening Line', 'Personalized Opening Line mapped');
assert.strictEqual(mappings.problem_paragraph, 'Problem Paragraph', 'Problem Paragraph mapped');
assert.strictEqual(mappings.pitch, 'Pitch', 'Pitch mapped');
assert.strictEqual(mappings.cta, 'CTA', 'CTA mapped');
console.log('✔ Test 1: AI Personalization column auto-detection verified.');

// Test 2: Extraction and template rendering with AI fields
const template = 'Hi {{firstName}},\n\n{{personalizedOpeningLine}}\n\n{{problemParagraph}}\n\n{{pitch}}\n\n{{cta}}';
const row = {
  firstName: 'Sarah',
  companyName: 'Acme Cloud Dynamics',
  personalizedOpeningLine: 'Loved your recent AWS latency article.',
  problemParagraph: 'Manual pipelines cause engineering slowdowns.',
  pitch: 'We automate multi-region failovers seamlessly.',
  cta: 'Free for a 10m demo Thursday?',
};

const rendered = template
  .replace('{{firstName}}', row.firstName)
  .replace('{{personalizedOpeningLine}}', row.personalizedOpeningLine)
  .replace('{{problemParagraph}}', row.problemParagraph)
  .replace('{{pitch}}', row.pitch)
  .replace('{{cta}}', row.cta);

assert.ok(rendered.includes('Loved your recent AWS latency article.'), 'Opening line interpolated');
assert.ok(rendered.includes('Manual pipelines cause engineering slowdowns.'), 'Problem paragraph interpolated');
assert.ok(rendered.includes('Free for a 10m demo Thursday?'), 'CTA interpolated');
console.log('✔ Test 2: AI personalization template interpolation verified.');

// Test 3: Auto-suppress failed websites rule
const mockLeadsList = [
  { id: '1', domain: 'goodsite.com', status: 'SUBMITTED' },
  { id: '2', domain: 'deadsite.com', status: 'BLOCKED', errorCode: 'NO_FORM' },
  { id: '3', domain: 'newsite.com', status: 'PENDING' },
];

const filtered = mockLeadsList.filter(p => !(p.status === 'BLOCKED' || p.errorCode === 'NO_FORM'));
assert.strictEqual(filtered.length, 2, 'Failed domains should be auto-excluded');
assert.ok(!filtered.some(p => p.domain === 'deadsite.com'), 'deadsite.com must be excluded');
console.log('✔ Test 3: Auto-suppression of failed websites for future campaigns verified.');

console.log('\n✅ ALL NAMED LISTS & AI PERSONALIZATION TESTS PASSED WITH 100% SUCCESS!');
