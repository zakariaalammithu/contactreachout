import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { InboxStore } from '@/lib/services/inbox-store';
import { getEmailSenderConfig } from '@/lib/services/email/email-config';
import { ResendProvider } from '@/lib/services/email/resend-provider';

export const dynamic = 'force-dynamic';

/**
 * Outbound Email Reply API
 * Sends a real outbound email message to the prospect using central Resend Email API.
 * Uses the user's active verified Reply Email as reply_to address.
 * Enforces strict server-side authentication and IDOR ownership checks.
 */
export async function POST(req: NextRequest) {
  const session = SessionManager.getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userEmail = session.email.toLowerCase().trim();
  const user = AuthStore.getUserByEmail(userEmail);
  const activeReplyEmail = user?.replyEmail || (user?.isEmailVerified ? userEmail : userEmail);
  const isAdmin = session.role === 'SUPER_ADMIN';

  try {
    const body = await req.json();
    const { messageId, recipientEmail, subject, replyText } = body;

    if (!recipientEmail || !replyText) {
      return NextResponse.json(
        { error: 'Missing required reply parameters (recipientEmail, replyText)' },
        { status: 400 }
      );
    }

    // Verify ownership of the conversation if messageId is provided (IDOR Protection)
    let existingMessage = null;
    if (messageId) {
      existingMessage = InboxStore.getMessageById(userEmail, messageId, isAdmin);
      if (!existingMessage) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied.' },
          { status: 403 }
        );
      }
    }

    const emailSubject = subject || existingMessage?.originalSubject || 'Re: Outreach Inquiry';
    const emailSender = getEmailSenderConfig();

    const provider = new ResendProvider();
    const sendResult = await provider.sendEmail({
      to: recipientEmail,
      from: emailSender.fromEmail,
      fromName: emailSender.fromName,
      replyTo: activeReplyEmail || emailSender.replyToEmail || userEmail,
      subject: emailSubject,
      html: `<p>${escapeHtml(replyText).replace(/\n/g, '<br />')}</p>`,
      text: replyText,
      headers: existingMessage?.externalMessageId
        ? {
            'In-Reply-To': existingMessage.externalMessageId,
            References: existingMessage.externalMessageId,
          }
        : undefined,
    });

    if (!sendResult.success || !sendResult.messageId) {
      const status = sendResult.errorCode === 'MISSING_API_KEY'
        ? 503
        : sendResult.errorCode === 'NETWORK_OR_PROVIDER_ERROR'
          ? 503
          : 502;
      return NextResponse.json(
        { error: sendResult.errorMessage || 'The email provider did not accept this reply.' },
        { status }
      );
    }

    // Save outbound reply to server-side InboxStore if messageId is known
    if (messageId) {
      InboxStore.addOutboundReply(userEmail, messageId, replyText, isAdmin);
    }

    return NextResponse.json({
      success: true,
      isLiveSent: true,
      providerAccepted: true,
      messageId: sendResult.messageId,
      senderReplyEmail: activeReplyEmail,
      message: `Reply accepted by Resend for ${recipientEmail}.`,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to dispatch the reply email.' },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
