export interface GoogleIdentityClaims {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string | number;
  nonce?: string;
  sub?: string;
  name?: string;
}

export function validateGoogleIdentityClaims(
  claims: GoogleIdentityClaims,
  expectedClientId: string,
  expectedNonce: string
): { email: string; name: string; sub: string } {
  if (!claims || claims.aud !== expectedClientId) throw new Error('Google identity token audience is invalid.');
  if (claims.email_verified !== true && claims.email_verified !== 'true') {
    throw new Error('Google account email is not verified.');
  }
  if (!claims.nonce || claims.nonce !== expectedNonce) throw new Error('Google identity token nonce is invalid.');
  const expiresAt = Number(claims.exp || 0) * 1000;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('Google identity token has expired.');
  const email = String(claims.email || '').toLowerCase().trim();
  const sub = String(claims.sub || '').trim();
  if (!email.includes('@') || !sub) throw new Error('Google identity token is missing required identity claims.');
  return { email, sub, name: String(claims.name || email.split('@')[0]).trim() };
}
