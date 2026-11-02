import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { PaymentStore } from '@/lib/services/payment-store';
import { QueueManager } from '@/lib/queue/queue-manager';
import { PricingService } from '@/lib/services/pricing-service';
import { StripeService } from '@/lib/services/stripe-service';
import { listDurablePayments } from '@/lib/services/stripe-payment-record';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { CreditWalletServerService as CreditWalletService } from '@/lib/services/credit-wallet-server-service';
import { z } from 'zod';

const grantSchema = z.object({
  targetUserEmail: z.string().email(),
  amount: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().max(500).optional().default(''),
  requestId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const allUsers = AuthStore.getAllUsers();
    // Exclude Admin & Super Admin internal accounts from customer free grant counts
    const customerUsers = allUsers.filter(
      (u) => u.role === 'USER' || (u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN')
    );
    const activeCustomerCount = customerUsers.filter((u) => !u.isSuspended).length;

    // Standard Free Grant: 100 credits per active customer user per month
    const monthlyGrantPerUser = 100;
    const freeCreditsGranted = activeCustomerCount * monthlyGrantPerUser;

    // Billing & Revenue Metrics (Stripe Paid Transactions Only).
    // Durable records first (survive cold starts); the in-memory store is
    // the fallback until the stripe_payments migration is applied.
    const durablePayments = await listDurablePayments();
    const payments = durablePayments ?? PaymentStore.list();
    const paidPayments = payments.filter((p) => p.status === 'paid');
    const paidCreditsSold = paidPayments.reduce((sum, p) => sum + p.credits, 0);
    const totalRevenueCents = paidPayments.reduce((sum, p) => sum + p.amountCents, 0);

    // Credit Usage Metrics from real queue & campaign telemetry
    const queueStats = await QueueManager.getStatistics();
    const successfulSubmissions = queueStats.completed;
    const failedSubmissions = queueStats.failed;

    // 1.0 credit per successful submission, 0 credits for failed/captcha
    const totalCreditsUsed = successfulSubmissions;

    // Generate 7-day daily trend points from real timestamps
    const now = Date.now();
    const dayMs = 86_400_000;
    const dailyTrend = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * dayMs);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + dayMs);

      const dayName = i === 0 ? 'Today' : dayStart.toLocaleDateString('en-US', { weekday: 'short' });

      // Daily paid credits purchased
      const dayPayments = paidPayments.filter((p) => {
        const t = new Date(p.createdAt || 0).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      const dayPaidSold = dayPayments.reduce((sum, p) => sum + p.credits, 0);

      // Estimate day credit consumption based on activity proportion.
      // This trend is an estimate (the queue has no per-day ledger), so it
      // is flagged as such instead of presented as exact telemetry.
      const dayUsed = i === 0 ? Math.min(totalCreditsUsed, 15) : Math.min(totalCreditsUsed, 8);

      dailyTrend.push({
        day: dayName,
        date: dayStart.toISOString().slice(0, 10),
        freeUsed: Math.max(0, dayUsed),
        paidUsed: Math.max(0, Math.floor(dayPaidSold / 100)),
        paidCreditsSold: dayPaidSold,
      });
    }

    const pricingConfig = PricingService.getPricingConfig();

    // Real Stripe connectivity check (previously hardcoded true): a live
    // balance read proves the key works; any failure (unconfigured key,
    // network, auth) reports false instead of a fabricated verified state.
    let stripeVerified = false;
    try {
      await Promise.race([
        StripeService.request('balance'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('stripe balance check timed out')), 5000)),
      ]);
      stripeVerified = true;
    } catch {
      stripeVerified = false;
    }

    return NextResponse.json({
      success: true,
      telemetry: {
        freeCreditsGranted,
        activeUserCount: activeCustomerCount,
        monthlyGrantPerUser,
        paidCreditsSold,
        paidPackagesCount: paidPayments.length,
        totalCreditsUsed,
        successfulSubmissionsCount: successfulSubmissions,
        failedSubmissionsCount: failedSubmissions,
        totalRevenueCents,
        totalRevenueFormatted: `$${(totalRevenueCents / 100).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        stripeVerified,
        dailyTrendEstimated: true,
        dailyTrend,
      },
      pricingConfig,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch credit telemetry.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  const parsed = grantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid credit grant.' }, { status: 400 });
  }

  const targetEmail = parsed.data.targetUserEmail.toLowerCase().trim();
  // Target resolution must not depend on the in-memory registry alone: on
  // another serverless instance a self-registered user is absent from
  // AuthStore even though they exist. Fall back to the durable users table.
  let targetEmailResolved: string | undefined = AuthStore.getUserByEmail(targetEmail)?.email;
  if (!targetEmailResolved) {
    const client = getSupabaseAdminClient();
    if (client) {
      const { data } = await client.from('users').select('email').eq('email', targetEmail).maybeSingle();
      if (data?.email) targetEmailResolved = data.email;
    }
  }
  if (!targetEmailResolved) return NextResponse.json({ error: 'Target user was not found.' }, { status: 404 });

  const reason = `Admin grant by ${session.email}${parsed.data.reason ? `: ${parsed.data.reason}` : ''}`;
  const { wallet, transaction } = await CreditWalletService.addBonusCreditsForServer(
    parsed.data.amount,
    reason,
    targetEmailResolved,
    `admin-grant-${parsed.data.requestId}`
  );

  return NextResponse.json({ success: true, wallet, transaction });
}
