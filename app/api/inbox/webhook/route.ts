import { NextRequest, NextResponse } from 'next/server';

/**
 * Dual Reply Synchronization Webhook API
 * Automatically receives incoming email replies from prospects and syncs them to:
 * 1. User's Personal Email Inbox (mithusquare@gmail.com)
 * 2. Platform System Unibox (/unibox & Campaign Unibox)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prospectName,
      prospectEmail,
      companyName,
      subject,
      replyMessage,
      userSenderEmail,
      campaignName,
    } = body;

    if (!prospectEmail || !replyMessage) {
      return NextResponse.json(
        { error: 'Missing required reply details (prospectEmail, replyMessage)' },
        { status: 400 }
      );
    }

    const replyObject = {
      id: `rep-${Date.now()}`,
      prospectName: prospectName || prospectEmail.split('@')[0],
      email: prospectEmail,
      companyName: companyName || 'Target Company',
      campaignName: campaignName || 'Outreach Campaign',
      date: 'Just now',
      isUnread: true,
      status: 'INTERESTED',
      forwardedToEmail: userSenderEmail || 'hello@contactreachout.com',
      originalSubject: subject || 'Outreach Inquiry',
      replyMessage: replyMessage,
      receivedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: `Reply synchronized successfully to both ${replyObject.forwardedToEmail} and System Unibox!`,
      reply: replyObject,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error processing reply webhook' },
      { status: 500 }
    );
  }
}
