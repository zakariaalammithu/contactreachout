import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isDurableInboxEnabled } from '@/lib/services/durable-inbox-feature';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { getInboxConversation, recordGmailOutboundMessage } from '@/lib/persistence/inbox-conversation-repository';
import { sendGmailReply } from '@/lib/services/gmail-reply-service';

const schema = z.object({ mailboxId: z.string().uuid(), recipientEmail: z.string().email(), subject: z.string().trim().min(1).max(998), replyText: z.string().trim().min(1).max(100000) }).strict();
export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  if (!isDurableInboxEnabled()) return NextResponse.json({ error: 'Durable Inbox is disabled.' }, { status: 404 });
  try {
    const input = schema.parse(await request.json()); const context = await resolvePersistenceContext(request); const detail = await getInboxConversation(context, params.conversationId);
    if (!detail || detail.conversation.connected_mailbox_id !== input.mailboxId) return NextResponse.json({ error: 'Conversation was not found.' }, { status: 404 });
    const sent = await sendGmailReply(context, { mailboxId: input.mailboxId, to: input.recipientEmail, subject: input.subject, text: input.replyText, threadId: detail.conversation.provider_thread_id });
    if (!sent.messageId || !sent.threadId) throw new Error('GMAIL_SEND_FAILED');
    await recordGmailOutboundMessage(context, { conversationId: params.conversationId, mailboxId: input.mailboxId, providerMessageId: sent.messageId, providerThreadId: sent.threadId, recipient: input.recipientEmail, subject: input.subject, text: input.replyText });
    return NextResponse.json({ success: true, providerAccepted: true, messageId: sent.messageId, threadId: sent.threadId });
  } catch (error) { const status = error instanceof z.ZodError ? 400 : error instanceof PersistenceAuthorizationError ? 401 : 502; return NextResponse.json({ error: status === 400 ? 'Invalid reply request.' : status === 401 ? 'Authentication is required.' : 'Gmail did not accept or persist this reply.' }, { status }); }
}
