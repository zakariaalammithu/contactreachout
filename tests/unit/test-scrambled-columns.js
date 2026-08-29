/**
 * Bulk Contact Form Outreach System — Scrambled Column Auto-Detection Test
 * Tests that when headers are in reverse, randomized, or aliased order,
 * the 12 fields are 100% correctly recognized and mapped.
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
  };

  for (const header of headers) {
    const raw = header.trim();
    const h = normalize(raw);

    // 1. Company LinkedIn vs Person LinkedIn
    if (!suggestions.company_linkedin_url && (
      /(companylinkedin|organizationlinkedin|corplinkedin|businesslinkedin|orglinkedin)/i.test(h) ||
      /company.*linkedin/i.test(raw) ||
      /organization.*linkedin/i.test(raw)
    )) {
      suggestions.company_linkedin_url = header;
      continue;
    }

    if (!suggestions.person_linkedin_url && (
      /(personlinkedin|personallinkedin|linkedinprofile|userlinkedin|contactlinkedin|profileurl|^linkedinurl$|^linkedin$)/i.test(h) ||
      /person.*linkedin/i.test(raw) ||
      /personal.*linkedin/i.test(raw) ||
      /linkedin.*profile/i.test(raw) ||
      /profile.*url/i.test(raw) ||
      /linkedin/i.test(raw)
    )) {
      suggestions.person_linkedin_url = header;
      continue;
    }

    // 2. Company Name
    if (!suggestions.company_name && (
      /(companyname|company|organization|orgname|businessname|accountname|firmname|^account$)/i.test(h) ||
      /company.*name/i.test(raw) ||
      /company/i.test(raw) ||
      /organization/i.test(raw)
    )) {
      suggestions.company_name = header;
      continue;
    }

    // 3. Website
    if (!suggestions.website && (
      /(^website$|websiteurl|weburl|domain|site|homepage|companyurl|companywebsite|companydomain|webaddress|^url$)/i.test(h) ||
      /website.*url/i.test(raw) ||
      /website/i.test(raw) ||
      /domain/i.test(raw) ||
      /url/i.test(raw)
    )) {
      suggestions.website = header;
      continue;
    }

    // 4. First Name
    if (!suggestions.first_name && (
      /(firstname|fname|givenname|forename|leadfirst|^first$)/i.test(h) ||
      /first.*name/i.test(raw) ||
      /fname/i.test(raw)
    )) {
      suggestions.first_name = header;
      continue;
    }

    // 5. Last Name
    if (!suggestions.last_name && (
      /(lastname|lname|surname|familyname|leadlast|^last$)/i.test(h) ||
      /last.*name/i.test(raw) ||
      /lname/i.test(raw) ||
      /surname/i.test(raw)
    )) {
      suggestions.last_name = header;
      continue;
    }

    // 6. Title
    if (!suggestions.title && (
      /(^title$|jobtitle|position|role|designation|jobrole|headline|occupation)/i.test(h) ||
      /job.*title/i.test(raw) ||
      /^title$/i.test(raw) ||
      /position/i.test(raw) ||
      /role/i.test(raw)
    )) {
      suggestions.title = header;
      continue;
    }

    // 7. Email
    if (!suggestions.email && (
      /(email|emailaddress|mail|workemail|contactemail)/i.test(h) ||
      /email.*address/i.test(raw) ||
      /email/i.test(raw) ||
      /mail/i.test(raw)
    )) {
      suggestions.email = header;
      continue;
    }

    // 8. Industry
    if (!suggestions.industry && (
      /(industry|sector|category|vertical|businesstype|market)/i.test(h) ||
      /industry/i.test(raw) ||
      /sector/i.test(raw)
    )) {
      suggestions.industry = header;
      continue;
    }

    // 9. City
    if (!suggestions.city && (
      /(^city$|town|municipality|locationcity|metro)/i.test(h) ||
      /^city$/i.test(raw) ||
      /town/i.test(raw)
    )) {
      suggestions.city = header;
      continue;
    }

    // 10. State
    if (!suggestions.state && (
      /(^state$|province|region|stateprovince|territory)/i.test(h) ||
      /^state$/i.test(raw) ||
      /province/i.test(raw) ||
      /region/i.test(raw)
    )) {
      suggestions.state = header;
      continue;
    }

    // 11. Country
    if (!suggestions.country && (
      /(^country$|nation|locationcountry|countrycode|geo)/i.test(h) ||
      /^country$/i.test(raw) ||
      /nation/i.test(raw)
    )) {
      suggestions.country = header;
      continue;
    }
  }

  return suggestions;
}

console.log('=== RUNNING SCRAMBLED COLUMNS AUTO-DETECTION TEST ===');

// Test 1: Exact standard order
const standardHeaders = [
  'First Name',
  'Last Name',
  'Title',
  'Company Name',
  'Email',
  'Industry',
  'Person Linkedin Url',
  'Website',
  'Company Linkedin Url',
  'City',
  'State',
  'Country',
];

const mappedStandard = suggestColumnMappings(standardHeaders);
assert.strictEqual(mappedStandard.first_name, 'First Name');
assert.strictEqual(mappedStandard.last_name, 'Last Name');
assert.strictEqual(mappedStandard.title, 'Title');
assert.strictEqual(mappedStandard.company_name, 'Company Name');
assert.strictEqual(mappedStandard.email, 'Email');
assert.strictEqual(mappedStandard.industry, 'Industry');
assert.strictEqual(mappedStandard.person_linkedin_url, 'Person Linkedin Url');
assert.strictEqual(mappedStandard.website, 'Website');
assert.strictEqual(mappedStandard.company_linkedin_url, 'Company Linkedin Url');
assert.strictEqual(mappedStandard.city, 'City');
assert.strictEqual(mappedStandard.state, 'State');
assert.strictEqual(mappedStandard.country, 'Country');
console.log('✔ Test 1: Exact 12 standard headers recognized successfully.');

// Test 2: Completely reversed and jumbled order
const scrambledHeaders = [
  'Country',
  'Company Linkedin Url',
  'State',
  'City',
  'Person Linkedin Url',
  'Industry',
  'Email',
  'Title',
  'Website',
  'Company Name',
  'Last Name',
  'First Name',
];

const mappedScrambled = suggestColumnMappings(scrambledHeaders);
assert.strictEqual(mappedScrambled.first_name, 'First Name');
assert.strictEqual(mappedScrambled.last_name, 'Last Name');
assert.strictEqual(mappedScrambled.title, 'Title');
assert.strictEqual(mappedScrambled.company_name, 'Company Name');
assert.strictEqual(mappedScrambled.email, 'Email');
assert.strictEqual(mappedScrambled.industry, 'Industry');
assert.strictEqual(mappedScrambled.person_linkedin_url, 'Person Linkedin Url');
assert.strictEqual(mappedScrambled.website, 'Website');
assert.strictEqual(mappedScrambled.company_linkedin_url, 'Company Linkedin Url');
assert.strictEqual(mappedScrambled.city, 'City');
assert.strictEqual(mappedScrambled.state, 'State');
assert.strictEqual(mappedScrambled.country, 'Country');
console.log('✔ Test 2: Scrambled/reversed headers correctly auto-detected and reordered.');

// Test 3: Common alternate naming conventions
const aliasedHeaders = [
  'Job Title',
  'Company',
  'Work Email',
  'Personal LinkedIn',
  'Website URL',
  'Org LinkedIn Page',
  'Location City',
  'Province',
  'Nation',
  'Sector',
  'Lead Last Name',
  'Lead First Name',
];

const mappedAliased = suggestColumnMappings(aliasedHeaders);
assert.strictEqual(mappedAliased.first_name, 'Lead First Name');
assert.strictEqual(mappedAliased.last_name, 'Lead Last Name');
assert.strictEqual(mappedAliased.title, 'Job Title');
assert.strictEqual(mappedAliased.company_name, 'Company');
assert.strictEqual(mappedAliased.email, 'Work Email');
assert.strictEqual(mappedAliased.industry, 'Sector');
assert.strictEqual(mappedAliased.person_linkedin_url, 'Personal LinkedIn');
assert.strictEqual(mappedAliased.website, 'Website URL');
assert.strictEqual(mappedAliased.company_linkedin_url, 'Org LinkedIn Page');
assert.strictEqual(mappedAliased.city, 'Location City');
assert.strictEqual(mappedAliased.state, 'Province');
assert.strictEqual(mappedAliased.country, 'Nation');
console.log('✔ Test 3: Aliased and synonym headers correctly recognized.');

console.log('✅ ALL SCRAMBLED COLUMNS AUTO-DETECTION TESTS PASSED WITH 100% SUCCESS!\n');
