// Sender postal address mapping (2026-11-13): address fields on a
// target form fill from the account identity only — never from the
// lead (prospect), never fabricated when the profile is empty.
import { describe, it, expect } from 'vitest';
import { parseContactFormsFromHtml, classifyFetchField, classifyFormField } from '@/lib/services/form-detector';
import { mapLeadToFormFields } from '@/lib/services/field-mapper';

const longBody =
  'Hello, reaching out regarding a partnership inquiry. We build modern high-quality web systems tailored for businesses to scale operations and generate more opportunities.';

const identity = {
  fullName: 'Zakaria Alam Mithu',
  replyEmail: 'zakaria@contactreachout.com',
  phone: '+15551234567',
  whatsApp: '+15557654321',
  companyName: 'ContactReachout',
  website: 'https://contactreachout.com',
  jobTitle: 'Founder',
  country: 'United Kingdom',
  streetAddress: '124 Whitechapel Road',
  city: 'London',
  stateRegion: 'Greater London',
  postalCode: 'E1 1JE',
};

// The prospect's own city/state/country deliberately differ: the mapper
// must use the SENDER's address, never the lead's.
const leadFor = (identityOverride) => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company_name: 'Prospect Ltd',
  website: 'https://prospect.example',
  city: 'Montevideo',
  state: 'Montevideo Department',
  country: 'Uruguay',
  user_contact_identity: identityOverride === undefined ? identity : identityOverride,
});

function field(overrides) {
  return {
    selector: '#f',
    tag: 'input',
    htmlType: 'text',
    label: '',
    normalizedType: 'unknown',
    confidence: 0.95,
    isRequired: false,
    isHoneypot: false,
    ...overrides,
  };
}

const addressFields = [
  field({ selector: '#email', htmlType: 'email', label: 'Email', normalizedType: 'email', isRequired: true }),
  field({ selector: '#street', label: 'Street Address', normalizedType: 'street_address', isRequired: true }),
  field({ selector: '#city', label: 'City', normalizedType: 'city', isRequired: true }),
  field({ selector: '#state', label: 'State / Region', normalizedType: 'state', isRequired: true }),
  field({ selector: '#postal', label: 'Postal Code', normalizedType: 'postal_code', isRequired: true }),
  field({ selector: '#country', label: 'Country', normalizedType: 'country', isRequired: true }),
  field({ selector: '#message', tag: 'textarea', htmlType: 'textarea', label: 'Message', normalizedType: 'message' }),
];

describe('address field classification', () => {
  it('classifies street/postal/city/state labels from name or label', () => {
    expect(classifyFetchField('input', 'text', 'street_address', 'Street Address')).toBe('street_address');
    expect(classifyFetchField('input', 'text', 'address1', 'Address Line 1')).toBe('street_address');
    expect(classifyFetchField('input', 'text', 'address', 'Address')).toBe('street_address');
    expect(classifyFetchField('input', 'text', 'zip', 'ZIP Code')).toBe('postal_code');
    expect(classifyFetchField('input', 'text', 'postal_code', 'Postal Code')).toBe('postal_code');
    expect(classifyFetchField('input', 'text', 'city', 'City')).toBe('city');
    expect(classifyFetchField('input', 'text', 'state', 'State / Region')).toBe('state');
  });

  it('never misclassifies Email Address or Website Address as a street address', () => {
    expect(classifyFetchField('input', 'text', 'email', 'Email Address')).toBe('email');
    expect(classifyFetchField('input', 'text', 'website', 'Website Address')).toBe('website');
    expect(classifyFetchField('input', 'text', 'company_address', 'Company Address')).toBe('street_address');
  });

  it('classifies street/postal fields through the runtime classifier too', () => {
    expect(classifyFormField({ tag: 'input', htmlType: 'text', name: 'street_address', label: 'Street Address' }).normalizedType).toBe('street_address');
    expect(classifyFormField({ tag: 'input', htmlType: 'text', name: 'zip', label: 'ZIP Code' }).normalizedType).toBe('postal_code');
    expect(classifyFormField({ tag: 'input', htmlType: 'text', name: 'email', label: 'Email Address' }).normalizedType).toBe('email');
  });

  it('parses a full address form from real-world style HTML', () => {
    const html = `<form><input type="text" name="contact[address]" placeholder="Street Address"><input type="text" name="contact[city]" placeholder="City"><input type="text" name="contact[state]" placeholder="State"><input type="text" name="contact[zip]" placeholder="ZIP Code"><input type="email" name="contact[email]" placeholder="Email"><textarea name="contact[message]" placeholder="Message"></textarea></form>`;
    const parsed = parseContactFormsFromHtml(html, 'https://example.com/contact');
    const types = parsed.fields.map((f) => f.normalizedType);
    expect(types).toContain('street_address');
    expect(types).toContain('city');
    expect(types).toContain('state');
    expect(types).toContain('postal_code');
    expect(types).toContain('email');
    expect(types).toContain('message');
  });
});

describe('address field mapping', () => {
  it('fills every address field from the sender identity, never the lead', () => {
    const result = mapLeadToFormFields(addressFields, leadFor(), { subject: 'Partnership Inquiry', body: longBody }, {});
    expect(result.status).toBe('READY_FOR_SUBMISSION');
    expect(result.unmappedRequiredCount).toBe(0);
    const byLabel = Object.fromEntries(result.mappedFields.map((a) => [a.fieldLabel, a.valueToFill]));
    expect(byLabel['Street Address']).toBe('124 Whitechapel Road');
    expect(byLabel.City).toBe('London');
    expect(byLabel['State / Region']).toBe('Greater London');
    expect(byLabel['Postal Code']).toBe('E1 1JE');
    expect(byLabel.Country).toBe('United Kingdom');
  });

  it('leaves required address fields blank — never fabricated — when the profile has no address', () => {
    const noAddress = { ...identity, streetAddress: '', city: '', stateRegion: '', postalCode: '', country: '' };
    const result = mapLeadToFormFields(addressFields, leadFor(noAddress), { subject: 'Partnership Inquiry', body: longBody }, {});
    expect(result.status).toBe('FIELD_MAPPING_REQUIRED');
    expect(result.unmappedRequiredCount).toBe(5);
    const byLabel = Object.fromEntries(result.mappedFields.map((a) => [a.fieldLabel, a.valueToFill]));
    expect(byLabel['Street Address']).toBe('');
    expect(byLabel.City).toBe('');
    expect(byLabel['State / Region']).toBe('');
    expect(byLabel['Postal Code']).toBe('');
    expect(byLabel.Country).toBe('');
  });

  it('matches a state select against the sender state, and falls back to Other without one', () => {
    const fields = [
      field({ selector: '#email', htmlType: 'email', label: 'Email', normalizedType: 'email', isRequired: true }),
      field({ selector: '#message', tag: 'textarea', htmlType: 'textarea', label: 'Message', normalizedType: 'message' }),
      field({
        selector: '#state', tag: 'select', htmlType: 'select', label: 'State', normalizedType: 'state',
        isRequired: true, options: ['California', 'Greater London', 'Other'],
      }),
    ];
    const matched = mapLeadToFormFields(fields, leadFor(), { subject: 'Hi', body: longBody }, {});
    expect(matched.status).toBe('READY_FOR_SUBMISSION');
    expect(matched.mappedFields.find((a) => a.fieldLabel === 'State').valueToFill).toBe('Greater London');
    const noState = { ...identity, stateRegion: '' };
    const other = mapLeadToFormFields(fields, leadFor(noState), { subject: 'Hi', body: longBody }, {});
    expect(other.mappedFields.find((a) => a.fieldLabel === 'State').valueToFill).toBe('Other');
  });

  it('fills a country text input directly from the sender country', () => {
    const fields = [
      field({ selector: '#email', htmlType: 'email', label: 'Email', normalizedType: 'email', isRequired: true }),
      field({ selector: '#message', tag: 'textarea', htmlType: 'textarea', label: 'Message', normalizedType: 'message' }),
      field({ selector: '#country', label: 'Country', normalizedType: 'country', isRequired: true }),
    ];
    const result = mapLeadToFormFields(fields, leadFor(), { subject: 'Hi', body: longBody }, {});
    expect(result.status).toBe('READY_FOR_SUBMISSION');
    expect(result.mappedFields.find((a) => a.fieldLabel === 'Country').valueToFill).toBe('United Kingdom');
  });
});
