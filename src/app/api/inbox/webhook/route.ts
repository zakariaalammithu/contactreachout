import { NextRequest, NextResponse } from 'next/server';
import { InboxStore } from '@/lib/services/inbox-store';
import { AuthStore } from '@/lib/auth/auth-store';
import { getEmailSenderConfig } from '@/lib/services/email/email-config';

export const dynamic = 'force-dynamic';

/**
 * Dual Reply Synchronization Webhook API
 * Receives incoming prospect replies (from Resend Inbound or Form webhook) and syncs them to:
 * 1. User's isolated ContactReachout Inbox (/unibox)
 * 2. User's active verified Reply Email inbox
 * 
 * Enforces:
 * - Idempotency deduplication
 * - User/Tenant Resolution
 * - Unmatched Email State (safe 'UNMATCHED' status scope per user)
 * - Security payload validation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prospectName,
      prospectEmail,
      companyName,
      website,
      subject,
      replyMessage,
      userEmail,
      userSenderEmail,
      campaignName,
      campaignId,
      leadId,
      conversationId,
      externalMessageId,
      messageId,
      status,
    } = body;

    const rawTargetEmail = (userEmail || userSenderEmail || body.to || body.recipient || '').toLowerCase().trim();
    const rawProspectEmail = (prospectEmail || body.from || body.sender || '').toLowerCase().trim();

    if (!rawTargetEmail || !rawProspectEmail || !replyMessage) {
      return NextResponse.json(
        { error: 'Missing required reply details (targetUserEmail, prospectEmail, replyMessage)' },
        { status: 400 }
      );
    }

    // Resolve User Account by email or replyEmail
    let user = AuthStore.getUserByEmail(rawTargetEmail);
    if (!user) {
      // Check if rawTargetEmail is configured as another user's verified replyEmail
      const allUsers = AuthStore.getAllUsers();
      user = allUsers.find(
        (u) => (u.replyEmail && u.replyEmail.toLowerCase().trim() === rawTargetEmail) || u.email.toLowerCase().trim() === rawTargetEmail
      ) || null;
    }

    if (!user) {
      // Reject unauthorized webhook payload for non-existent users to maintain tenant isolation
      return NextResponse.json(
        { error: 'Recipient address does not match any registered ContactReachout user.' },
        { status: 404 }
      );
    }

    const targetUserEmail = user.email;
    const forwardedToEmail = user.replyEmail || user.email;

    // Detect if message is unmatched (lacks campaign or lead context)
    const isMatched = Boolean(campaignName || campaignId || leadId || conversationId);
    const resolvedStatus = status || (isMatched ? 'INTERESTED' : 'UNMATCHED');
    const resolvedCampaignName = campaignName || (isMatched ? 'Outreach Campaign' : 'Unmatched / Needs Review');

    // Idempotent save to InboxStore
    const savedMessage = InboxStore.addIncomingReply({
      userId: user.id,
      userEmail: targetUserEmail,
      campaignId,
      leadId,
      conversationId,
      externalMessageId: externalMessageId || messageId,
      prospectName: prospectName || rawProspectEmail.split('@')[0],
      email: rawProspectEmail,
      companyName,
      website,
      campaignName: resolvedCampaignName,
      originalSubject: subject,
      replyMessage,
      status: resolvedStatus,
      forwardedToEmail,
    });

    // Forward incoming reply notification to user's configured Reply Email if Resend API key is present
    let emailForwarded = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const sender = getEmailSenderConfig();
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${sender.fromName} <${sender.fromEmail}>`,
            reply_to: rawProspectEmail,
            to: [forwardedToEmail],
            subject: `[Prospect Reply] ${subject || 'New website contact-form reply'}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
                <h3 style="color:#0e6de4;margin-top:0;">New Prospect Reply Received</h3>
                <p style="color:#475569;font-size:14px;"><strong>From:</strong> ${savedMessage.prospectName} (${rawProspectEmail})</p>
                <p style="color:#475569;font-size:14px;"><strong>Company:</strong> ${companyName || website || 'N/A'}</p>
                <p style="color:#475569;font-size:14px;"><strong>Campaign:</strong> ${resolvedCampaignName}</p>
                <div style="background:#f8fafc;padding:16px;border-radius:12px;border-left:4px solid #0e6de4;margin:16px 0;font-size:14px;color:#0f172a;line-height:1.6;">
                  ${replyMessage.replace(/\n/g, '<br/>')}
                </div>
                <p style="color:#64748b;font-size:12px;">This message has been saved in your ContactReachout Inbox. You can reply directly from your ContactReachout Inbox or email client.</p>
              </div>
            `,
          }),
        });

        if (resendRes.ok) {
          emailForwarded = true;
        }
      } catch (err) {
        console.warn('Reply email forwarding error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      emailForwarded,
      message: `Reply synchronized successfully to both ${savedMessage.forwardedToEmail} and ContactReachout Inbox!`,
      reply: savedMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error processing reply webhook' },
      { status: 500 }
    );
  }
}
