// Gravity Forms bare "First" / "Last" name sub-inputs (Campaign 1,
// brimbank, 2026-11-15): the sub-labels carry no "Name", so the old
// first.?name / last.?name patterns never matched and both required
// inputs landed in REVIEW.
import { describe, expect, it } from 'vitest';
import { classifyFetchField, classifyFormField, parseContactFormsFromHtml } from '../src/lib/services/form-detector.ts';
import { mapLeadToFormFields } from '../src/lib/services/field-mapper.ts';

const SENDER = {
  fullName: 'Zakaria Alam Mithu',
  replyEmail: 'mithusquare@gmail.com',
  phone: '+15551234567',
  whatsApp: '+15557654321',
  companyName: 'B2B GDC',
  website: 'https://b2bgdc.com',
  jobTitle: 'Founder',
  country: 'UK',
  streetAddress: '124 Whitechapel Road',
  city: 'London',
  stateRegion: 'Greater London',
  postalCode: 'E1 1JE',
};

const GRAVITY_HTML = `<form id="gform_2" action="/contact-us/" method="post">
  <input type="text" name="input_1.3" id="input_2_1_3" aria-required="true"><label for="input_2_1_3">First</label>
  <input type="text" name="input_1.6" id="input_2_1_6" aria-required="true"><label for="input_2_1_6">Last</label>
  <input type="text" name="input_2" id="input_2_2" aria-required="true"><label for="input_2_2">Phone(Required)</label>
  <input type="email" name="input_3" id="input_2_3" aria-required="true"><label for="input_2_3">Email(Required)</label>
  <textarea name="input_5" id="input_2_5"></textarea><label for="input_2_5">Message:</label>
</form>`;

describe('gravity bare First/Last name fields', () => {
  it('classifyFetchField reads a bare First / Last label', () => {
    expect(classifyFetchField('input', 'text', 'input_1.3', 'First')).toBe('first_name');
    expect(classifyFetchField('input', 'text', 'input_1.6', 'Last')).toBe('last_name');
    expect(classifyFetchField('input', 'text', 'input_1.3', 'First *')).toBe('first_name');
    expect(classifyFetchField('input', 'text', 'input_1.6', 'Last (Required)')).toBe('last_name');
  });

  it('does not mistake other bare labels or Gravity numbering for a name', () => {
    // "First appointment" is not a first name.
    expect(classifyFetchField('input', 'text', 'input_1.3', 'First appointment')).toBe('unknown');
    // A Gravity address sub-input shares the .3 numbering but its label
    // is City, not First — the name alone must never decide.
    expect(classifyFetchField('input', 'text', 'input_2.3', 'City')).toBe('city');
    expect(classifyFetchField('input', 'text', 'input_2.6', 'Country')).toBe('country');
  });

  it('classifyFormField reads a bare First / Last label', () => {
    expect(classifyFormField({ tag: 'input', htmlType: 'text', name: 'input_1.3', label: 'First' }).normalizedType).toBe('first_name');
    expect(classifyFormField({ tag: 'input', htmlType: 'text', name: 'input_1.6', label: 'Last' }).normalizedType).toBe('last_name');
  });

  it('a Gravity name form maps READY_FOR_SUBMISSION', () => {
    const parsed = parseContactFormsFromHtml(GRAVITY_HTML, 'https://example.test/contact');
    expect(parsed).not.toBeNull();
    const mapped = mapLeadToFormFields(
      parsed.fields,
      {
        company_name: 'Example Clinic',
        website: 'https://example.test',
        email: 'info@example.test',
        user_contact_identity: SENDER,
      },
      { body: 'Hello, we help clinics grow with modern websites and AI automation systems that generate more patient enquiries every week.' },
    );
    expect(mapped.status).toBe('READY_FOR_SUBMISSION');
    expect(mapped.unmappedRequiredCount).toBe(0);
    const byLabel = Object.fromEntries(mapped.mappedFields.map((f) => [f.fieldLabel, f.valueToFill]));
    expect(byLabel.First).toBe('Zakaria');
    expect(byLabel.Last).toBe('Alam Mithu');
  });
});
