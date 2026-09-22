import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { SessionManager } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const user = AuthStore.getUserByEmail(session.email);
  if (!user) return NextResponse.json({ error: 'User account not found.' }, { status: 404 });

  // Get referred users associated strictly with this authenticated user
  const referredUsers = AuthStore.getReferredUsers(user.id);
  const successfulReferrals = referredUsers.filter((u) => u.isEmailVerified && !u.isSuspended).length;
  const pendingReferrals = referredUsers.filter((u) => !u.isEmailVerified).length;
  const totalReferrals = referredUsers.length;
  const referralRewards = successfulReferrals * 100;

  return NextResponse.json({
    userId: user.id,
    referralCode: user.referralCode,
    referralUrl: `/signup?ref=${encodeURIComponent(user.referralCode)}`,
    fullReferralUrl: `https://contactreachout.com/signup?ref=${encodeURIComponent(user.referralCode)}`,
    bonusCredits: user.bonusCredits,
    payoutEmail: user.payoutEmail || '',
    totals: {
      totalReferrals,
      successfulReferrals,
      pendingReferrals,
      referralRewards,
      availableReferralCredits: user.bonusCredits,
    },
    referredUsers: referredUsers.map((referredUser) => ({
      id: referredUser.id,
      name: referredUser.name,
      joinedAt: referredUser.createdAt,
      status: referredUser.isEmailVerified ? (referredUser.isSuspended ? 'Suspended' : 'Successful') : 'Pending',
      rewardCredits: 100,
    })),
  });
}

const updateSchema = z.object({ payoutEmail: z.string().email('Enter a valid Wise account email.') });

export async function POST(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = AuthStore.updateUser(session.email, { payoutEmail: parsed.data.payoutEmail.toLowerCase().trim() });
  return NextResponse.json({ success: true, payoutEmail: user.payoutEmail });
}
