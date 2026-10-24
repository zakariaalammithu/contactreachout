import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { sendGmailReply } from '@/lib/services/gmail-reply-service';

export const dynamic = 'force-dynamic';

const schema = z.object({
  mailboxId: z.string().uuid(),
  recipientEmail: z.string().email(),
  subject: z.string().trim().min(1).max(998),
  replyText: z.string().min(1).max(100_000),
  threadId: z.string().trim().max(255).optional(),
  inReplyTo: z.string().trim().max(998).optional(),
  references: z.string().trim().max(4096).optional(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const sent = await sendGmailReply(await resolvePersistenceContext(request), {
      mailboxId: input.mailboxId, to: input.recipientEmail, subject: input.subject, text: input.replyText,
      threadId: input.threadId, inReplyTo: input.inReplyTo, references: input.references,
    });
    return NextResponse.json({ success: true, providerAccepted: true, isLiveSent: true, messageId: sent.messageId, threadId: sent.threadId, mailboxEmail: sent.mailboxEmail });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid reply request.' }, { status: 400 });
    if (error instanceof PersistenceAuthorizationError) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    const code = error instanceof Error ? error.message : '';
    const status = code === 'MAILBOX_NOT_AVAILABLE' ? 403 : code === 'MAILBOX_REAUTH_REQUIRED' || code === 'GMAIL_NOT_CONFIGURED' ? 503 : 502;
    return NextResponse.json({ error: status === 503 ? 'The selected Gmail mailbox requires configuration or reconnection.' : status === 403 ? 'The selected mailbox is not available to this account.' : 'Gmail did not accept this reply.' }, { status });
  }
}
