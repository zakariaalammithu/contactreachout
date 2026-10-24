import 'server-only';

import crypto from 'node:crypto';
import { SecretManager } from '@/lib/security/secret-manager';
import type { PersistenceContext } from '@/lib/persistence/identity';
import { saveConnectedMailbox } from '@/lib/persistence/gmail-mailbox-repository';
import { resolveGmailRedirectUri } from './gmail-mailbox-protocol';
export { safeStateMatches } from './gmail-mailbox-protocol';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
] as const;

/** Boolean-only status for UI/API diagnostics; credentials never leave server code. */
export function gmailOAuthConfiguration() {
  const clientId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = SecretManager.getSecret('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
  return { configured: Boolean(clientId && clientSecret && clientId.endsWith('.apps.googleusercontent.com')) };
}

export function gmailRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto === 'https' ? 'https:' : url.protocol;
  const fallback = `${protocol}//${request.headers.get('host') || url.host}/api/gmail/mailboxes/callback`;
  return resolveGmailRedirectUri(process.env.GMAIL_OAUTH_REDIRECT_URI, fallback, process.env.NODE_ENV === 'production');
}

export function createMailboxOauthState(context: PersistenceContext): string {
  return `${context.appUserId}.${crypto.randomBytes(24).toString('base64url')}`;
}

export function gmailAuthorizeUrl(request: Request, state: string): string {
  const clientId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
  if (!gmailOAuthConfiguration().configured || !clientId) {
    throw new Error('Google OAuth is not configured for Gmail mailbox connection.');
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', gmailRedirectUri(request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GMAIL_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent select_account');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeAndStoreGmailMailbox(request: Request, context: PersistenceContext, code: string) {
  const clientId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = SecretManager.getSecret('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured for Gmail mailbox connection.');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: gmailRedirectUri(request), grant_type: 'authorization_code' }),
  });
  if (!tokenResponse.ok) throw new Error('Google did not accept the mailbox authorization code.');
  const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; scope?: string };
  if (!token.access_token || !token.refresh_token) {
    throw new Error('Google did not provide offline mailbox access. Reconnect and grant access again.');
  }

  const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) throw new Error('Google could not verify the selected Gmail mailbox.');
  const profile = await profileResponse.json() as { emailAddress?: string; historyId?: string };
  const emailNormalized = String(profile.emailAddress || '').toLowerCase().trim();
  if (!emailNormalized || !emailNormalized.includes('@')) throw new Error('Google did not return a valid Gmail mailbox address.');

  const encrypted = SecretManager.encrypt(token.refresh_token);
  return saveConnectedMailbox(context, {
    emailNormalized,
    encryptedRefreshToken: encrypted.encryptedValue,
    refreshTokenIv: encrypted.iv,
    refreshTokenAuthTag: encrypted.authTag,
    grantedScopes: (token.scope || GMAIL_SCOPES.join(' ')).split(/\s+/).filter(Boolean),
    gmailHistoryId: profile.historyId || null,
  });
}
