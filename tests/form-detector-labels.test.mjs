// GoDaddy-style builder forms (campaign camp-1794465474967, "New Campaign 14",
// righttheredme.com, 12 Nov 2026): inputs carry an id but no name, no
// aria-label and no placeholder — the label lives in a sibling
// `<label for="id">` and in the data-aid hint (CONTACT_FORM_EMAIL etc.).
// The fetch parser must read those, or the email field classifies
// [unknown] and the mapper reports EMAIL_REQUIREMENT_NOT_MET.
import { describe, it, expect } from 'vitest';
import { parseContactFormsFromHtml } from '@/lib/services/form-detector';
import { mapLeadToFormFields } from '@/lib/services/field-mapper';

const identity = {
  fullName: 'Zakaria Alam Mithu',
  replyEmail: 'mithusquare@gmail.com',
  phone: '+15551234567',
  whatsApp: '+15557654321',
  companyName: 'ContactReachout',
  website: 'https://contactreachout.com',
  jobTitle: 'Founder',
  country: 'United Kingdom',
};
const message = {
  subject: 'Partnership Inquiry & Growth Solution',
  body: 'Hello there, I build modern high-quality websites and AI automation systems tailored for businesses to generate more leads and growth. Reaching out regarding a quick partnership inquiry to explore how we can help your business scale operations and generate more opportunities.',
};
const leadFor = (company, website) => ({
  company_name: company,
  website,
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  user_contact_identity: identity,
});

const godaddyForm = `<form data-ux="Form"><input type="text" name="_app_id" tabindex="-1" style="display:none" value=""/><div><div data-ux="InputFloatLabel"><input type="text" id="input16734" data-aid="CONTACT_FORM_NAME"/><label for="input16734">Name</label></div></div><div><div data-ux="InputFloatLabel"><input type="text" id="input16735" data-aid="CONTACT_FORM_EMAIL"/><label for="input16735">Email*</label></div></div><div><textarea aria-label="Message" placeholder="Message" data-aid="CONTACT_FORM_MESSAGE"></textarea></div></form>`;

describe('fetch parser: sibling labels and data-aid hints', () => {
  it('classifies GoDaddy id-only inputs via sibling label + data-aid', () => {
    const parsed = parseContactFormsFromHtml(godaddyForm, 'https://righttheredme.com/contact-us');
    expect(parsed).not.toBeNull();
    const types = parsed.fields.map((f) => f.normalizedType);
    expect(types).toContain('full_name');
    expect(types).toContain('email');
    expect(types).toContain('message');
  });

  it('maps the GoDaddy form READY with the sender identity', () => {
    const parsed = parseContactFormsFromHtml(godaddyForm, 'https://righttheredme.com/contact-us');
    const result = mapLeadToFormFields(parsed.fields, leadFor('Right There DME', 'https://righttheredme.com/contact-us'), message);
    expect(result.status).toBe('READY_FOR_SUBMISSION');
    expect(result.unmappedRequiredCount).toBe(0);
  });

  it('classifies an email input from the sibling label alone (no data-aid)', () => {
    const html = `<form><input type="text" id="e1"/><label for="e1">Email*</label><textarea placeholder="Message"></textarea></form>`;
    const parsed = parseContactFormsFromHtml(html, 'https://example.com/contact');
    expect(parsed.fields.map((f) => f.normalizedType)).toContain('email');
  });

  it('classifies an email input from data-aid alone (no sibling label)', () => {
    const html = `<form><input type="text" id="e2" data-aid="CONTACT_FORM_EMAIL"/><textarea placeholder="Message"></textarea></form>`;
    const parsed = parseContactFormsFromHtml(html, 'https://example.com/contact');
    expect(parsed.fields.map((f) => f.normalizedType)).toContain('email');
  });

  it('leaves an id-only input with no label anywhere as unknown', () => {
    const html = `<form><input type="text" id="x1"/><textarea placeholder="Message"></textarea></form>`;
    const parsed = parseContactFormsFromHtml(html, 'https://example.com/contact');
    expect(parsed.fields.find((f) => f.id === 'x1').normalizedType).toBe('unknown');
  });
});
