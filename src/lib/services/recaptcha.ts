// Google reCAPTCHA v2 ("I'm not a robot") verification for the public
// contact/demo form (POST /api/contact).
//
// Env (both set in Vercel; the site key is public, the secret is server-only):
//   NEXT_PUBLIC_RECAPTCHA_SITE_KEY — rendered by the form widget.
//   RECAPTCHA_SECRET_KEY — server-side verification only, never exposed.
//
// Rollout behaviour is deliberate: when the secret is NOT configured the
// check is skipped (fail open) so the contact form keeps working until the
// owner creates the keys in Google reCAPTCHA admin and adds them to Vercel.
// Once the secret IS set, a missing/invalid token is rejected, and a
// siteverify failure fails closed (a bot must never slip through on an
// error). The secret is read inside the function so tests can set it
// per case; the token value is never logged.
export type RecaptchaVerification =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: 'missing-token' | 'invalid-token' | 'verification-unavailable' };

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export async function verifyRecaptchaToken(
  token: string | undefined | null,
): Promise<RecaptchaVerification> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn('[recaptcha] RECAPTCHA_SECRET_KEY is not configured; CAPTCHA check skipped.');
    return { ok: true, skipped: true };
  }
  if (!token) {
    return { ok: false, reason: 'missing-token' };
  }
  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
  } catch {
    return { ok: false, reason: 'verification-unavailable' };
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, reason: 'verification-unavailable' };
  }
  if (payload && typeof payload === 'object' && (payload as { success?: unknown }).success === true) {
    return { ok: true };
  }
  return { ok: false, reason: 'invalid-token' };
}
