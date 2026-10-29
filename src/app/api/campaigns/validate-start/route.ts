import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { CreditWalletServerService } from '@/lib/services/credit-wallet-server-service';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

export const dynamic = 'force-dynamic';

/**
 * Server-Side Campaign Start Credit & AI Entitlement Validation API
 * Strictly enforces credit capacity rules and AI plan authorization on the server.
 */
export async function POST(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    // The session token is HMAC-signed and self-contained, so its email IS
    // the authenticated identity. The previous check additionally required
    // the user to exist in the in-memory AuthStore with a matching id — but
    // AuthStore lives only in serverless instance memory, so every
    // self-registered user failed here with 401 on any instance other than
    // the one that created their account, and the client displayed that
    // failure as a numberless "Not Enough Credits" modal. The id adds no
    // security (a forged token would need SESSION_SECRET, and the wallet
    // below is keyed by the signed email), so the registry is now consulted
    // only for suspension and plan — never as a gate for existence. Note:
    // no durable user store exists to check suspension for users absent
    // from the registry; the signed session plus the credit gate below
    // remain the enforcement for them.
    const authenticatedUser = AuthStore.getUserByEmail(session.email);
    if (authenticatedUser?.isSuspended) return NextResponse.json({ error: 'Account is suspended.' }, { status: 403 });
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
      const user = authenticatedUser;
      const isFreeUser = !user?.plan || user.plan.toLowerCase() === 'free';
      const isAdmin = user?.role === 'SUPER_ADMIN' || session.role === 'SUPER_ADMIN';

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
    // Self-registered accounts have no Supabase users row yet, so the
    // database wallet lookup throws USER_NOT_FOUND for them. Fall back to
    // the standard in-memory wallet (100 free monthly credits, plus the
    // admin testing grant for admin accounts) instead of failing the start
    // with a 500 the client shows as a credit error. Any other database
    // failure still surfaces as a 500.
    let wallet;
    try {
      wallet = await CreditWalletServerService.getWalletForServer(userId);
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('CREDIT_DATABASE_USER_NOT_FOUND') || message.includes('CREDIT_DATABASE_NOT_CONFIGURED')) {
        wallet = CreditWalletService.getWallet(userId);
      } else {
        throw err;
      }
    }
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
