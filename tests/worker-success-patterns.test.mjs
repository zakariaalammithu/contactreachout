import { describe, expect, it } from 'vitest';
import { successPattern, visibleSuccessPattern, jsonIndicatesSuccess } from '../browser-worker/success-patterns.mjs';

// Regression: Wix forms answer a delivered submission with
// "Thanks for submitting!" — the old patterns missed it, so a delivered
// Wix message was reported FAILED (SUCCESS_VERIFICATION_FAILED).
describe('worker success patterns', () => {
  it('matches the Wix success wording in both patterns', () => {
    expect('Thanks for submitting!').toMatch(successPattern);
    expect('Thanks for submitting!').toMatch(visibleSuccessPattern);
  });

  it('still matches the established success wordings', () => {
    expect('Thank you for your message. It has been sent.').toMatch(successPattern);
    expect('Your message has been sent.').toMatch(successPattern);
    expect('Your submission has been received.').toMatch(successPattern);
    expect('Submission received').toMatch(visibleSuccessPattern);
    expect("Thanks for reaching out — we'll be in touch.").toMatch(visibleSuccessPattern);
    expect('Form submitted successfully.').toMatch(successPattern);
  });

  it('does not match pre-submit or failure text', () => {
    expect('Please fill all fields').not.toMatch(successPattern);
    expect('Please fill all fields').not.toMatch(visibleSuccessPattern);
    expect('Submit your inquiry below').not.toMatch(successPattern);
    expect('Submit your inquiry below').not.toMatch(visibleSuccessPattern);
    expect('There was an error trying to send your message.').not.toMatch(successPattern);
    expect('Thanks for visiting our site').not.toMatch(successPattern);
    expect('Thanks for visiting our site').not.toMatch(visibleSuccessPattern);
  });

  it('accepts explicit JSON acceptance, including Wix-style status', () => {
    expect(jsonIndicatesSuccess({ success: true })).toBe(true);
    expect(jsonIndicatesSuccess({ status: 'success' })).toBe(true);
    expect(jsonIndicatesSuccess({ status: 'spam' })).toBe(false);
    expect(jsonIndicatesSuccess({ status: 'validation_failed' })).toBe(false);
    expect(jsonIndicatesSuccess({ status: 'mail_sent' })).toBe(false);
    expect(jsonIndicatesSuccess({})).toBe(false);
    expect(jsonIndicatesSuccess(null)).toBe(false);
    expect(jsonIndicatesSuccess('success')).toBe(false);
  });
});
