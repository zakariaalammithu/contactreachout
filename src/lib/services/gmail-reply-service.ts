import 'server-only';

import { SecretManager } from '@/lib/security/secret-manager';
import type { PersistenceContext } from '@/lib/persistence/identity';
import { getConnectedMailboxForOwner, recordMailboxConnectionIssue } from '@/lib/persistence/gmail-mailbox-repository';
import { buildGmailReplyMime } from './gmail-mailbox-protocol';
export { buildGmailReplyMime } from './gmail-mailbox-protocol';

async function refreshAccessToken(refreshToken: string) {
  const clientId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = SecretManager.getSecret('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GMAIL_NOT_CONFIGURED');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!response.ok) return null;
  const token = await response.json() as { access_token?: string };
  return token.access_token || null;
}

export async function sendGmailReply(context: PersistenceContext, input: { mailboxId: string; to: string; subject: string; text: string; threadId?: string; inReplyTo?: string; references?: string }) {
  const mailbox = await getConnectedMailboxForOwner(context, input.mailboxId);
  if (!mailbox || mailbox.connection_status !== 'ACTIVE') throw new Error('MAILBOX_NOT_AVAILABLE');
  let refreshToken: string;
  try {
    refreshToken = SecretManager.decrypt(mailbox.encrypted_refresh_token, mailbox.refresh_token_iv, mailbox.refresh_token_auth_tag);
  } catch {
    await recordMailboxConnectionIssue(context, mailbox.id, 'REAUTH_REQUIRED', 'TOKEN_DECRYPT_FAILED');
    throw new Error('MAILBOX_REAUTH_REQUIRED');
  }
  const accessToken = await refreshAccessToken(refreshToken);
  if (!accessToken) {
    await recordMailboxConnectionIssue(context, mailbox.id, 'REAUTH_REQUIRED', 'TOKEN_REFRESH_FAILED');
    throw new Error('MAILBOX_REAUTH_REQUIRED');
  }
  const raw = Buffer.from(buildGmailReplyMime({ from: mailbox.email_normalized, to: input.to, subject: input.subject, text: input.text, inReplyTo: input.inReplyTo, references: input.references }), 'utf8').toString('base64url');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw, ...(input.threadId ? { threadId: input.threadId } : {}) }),
  });
  if (!response.ok) {
    await recordMailboxConnectionIssue(context, mailbox.id, response.status === 401 || response.status === 403 ? 'REAUTH_REQUIRED' : 'ERROR', `SEND_HTTP_${response.status}`);
    throw new Error(response.status === 401 || response.status === 403 ? 'MAILBOX_REAUTH_REQUIRED' : 'GMAIL_SEND_FAILED');
  }
  const result = await response.json() as { id?: string; threadId?: string };
  if (!result.id) throw new Error('GMAIL_SEND_FAILED');
  return { messageId: result.id, threadId: result.threadId || input.threadId || null, mailboxEmail: mailbox.email_normalized };
}
