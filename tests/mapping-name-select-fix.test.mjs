import { describe, it, expect } from 'vitest';

import { splitPersonName } from '../src/lib/lead-name.ts';
import { mapLeadToFormFields } from '../src/lib/services/field-mapper.ts';

const longBody =
  'Hello, reaching out regarding a partnership inquiry. We build modern high-quality web systems tailored for businesses to scale operations and generate more opportunities.';

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

const vitalmobilityFields = [
  field({ selector: '#first', label: 'First', normalizedType: 'first_name', isRequired: true }),
  field({ selector: '#last', label: 'Last', normalizedType: 'last_name', isRequired: true }),
  field({ selector: '#email', htmlType: 'email', label: 'Email', normalizedType: 'email', isRequired: true }),
  field({ selector: '#message', tag: 'textarea', htmlType: 'textarea', label: 'Message', normalizedType: 'message' }),
  field({
    selector: '#looking',
    tag: 'select',
    htmlType: 'select',
    label: "I'm looking to",
    normalizedType: 'select',
    confidence: 0.9,
    isRequired: true,
    options: ['Choose one', 'Get a quote to buy', 'Get a rental quote', 'Service and repairs', 'Shipping question', 'Other'],
  }),
];

describe('splitPersonName', () => {
  it('splits first and rest', () => {
    expect(splitPersonName('Bruno Reznikiewicz')).toEqual({ firstName: 'Bruno', lastName: 'Reznikiewicz' });
  });

  it('handles a single token and extra spaces', () => {
    expect(splitPersonName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' });
    expect(splitPersonName('  Zakaria   Alam  Mithu  ')).toEqual({ firstName: 'Zakaria', lastName: 'Alam Mithu' });
    expect(splitPersonName('')).toEqual({ firstName: '', lastName: '' });
  });
});

describe('mapping name + select fix', () => {
  it('fills first/last/email from the sender identity and picks Other for the no-data select', () => {
    const result = mapLeadToFormFields(
      vitalmobilityFields,
      {
        first_name: 'Bruno',
        last_name: 'Reznikiewicz',
        email: 'bruno@vitalmobility.ca',
        company_name: 'Vital Mobility',
        website: 'https://vitalmobility.ca',
        user_contact_identity: { fullName: 'Zakaria Alam Mithu', replyEmail: 'zakaria@contactreachout.com' },
      },
      { subject: 'Partnership Inquiry', body: longBody },
      {}
    );
    expect(result.status).toBe('READY_FOR_SUBMISSION');
    expect(result.unmappedRequiredCount).toBe(0);
    const byLabel = Object.fromEntries(result.mappedFields.map((a) => [a.fieldLabel, a.valueToFill]));
    expect(byLabel.First).toBe('Zakaria');
    expect(byLabel.Last).toBe('Alam Mithu');
    expect(byLabel.Email).toBe('zakaria@contactreachout.com');
    expect(byLabel["I'm looking to"]).toBe('Other');
  });

  it('still reports first/last unmapped when no sender name exists', () => {
    const result = mapLeadToFormFields(
      vitalmobilityFields,
      {
        email: 'bruno@vitalmobility.ca',
        company_name: 'Vital Mobility',
        website: 'https://vitalmobility.ca',
        user_contact_identity: { replyEmail: 'zakaria@contactreachout.com' },
      },
      { subject: 'Partnership Inquiry', body: longBody },
      {}
    );
    expect(result.status).toBe('FIELD_MAPPING_REQUIRED');
    expect(result.unmappedRequiredCount).toBe(2);
    const select = result.mappedFields.find((a) => a.fieldLabel === "I'm looking to");
    expect(select.valueToFill).toBe('Other');
  });

  it('a matching lead value still beats the Other default', () => {
    const fields = [
      field({ selector: '#email', htmlType: 'email', label: 'Email', normalizedType: 'email', isRequired: true }),
      field({ selector: '#message', tag: 'textarea', htmlType: 'textarea', label: 'Message', normalizedType: 'message' }),
      field({
        selector: '#country',
        tag: 'select',
        htmlType: 'select',
        label: 'Country',
        normalizedType: 'country',
        confidence: 0.9,
        isRequired: true,
        options: ['USA', 'Canada', 'Other'],
      }),
    ];
    const result = mapLeadToFormFields(
      fields,
      { email: 'a@example.com', country: 'Canada', user_contact_identity: { replyEmail: 'zakaria@contactreachout.com', country: 'Canada' } },
      { subject: 'Hi', body: longBody },
      {}
    );
    expect(result.status).toBe('READY_FOR_SUBMISSION');
    expect(result.mappedFields.find((a) => a.fieldLabel === 'Country').valueToFill).toBe('Canada');
  });

  it('a select without Other keeps the previous keyword fallback', () => {
    const fields = [
      field({ selector: '#email', htmlType: 'email', label: 'Email', normalizedType: 'email', isRequired: true }),
      field({ selector: '#message', tag: 'textarea', htmlType: 'textarea', label: 'Message', normalizedType: 'message' }),
      field({
        selector: '#looking',
        tag: 'select',
        htmlType: 'select',
        label: "I'm looking to",
        normalizedType: 'select',
        confidence: 0.9,
        isRequired: true,
        options: ['Choose one', 'Service and repairs', 'Shipping question'],
      }),
    ];
    const result = mapLeadToFormFields(fields, { email: 'a@example.com', user_contact_identity: { replyEmail: 'zakaria@contactreachout.com' } }, { subject: 'Hi', body: longBody }, {});
    expect(result.status).toBe('READY_FOR_SUBMISSION');
    expect(result.mappedFields.find((a) => a.fieldLabel === "I'm looking to").valueToFill).toBe('Service and repairs');
  });
});
