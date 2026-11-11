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

  it('matches non-English success wordings (Spanish, French, German, Portuguese)', () => {
    expect('¡Gracias por tu mensaje!').toMatch(successPattern);
    expect('¡Gracias por tu mensaje!').toMatch(visibleSuccessPattern);
    expect('Mensaje enviado correctamente.').toMatch(successPattern);
    expect('Merci pour votre message !').toMatch(successPattern);
    expect('Merci pour votre message !').toMatch(visibleSuccessPattern);
    expect('Votre message a bien été envoyé.').toMatch(successPattern);
    expect('Vielen Dank für Ihre Nachricht.').toMatch(successPattern);
    expect('Vielen Dank für Ihre Nachricht.').toMatch(visibleSuccessPattern);
    expect('Ihre Nachricht wurde gesendet.').toMatch(successPattern);
    expect('Obrigado pela sua mensagem!').toMatch(successPattern);
    expect('Obrigado pela sua mensagem!').toMatch(visibleSuccessPattern);
    expect('Mensagem enviada com sucesso.').toMatch(successPattern);
  });

  it('does not match a bare thank-you word in any language', () => {
    expect('gracias').not.toMatch(successPattern);
    expect('merci').not.toMatch(successPattern);
    expect('danke').not.toMatch(successPattern);
    expect('obrigado').not.toMatch(successPattern);
    expect('gracias').not.toMatch(visibleSuccessPattern);
    expect('merci').not.toMatch(visibleSuccessPattern);
  });

  it('documents the broad thank-you match the POST gate exists for', () => {
    // Bare "thank you" DOES match the page-content pattern — it also
    // appears in static page copy ("Thank you for visiting our site").
    // That is why server.mjs only counts page-text / visible-text
    // evidence after a form POST actually left the browser: the pattern
    // alone must never verify a submission that never happened.
    expect('Thank you for visiting our site').toMatch(successPattern);
    expect("Fill the form and we'll be in touch").toMatch(visibleSuccessPattern);
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
