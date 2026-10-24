import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import type { PersistenceContext } from './identity';

export type ConnectedMailbox = {
  id: string;
  email_normalized: string;
  provider: 'gmail';
  connection_status: 'ACTIVE' | 'REAUTH_REQUIRED' | 'REVOKED' | 'DISCONNECTED' | 'ERROR';
  granted_scopes: string[];
  watch_expiration_at: string | null;
  last_synced_at: string | null;
  last_error_code: string | null;
  created_at: string;
};

type StoredMailbox = ConnectedMailbox & {
  organization_id: string;
  owner_app_user_id: string;
  encrypted_refresh_token: string;
  refresh_token_iv: string;
  refresh_token_auth_tag: string;
  gmail_history_id: string | null;
};

function clientOrThrow() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error('Durable mailbox storage is not configured.');
  return client;
}

export async function listConnectedMailboxes(context: PersistenceContext): Promise<ConnectedMailbox[]> {
  const result = await clientOrThrow()
    .from('app_connected_mailboxes')
    .select('id, email_normalized, provider, connection_status, granted_scopes, watch_expiration_at, last_synced_at, last_error_code, created_at')
    .eq('organization_id', context.organizationId)
    .eq('owner_app_user_id', context.appUserId)
    .neq('connection_status', 'DISCONNECTED')
    .order('created_at', { ascending: false });
  if (result.error) throw new Error('Could not list connected mailboxes.');
  return (result.data || []) as ConnectedMailbox[];
}

export async function getConnectedMailboxForOwner(context: PersistenceContext, mailboxId: string): Promise<StoredMailbox | null> {
  const result = await clientOrThrow()
    .from('app_connected_mailboxes')
    .select('*')
    .eq('id', mailboxId)
    .eq('organization_id', context.organizationId)
    .eq('owner_app_user_id', context.appUserId)
    .neq('connection_status', 'DISCONNECTED')
    .maybeSingle();
  if (result.error) throw new Error('Could not resolve the connected mailbox.');
  return result.data as StoredMailbox | null;
}

/** Used only by the server-side Gmail notification worker after it has mapped
 * a provider notification to a persisted mailbox id. */
export async function getConnectedMailboxForSync(mailboxId: string): Promise<StoredMailbox | null> {
  const result = await clientOrThrow().from('app_connected_mailboxes').select('*').eq('id', mailboxId).eq('connection_status', 'ACTIVE').maybeSingle();
  if (result.error) throw new Error('Could not resolve the connected mailbox.');
  return result.data as StoredMailbox | null;
}

export async function findConnectedMailboxByEmail(email: string): Promise<StoredMailbox | null> {
  const result = await clientOrThrow().from('app_connected_mailboxes').select('*').eq('email_normalized', email.toLowerCase().trim()).eq('connection_status', 'ACTIVE').maybeSingle();
  if (result.error) throw new Error('Could not resolve the connected mailbox.');
  return result.data as StoredMailbox | null;
}

export async function updateMailboxSyncState(mailboxId: string, input: { historyId?: string; watchExpirationAt?: string; errorCode?: string | null; status?: 'ACTIVE' | 'REAUTH_REQUIRED' | 'REVOKED' | 'ERROR' }) {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.historyId !== undefined) updates.gmail_history_id = input.historyId;
  if (input.watchExpirationAt !== undefined) updates.watch_expiration_at = input.watchExpirationAt;
  if (input.errorCode !== undefined) { updates.last_error_code = input.errorCode; updates.last_error_at = input.errorCode ? new Date().toISOString() : null; }
  if (input.status) updates.connection_status = input.status;
  if (!input.errorCode && input.historyId !== undefined) updates.last_synced_at = new Date().toISOString();
  const result = await clientOrThrow().from('app_connected_mailboxes').update(updates).eq('id', mailboxId);
  if (result.error) throw new Error('Could not update mailbox sync state.');
}

export async function saveConnectedMailbox(context: PersistenceContext, input: {
  emailNormalized: string;
  encryptedRefreshToken: string;
  refreshTokenIv: string;
  refreshTokenAuthTag: string;
  grantedScopes: string[];
  gmailHistoryId?: string | null;
}): Promise<ConnectedMailbox> {
  // The approved mailbox model is one organization per normalized Gmail
  // address. The global unique index is introduced by the Unified Inbox
  // migration; this explicit check gives callers a deterministic, safe error
  // before that migration is applied and never reassigns an existing mailbox.
  const existing = await clientOrThrow()
    .from('app_connected_mailboxes')
    .select('id, organization_id')
    .eq('email_normalized', input.emailNormalized)
    .maybeSingle();
  if (existing.error) throw new Error('Could not verify Gmail mailbox ownership.');
  if (existing.data && existing.data.organization_id !== context.organizationId) {
    throw new Error('MAILBOX_OWNED_BY_ANOTHER_ORGANIZATION');
  }

  const result = await clientOrThrow()
    .from('app_connected_mailboxes')
    .upsert({
      organization_id: context.organizationId,
      owner_app_user_id: context.appUserId,
      provider: 'gmail',
      email_normalized: input.emailNormalized,
      encrypted_refresh_token: input.encryptedRefreshToken,
      refresh_token_iv: input.refreshTokenIv,
      refresh_token_auth_tag: input.refreshTokenAuthTag,
      granted_scopes: input.grantedScopes,
      gmail_history_id: input.gmailHistoryId || null,
      connection_status: 'ACTIVE',
      disconnected_at: null,
      last_error_code: null,
      last_error_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,email_normalized' })
    .select('id, email_normalized, provider, connection_status, granted_scopes, watch_expiration_at, last_synced_at, last_error_code, created_at')
    .single();
  if (result.error) throw new Error('Could not save the connected mailbox.');
  return result.data as ConnectedMailbox;
}

export async function disconnectMailbox(context: PersistenceContext, mailboxId: string): Promise<boolean> {
  const result = await clientOrThrow()
    .from('app_connected_mailboxes')
    .update({ connection_status: 'DISCONNECTED', disconnected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', mailboxId)
    .eq('organization_id', context.organizationId)
    .eq('owner_app_user_id', context.appUserId)
    .neq('connection_status', 'DISCONNECTED')
    .select('id')
    .maybeSingle();
  if (result.error) throw new Error('Could not disconnect the mailbox.');
  return Boolean(result.data);
}

export async function recordMailboxConnectionIssue(context: PersistenceContext, mailboxId: string, status: 'REAUTH_REQUIRED' | 'REVOKED' | 'ERROR', code: string): Promise<void> {
  const result = await clientOrThrow()
    .from('app_connected_mailboxes')
    .update({ connection_status: status, last_error_code: code, last_error_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', mailboxId)
    .eq('organization_id', context.organizationId)
    .eq('owner_app_user_id', context.appUserId);
  if (result.error) throw new Error('Could not update mailbox connection status.');
}
