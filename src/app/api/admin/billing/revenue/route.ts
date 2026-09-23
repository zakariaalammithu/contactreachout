import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { PaymentStore } from '@/lib/services/payment-store';
import { PricingService, PLAN_PRICING_DETAILS } from '@/lib/services/pricing-service';

export async function GET(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'last-30-days';

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

    let start: Date;
    let end: Date = endOfDay;

    if (range === 'today') {
      start = startOfDay;
    } else if (range === 'yesterday') {
      start = new Date(startOfDay.getTime() - 86_400_000);
      end = startOfDay;
    } else if (range === 'last-7-days') {
      start = new Date(startOfDay.getTime() - 6 * 86_400_000);
    } else if (range === 'last-30-days') {
      start = new Date(startOfDay.getTime() - 29 * 86_400_000);
    } else if (range === 'last-90-days') {
      start = new Date(startOfDay.getTime() - 89 * 86_400_000);
    } else if (range === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'this-year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (range === 'custom') {
      const sParam = url.searchParams.get('startDate');
      const eParam = url.searchParams.get('endDate');
      start = sParam ? new Date(`${sParam}T00:00:00`) : new Date(startOfDay.getTime() - 29 * 86_400_000);
      end = eParam ? new Date(`${eParam}T23:59:59`) : endOfDay;
    } else {
      start = new Date(startOfDay.getTime() - 29 * 86_400_000);
    }

    const allPayments = PaymentStore.list();
    const paidPayments = allPayments.filter((p) => p.status === 'paid');

    // Revenue totals
    const todayPayments = paidPayments.filter((p) => {
      const t = new Date(p.createdAt);
      return t >= startOfDay && t < endOfDay;
    });
    const revenueTodayCents = todayPayments.reduce((sum, p) => sum + p.amountCents, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthPayments = paidPayments.filter((p) => new Date(p.createdAt) >= monthStart);
    const revenueThisMonthCents = monthPayments.reduce((sum, p) => sum + p.amountCents, 0);

    const totalRevenueCents = paidPayments.reduce((sum, p) => sum + p.amountCents, 0);

    // Range payments
    const rangePayments = paidPayments.filter((p) => {
      const t = new Date(p.createdAt);
      return t >= start && t < end;
    });

    // Package Sales Breakdown according to canonical PLAN_PRICING_DETAILS
    const canonicalPlans = [
      { key: 'starter_monthly', name: 'Starter', cycle: 'Monthly', credits: 5000, priceFormatted: '$50/mo', priceCents: 5000 },
      { key: 'starter_yearly', name: 'Starter', cycle: 'Yearly', credits: 60000, priceFormatted: '$480/yr', priceCents: 48000 },
      { key: 'growth_monthly', name: 'Growth', cycle: 'Monthly', credits: 10000, priceFormatted: '$99/mo', priceCents: 9900 },
      { key: 'growth_yearly', name: 'Growth', cycle: 'Yearly', credits: 120000, priceFormatted: '$948/yr', priceCents: 94800 },
      { key: 'scale_monthly', name: 'Scale', cycle: 'Monthly', credits: 100000, priceFormatted: '$199/mo', priceCents: 19900 },
      { key: 'scale_yearly', name: 'Scale', cycle: 'Yearly', credits: 1200000, priceFormatted: '$1,908/yr', priceCents: 190800 },
      { key: 'enterprise_monthly', name: 'Enterprise', cycle: 'Monthly', credits: 300000, priceFormatted: '$299/mo', priceCents: 29900 },
      { key: 'enterprise_yearly', name: 'Enterprise', cycle: 'Yearly', credits: 3600000, priceFormatted: '$2,868/yr', priceCents: 286800 },
    ];

    const packageSalesBreakdown = canonicalPlans.map((plan) => {
      const matchingSales = rangePayments.filter((p) => p.credits === plan.credits || p.amountCents === plan.priceCents);
      const salesCount = matchingSales.length;
      const totalCents = matchingSales.reduce((sum, p) => sum + p.amountCents, 0);

      return {
        ...plan,
        salesCount,
        revenueCents: totalCents,
        revenueFormatted: `$${(totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
    });

    // Revenue Trend calculation
    const dayMs = 86_400_000;
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));
    const stepDays = daysDiff > 90 ? 7 : 1;

    const revenueTrend: Array<{ date: string; revenue: number; salesCount: number }> = [];
    let curr = new Date(start.getTime());

    while (curr < end) {
      const next = new Date(curr.getTime() + dayMs * stepDays);
      const bucketPayments = rangePayments.filter((p) => {
        const d = new Date(p.createdAt);
        return d >= curr && d < next;
      });

      const bucketRevenue = bucketPayments.reduce((sum, p) => sum + p.amountCents / 100, 0);
      revenueTrend.push({
        date: curr.toISOString().slice(0, 10),
        revenue: Math.round(bucketRevenue * 100) / 100,
        salesCount: bucketPayments.length,
      });

      curr = next;
    }

    return NextResponse.json({
      success: true,
      metrics: {
        todayCents: revenueTodayCents,
        todayFormatted: `$${(revenueTodayCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        thisMonthCents: revenueThisMonthCents,
        thisMonthFormatted: `$${(revenueThisMonthCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalCents: totalRevenueCents,
        totalFormatted: `$${(totalRevenueCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        successfulTransactionsCount: paidPayments.length,
      },
      packageSalesBreakdown,
      revenueTrend,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch revenue analytics.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
