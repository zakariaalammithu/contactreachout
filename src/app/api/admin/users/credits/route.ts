import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { CreditWalletServerService as CreditWalletService } from '@/lib/services/credit-wallet-server-service';
import { recordAdminAction } from '@/lib/services/admin-action-service';
import { resolveManagementTarget, targetGuard } from '@/lib/services/admin-user-management';
import { z } from 'zod';

/**
 * Admin credit adjustment (2026-11-02, URGENT admin brief).
 * Extends the existing grant-only /api/admin/credits route with deduct:
 * positive amount adds (BONUS bucket, existing path), negative amount
 * deducts (single-bucket rule, ADMIN_ADJUSTMENT ledger row). Reason is
 * required here (audit quality); every adjustment is audited and
 * idempotent on requestId. Manual adjustments are never Stripe payments.
 */
const adjustSchema = z.object({
  targetUserEmail: z.string().email(),
  amount: z.number().int().refine((n) => n !== 0 && Math.abs(n) <= 1_000_000, {
    message: 'Amount must be a non-zero whole number up to 1,000,000 in absolute value.',
  }),
  reason: z.string().trim().min(1).max(500),
  requestId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = adjustSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid credit adjustment.' }, { status: 400 });
  }

  const target = await resolveManagementTarget(parsed.data.targetUserEmail);
  if (!target) return NextResponse.json({ error: 'Target user was not found.' }, { status: 404 });
  const guard = targetGuard(session.role, target);
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const direction = parsed.data.amount > 0 ? 'add' : 'deduct';
  const absAmount = Math.abs(parsed.data.amount);
  const reason = `Admin ${direction} by ${session.email}: ${parsed.data.reason}`;

  try {
    let wallet;
    let transaction;
    let applied: boolean;
    if (direction === 'add') {
      const result = await CreditWalletService.addBonusCreditsForServer(
        absAmount,
        reason,
        target.email,
        `admin-grant-${parsed.data.requestId}`,
      );
      wallet = result.wallet;
      transaction = result.transaction;
      applied = true; // grant path returns the unchanged wallet on replay
    } else {
      const result = await CreditWalletService.deductCreditsForAdminForServer(
        absAmount,
        reason,
        target.email,
        `admin-deduct-${parsed.data.requestId}`,
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Credit deduct failed.' }, { status: 400 });
      }
      wallet = result.wallet;
      transaction = result.transaction;
      applied = result.deducted > 0;
    }

    const { stored } = await recordAdminAction({
      actorEmail: session.email,
      action: 'credits_adjusted',
      targetEmail: target.email,
      reason: parsed.data.reason,
      requestId: parsed.data.requestId,
      details: { direction, amount: parsed.data.amount, balanceAfter: wallet.totalCreditsAvailable, applied },
    });

    return NextResponse.json({ success: true, wallet, transaction, applied, auditStored: stored });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Credit adjustment failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
