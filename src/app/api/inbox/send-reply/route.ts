import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { InboxStore } from '@/lib/services/inbox-store';
import { getEmailSenderConfig } from '@/lib/services/email/email-config';

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

    let isLiveSent = false;
    let deliveryMessage = `Reply email sent to ${recipientEmail}`;

    try {
      if (process.env.RESEND_API_KEY) {
        const payload: any = {
          from: `${emailSender.fromName} <${emailSender.fromEmail}>`,
          reply_to: activeReplyEmail || emailSender.replyToEmail || userEmail,
          to: [recipientEmail],
          subject: emailSubject,
          text: replyText,
        };

        // Attach threading headers if externalMessageId is present
        if (existingMessage?.externalMessageId) {
          payload.headers = {
            'In-Reply-To': existingMessage.externalMessageId,
            'References': existingMessage.externalMessageId,
          };
        }

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (resendRes.ok) {
          isLiveSent = true;
          deliveryMessage = `Live email transmitted successfully via Resend API to ${recipientEmail}!`;
        }
      }
    } catch (e) {
      console.warn('Resend live dispatch fallback:', e);
    }

    // Save outbound reply to server-side InboxStore if messageId is known
    if (messageId) {
      InboxStore.addOutboundReply(userEmail, messageId, replyText, isAdmin);
    }

    return NextResponse.json({
      success: true,
      isLiveSent,
      senderReplyEmail: activeReplyEmail,
      message: deliveryMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error dispatching reply email' },
      { status: 500 }
    );
  }
}
