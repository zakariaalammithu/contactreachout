import 'server-only';

import { SecretManager } from '@/lib/security/secret-manager';
import { getConnectedMailboxForSync, updateMailboxSyncState } from '@/lib/persistence/gmail-mailbox-repository';
import { ingestGmailMessage } from '@/lib/persistence/gmail-sync-repository';
import { parseGmailMessage } from './gmail-message-parser';

type GmailList = { messages?: Array<{ id?: string }>; historyId?: string; history?: Array<{ messagesAdded?: Array<{ message?: { id?: string } }> }> };

async function accessToken(mailbox: { encrypted_refresh_token: string; refresh_token_iv: string; refresh_token_auth_tag: string }) {
  const refreshToken = SecretManager.decrypt(mailbox.encrypted_refresh_token, mailbox.refresh_token_iv, mailbox.refresh_token_auth_tag);
  const clientId = SecretManager.getSecret('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = SecretManager.getSecret('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GMAIL_NOT_CONFIGURED');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  if (!response.ok) throw new Error(response.status === 400 || response.status === 401 ? 'GMAIL_REAUTH_REQUIRED' : 'GMAIL_TOKEN_REFRESH_FAILED');
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error('GMAIL_TOKEN_REFRESH_FAILED');
  return body.access_token;
}

async function gmailJson<T>(token: string, path: string): Promise<{ status: number; data: T | null }> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: await response.json() as T };
}

/**
 * Synchronizes only server-verified Gmail mailbox changes. A History API 404
 * means the cursor expired: reconciliation fetches the newest inbox messages
 * and records a fresh cursor; unique provider IDs prevent duplicate unread rows.
 */
export async function synchronizeGmailMailbox(mailboxId: string): Promise<{ imported: number; duplicates: number; cursorRecovered: boolean }> {
  const mailbox = await getConnectedMailboxForSync(mailboxId);
  if (!mailbox) throw new Error('MAILBOX_NOT_AVAILABLE');
  let token: string;
  try { token = await accessToken(mailbox); } catch (error) {
    await updateMailboxSyncState(mailboxId, { status: 'REAUTH_REQUIRED', errorCode: error instanceof Error ? error.message : 'TOKEN_ERROR' });
    throw error;
  }
  const cursor = mailbox.gmail_history_id;
  let ids: string[] = [];
  let nextCursor: string | undefined;
  let cursorRecovered = false;
  if (cursor) {
    const history = await gmailJson<GmailList>(token, `history?startHistoryId=${encodeURIComponent(cursor)}&historyTypes=messageAdded`);
    if (history.status === 404) {
      cursorRecovered = true;
    } else if (!history.data) {
      throw new Error(history.status === 401 || history.status === 403 ? 'GMAIL_REAUTH_REQUIRED' : 'GMAIL_HISTORY_FAILED');
    } else {
      nextCursor = history.data.historyId;
      ids = (history.data.history || []).flatMap((entry) => entry.messagesAdded || []).map((entry) => entry.message?.id || '').filter(Boolean);
    }
  }
  if (!cursor || cursorRecovered) {
    const latest = await gmailJson<GmailList>(token, 'messages?labelIds=INBOX&maxResults=100');
    if (!latest.data) throw new Error(latest.status === 401 || latest.status === 403 ? 'GMAIL_REAUTH_REQUIRED' : 'GMAIL_RECONCILIATION_FAILED');
    ids = (latest.data.messages || []).map((message) => message.id || '').filter(Boolean);
    const profile = await gmailJson<{ historyId?: string }>(token, 'profile');
    nextCursor = profile.data?.historyId;
  }
  let imported = 0;
  let duplicates = 0;
  for (const id of [...new Set(ids)]) {
    const message = await gmailJson<any>(token, `messages/${encodeURIComponent(id)}?format=full`);
    if (!message.data) continue;
    const parsed = parseGmailMessage(message.data);
    if (!parsed || !parsed.text || parsed.from.toLowerCase().includes(mailbox.email_normalized)) continue;
    const outcome = await ingestGmailMessage({ organizationId: mailbox.organization_id, ownerAppUserId: mailbox.owner_app_user_id, mailboxId, message: parsed });
    if (outcome === 'IMPORTED') imported += 1; else duplicates += 1;
  }
  await updateMailboxSyncState(mailboxId, { historyId: nextCursor || cursor || undefined, errorCode: null });
  return { imported, duplicates, cursorRecovered };
}

export async function registerGmailWatch(mailboxId: string): Promise<{ expirationAt: string }> {
  const mailbox = await getConnectedMailboxForSync(mailboxId);
  if (!mailbox) throw new Error('MAILBOX_NOT_AVAILABLE');
  const topicName = process.env.GOOGLE_GMAIL_PUBSUB_TOPIC;
  if (!topicName) throw new Error('GMAIL_PUBSUB_NOT_CONFIGURED');
  const token = await accessToken(mailbox);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ topicName, labelIds: ['INBOX'], labelFilterBehavior: 'INCLUDE' }) });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'GMAIL_REAUTH_REQUIRED' : 'GMAIL_WATCH_FAILED');
  const body = await response.json() as { historyId?: string; expiration?: string };
  if (!body.historyId || !body.expiration) throw new Error('GMAIL_WATCH_FAILED');
  const expirationAt = new Date(Number(body.expiration)).toISOString();
  await updateMailboxSyncState(mailboxId, { historyId: body.historyId, watchExpirationAt: expirationAt, errorCode: null });
  return { expirationAt };
}
