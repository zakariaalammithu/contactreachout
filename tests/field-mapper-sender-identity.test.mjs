import { describe, expect, it } from 'vitest';
import { mapLeadToFormFields } from '@/lib/services/field-mapper';

// A contact form's identity fields ask about the SENDER, so they must
// fill from the account identity — never from the prospect lead. The
// lead's values belong only in the message (subject/body), where they
// address the prospect.
const prospectLead = {
  first_name: 'Priya',
  last_name: 'Sharma',
  company_name: 'Handy Ltd',
  website: 'https://handy.uy',
  email: 'info@handy.uy',
  phone: '+59810000000',
  job_title: 'Owner',
  country: 'Uruguay',
  user_contact_identity: {
    fullName: 'Zakaria Alam Mithu',
    replyEmail: 'mithusquare@gmail.com',
    phone: '+8801700000000',
    whatsApp: '+8801800000000',
    companyName: 'ContactReachout',
    website: 'https://contactreachout.com',
    jobTitle: 'Founder',
    country: 'United Kingdom',
  },
};

const message = {
  subject: 'Partnership Inquiry',
  body: 'Hello Priya, reaching out to Handy Ltd regarding a potential partnership. We build modern websites.',
};

function field(normalizedType, extra = {}) {
  return {
    selector: `#${normalizedType}`,
    name: normalizedType,
    id: normalizedType,
    label: normalizedType,
    tag: 'input',
    htmlType: 'text',
    normalizedType,
    confidence: 0.9,
    isRequired: false,
    isHoneypot: false,
    ...extra,
  };
}

function valueFor(result, normalizedType) {
  const a = result.mappedFields.find((x) => x.normalizedType === normalizedType);
  return a ? a.valueToFill : undefined;
}

describe('sender identity fills form identity fields', () => {
  it('fills name, email, phone, company and website from the sender identity, not the lead', () => {
    const result = mapLeadToFormFields(
      [
        ...['first_name', 'last_name', 'full_name', 'email', 'phone', 'whatsApp', 'company', 'website'].map((t) => field(t)),
        field('message', { tag: 'textarea', htmlType: 'textarea' }),
      ],
      prospectLead,
      message,
    );
    expect(valueFor(result, 'first_name')).toBe('Zakaria');
    expect(valueFor(result, 'last_name')).toBe('Alam Mithu');
    expect(valueFor(result, 'full_name')).toBe('Zakaria Alam Mithu');
    expect(valueFor(result, 'email')).toBe('mithusquare@gmail.com');
    expect(valueFor(result, 'phone')).toBe('+8801700000000');
    expect(valueFor(result, 'whatsApp')).toBe('+8801800000000');
    expect(valueFor(result, 'company')).toBe('ContactReachout');
    expect(valueFor(result, 'website')).toBe('https://contactreachout.com');
    expect(result.status).toBe('READY_FOR_SUBMISSION');
  });

  it('fills an unclassified name field from the sender identity', () => {
    const result = mapLeadToFormFields(
      [field('name', { label: 'Your Name' })],
      prospectLead,
      message,
    );
    expect(valueFor(result, 'name')).toBe('Zakaria Alam Mithu');
  });

  it('leaves the company field blank when the sender has no company (never the prospect name)', () => {
    const noCompanyLead = {
      ...prospectLead,
      user_contact_identity: { ...prospectLead.user_contact_identity, companyName: '' },
    };
    const result = mapLeadToFormFields(
      [
        field('email'),
        field('message', { tag: 'textarea', htmlType: 'textarea' }),
        field('company', { isRequired: true }),
      ],
      noCompanyLead,
      message,
    );
    expect(valueFor(result, 'company')).toBe('');
    expect(result.status).toBe('FIELD_MAPPING_REQUIRED');
    expect(result.unmappedRequiredCount).toBe(1);
  });

  it('leaves identity fields blank when there is no sender identity at all', () => {
    const anonymousLead = {
      first_name: 'Priya',
      company_name: 'Handy Ltd',
      website: 'https://handy.uy',
      email: 'info@handy.uy',
    };
    const result = mapLeadToFormFields(
      [field('company'), field('website'), field('email')],
      anonymousLead,
      message,
    );
    expect(valueFor(result, 'company')).toBe('');
    expect(valueFor(result, 'website')).toBe('');
    expect(valueFor(result, 'email')).toBe('');
  });

  it('still puts the prospect values into the message body, not the sender values', () => {
    const result = mapLeadToFormFields(
      [field('message', { tag: 'textarea', htmlType: 'textarea' })],
      prospectLead,
      message,
    );
    expect(valueFor(result, 'message')).toContain('Priya');
    expect(valueFor(result, 'message')).toContain('Handy Ltd');
  });

  it('fills job title and country from the sender identity, not the lead', () => {
    const countryField = {
      selector: '#country',
      name: 'country',
      id: 'country',
      label: 'Country',
      tag: 'select',
      htmlType: 'select-one',
      normalizedType: 'country',
      confidence: 0.9,
      isRequired: false,
      isHoneypot: false,
      options: ['USA', 'United Kingdom', 'Other'],
    };
    const result = mapLeadToFormFields(
      [field('job_title'), countryField],
      prospectLead,
      message,
    );
    expect(valueFor(result, 'job_title')).toBe('Founder');
    expect(valueFor(result, 'country')).toBe('United Kingdom');
  });

  it('picks Other for a generic select even when the lead carries a country', () => {
    const lookingField = {
      selector: '#looking',
      name: 'looking',
      id: 'looking',
      label: "I'm looking to",
      tag: 'select',
      htmlType: 'select-one',
      normalizedType: 'select',
      confidence: 0.9,
      isRequired: true,
      isHoneypot: false,
      options: ['Choose one', 'Get a quote to buy', 'Service and repairs', 'Other'],
    };
    const result = mapLeadToFormFields(
      [field('email'), field('message', { tag: 'textarea', htmlType: 'textarea' }), lookingField],
      prospectLead,
      message,
    );
    expect(valueFor(result, 'select')).toBe('Other');
    expect(result.status).toBe('READY_FOR_SUBMISSION');
  });

  it('fills a Country select from the sender country, beating Other', () => {
    const countryField = {
      selector: '#country',
      name: 'country',
      id: 'country',
      label: 'Country',
      tag: 'select',
      htmlType: 'select-one',
      normalizedType: 'country',
      confidence: 0.9,
      isRequired: true,
      isHoneypot: false,
      options: ['USA', 'United Kingdom', 'Other'],
    };
    const result = mapLeadToFormFields(
      [field('email'), field('message', { tag: 'textarea', htmlType: 'textarea' }), countryField],
      prospectLead,
      message,
    );
    expect(valueFor(result, 'country')).toBe('United Kingdom');
  });

  it('checks only the first radio in a group', () => {
    const radio = (id) => ({
      selector: `#${id}`,
      name: 'reason',
      id,
      label: id,
      tag: 'input',
      htmlType: 'radio',
      normalizedType: 'radio',
      confidence: 0.9,
      isRequired: true,
      isHoneypot: false,
    });
    const result = mapLeadToFormFields(
      [field('email'), field('message', { tag: 'textarea', htmlType: 'textarea' }), radio('reason-a'), radio('reason-b')],
      prospectLead,
      message,
    );
    const radios = result.mappedFields.filter((a) => a.normalizedType === 'radio');
    expect(radios).toHaveLength(2);
    expect(radios[0].valueToFill).toBe('true');
    expect(radios[1].valueToFill).toBe('');
    expect(result.status).toBe('READY_FOR_SUBMISSION');
    expect(result.unmappedRequiredCount).toBe(0);
  });
});
