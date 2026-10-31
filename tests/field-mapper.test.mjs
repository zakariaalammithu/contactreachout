import { describe, expect, it } from 'vitest';
import { mapLeadToFormFields } from '@/lib/services/field-mapper';

const lead = {
  first_name: 'Test',
  last_name: 'User',
  company_name: 'TestCo',
  website: 'https://testco.example',
  email: 'test@testco.example',
};

function subjectField(options) {
  return {
    selector: '#subject',
    name: 'subject',
    id: 'subject',
    label: 'Subject',
    tag: 'select',
    htmlType: 'select-one',
    normalizedType: 'subject',
    confidence: 0.9,
    isRequired: true,
    isHoneypot: false,
    options,
  };
}

function subjectValue(result) {
  const assignment = result.mappedFields.find((a) => a.normalizedType === 'subject');
  return assignment ? assignment.valueToFill : undefined;
}

describe('subject dropdown mapping', () => {
  it('keeps the campaign subject verbatim for a plain text subject field', () => {
    const result = mapLeadToFormFields(
      [{ ...subjectField(undefined), tag: 'input', htmlType: 'text', options: undefined }],
      lead,
      { subject: 'hello TestCo team', body: 'Hello' }
    );
    expect(subjectValue(result)).toBe('hello TestCo team');
  });

  it('selects the exact matching option when the campaign subject is one of the site options', () => {
    const result = mapLeadToFormFields(
      [subjectField(['General Inquiry', 'Hospital Website', 'Support'])],
      lead,
      { subject: 'Hospital Website', body: 'Hello' }
    );
    expect(subjectValue(result)).toBe('Hospital Website');
  });

  it('selects a valid site option when the campaign subject matches none (b2bgdc case)', () => {
    // The campaign subject "hello B2BGDC team" is not an option; the
    // old code sent it raw, selectOption failed silently, and a
    // required subject was left on its placeholder. The fix must pick
    // a real option from the site instead.
    const result = mapLeadToFormFields(
      [subjectField(['-- Select Subject --', 'Hospital Website', 'E-commerce Website'])],
      lead,
      { subject: 'hello B2BGDC team', body: 'Hello' }
    );
    const value = subjectValue(result);
    expect(value).not.toBe('hello B2BGDC team');
    expect(value).not.toBe('-- Select Subject --');
    expect(['Hospital Website', 'E-commerce Website']).toContain(value);
  });

  it('skips placeholders even when no option matches the campaign subject', () => {
    const result = mapLeadToFormFields(
      [subjectField(['Select a subject', 'Choose...', 'General Inquiry'])],
      lead,
      { subject: 'Something Entirely Different', body: 'Hello' }
    );
    expect(subjectValue(result)).toBe('General Inquiry');
  });
});
