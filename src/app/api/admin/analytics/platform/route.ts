import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { PaymentStore } from '@/lib/services/payment-store';
import { QueueManager } from '@/lib/queue/queue-manager';
import { WebsiteAnalyticsService } from '@/lib/services/website-analytics-service';
import { AdminCampaignStore } from '@/lib/services/admin-campaign-store';

export async function GET(req: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const params = req.nextUrl.searchParams;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
  const range = params.get('range') || 'last-30-days';
  let start: Date;
  let end: Date;

  if (range === 'today') {
    start = startOfDay;
    end = endOfDay;
  } else if (range === 'yesterday') {
    start = new Date(startOfDay.getTime() - 86_400_000);
    end = startOfDay;
  } else if (range === 'last-7-days') {
    start = new Date(startOfDay.getTime() - 6 * 86_400_000);
    end = endOfDay;
  } else if (range === 'last-30-days') {
    start = new Date(startOfDay.getTime() - 29 * 86_400_000);
    end = endOfDay;
  } else if (range === 'last-90-days') {
    start = new Date(startOfDay.getTime() - 89 * 86_400_000);
    end = endOfDay;
  } else if (range === 'this-month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = endOfDay;
  } else if (range === 'this-year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = endOfDay;
  } else if (range === 'custom') {
    start = new Date(`${params.get('startDate') || ''}T00:00:00`);
    end = new Date(`${params.get('endDate') || ''}T00:00:00`);
    end.setDate(end.getDate() + 1);
  } else {
    start = new Date(startOfDay.getTime() - 29 * 86_400_000);
    end = endOfDay;
  }

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end ||
    end.getTime() - start.getTime() > 366 * 86_400_000
  ) {
    return NextResponse.json({ error: 'Invalid analytics date range.' }, { status: 400 });
  }

  try {
    const users = AuthStore.getAllUsers();
    const payments = PaymentStore.list();
    const queueStats = await QueueManager.getStatistics();
    const visitorAnalytics = await WebsiteAnalyticsService.getAnalytics(start, end);
    const campaigns = AdminCampaignStore.getAllCampaigns();

    const usersInRange = users.filter((user) => {
      const createdAt = new Date(user.createdAt);
      return createdAt >= start && createdAt < end;
    });

    const campaignsInRange = campaigns.filter((c) => {
      const createdAt = new Date(c.createdAt);
      return createdAt >= start && createdAt < end;
    });

    const campaignsStartedInRange = campaignsInRange.filter(
      (c) => c.status === 'running' || c.status === 'completed' || (c.processedProspects || 0) > 0
    );

    const paymentsInRange = payments.filter((payment) => {
      const createdAt = new Date(payment.createdAt);
      return createdAt >= start && createdAt < end;
    });

    const paidPayments = payments.filter((payment) => payment.status === 'paid');
    const paidPaymentsInRange = paymentsInRange.filter((payment) => payment.status === 'paid');
    const paidUserIdsAll = new Set(paidPayments.map((payment) => payment.userId));
    const paidUserIdsInRange = new Set(paidPaymentsInRange.map((payment) => payment.userId));

    const revenueToday = paidPayments
      .filter(
        (payment) =>
          new Date(payment.createdAt) >= startOfDay && new Date(payment.createdAt) < endOfDay
      )
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueThisMonth = paidPayments
      .filter((payment) => new Date(payment.createdAt) >= monthStart)
      .reduce((sum, payment) => sum + payment.amountCents, 0);
    const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amountCents, 0);

    // Calculate user growth trend points
    const dayMs = 86_400_000;
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));
    const stepDays = daysDiff > 90 ? 7 : 1;

    const userTrend: Array<{ date: string; newUsers: number; cumulativeUsers: number }> = [];
    let curr = new Date(start.getTime());
    let runningTotal = users.filter((u) => new Date(u.createdAt) < start).length;

    while (curr < end) {
      const next = new Date(curr.getTime() + dayMs * stepDays);
      const bucketUsers = users.filter((u) => {
        const d = new Date(u.createdAt);
        return d >= curr && d < next;
      });
      runningTotal += bucketUsers.length;
      userTrend.push({
        date: curr.toISOString().slice(0, 10),
        newUsers: bucketUsers.length,
        cumulativeUsers: runningTotal,
      });
      curr = next;
    }

    const totalUserCount = users.length;
    const verifiedUsersCount = users.filter((u) => u.isEmailVerified).length;
    const activeUsersCount = users.filter((u) => !u.isSuspended).length;
    const suspendedUsersCount = users.filter((u) => u.isSuspended).length;
    const totalPaidUsersCount = paidUserIdsAll.size;

    return NextResponse.json(
      {
        users: {
          total: totalUserCount,
          new: usersInRange.length,
          active: activeUsersCount,
          suspended: suspendedUsersCount,
          verified: verifiedUsersCount,
          unverified: totalUserCount - verifiedUsersCount,
          paid: totalPaidUsersCount,
          free: Math.max(0, totalUserCount - totalPaidUsersCount),
          paidInRange: paidUserIdsInRange.size,
          verificationRate:
            totalUserCount > 0
              ? Math.round((verifiedUsersCount / totalUserCount) * 1000) / 10
              : 0,
          paidConversionRate:
            totalUserCount > 0
              ? Math.round((totalPaidUsersCount / totalUserCount) * 1000) / 10
              : 0,
        },
        userTrend,
        funnel: {
          websiteVisitors: visitorAnalytics.metrics?.uniqueVisitors ?? null,
          signups: usersInRange.length,
          emailVerified: usersInRange.filter((user) => user.isEmailVerified).length,
          campaignCreated: campaignsInRange.length,
          firstSubmission: campaignsStartedInRange.length,
          paidCustomers: paidUserIdsInRange.size,
          visitorToSignupRate:
            visitorAnalytics.metrics?.uniqueVisitors && visitorAnalytics.metrics.uniqueVisitors > 0
              ? Math.round((usersInRange.length / visitorAnalytics.metrics.uniqueVisitors) * 1000) / 10
              : null,
          signupToVerifiedRate:
            usersInRange.length > 0
              ? Math.round(
                  (usersInRange.filter((user) => user.isEmailVerified).length / usersInRange.length) * 1000
                ) / 10
              : null,
          verifiedToCampaignRate:
            usersInRange.filter((u) => u.isEmailVerified).length > 0
              ? Math.round(
                  (campaignsInRange.length / usersInRange.filter((u) => u.isEmailVerified).length) * 1000
                ) / 10
              : null,
          campaignToPaidRate:
            campaignsInRange.length > 0
              ? Math.round((paidUserIdsInRange.size / campaignsInRange.length) * 1000) / 10
              : null,
        },
        productUsage: {
          activeCampaigns: campaigns.filter((c) => c.status === 'running').length,
          totalCampaigns: campaigns.length,
          totalProspects: campaigns.reduce((sum, c) => sum + (c.totalProspects || 0), 0),
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
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Platform analytics are currently unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
