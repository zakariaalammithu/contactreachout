import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { AdminLeadStore, type AdminLeadItem } from '@/lib/services/admin-lead-store';
import Papa from 'papaparse';

export async function GET(req: NextRequest) {
  // 1. Server-Side RBAC Enforcement: ADMIN or SUPER_ADMIN required
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim() || '';
  const userFilter = url.searchParams.get('userEmail') || 'all';
  const listFilter = url.searchParams.get('listName') || 'all';
  const statusFilter = url.searchParams.get('status')?.toUpperCase() || 'ALL';
  const confidenceFilter = url.searchParams.get('confidence')?.toLowerCase() || 'all';
  const dateRangeFilter = url.searchParams.get('dateRange')?.toLowerCase() || 'all';
  const countryFilter = url.searchParams.get('country') || 'all';
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '25', 10)));
  const isExportCsv = url.searchParams.get('export') === 'csv';

  // 2. Fetch All Leads from Canonical Store
  let leads = AdminLeadStore.getAllLeads();

  // Extract metadata options for filter dropdowns
  const allLeadLists = Array.from(new Set(leads.map((l) => l.listName).filter((name): name is string => Boolean(name))));
  const allCountries = Array.from(new Set(leads.map((l) => l.country).filter((c): c is string => Boolean(c) && c !== 'N/A')));
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
      leads = leads.filter((l) => l.ownerEmail.toLowerCase().trim() === userFilter.toLowerCase().trim());
    }
  } else if (session.role === 'ADMIN') {
    if (userFilter !== 'all') {
      leads = leads.filter((l) => l.ownerEmail.toLowerCase().trim() === userFilter.toLowerCase().trim());
    }
  }

  // 4. Omni Search Filter: Company, Domain, Email, Recipient, Owner, List, Website, Contact Page
  if (q) {
    leads = leads.filter((l) => {
      const matchCompany = l.companyName.toLowerCase().includes(q);
      const matchDomain = l.domain.toLowerCase().includes(q);
      const matchWebsite = l.website.toLowerCase().includes(q);
      const matchEmail = (l.email || '').toLowerCase().includes(q);
      const matchRecipient = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase().includes(q);
      const matchOwnerName = (l.ownerName || '').toLowerCase().includes(q);
      const matchOwnerEmail = l.ownerEmail.toLowerCase().includes(q);
      const matchList = (l.listName || '').toLowerCase().includes(q);
      const matchContactUrl = (l.contactPageUrl || '').toLowerCase().includes(q);
      return (
        matchCompany ||
        matchDomain ||
        matchWebsite ||
        matchEmail ||
        matchRecipient ||
        matchOwnerName ||
        matchOwnerEmail ||
        matchList ||
        matchContactUrl
      );
    });
  }

  // 5. Lead List Filter
  if (listFilter !== 'all') {
    leads = leads.filter((l) => (l.listName || '').toLowerCase().trim() === listFilter.toLowerCase().trim());
  }

  // 6. Status Filter
  if (statusFilter !== 'ALL') {
    leads = leads.filter((l) => (l.status || '').toUpperCase() === statusFilter);
  }

  // 7. Confidence Filter
  if (confidenceFilter !== 'all') {
    leads = leads.filter((l) => {
      const conf = typeof l.formConfidence === 'number' ? l.formConfidence : -1;
      if (confidenceFilter === 'high') return conf >= 90;
      if (confidenceFilter === 'medium') return conf >= 70 && conf < 90;
      if (confidenceFilter === 'low') return conf > 0 && conf < 70;
      if (confidenceFilter === 'none') return conf <= 0;
      return true;
    });
  }

  // 8. Country Filter
  if (countryFilter !== 'all') {
    leads = leads.filter((l) => (l.country || '').toLowerCase().trim() === countryFilter.toLowerCase().trim());
  }

  // 9. Date Range Filter
  if (dateRangeFilter !== 'all') {
    const now = Date.now();
    leads = leads.filter((l) => {
      const itemTime = new Date(l.createdAt).getTime();
      if (isNaN(itemTime)) return true;
      if (dateRangeFilter === 'today') {
        return now - itemTime <= 86400000;
      }
      if (dateRangeFilter === 'last7days') {
        return now - itemTime <= 7 * 86400000;
      }
      if (dateRangeFilter === 'last30days') {
        return now - itemTime <= 30 * 86400000;
      }
      return true;
    });
  }

  // 10. Real Summary Metrics (Calculated directly from filtered/queried leads)
  const summaryMetrics = {
    totalLeads: leads.length,
    totalLeadLists: new Set(leads.map((l) => l.listName).filter(Boolean)).size,
    usersWithLeads: new Set(leads.map((l) => l.ownerEmail)).size,
    submittedCount: leads.filter((l) => l.status === 'SUBMITTED').length,
    pendingCount: leads.filter((l) => l.status === 'PENDING' || l.status === 'UNCONTACTED').length,
    failedCount: leads.filter((l) => l.status === 'FAILED').length,
    reviewRequiredCount: leads.filter((l) => l.status === 'REVIEW_REQUIRED' || l.status === 'BLOCKED').length,
  };

  // 11. Export CSV functionality
  if (isExportCsv) {
    const csvRows = leads.map((l) => ({
      'Company Name': l.companyName,
      'Domain': l.domain,
      'Website URL': l.website,
      'Contact Page URL': l.contactPageUrl || 'N/A',
      'Recipient Email': l.email || 'N/A',
      'Recipient Name': `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'N/A',
      'Country': l.country || 'N/A',
      'Lead List': l.listName || 'N/A',
      'Confidence %': typeof l.formConfidence === 'number' ? `${l.formConfidence}%` : 'N/A',
      'Status': l.status,
      'Owner Name': l.ownerName,
      'Owner Email': l.ownerEmail,
      'Owner User ID': l.ownerUserId,
      'Date Added': l.createdAt,
    }));

    const csvContent = Papa.unparse(csvRows);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=admin_global_leads_${Date.now()}.csv`,
      },
    });
  }

  // 12. Dynamic Sorting
  leads.sort((a, b) => {
    let valA: any = a[sortBy as keyof typeof a] ?? '';
    let valB: any = b[sortBy as keyof typeof b] ?? '';

    if (sortBy === 'createdAt' || sortBy === 'lastAttemptAt') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else if (sortBy === 'formConfidence') {
      valA = typeof a.formConfidence === 'number' ? a.formConfidence : -1;
      valB = typeof b.formConfidence === 'number' ? b.formConfidence : -1;
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 13. Server-Side Pagination
  const total = leads.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedLeads = leads.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    leads: paginatedLeads,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    summaryMetrics,
    options: {
      users: registeredUsers,
      leadLists: allLeadLists,
      countries: allCountries,
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
    if (Array.isArray(body.leads)) {
      const synced = AdminLeadStore.syncLeads(body.leads);
      return NextResponse.json({ success: true, count: synced.length });
    }

    if (body.id && body.ownerEmail) {
      const saved = AdminLeadStore.saveLead(body);
      return NextResponse.json({ success: true, lead: saved });
    }

    return NextResponse.json({ error: 'Invalid lead payload.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync leads.' }, { status: 500 });
  }
}
