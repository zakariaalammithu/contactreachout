import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { SessionManager } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const user = AuthStore.getUserByEmail(session.email);
  if (!user) return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
  const referredUsers = AuthStore.getReferredUsers(user.id);

  return NextResponse.json({
    userId: user.id,
    referralCode: user.referralCode,
    referralUrl: `/signup?ref=${encodeURIComponent(user.referralCode)}`,
    bonusCredits: user.bonusCredits,
    payoutEmail: user.payoutEmail || '',
    totals: {
      referredUsers: referredUsers.length,
      earnedCredits: referredUsers.length * 100,
      linkClicks: 0,
    },
    referredUsers: referredUsers.map((referredUser) => ({
      id: referredUser.id,
      name: referredUser.name,
      joinedAt: referredUser.createdAt,
      status: referredUser.isSuspended ? 'Suspended' : 'Active',
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
