import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SessionManager } from '@/lib/auth/session';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

export async function GET(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    const userId = session?.email || 'usr_guest';
    const wallet = CreditWalletService.getWallet(userId);
    const transactions = CreditWalletService.getTransactions(userId);

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

const deductSchema = z.object({
  action: z.literal('deduct'),
  resultType: z.string().optional(),
  campaignId: z.string().optional(),
  leadId: z.string().optional(),
  companyName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = deductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { resultType = 'FORM_SUBMITTED', campaignId, leadId, companyName } = parsed.data;
    const userId = session.email;

    const result = CreditWalletService.deductCredits(
      resultType,
      campaignId,
      leadId,
      companyName,
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Insufficient credit balance. Please purchase additional credits to submit outreach.',
          wallet: result.wallet,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      success: true,
      cost: result.cost,
      source: result.source,
      wallet: result.wallet,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process credit deduction' },
      { status: 500 }
    );
  }
}
