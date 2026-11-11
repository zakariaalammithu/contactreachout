// Success-verification signals for the browser worker (2026-11-11).
// Shared by server.mjs and the unit tests so the patterns are verified
// without launching a browser.
//
// Why these phrases: Wix forms answer a delivered submission with
// "Thanks for submitting!" — which the old patterns missed ("thank you"
// needs the word "you"; the visible pattern only knew "thanks for
// reaching out / contacting / getting in touch"). A delivered Wix
// message was therefore reported FAILED (SUCCESS_VERIFICATION_FAILED)
// even though the site had accepted it. The phrases below only appear
// in a post-submit success state — never in a form's labels or
// instructions — so they cannot verify a submission that never happened.
// Bare "thanks" stays excluded on purpose (it appears in ordinary page
// text); the app-side SUCCESS_SIGNATURES keeps its own broader list.

// Matched against submission-response bodies and full page content.
export const successPattern =
  /thank\s*you|thanks for submitting|message\s*(has been )?(sent|received|submitted)|submission\s*(has been )?(received|sent|submitted|successful)|inquiry\s*submitted|successfully\s*(sent|submitted)|(sent|submitted)\s*successfully/i;

// Matched against visible text only (innerText, never page HTML), so a
// matching string inside a <script> cannot verify a submission.
export const visibleSuccessPattern =
  /thanks for (reaching out|contacting|getting in touch|submitting)|we('ll| will) be in touch|submission received|inquiry received|request received|successfully received|we have received your message|thank you for contacting us/i;

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
