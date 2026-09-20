import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { PaymentStore } from '@/lib/services/payment-store';
import { QueueManager } from '@/lib/queue/queue-manager';
import { WebsiteAnalyticsService } from '@/lib/services/website-analytics-service';

export async function GET(req: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const params = req.nextUrl.searchParams;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
  const range = params.get('range') || 'last-7-days';
  let start: Date;
  let end: Date;

  if (range === 'today') {
    start = startOfDay; end = endOfDay;
  } else if (range === 'yesterday') {
    start = new Date(startOfDay.getTime() - 86_400_000); end = startOfDay;
  } else if (range === 'last-30-days') {
    start = new Date(startOfDay.getTime() - 29 * 86_400_000); end = endOfDay;
  } else if (range === 'this-month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1); end = endOfDay;
  } else if (range === 'custom') {
    start = new Date(`${params.get('startDate') || ''}T00:00:00`);
    end = new Date(`${params.get('endDate') || ''}T00:00:00`);
    end.setDate(end.getDate() + 1);
  } else {
    start = new Date(startOfDay.getTime() - 6 * 86_400_000); end = endOfDay;
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end || end.getTime() - start.getTime() > 366 * 86_400_000) {
    return NextResponse.json({ error: 'Invalid analytics date range.' }, { status: 400 });
  }

  try {
    const users = AuthStore.getAllUsers();
    const payments = PaymentStore.list();
    const queueStats = await QueueManager.getStatistics();
    const visitorAnalytics = await WebsiteAnalyticsService.getAnalytics(start, end);
    const usersInRange = users.filter((user) => {
      const createdAt = new Date(user.createdAt);
      return createdAt >= start && createdAt < end;
    });
    const paymentsInRange = payments.filter((payment) => {
      const createdAt = new Date(payment.createdAt);
      return createdAt >= start && createdAt < end;
    });
    const paidPayments = payments.filter((payment) => payment.status === 'paid');
    const paidPaymentsInRange = paymentsInRange.filter((payment) => payment.status === 'paid');
    const paidUserIdsInRange = new Set(paidPaymentsInRange.map((payment) => payment.userId));

    const revenueToday = paidPayments
      .filter((payment) => new Date(payment.createdAt) >= startOfDay && new Date(payment.createdAt) < endOfDay)
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueThisMonth = paidPayments
      .filter((payment) => new Date(payment.createdAt) >= monthStart)
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amountCents, 0);

    return NextResponse.json({
      users: {
        total: users.length,
        new: usersInRange.length,
        active: users.filter((user) => !user.isSuspended).length,
        verified: usersInRange.filter((user) => user.isEmailVerified).length,
        paid: paidUserIdsInRange.size,
      },
      funnel: {
        websiteVisitors: visitorAnalytics.metrics?.uniqueVisitors ?? null,
        signups: usersInRange.length,
        emailVerified: usersInRange.filter((user) => user.isEmailVerified).length,
        campaignCreated: null,
        firstSubmission: null,
        paidCustomers: paidUserIdsInRange.size,
        visitorToSignupRate: null,
        signupToVerifiedRate: usersInRange.length > 0
          ? Math.round((usersInRange.filter((user) => user.isEmailVerified).length / usersInRange.length) * 1000) / 10
          : null,
        verifiedToCampaignRate: null,
        campaignToPaidRate: null,
      },
      productUsage: {
        activeCampaigns: null,
        totalCampaigns: null,
        totalProspects: null,
        totalSubmissions: queueStats.completed + queueStats.failed,
        successfulSubmissions: queueStats.completed,
        failedSubmissions: queueStats.failed,
        creditsUsed: null,
        creditsPurchased: paidPaymentsInRange.reduce((sum, payment) => sum + payment.credits, 0),
        aiPersonalizationUsage: null,
      },
      revenue: {
        todayCents: revenueToday,
        thisMonthCents: revenueThisMonth,
        totalCents: totalRevenue,
        successfulTransactions: paidPayments.length,
        failedTransactions: payments.filter((payment) => payment.status === 'failed').length,
        creditsPurchased: paidPayments.reduce((sum, payment) => sum + payment.credits, 0),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { error: 'Platform analytics are currently unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
