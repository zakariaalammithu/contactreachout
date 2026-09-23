import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { AdminSubmissionStore, type AdminSubmissionItem } from '@/lib/services/admin-submission-store';

export async function GET(req: NextRequest) {
  // 1. Server-Side RBAC Enforcement: ADMIN or SUPER_ADMIN required
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim() || '';
  const userFilter = url.searchParams.get('userEmail') || 'all';
  const campaignFilter = url.searchParams.get('campaignName') || 'all';
  const statusFilter = url.searchParams.get('status')?.toUpperCase() || 'ALL';
  const modeFilter = url.searchParams.get('mode')?.toUpperCase() || 'ALL';
  const dateRangeFilter = url.searchParams.get('dateRange')?.toLowerCase() || 'all';
  const sortBy = url.searchParams.get('sortBy') || 'timestamp';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '25', 10)));

  // 2. Fetch All Submissions from Canonical Store
  let submissions = AdminSubmissionStore.getAllSubmissions();

  // Extract metadata options for filter dropdowns
  const allCampaigns = Array.from(new Set(submissions.map((s) => s.campaignName).filter(Boolean)));
  const registeredUsers = AuthStore.getAllUsers().map((u) => ({
    id: u.id,
    name: u.name || u.email.split('@')[0],
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl || null,
  }));

  // 3. Role-Aware Isolation
  if (session.role === 'SUPER_ADMIN') {
    if (userFilter !== 'all') {
      submissions = submissions.filter((s) => s.ownerEmail.toLowerCase().trim() === userFilter.toLowerCase().trim());
    }
  } else if (session.role === 'ADMIN') {
    if (userFilter !== 'all') {
      submissions = submissions.filter((s) => s.ownerEmail.toLowerCase().trim() === userFilter.toLowerCase().trim());
    }
  }

  // 4. Omni Search Filter: Company Name, Target URL, Domain, Owner Name/Email, Campaign Name, Sub ID
  if (q) {
    submissions = submissions.filter((s) => {
      const matchCompany = s.companyName.toLowerCase().includes(q);
      const matchTarget = s.targetUrl.toLowerCase().includes(q);
      const matchDomain = s.domain.toLowerCase().includes(q);
      const matchWebsite = s.website.toLowerCase().includes(q);
      const matchOwnerName = (s.ownerName || '').toLowerCase().includes(q);
      const matchOwnerEmail = s.ownerEmail.toLowerCase().includes(q);
      const matchCampaign = (s.campaignName || '').toLowerCase().includes(q);
      const matchId = s.id.toLowerCase().includes(q);
      return matchCompany || matchTarget || matchDomain || matchWebsite || matchOwnerName || matchOwnerEmail || matchCampaign || matchId;
    });
  }

  // 5. Campaign Filter
  if (campaignFilter !== 'all') {
    submissions = submissions.filter((s) => (s.campaignName || '').toLowerCase().trim() === campaignFilter.toLowerCase().trim());
  }

  // 6. Status Filter
  if (statusFilter !== 'ALL') {
    submissions = submissions.filter((s) => {
      const st = (s.status || '').toUpperCase();
      if (statusFilter === 'SUCCESS') return st === 'SUCCESS' || st === 'DELIVERED' || st === 'DRY_RUN_COMPLETED';
      if (statusFilter === 'FAILED') return st === 'FAILED' || st === 'BLOCKED';
      if (statusFilter === 'CAPTCHA' || statusFilter === 'REVIEW') return st === 'CAPTCHA' || st === 'REVIEW_REQUIRED' || st === 'REVIEW';
      if (statusFilter === 'NO_FORM') return st === 'NO_FORM' || st === 'NO-FORM';
      return st === statusFilter;
    });
  }

  // 7. Mode Filter
  if (modeFilter !== 'ALL') {
    submissions = submissions.filter((s) => (s.submissionMode || '').toUpperCase() === modeFilter);
  }

  // 8. Date Range Filter
  if (dateRangeFilter !== 'all') {
    const now = Date.now();
    submissions = submissions.filter((s) => {
      const itemTime = new Date(s.timestamp).getTime();
      if (isNaN(itemTime)) return true;
      if (dateRangeFilter === 'today') return now - itemTime <= 86400000;
      if (dateRangeFilter === 'last7days') return now - itemTime <= 7 * 86400000;
      if (dateRangeFilter === 'last30days') return now - itemTime <= 30 * 86400000;
      return true;
    });
  }

  // 9. Dynamic Sorting
  submissions.sort((a, b) => {
    let valA: any = a[sortBy as keyof typeof a] ?? '';
    let valB: any = b[sortBy as keyof typeof b] ?? '';

    if (sortBy === 'timestamp') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else if (sortBy === 'executionLatencyMs') {
      valA = typeof a.executionLatencyMs === 'number' ? a.executionLatencyMs : 0;
      valB = typeof b.executionLatencyMs === 'number' ? b.executionLatencyMs : 0;
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 10. Server-Side Pagination
  const total = submissions.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedSubmissions = submissions.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    submissions: paginatedSubmissions,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    options: {
      users: registeredUsers,
      campaigns: allCampaigns,
    },
    currentUser: {
      userId: session.userId,
      email: session.email,
      role: session.role,
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    if (Array.isArray(body.submissions)) {
      const synced = AdminSubmissionStore.syncSubmissions(body.submissions);
      return NextResponse.json({ success: true, count: synced.length });
    }

    if (body.id && body.ownerEmail) {
      const saved = AdminSubmissionStore.saveSubmission(body);
      return NextResponse.json({ success: true, submission: saved });
    }

    return NextResponse.json({ error: 'Invalid submission payload.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync submissions.' }, { status: 500 });
  }
}
