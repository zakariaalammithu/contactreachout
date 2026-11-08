import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { CreditWalletServerService as CreditWalletService } from '@/lib/services/credit-wallet-server-service';

export async function GET(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    // Unauthenticated requests get 401, not a fabricated guest wallet:
    // a guest balance is not a real balance and must never be displayed
    // as one. All three client callers tolerate a non-ok response.
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = session.email;
    const wallet = await CreditWalletService.getWalletForServer(userId);
    // The wallet is the primary data: a ledger read failure must never
    // 500 the balance (the campaign editor showed "Unavailable" while
    // the sidebar showed the real balance, because the transactions
    // lookup had no unprovisioned-account fallback). History degrades
    // to empty and the failure is logged server-side.
    let transactions: Awaited<ReturnType<typeof CreditWalletService.getTransactionsForServer>>;
    try {
      transactions = await CreditWalletService.getTransactionsForServer(userId);
    } catch (txErr: any) {
      console.error('[credits] transaction history unavailable:', txErr?.message || txErr);
      transactions = [];
    }

    return NextResponse.json({
      success: true,
      wallet,
      transactions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve credit wallet' },
      { status: 500 }
    );
  }
}

// NOTE (2026-11-02, credit + Stripe fix batch): the undocumented POST
// self-deduction endpoint was removed. It let any authenticated user drain
// their own wallet with arbitrary campaign/lead ids (fake USAGE ledger
// rows), had no client callers, and is not part of any supported flow.
// Credit deduction happens only server-side, in the campaign process route,
// on verified DELIVERED submissions.
