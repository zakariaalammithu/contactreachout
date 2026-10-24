import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import type { PersistenceContext } from './identity';

type StateAction = 'mark_read' | 'mark_unread' | 'archive' | 'unarchive';
const client = () => { const value = getSupabaseAdminClient(); if (!value) throw new Error('DURABLE_INBOX_UNAVAILABLE'); return value; };

function scope(context: PersistenceContext) { return client().from('app_inbox_conversation_members').select('conversation_id').eq('organization_id', context.organizationId).eq('app_user_id', context.appUserId); }

export async function listInboxConversations(context: PersistenceContext, input: { limit: number; offset: number; archived?: boolean; unread?: boolean; search?: string; mailboxId?: string }) {
  const memberIds = await scope(context);
  if (memberIds.error) throw new Error('INBOX_QUERY_FAILED');
  const ids = (memberIds.data || []).map((row: any) => row.conversation_id);
  if (!ids.length) return { conversations: [], unreadCount: 0 };
  let query: any = client().from('app_inbox_conversations').select('id, connected_mailbox_id, provider_thread_id, subject_preview, latest_message_at, status, app_inbox_conversation_members!inner(is_read,is_archived,app_user_id)', { count: 'exact' }).eq('organization_id', context.organizationId).eq('app_inbox_conversation_members.app_user_id', context.appUserId).in('id', ids).order('latest_message_at', { ascending: false }).range(input.offset, input.offset + input.limit - 1);
  if (input.archived !== undefined) query = query.eq('app_inbox_conversation_members.is_archived', input.archived);
  if (input.unread) query = query.eq('app_inbox_conversation_members.is_read', false);
  if (input.mailboxId) query = query.eq('connected_mailbox_id', input.mailboxId);
  if (input.search) query = query.ilike('subject_preview', `%${input.search.replace(/[%_]/g, '\\$&')}%`);
  const result = await query;
  if (result.error) throw new Error('INBOX_QUERY_FAILED');
  const unread = await client().from('app_inbox_conversation_members').select('conversation_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('app_user_id', context.appUserId).eq('is_archived', false).eq('is_read', false);
  if (unread.error) throw new Error('INBOX_QUERY_FAILED');
  return { conversations: result.data || [], unreadCount: unread.count || 0, total: result.count || 0 };
}

export async function getInboxConversation(context: PersistenceContext, id: string) {
  const membership = await client().from('app_inbox_conversation_members').select('conversation_id,is_read,is_archived').eq('conversation_id', id).eq('organization_id', context.organizationId).eq('app_user_id', context.appUserId).maybeSingle();
  if (membership.error) throw new Error('INBOX_QUERY_FAILED');
  if (!membership.data) return null;
  const conversation = await client().from('app_inbox_conversations').select('*').eq('id', id).eq('organization_id', context.organizationId).maybeSingle();
  if (conversation.error) throw new Error('INBOX_QUERY_FAILED');
  if (!conversation.data) return null;
  const messages = await client().from('app_inbox_messages').select('*').eq('app_inbox_conversation_id', id).eq('organization_id', context.organizationId).order('received_at', { ascending: true });
  if (messages.error) throw new Error('INBOX_QUERY_FAILED');
  return { conversation: conversation.data, memberState: membership.data, messages: messages.data || [] };
}

export async function setInboxConversationState(context: PersistenceContext, id: string, action: StateAction) {
  const updates = action === 'mark_read' ? { is_read: true } : action === 'mark_unread' ? { is_read: false } : action === 'archive' ? { is_archived: true } : { is_archived: false };
  const result = await client().from('app_inbox_conversation_members').update({ ...updates, updated_at: new Date().toISOString() }).eq('conversation_id', id).eq('organization_id', context.organizationId).eq('app_user_id', context.appUserId).select('conversation_id,is_read,is_archived').maybeSingle();
  if (result.error) throw new Error('INBOX_STATE_FAILED');
  return result.data || null;
}

/** Server-only Gmail ingestion primitive. It trusts only the resolved mailbox
 * and provider thread id, and grants initial access solely to its owner. */
export async function findOrCreateGmailConversation(input: { organizationId: string; mailboxId: string; ownerAppUserId: string; threadId: string; subject: string | null; receivedAt: string }) {
  const existing = await client().from('app_inbox_conversations').select('id').eq('organization_id', input.organizationId).eq('connected_mailbox_id', input.mailboxId).eq('provider_thread_id', input.threadId).maybeSingle();
  if (existing.error) throw new Error('INBOX_CONVERSATION_FAILED');
  let id = existing.data?.id as string | undefined;
  if (!id) {
    const created = await client().from('app_inbox_conversations').insert({ organization_id: input.organizationId, connected_mailbox_id: input.mailboxId, assigned_app_user_id: input.ownerAppUserId, provider: 'gmail', provider_thread_id: input.threadId, subject_preview: input.subject, latest_message_at: input.receivedAt }).select('id').maybeSingle();
    if (created.error) {
      const raced = await client().from('app_inbox_conversations').select('id').eq('organization_id', input.organizationId).eq('connected_mailbox_id', input.mailboxId).eq('provider_thread_id', input.threadId).maybeSingle();
      if (raced.error || !raced.data) throw new Error('INBOX_CONVERSATION_FAILED');
      id = raced.data.id;
    } else id = created.data?.id;
  }
  if (!id) throw new Error('INBOX_CONVERSATION_FAILED');
  const member = await client().from('app_inbox_conversation_members').upsert({ conversation_id: id, organization_id: input.organizationId, app_user_id: input.ownerAppUserId, is_read: false, is_archived: false }, { onConflict: 'conversation_id,app_user_id', ignoreDuplicates: true });
  if (member.error) throw new Error('INBOX_MEMBERSHIP_FAILED');
  return id;
}

export async function recordGmailOutboundMessage(context: PersistenceContext, input: { conversationId: string; mailboxId: string; providerMessageId: string; providerThreadId: string; recipient: string; subject: string; text: string }) {
  const access = await getInboxConversation(context, input.conversationId);
  if (!access || access.conversation.connected_mailbox_id !== input.mailboxId) throw new Error('INBOX_ACCESS_DENIED');
  const result = await client().from('app_inbox_messages').insert({ organization_id: context.organizationId, assigned_app_user_id: context.appUserId, connected_mailbox_id: input.mailboxId, provider: 'gmail', provider_thread_id: input.providerThreadId, provider_message_id: input.providerMessageId, conversation_id: input.providerThreadId, app_inbox_conversation_id: input.conversationId, prospect_email: input.recipient, subject: input.subject, reply_message: input.text, status: 'REPLIED', is_read: true, is_archived: false, direction: 'OUTBOUND', recipient_emails: [input.recipient], received_at: new Date().toISOString() }).select('id').maybeSingle();
  if (result.error) { if (/duplicate|unique/i.test(result.error.message)) return 'DUPLICATE'; throw new Error('OUTBOUND_PERSIST_FAILED'); }
  const updated = await client().from('app_inbox_conversations').update({ latest_message_at: new Date().toISOString(), status: 'REPLIED', updated_at: new Date().toISOString() }).eq('id', input.conversationId).eq('organization_id', context.organizationId);
  if (updated.error) throw new Error('OUTBOUND_PERSIST_FAILED');
  return 'RECORDED';
}
