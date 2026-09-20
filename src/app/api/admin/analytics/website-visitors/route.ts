import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { WebsiteAnalyticsService } from '@/lib/services/website-analytics-service';

function getDateRange(request: NextRequest): { start: Date; end: Date } | null {
  const params = request.nextUrl.searchParams;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
  const range = params.get('range') || 'last-7-days';

  if (range === 'today') return { start: startOfDay, end: endOfDay };
  if (range === 'yesterday') {
    return { start: new Date(startOfDay.getTime() - 86_400_000), end: startOfDay };
  }
  if (range === 'last-7-days') {
    return { start: new Date(startOfDay.getTime() - 6 * 86_400_000), end: endOfDay };
  }
  if (range === 'last-30-days') {
    return { start: new Date(startOfDay.getTime() - 29 * 86_400_000), end: endOfDay };
  }
  if (range === 'this-month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay };
  }
  if (range === 'custom') {
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    if (!startDate || !endDate) return null;
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    end.setDate(end.getDate() + 1);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;
    if (end.getTime() - start.getTime() > 366 * 86_400_000) return null;
    return { start, end };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const dateRange = getDateRange(req);
  if (!dateRange) {
    return NextResponse.json({ error: 'Invalid analytics date range.' }, { status: 400 });
  }

  try {
    const analytics = await WebsiteAnalyticsService.getAnalytics(dateRange.start, dateRange.end);
    return NextResponse.json(analytics, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Visitor analytics are currently unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
