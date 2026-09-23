import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { PaymentStore, PaymentRecord } from '@/lib/services/payment-store';
import { PricingService } from '@/lib/services/pricing-service';

export interface EnrichedTransactionRecord {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  credits: number;
  amountCents: number;
  amountFormatted: string;
  currency: string;
  status: 'paid' | 'failed' | 'pending' | 'cancelled';
  credited: boolean;
  planName: string;
  createdAt: string;
  completedAt?: string | null;
}

export async function GET(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase().trim() || '';
    const statusFilter = url.searchParams.get('status')?.toLowerCase() || 'ALL';
    const planFilter = url.searchParams.get('plan') || 'ALL';
    const dateFilter = url.searchParams.get('dateRange') || 'ALL';

    const rawPayments = PaymentStore.list();
    const allUsers = AuthStore.getAllUsers();

    // Map raw payment records to enriched records
    let enrichedList: EnrichedTransactionRecord[] = rawPayments.map((p) => {
      const user = allUsers.find((u) => u.id === p.userId || u.email === p.userId);
      const planDetails = PricingService.getPlanPricingDetails(p.credits);
      const planName = planDetails
        ? `${planDetails.name} (${p.credits.toLocaleString()} Credits)`
        : `${p.credits.toLocaleString()} Credits Package`;

      return {
        sessionId: p.sessionId,
        userId: p.userId,
        userEmail: user?.email || p.userId,
        userName: user?.name || user?.email?.split('@')[0] || 'Customer',
        credits: p.credits,
        amountCents: p.amountCents,
        amountFormatted: `$${(p.amountCents / 100).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        currency: 'USD',
        status: p.status,
        credited: p.credited,
        planName,
        createdAt: p.createdAt,
        completedAt: p.status === 'paid' ? p.createdAt : null,
      };
    });

    // Summary Metrics Calculation (Global Scope)
    const paidRecords = enrichedList.filter((p) => p.status === 'paid');
    const failedRecords = enrichedList.filter((p) => p.status === 'failed');

    const successfulPaymentsCount = paidRecords.length;
    const failedPaymentsCount = failedRecords.length;
    const creditsPurchasedTotal = paidRecords
      .filter((p) => p.credited)
      .reduce((sum, p) => sum + p.credits, 0);
    const totalRevenueCents = paidRecords.reduce((sum, p) => sum + p.amountCents, 0);

    // Apply Search Filter
    if (search) {
      enrichedList = enrichedList.filter(
        (p) =>
          p.sessionId.toLowerCase().includes(search) ||
          p.userEmail.toLowerCase().includes(search) ||
          p.userName.toLowerCase().includes(search) ||
          p.planName.toLowerCase().includes(search) ||
          p.amountFormatted.includes(search)
      );
    }

    // Apply Status Filter
    if (statusFilter !== 'ALL') {
      enrichedList = enrichedList.filter((p) => p.status === statusFilter);
    }

    // Apply Plan Filter
    if (planFilter !== 'ALL') {
      enrichedList = enrichedList.filter((p) => {
        if (planFilter === '5000') return p.credits === 5000;
        if (planFilter === '10000') return p.credits === 10000;
        if (planFilter === '100000') return p.credits === 100000;
        if (planFilter === '300000') return p.credits === 300000;
        return true;
      });
    }

    // Apply Date Range Filter
    if (dateFilter !== 'ALL') {
      const now = Date.now();
      const oneDay = 86_400_000;
      enrichedList = enrichedList.filter((p) => {
        const time = new Date(p.createdAt).getTime();
        if (dateFilter === 'today') return now - time <= oneDay;
        if (dateFilter === '7days') return now - time <= oneDay * 7;
        if (dateFilter === '30days') return now - time <= oneDay * 30;
        if (dateFilter === 'this-month') {
          const currentMonth = new Date().getMonth();
          return new Date(p.createdAt).getMonth() === currentMonth;
        }
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        successfulPayments: successfulPaymentsCount,
        failedPayments: failedPaymentsCount,
        creditsPurchased: creditsPurchasedTotal,
        totalRevenueCents,
        totalRevenueFormatted: `$${(totalRevenueCents / 100).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      },
      transactions: enrichedList,
      totalCount: enrichedList.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch billing transactions.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
