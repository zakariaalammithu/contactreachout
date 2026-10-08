import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { InboxStore } from '@/lib/services/inbox-store';

export const dynamic = 'force-dynamic';

/**
 * Admin-Only Inbox Reply Simulation Endpoint
 * Restricted strictly to SUPER_ADMIN and ADMIN roles.
 * Returns 403 Forbidden for regular users.
 */
export async function POST(req: NextRequest) {
  const session = SessionManager.getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // Enforce strict Role-Based Access Control (RBAC)
  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Admin or Super Admin role required to execute simulation tools.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      prospectName,
      prospectEmail,
      companyName,
      website,
      replyMessage,
      targetUserEmail,
      campaignName,
    } = body;

    const rawTarget = (targetUserEmail || session.email).toLowerCase().trim();
    const user = AuthStore.getUserByEmail(rawTarget) || AuthStore.getUserByEmail(session.email);

    if (!user) {
      return NextResponse.json({ error: 'Target user account not found.' }, { status: 404 });
    }

    const cleanProspectEmail = (prospectEmail || 'test.lead@targetdomain.com').toLowerCase().trim();
    const cleanProspectName = prospectName?.trim() || 'Alex Rivera (Test)';
    const cleanCompanyName = companyName?.trim() || 'GrowthTech Solutions';
    const cleanWebsite = website?.trim() || `https://${cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.io`;
    const cleanReplyMessage = replyMessage?.trim() || 'Thanks for reaching out! We would like to test ContactReachout.';

    const savedMessage = InboxStore.addIncomingReply({
      userId: user.id,
      userEmail: user.email,
      prospectName: cleanProspectName,
      email: cleanProspectEmail,
      companyName: cleanCompanyName,
      website: cleanWebsite,
      campaignName: `[TEST SIMULATED] ${campaignName?.trim() || 'Developer Test Campaign'}`,
      originalSubject: '[TEST SIMULATED] Website Outreach Inquiry',
      originalMessage: 'Outreach message submitted via website contact form.',
      replyMessage: `[TEST / SIMULATED DATA]\n${cleanReplyMessage}`,
      status: 'INTERESTED',
      forwardedToEmail: user.replyEmail || user.email,
    });

    return NextResponse.json({
      success: true,
      message: `Simulated test reply generated and synchronized for ${user.email}`,
      reply: savedMessage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error processing simulated reply' },
      { status: 500 }
    );
  }
}
