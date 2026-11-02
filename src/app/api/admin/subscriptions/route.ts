import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { PaymentStore } from '@/lib/services/payment-store';
import { listDurablePayments } from '@/lib/services/stripe-payment-record';
import {
  listAllSubscriptions,
  listRemindersForSubscription,
  subscriptionsTablesAvailable,
  type UserSubscription,
} from '@/lib/services/subscription-service';
import { getDaysRemaining, isSubscriptionExpired } from '@/lib/services/subscription-policy';

export const dynamic = 'force-dynamic';

/**
 * Admin subscription list + aggregates (brief §1).
 * Sources: user_subscriptions (durable, once migrated) for subscription
 * truth; stripe_payments (durable, once migrated) else PaymentStore for
 * payment history; AuthStore for display names (best-effort — a user
 * absent from this instance's registry still lists, with name null).
 * Until the migration is applied the list is empty by construction, and
 * the response says so instead of fabricating rows.
 */
export async function GET(request: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const params = request.nextUrl.searchParams;
    const status = params.get('status') || 'all';
    const expiringParam = params.get('expiringWithinDays');
    const expiringWithinDays = expiringParam ? Number(expiringParam) : undefined;

    const rows = await listAllSubscriptions({
      status,
      expiringWithinDays: Number.isFinite(expiringWithinDays) ? expiringWithinDays : undefined,
    });

    const durablePayments = await listDurablePayments();
    const payments = durablePayments ?? PaymentStore.list();
    const paidPayments = payments.filter((p) => p.status === 'paid');

    const now = Date.now();
    const active = rows.filter((r) => r.status === 'active' || r.status === 'past_due');
    const expired = rows.filter((r) =>
      isSubscriptionExpired({
        id: r.id,
        status: r.status,
        current_period_end: r.currentPeriodEnd,
        cancel_at_period_end: r.cancelAtPeriodEnd,
      }),
    );
    const expiringIn5Days = rows.filter(
      (r) =>
        (r.status === 'active' || r.status === 'past_due') &&
        r.currentPeriodEnd &&
        new Date(r.currentPeriodEnd).getTime() > now &&
        new Date(r.currentPeriodEnd).getTime() <= now + 5 * 86_400_000,
    );
    const renewed = rows.filter((r) => r.renewalCount > 0);

    const packageWiseUsers: Record<string, number> = {};
    const packageWiseCurrentPeriodCents: Record<string, number> = {};
    for (const r of active) {
      const plan = r.planName || 'Unknown';
      packageWiseUsers[plan] = (packageWiseUsers[plan] || 0) + 1;
      packageWiseCurrentPeriodCents[plan] =
        (packageWiseCurrentPeriodCents[plan] || 0) + (r.amountCents || 0);
    }

    const recentPurchases = [...paidPayments]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 20);
    const totalRevenueCents = paidPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0);

    const subscriptions = [];
    for (const r of rows) {
      const account = AuthStore.getUserByEmail(r.userEmail);
      const userPayments = payments
        .filter((p) => p.userId === r.userEmail)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);
      subscriptions.push({
        ...r,
        userName: account?.name || null,
        daysRemaining: getDaysRemaining(r.currentPeriodEnd),
        isExpired: isSubscriptionExpired({
          id: r.id,
          status: r.status,
          current_period_end: r.currentPeriodEnd,
          cancel_at_period_end: r.cancelAtPeriodEnd,
        }),
        reminders: await listRemindersForSubscription(r.id),
        payments: userPayments,
      });
    }

    const upcomingRenewals = [...expiringIn5Days]
      .sort((a, b) => new Date(a.currentPeriodEnd || 0).getTime() - new Date(b.currentPeriodEnd || 0).getTime())
      .map((r) => ({
        userEmail: r.userEmail,
        planName: r.planName,
        currentPeriodEnd: r.currentPeriodEnd,
        daysRemaining: getDaysRemaining(r.currentPeriodEnd),
      }));

    return NextResponse.json({
      success: true,
      tablesAvailable: await subscriptionsTablesAvailable(),
      subscriptions,
      aggregates: {
        totalActive: active.length,
        totalExpired: expired.length,
        expiringIn5Days: expiringIn5Days.length,
        totalRenewed: renewed.length,
        packageWiseUsers,
        packageWiseCurrentPeriodCents,
        totalRevenueCents,
        recentPurchases,
        upcomingRenewals,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch subscriptions.' },
      { status: 500 },
    );
  }
}
