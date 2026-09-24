import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

export const dynamic = 'force-dynamic';

/**
 * Server-Side Campaign Start Credit & AI Entitlement Validation API
 * Strictly enforces credit capacity rules and AI plan authorization on the server.
 */
export async function POST(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    const userId = (session?.email || req.headers.get('x-user-email') || 'usr_guest').toLowerCase().trim();
    const body = await req.json();
    const { prospectsCount = 0, aiPersonalizationEnabled = false } = body;

    const count = Number(prospectsCount);
    if (isNaN(count) || count < 0) {
      return NextResponse.json({ error: 'Invalid prospect count parameter.' }, { status: 400 });
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
    const validation = CreditWalletService.validateCampaignStart(userId, count);

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
