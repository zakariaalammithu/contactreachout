// Success-verification signals for the browser worker (2026-11-11).
// Shared by server.mjs and the unit tests so the patterns are verified
// without launching a browser.
//
// Why these phrases: Wix forms answer a delivered submission with
// "Thanks for submitting!" — which the old patterns missed ("thank you"
// needs the word "you"; the visible pattern only knew "thanks for
// reaching out / contacting / getting in touch"). A delivered Wix
// message was therefore reported FAILED (SUCCESS_VERIFICATION_FAILED)
// even though the site had accepted it.
//
// HONESTY LIMIT (2026-11-11): two of these phrases ALSO appear in
// static page copy — bare "thank you" (footers, testimonials) and
// "we'll be in touch" (contact-page intros). The worker's
// checkVerification therefore only counts page-text / visible-text
// evidence AFTER a form POST actually left the browser
// (submissionRequests.length > 0); a click that died in validation
// must never verify from static text. Bare "thanks" stays excluded on
// purpose (it appears in ordinary page text), and bare "gracias" /
// "merci" / "danke" / "obrigado" are excluded for the same reason —
// only full post-submit phrases count.
//
// Non-English phrases (2026-11-11): the patterns were English-only, so
// a genuine delivery to a Spanish / French / German / Portuguese form
// reported FAILED. Only full phrases are listed, never the bare
// thank-you word, for the same static-text reason as above.

// Matched against submission-response bodies and full page content.
export const successPattern =
  /thank\s*you|thanks for submitting|message\s*(has been )?(sent|received|submitted)|submission\s*(has been )?(received|sent|submitted|successful)|inquiry\s*submitted|successfully\s*(sent|submitted)|(sent|submitted)\s*successfully|gracias por (tu|su|el) mensaje|mensaje\s*(ha sido )?(enviado|recibido|enviada|recibida)|gracias por contactarnos|merci (pour votre message|de nous avoir contact\w*)|votre message (a bien été )?(envoyé|reçu)|message\s*(a bien été )?(envoyé|reçu)|vielen dank für (ihre|deine) nachricht|ihre nachricht wurde (gesendet|empfangen)|danke für (ihre|deine) nachricht|obrigado (pela sua mensagem|pelo seu contato)|mensagem\s*(enviada|recebida)/i;

// Matched against visible text only (innerText, never page HTML), so a
// matching string inside a <script> cannot verify a submission.
export const visibleSuccessPattern =
  /thanks for (reaching out|contacting|getting in touch|submitting)|we('ll| will) be in touch|submission received|inquiry received|request received|successfully received|we have received your message|thank you for contacting us|gracias por (tu|su|el) mensaje|mensaje\s*(ha sido )?(enviado|recibido)|merci (pour votre message|de nous avoir contact\w*)|votre message (a bien été )?(envoyé|reçu)|vielen dank für (ihre|deine) nachricht|ihre nachricht wurde (gesendet|empfangen)|obrigado (pela sua mensagem|pelo seu contato)|mensagem\s*(enviada|recebida)/i;

// A form POST's JSON body counts as acceptance when the backend says so
// explicitly. Wix-style backends answer { status: 'success' } instead of
// { success: true }; anything else (e.g. Contact Form 7's
// { status: 'spam' } / { status: 'validation_failed' }) is not success —
// CF7's real success is { status: 'mail_sent' } plus its "Thank you for
// your message. It has been sent." text, which the patterns above catch.
export function jsonIndicatesSuccess(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  return parsed.success === true || parsed.status === 'success';
}
