/**
 * Admin user management policy — pure helpers, no imports (2026-11-02).
 *
 * Covers the URGENT admin brief: credit add/deduct, package change,
 * subscription dates, lifetime. Server code in admin-user-management.ts
 * calls these; tests import this file directly.
 *
 * Deliberate rules:
 * - Plans are the pricing-service plans. Free = 100 monthly credits and
 *   no subscription row semantics beyond a marker row; paid plans grant
 *   their period credits once on manual assignment (BONUS bucket, never
 *   labelled a Stripe payment).
 * - Lifetime = status 'lifetime', period 'lifetime', NO expiry date, NO
 *   renewal reminders. Lifetime assignment grants NO automatic credits:
 *   credits are managed explicitly via Manage Credits (the lifetime
 *   credit policy is still open from the 2026-11-02 prices brief).
 * - Credit deduct is single-bucket (FREE remainder, else PAID, else
 *   BONUS), mirroring the apply_credit_transaction RPC: a deduct larger
 *   than any single bucket is rejected with a clear error instead of
 *   driving a bucket negative or splitting silently.
 * - Old payment/credit history is never edited: adjustments only append
 *   new ledger rows and new admin-action rows.
 */

export const MANAGED_PLANS = ['Free', 'Starter', 'Growth', 'Agency', 'Enterprise'];

export const PLAN_CREDITS_MONTHLY = {
  Free: 100,
  Starter: 5000,
  Growth: 10000,
  Agency: 100000,
  Enterprise: 300000,
};

export const PLAN_CREDITS_YEARLY = {
  Free: 100,
  Starter: 60000,
  Growth: 120000,
  Agency: 1200000,
  Enterprise: 3600000,
};

export function isManagedPlan(plan: string): boolean {
  return MANAGED_PLANS.includes(plan);
}

/** Period credits for a manual package assignment (Free never auto-grants). */
export function creditsForPackage(plan: string, period: string | null): number {
  if (plan === 'Free') return 0;
  if (period === 'yearly') return (PLAN_CREDITS_YEARLY as Record<string, number>)[plan] ?? 0;
  if (period === 'lifetime') return 0;
  return (PLAN_CREDITS_MONTHLY as Record<string, number>)[plan] ?? 0;
}

/** Which single bucket covers a deduct, or null when none does. */
export function deductBucket(
  wallet: { freeMonthlyCredits: number; freeMonthlyUsed: number; paidCredits: number; bonusCredits: number },
  amount: number,
): 'FREE' | 'PAID' | 'BONUS' | null {
  const freeRemaining = Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed);
  if (freeRemaining >= amount) return 'FREE';
  if (wallet.paidCredits >= amount) return 'PAID';
  if (wallet.bonusCredits >= amount) return 'BONUS';
  return null;
}

/**
 * Derives the new (status, periodEnd) for a subscription-date action.
 * `row` carries { status, period, current_period_end }. Throws on invalid
 * input; callers turn the message into a 400. Lifetime rows reject every
 * date action (they have no expiry by definition).
 */
export function deriveSubscriptionDates(
  row: { status: string; period: string | null; current_period_end: string | null } | null,
  action: string,
  input: { extendDays?: number; startDate?: string; endDate?: string },
  nowMs: number,
): { status: string; current_period_end: string; current_period_start?: string } {
  if (!row) throw new Error('No subscription found for this user. Assign a package first.');
  if (row.status === 'lifetime' || row.period === 'lifetime') {
    throw new Error('Lifetime access has no expiry date and cannot be extended or re-dated.');
  }
  const now = new Date(nowMs);
  const oldEnd = row.current_period_end ? new Date(row.current_period_end) : null;

  if (action === 'expire') {
    return { status: 'expired', current_period_end: now.toISOString() };
  }
  if (action === 'reactivate') {
    const days = input.extendDays && Number.isInteger(input.extendDays) && input.extendDays > 0
      ? input.extendDays
      : 30;
    const end = new Date(now.getTime() + days * 86400000);
    return { status: 'active', current_period_end: end.toISOString() };
  }
  if (action === 'extend') {
    const days = input.extendDays;
    if (days === undefined || !Number.isInteger(days) || days <= 0 || days > 3650) {
      throw new Error('Extend requires whole days between 1 and 3650.');
    }
    const base = oldEnd && oldEnd.getTime() > nowMs ? oldEnd : now;
    const end = new Date(base.getTime() + days * 86400000);
    return { status: 'active', current_period_end: end.toISOString() };
  }
  if (action === 'set') {
    const start = input.startDate ? new Date(input.startDate) : null;
    const end = input.endDate ? new Date(input.endDate) : null;
    if (!start || Number.isNaN(start.getTime())) throw new Error('A valid start date is required.');
    if (!end || Number.isNaN(end.getTime())) throw new Error('A valid expiry date is required.');
    if (end.getTime() <= start.getTime()) throw new Error('Expiry date must be after the start date.');
    return {
      status: end.getTime() > nowMs ? 'active' : 'expired',
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
    };
  }
  throw new Error('Unknown subscription date action.');
}

/** Package-change validation: returns an error string or null. */
export function validatePackageChange(plan: string, period: string | null): string | null {
  if (!isManagedPlan(plan)) return 'Unknown plan. Use Free, Starter, Growth, Agency or Enterprise.';
  if (plan === 'Free' && period && period !== 'monthly') {
    return 'Free has no billing period. Use monthly or leave the period empty.';
  }
  if (plan !== 'Free' && (period === null || !['monthly', 'yearly', 'lifetime'].includes(period))) {
    return 'Paid plans need a period: monthly, yearly or lifetime.';
  }
  return null;
}
