// Field-detection traps found in campaign camp-1794419726809
// ("New Campaign 3-final", 11 Nov 2026): podeo.co REVIEWed on Framer's
// noscript trap input, ssupworld.com REVIEWed on Fluent Forms' masked
// phone input. Both must map READY with the current mapper.
import { describe, it, expect } from 'vitest';
import {
  parseContactFormsFromHtml,
  classifyFetchField,
  classifyFormField,
} from '@/lib/services/form-detector';
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

// Minimal Framer contact form (podeo.co): required name/email/company,
// a "Topic" message textarea, a required consent checkbox, and Framer's
// no-JS trap input with a pattern that can never match.
const FRAMER_HTML = `<form data-framer-form method="post">
  <input type="text" required name="Full name" placeholder="Full name">
  <input type="email" required name="Work email" placeholder="john@website.com">
  <input type="text" required name="Company name" placeholder="Company name">
  <textarea required name="Topic" placeholder="A few sentences is enough."></textarea>
  <input required type="checkbox" name="Consent">
  <input required pattern="(?!)" name="framer-noscript" tabindex="-1" aria-label="Enable JavaScript to submit this form">
</form>`;

// Minimal Fluent Forms contact form (ssupworld.com #fluentform_5):
// Arabic labels, a masked phone input named `input_mask`, a radio
// group that is NOT required, and a required message textarea.
const FLUENT_HTML = `<form id="fluentform_5" method="POST">
  <input type="text" name="names[first_name]" placeholder="Enter Your First Name" aria-required=false>
  <input type="text" name="names[last_name]" placeholder="Enter Your Last Name" aria-required=false>
  <input type="email" name="email" placeholder="Email Address" aria-required=true>
  <input type="text" name="input_mask" id="ff_5_input_mask" aria-required=true>
  <input type="radio" name="input_radio" value="A" aria-required=false>
  <input type="radio" name="input_radio" value="B" aria-required=false>
  <textarea name="description" aria-required="true"></textarea>
</form>`;

describe('form-detector traps', () => {
  it('classifies Fluent Forms input_mask as phone (fetch + runtime)', () => {
    expect(classifyFetchField('input', 'text', 'input_mask', '')).toBe('phone');
    expect(
      classifyFormField({ tag: 'input', htmlType: 'text', name: 'input_mask', label: 'رقم هاتف' }).normalizedType,
    ).toBe('phone');
  });

  it('flags Framer noscript trap as a honeypot (fetch + runtime)', () => {
    expect(
      classifyFormField({ tag: 'input', htmlType: 'text', name: 'framer-noscript', label: 'Enable JavaScript to submit this form' }).isHoneypot,
    ).toBe(true);
    const parsed = parseContactFormsFromHtml(FRAMER_HTML, 'https://podeo.co/contact');
    const trap = parsed.fields.find((f) => f.name === 'framer-noscript');
    expect(trap).toBeDefined();
    expect(trap.isHoneypot).toBe(true);
  });

  it('does not count aria-required=false as required', () => {
    const parsed = parseContactFormsFromHtml(FLUENT_HTML, 'https://ssupworld.com/contact');
    const first = parsed.fields.find((f) => f.name === 'names[first_name]');
    expect(first.isRequired).toBe(false);
    const email = parsed.fields.find((f) => f.name === 'email');
    expect(email.isRequired).toBe(true);
  });

  it('maps the Framer form READY (noscript trap never blocks)', () => {
    const parsed = parseContactFormsFromHtml(FRAMER_HTML, 'https://podeo.co/contact');
    const mapped = mapLeadToFormFields(parsed.fields, leadFor('Podeo', 'https://podeo.co'), message);
    expect(mapped.unmappedRequiredCount).toBe(0);
    expect(mapped.status).toBe('READY_FOR_SUBMISSION');
  });

  it('maps the Fluent Forms form READY (masked phone fills)', () => {
    const parsed = parseContactFormsFromHtml(FLUENT_HTML, 'https://ssupworld.com/contact');
    const phone = parsed.fields.find((f) => f.name === 'input_mask');
    expect(phone.normalizedType).toBe('phone');
    const mapped = mapLeadToFormFields(parsed.fields, leadFor('Ssup World', 'https://ssupworld.com'), message);
    expect(mapped.unmappedRequiredCount).toBe(0);
    expect(mapped.status).toBe('READY_FOR_SUBMISSION');
  });
});
