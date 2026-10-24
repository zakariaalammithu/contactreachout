import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { CreditWalletServerService as CreditWalletService } from '@/lib/services/credit-wallet-server-service';

export const dynamic = 'force-dynamic';

/**
 * Server-Side Campaign Start Credit & AI Entitlement Validation API
 * Strictly enforces credit capacity rules and AI plan authorization on the server.
 */
export async function POST(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const authenticatedUser = AuthStore.getUserByEmail(session.email);
    if (!authenticatedUser || authenticatedUser.id !== session.userId) {
      return NextResponse.json({ error: 'Authenticated account could not be verified.' }, { status: 401 });
    }
    if (authenticatedUser.isSuspended) return NextResponse.json({ error: 'Account is suspended.' }, { status: 403 });
    const userId = session.email.toLowerCase().trim();
    const body = await req.json();
    const { prospectsCount = 0, aiPersonalizationEnabled = false } = body;

    const count = Number(prospectsCount);
    if (isNaN(count) || count < 1) {
      return NextResponse.json({
        allowed: false,
        reason: 'NO_PROSPECTS',
        message: 'Add at least 1 prospect before starting this campaign.',
      }, { status: 400 });
    }

    // 1. AI Personalization Access Control Check
    if (aiPersonalizationEnabled) {
      const user = AuthStore.getUserByEmail(userId);
      const isFreeUser = !user?.plan || user.plan.toLowerCase() === 'free';
      const isAdmin = user?.role === 'SUPER_ADMIN';

      if (isFreeUser && !isAdmin) {
        return NextResponse.json(
          {
            allowed: false,
            reason: 'AI_NOT_AVAILABLE_ON_FREE',
            message: 'AI Personalization is available on paid plans. Upgrade your plan to use it.',
          },
          { status: 400 }
        );
      }
    }

    // 2. Credit Wallet Capacity & Unreserved Balance Validation
    const wallet = await CreditWalletService.getWalletForServer(userId);
    const validation = {
      allowed: wallet.totalCreditsAvailable >= count,
      reason: wallet.totalCreditsAvailable <= 0 ? 'NO_CREDITS_REMAINING' as const : wallet.totalCreditsAvailable < count ? 'INSUFFICIENT_CREDITS' as const : undefined,
      availableCredits: wallet.totalCreditsAvailable,
      unreservedCredits: wallet.totalCreditsAvailable,
      requiredCredits: count,
      shortfall: Math.max(0, count - wallet.totalCreditsAvailable),
      message: wallet.totalCreditsAvailable >= count
        ? `${count} prospects can be processed with your current ${wallet.totalCreditsAvailable} available credits.`
        : 'Not enough credits to start this campaign. Please purchase additional credits or reduce prospects.',
    };

    if (!validation.allowed) {
      return NextResponse.json(validation, { status: 402 });
    }

    return NextResponse.json(validation, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error validating campaign start credentials.' },
      { status: 500 }
    );
  }
}
