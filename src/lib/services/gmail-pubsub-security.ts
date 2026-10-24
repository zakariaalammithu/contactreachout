export type GooglePubSubPushClaims = {
  aud?: string;
  iss?: string;
  email?: string;
  email_verified?: string | boolean;
};

/**
 * Tokeninfo has already verified the token signature when this is called.
 * Keep the authorization decision pure so the route can be tested without
 * contacting Google or reading any credentials.
 */
export function isExpectedGooglePubSubPush(
  claims: GooglePubSubPushClaims,
  expectedAudience: string | undefined,
  expectedServiceAccount: string | undefined,
): boolean {
  const audience = expectedAudience?.trim();
  const serviceAccount = expectedServiceAccount?.trim().toLowerCase();
  if (!audience || !serviceAccount || !/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(serviceAccount)) return false;

  const issuerIsGoogle =
    claims.iss === 'accounts.google.com' ||
    claims.iss === 'https://accounts.google.com';
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';

  return (
    issuerIsGoogle &&
    claims.aud === audience &&
    emailVerified &&
    claims.email?.trim().toLowerCase() === serviceAccount
  );
}
