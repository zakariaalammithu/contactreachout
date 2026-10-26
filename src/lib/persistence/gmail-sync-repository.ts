import 'server-only';

import crypto from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import type { ParsedGmailMessage } from '@/lib/services/gmail-message-parser';
import { findOrCreateGmailConversation } from './inbox-conversation-repository';

function clientOrThrow() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error('Durable mailbox storage is not configured.');
  return client;
}

export async function claimMailboxSyncEvent(input: { mailboxId: string; organizationId: string; providerEventId: string; historyId?: string; payload: unknown }): Promise<boolean> {
  const payloadHash = crypto.createHash('sha256').update(JSON.stringify(input.payload)).digest('hex');
  const client = clientOrThrow();
  const result = await client.from('app_mailbox_sync_events').insert({
    organization_id: input.organizationId, connected_mailbox_id: input.mailboxId, provider: 'gmail', provider_event_id: input.providerEventId,
    history_id: input.historyId || null, payload_hash: payloadHash, processing_status: 'PROCESSING',
  }).select('id').maybeSingle();
  if (!result.error) return Boolean(result.data);
  if (/duplicate|unique/i.test(result.error.message)) {
    // A Pub/Sub redelivery is normally a duplicate and must not run twice.
    // The one exception is an event the previous worker explicitly marked as
    // retryable. The status predicate makes reclamation atomic: only one
    // concurrent redelivery can move it back to PROCESSING.
    const reclaim = await client
      .from('app_mailbox_sync_events')
      .update({ processing_status: 'PROCESSING', processed_at: null, updated_at: new Date().toISOString() })
      .eq('connected_mailbox_id', input.mailboxId)
      .eq('provider_event_id', input.providerEventId)
      .eq('processing_status', 'RETRYABLE_FAILURE')
      .select('id')
      .maybeSingle();
    if (reclaim.error) throw new Error('Could not reclaim mailbox sync event.');
    return Boolean(reclaim.data);
  }
  throw new Error('Could not record mailbox sync event.');
}

export async function finishMailboxSyncEvent(mailboxId: string, providerEventId: string, status: 'PROCESSED' | 'RETRYABLE_FAILURE' | 'PERMANENT_FAILURE') {
  const result = await clientOrThrow().from('app_mailbox_sync_events').update({ processing_status: status, processed_at: status === 'PROCESSED' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('connected_mailbox_id', mailboxId).eq('provider_event_id', providerEventId).eq('processing_status', 'PROCESSING');
  if (result.error) throw new Error('Could not update mailbox sync event.');
}

export async function ingestGmailMessage(input: { organizationId: string; ownerAppUserId: string; mailboxId: string; message: ParsedGmailMessage; campaign?: { campaignId: string; leadId: string } | null }): Promise<'IMPORTED' | 'DUPLICATE'> {
  const message = input.message;
  if (!message.providerThreadId || !message.providerMessageId) throw new Error('Malformed Gmail message identity.');
  const conversationId = await findOrCreateGmailConversation({ organizationId: input.organizationId, mailboxId: input.mailboxId, ownerAppUserId: input.ownerAppUserId, threadId: message.providerThreadId, subject: message.subject || null, receivedAt: message.receivedAt });
  const result = await clientOrThrow().from('app_inbox_messages').insert({
    organization_id: input.organizationId,
    assigned_app_user_id: input.ownerAppUserId,
    app_campaign_id: input.campaign?.campaignId || null,
    app_lead_id: input.campaign?.leadId || null,
    provider: 'gmail',
    connected_mailbox_id: input.mailboxId,
    provider_thread_id: message.providerThreadId,
    provider_message_id: message.providerMessageId,
    external_message_id: message.rfcMessageId || null,
    conversation_id: message.providerThreadId,
    app_inbox_conversation_id: conversationId,
    prospect_name: message.from || 'Unknown sender',
    prospect_email: message.from || null,
    subject: message.subject || null,
    reply_message: message.text,
    status: 'NEW',
    is_read: false,
    is_archived: false,
    direction: 'INBOUND',
    sender_email: message.from || null,
    recipient_emails: message.to,
    message_headers: { inReplyTo: message.inReplyTo || null, references: message.references || null },
    received_at: message.receivedAt,
  }).select('id').maybeSingle();
  if (!result.error) return 'IMPORTED';
  if (/duplicate|unique/i.test(result.error.message)) return 'DUPLICATE';
  throw new Error('Could not persist the Gmail message.');
}
