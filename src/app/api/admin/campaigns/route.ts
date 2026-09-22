import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { AdminCampaignStore, type AdminCampaign } from '@/lib/services/admin-campaign-store';

function formatProgress(processed: number, total: number): { processed: number; total: number; percentage: number; text: string } {
  const safeTotal = Math.max(0, total);
  const safeProcessed = Math.max(0, Math.min(processed, safeTotal > 0 ? safeTotal : processed));
  const percentage = safeTotal > 0 ? Math.round((safeProcessed / safeTotal) * 100) : 0;
  return {
    processed: safeProcessed,
    total: safeTotal,
    percentage,
    text: `${safeProcessed.toLocaleString()} / ${safeTotal.toLocaleString()} (${percentage}%)`,
  };
}

function calculateSuccessRate(delivered: number, processed: number): { rate: number | null; text: string } {
  if (processed <= 0) return { rate: null, text: '—' };
  const rate = Math.round((delivered / processed) * 1000) / 10;
  return { rate, text: `${rate.toFixed(1)}%` };
}

function enrichCampaignForAdmin(campaign: AdminCampaign) {
  const progressInfo = formatProgress(campaign.processedProspects, campaign.totalProspects);
  const successInfo = calculateSuccessRate(campaign.deliveredCount, campaign.processedProspects);

  return {
    id: campaign.id,
    name: campaign.name,
    ownerUserId: campaign.ownerUserId,
    ownerEmail: campaign.ownerEmail,
    ownerName: campaign.ownerName || campaign.ownerEmail.split('@')[0],
    ownerAvatarUrl: campaign.ownerAvatarUrl || null,
    organizationName: campaign.organizationName || null,
    status: campaign.status,
    createdAt: campaign.createdAt,
    startedAt: campaign.startedAt || null,
    completedAt: campaign.completedAt || null,
    updatedAt: campaign.updatedAt || campaign.createdAt,
    totalProspects: progressInfo.total,
    processedProspects: progressInfo.processed,
    deliveredCount: campaign.deliveredCount || 0,
    failedCount: campaign.failedCount || 0,
    noFormCount: campaign.noFormCount || 0,
    reviewCount: campaign.reviewCount || 0,
    repliedCount: campaign.repliedCount || 0,
    progressText: progressInfo.text,
    progressPercentage: progressInfo.percentage,
    successRateText: successInfo.text,
    successRateValue: successInfo.rate,
    tag: campaign.tag || 'CUSTOM',
    logsCount: Array.isArray(campaign.logs) ? campaign.logs.length : 0,
  };
}

export async function GET(req: NextRequest) {
  // 1. Strict Server-Side RBAC Enforcement: ADMIN or SUPER_ADMIN required
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim() || '';
  const userFilter = url.searchParams.get('userEmail') || 'all';
  const statusFilter = url.searchParams.get('status')?.toLowerCase() || 'all';
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '25', 10)));

  // 2. Retrieve All Registered System Campaigns
  let campaigns = AdminCampaignStore.getAllCampaigns();

  // 3. Role-Aware Isolation
  if (session.role === 'SUPER_ADMIN') {
    // Super Admin can view all campaigns or filter by specific user
    if (userFilter !== 'all') {
      campaigns = campaigns.filter((c) => c.ownerEmail.toLowerCase().trim() === userFilter.toLowerCase().trim());
    }
  } else if (session.role === 'ADMIN') {
    // Admin role access per authorization boundaries
    if (userFilter !== 'all') {
      campaigns = campaigns.filter((c) => c.ownerEmail.toLowerCase().trim() === userFilter.toLowerCase().trim());
    }
  }

  // 4. Omni Search Filter: Campaign Name, User Name, User Email, Campaign ID
  if (q) {
    campaigns = campaigns.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchOwnerName = (c.ownerName || '').toLowerCase().includes(q);
      const matchOwnerEmail = c.ownerEmail.toLowerCase().includes(q);
      const matchId = c.id.toLowerCase().includes(q);
      const matchOrg = (c.organizationName || '').toLowerCase().includes(q);
      return matchName || matchOwnerName || matchOwnerEmail || matchId || matchOrg;
    });
  }

  // 5. Campaign Status Filter
  if (statusFilter !== 'all') {
    campaigns = campaigns.filter((c) => c.status.toLowerCase() === statusFilter);
  }

  // 6. Enrich Campaigns with Computed Metrics
  let enriched = campaigns.map(enrichCampaignForAdmin);

  // 7. Dynamic Sorting
  enriched.sort((a, b) => {
    let valA: any = a[sortBy as keyof typeof a] ?? '';
    let valB: any = b[sortBy as keyof typeof b] ?? '';

    if (sortBy === 'createdAt' || sortBy === 'startedAt' || sortBy === 'completedAt') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else if (sortBy === 'progress') {
      valA = a.progressPercentage;
      valB = b.progressPercentage;
    } else if (sortBy === 'successRate') {
      valA = a.successRateValue ?? -1;
      valB = b.successRateValue ?? -1;
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 8. Server-Side Pagination
  const total = enriched.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedCampaigns = enriched.slice(startIndex, startIndex + limit);

  // 9. Fetch Real Users list for Super Admin "All Users" Filter Dropdown
  const registeredUsers = AuthStore.getAllUsers().map((u) => ({
    id: u.id,
    name: u.name || u.email.split('@')[0],
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl || null,
  }));

  return NextResponse.json({
    campaigns: paginatedCampaigns,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    users: registeredUsers,
    currentUser: {
      userId: session.userId,
      email: session.email,
      role: session.role,
    },
  });
}

export async function POST(req: NextRequest) {
  // Sync client/user campaigns to server store
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    if (Array.isArray(body.campaigns)) {
      const synced = AdminCampaignStore.syncCampaigns(body.campaigns);
      return NextResponse.json({ success: true, count: synced.length });
    }

    if (body.id && body.name && body.ownerEmail) {
      const saved = AdminCampaignStore.saveCampaign(body);
      return NextResponse.json({ success: true, campaign: enrichCampaignForAdmin(saved) });
    }

    return NextResponse.json({ error: 'Invalid campaign payload.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync campaigns.' }, { status: 500 });
  }
}
