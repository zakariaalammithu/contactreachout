import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { AdminLeadStore, type AdminLeadItem } from '@/lib/services/admin-lead-store';
import Papa from 'papaparse';

export interface FilterRule {
  field: string;
  operator:
    | 'equals'
    | 'contains'
    | 'starts_with'
    | 'does_not_contain'
    | 'greater_than'
    | 'less_than'
    | 'before'
    | 'after';
  value: string;
}

function evaluateRule(item: AdminLeadItem, rule: FilterRule): boolean {
  if (!rule.field || !rule.operator || rule.value === undefined) return true;

  const rawVal = getFieldValue(item, rule.field);
  const targetVal = String(rule.value).toLowerCase().trim();

  if (rawVal === undefined || rawVal === null) {
    if (rule.operator === 'does_not_contain') return true;
    return false;
  }

  const strVal = String(rawVal).toLowerCase().trim();

  switch (rule.operator) {
    case 'equals':
      return strVal === targetVal;
    case 'contains':
      return strVal.includes(targetVal);
    case 'starts_with':
      return strVal.startsWith(targetVal);
    case 'does_not_contain':
      return !strVal.includes(targetVal);
    case 'greater_than': {
      const numA = parseFloat(strVal);
      const numB = parseFloat(targetVal);
      return !isNaN(numA) && !isNaN(numB) && numA > numB;
    }
    case 'less_than': {
      const numA = parseFloat(strVal);
      const numB = parseFloat(targetVal);
      return !isNaN(numA) && !isNaN(numB) && numA < numB;
    }
    case 'before': {
      const timeA = new Date(rawVal).getTime();
      const timeB = new Date(targetVal).getTime();
      return !isNaN(timeA) && !isNaN(timeB) && timeA < timeB;
    }
    case 'after': {
      const timeA = new Date(rawVal).getTime();
      const timeB = new Date(targetVal).getTime();
      return !isNaN(timeA) && !isNaN(timeB) && timeA > timeB;
    }
    default:
      return true;
  }
}

function getFieldValue(item: AdminLeadItem, fieldName: string): any {
  const norm = fieldName.toLowerCase().trim();

  if (norm === 'company' || norm === 'companyname') return item.companyName;
  if (norm === 'domain') return item.domain;
  if (norm === 'website') return item.website;
  if (norm === 'email') return item.email;
  if (norm === 'firstname' || norm === 'first_name') return item.firstName;
  if (norm === 'lastname' || norm === 'last_name') return item.lastName;
  if (norm === 'name' || norm === 'fullname') return `${item.firstName || ''} ${item.lastName || ''}`.trim();
  if (norm === 'country') return item.country;
  if (norm === 'status') return item.status;
  if (norm === 'owner' || norm === 'ownername') return item.ownerName;
  if (norm === 'owneremail') return item.ownerEmail;
  if (norm === 'list' || norm === 'listname') return item.listName;
  if (norm === 'campaign' || norm === 'campaignname') return item.campaignName;
  if (norm === 'createdat' || norm === 'dateadded') return item.createdAt;
  if (norm === 'lastactivity' || norm === 'lastactivityat') return item.lastActivityAt;
  if (norm === 'phone') return item.phone;
  if (norm === 'title' || norm === 'jobtitle') return item.title;
  if (norm === 'industry') return item.industry;
  if (norm === 'city') return item.city;

  // Custom fields dictionary fallback
  if (item.customFields) {
    for (const [key, val] of Object.entries(item.customFields)) {
      if (key.toLowerCase().trim() === norm) {
        return val;
      }
    }
  }

  return undefined;
}

export async function GET(req: NextRequest) {
  // 1. Strict Server-Side RBAC Enforcement: ADMIN or SUPER_ADMIN required
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.toLowerCase().trim() || '';
  const userFilter = url.searchParams.get('userEmail') || 'all';
  const listFilter = url.searchParams.get('listName') || 'all';
  const campaignFilter = url.searchParams.get('campaignName') || 'all';
  const statusFilter = url.searchParams.get('status')?.toUpperCase() || 'ALL';
  const countryFilter = url.searchParams.get('country') || 'all';
  const logicMode = (url.searchParams.get('logic') || 'AND').toUpperCase();
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '25', 10)));
  const isExport = url.searchParams.get('export') === 'csv' || url.searchParams.get('export') === 'xlsx';

  // Parse advanced rule filters
  let filterRules: FilterRule[] = [];
  try {
    const rawRules = url.searchParams.get('filters');
    if (rawRules) {
      filterRules = JSON.parse(rawRules);
    }
  } catch (e) {
    console.error('Failed to parse filter rules:', e);
  }

  // 2. Fetch All CRM Contacts from Canonical Store
  let contacts = AdminLeadStore.getAllLeads();

  // Extract Metadata for Filters
  const allLists = Array.from(new Set(contacts.map((c) => c.listName).filter((n): n is string => Boolean(n))));
  const allCampaigns = Array.from(new Set(contacts.map((c) => c.campaignName).filter((n): n is string => Boolean(n))));
  const allCountries = Array.from(new Set(contacts.map((c) => c.country).filter((cnt): cnt is string => Boolean(cnt) && cnt !== 'N/A')));
  const registeredUsers = AuthStore.getAllUsers().map((u) => ({
    id: u.id,
    name: u.name || u.email.split('@')[0],
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl || null,
  }));

  const customFieldKeysSet = new Set<string>();
  for (const c of contacts) {
    if (c.customFields) {
      Object.keys(c.customFields).forEach((k) => customFieldKeysSet.add(k));
    }
  }

  // 3. Role Isolation
  if (session.role === 'SUPER_ADMIN') {
    if (userFilter !== 'all') {
      contacts = contacts.filter((c) => c.ownerEmail.toLowerCase().trim() === userFilter.toLowerCase().trim());
    }
  } else if (session.role === 'ADMIN') {
    if (userFilter !== 'all') {
      contacts = contacts.filter((c) => c.ownerEmail.toLowerCase().trim() === userFilter.toLowerCase().trim());
    }
  }

  // 4. Multi-Field Omni-Search
  if (q) {
    contacts = contacts.filter((c) => {
      const matchCompany = c.companyName.toLowerCase().includes(q);
      const matchDomain = c.domain.toLowerCase().includes(q);
      const matchWebsite = c.website.toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      const matchFirst = (c.firstName || '').toLowerCase().includes(q);
      const matchLast = (c.lastName || '').toLowerCase().includes(q);
      const matchOwnerName = (c.ownerName || '').toLowerCase().includes(q);
      const matchOwnerEmail = c.ownerEmail.toLowerCase().includes(q);
      const matchList = (c.listName || '').toLowerCase().includes(q);
      const matchCampaign = (c.campaignName || '').toLowerCase().includes(q);

      let matchCustom = false;
      if (c.customFields) {
        for (const [key, val] of Object.entries(c.customFields)) {
          if (key.toLowerCase().includes(q) || String(val).toLowerCase().includes(q)) {
            matchCustom = true;
            break;
          }
        }
      }

      return (
        matchCompany ||
        matchDomain ||
        matchWebsite ||
        matchEmail ||
        matchFirst ||
        matchLast ||
        matchOwnerName ||
        matchOwnerEmail ||
        matchList ||
        matchCampaign ||
        matchCustom
      );
    });
  }

  // 5. Basic Dropdown Filters
  if (listFilter !== 'all') {
    contacts = contacts.filter((c) => (c.listName || '').toLowerCase().trim() === listFilter.toLowerCase().trim());
  }

  if (campaignFilter !== 'all') {
    contacts = contacts.filter((c) => (c.campaignName || '').toLowerCase().trim() === campaignFilter.toLowerCase().trim());
  }

  if (statusFilter !== 'ALL') {
    contacts = contacts.filter((c) => {
      const st = (c.status || '').toUpperCase().replace('-', '_');
      const reqSt = statusFilter.replace('-', '_');
      if (reqSt === 'REVIEW') return st === 'REVIEW' || st === 'REVIEW_REQUIRED' || st === 'CAPTCHA';
      if (reqSt === 'NO_FORM') return st === 'NO_FORM' || st === 'NO_CONTACT_PAGE';
      return st === reqSt;
    });
  }

  if (countryFilter !== 'all') {
    contacts = contacts.filter((c) => (c.country || '').toLowerCase().trim() === countryFilter.toLowerCase().trim());
  }

  // 6. Advanced Filter Engine with AND / OR Logic Support
  if (filterRules.length > 0) {
    contacts = contacts.filter((item) => {
      if (logicMode === 'OR') {
        return filterRules.some((rule) => evaluateRule(item, rule));
      }
      return filterRules.every((rule) => evaluateRule(item, rule));
    });
  }

  // 7. Calculate Real Overview Summary Metrics
  const summaryMetrics = {
    totalContacts: contacts.length,
    totalLists: new Set(contacts.map((c) => c.listName).filter(Boolean)).size,
    activeCampaignContacts: contacts.filter((c) => Boolean(c.campaignName)).length,
    delivered: contacts.filter((c) => c.status === 'DELIVERED' || c.status === 'SUBMITTED').length,
    pending: contacts.filter((c) => c.status === 'PENDING' || c.status === 'UNCONTACTED' || c.status === 'PROSPECTS').length,
    failed: contacts.filter((c) => c.status === 'FAILED' || c.status === 'BLOCKED').length,
    noForm: contacts.filter((c) => c.status === 'NO_FORM' || c.status === 'NO-FORM').length,
    review: contacts.filter((c) => c.status === 'REVIEW' || c.status === 'REVIEW_REQUIRED').length,
    replied: contacts.filter((c) => c.status === 'REPLIED').length,
  };

  // 8. Filtered Export Handling (CSV / XLSX)
  if (isExport) {
    const csvRows = contacts.map((c) => {
      const rowObj: Record<string, any> = {
        'First Name': c.firstName || '',
        'Last Name': c.lastName || '',
        'Email Address': c.email || '',
        'Company Name': c.companyName,
        'Domain': c.domain,
        'Website URL': c.website,
        'Country': c.country || 'N/A',
        'Status': c.status,
        'Lead List': c.listName || 'N/A',
        'Associated Campaign': c.campaignName || 'N/A',
        'Owner Name': c.ownerName,
        'Owner Email': c.ownerEmail,
        'Owner User ID': c.ownerUserId,
        'Date Added': c.createdAt,
        'Last Activity': c.lastActivityAt || c.createdAt,
      };

      // Preserve all imported custom fields
      if (c.customFields) {
        for (const [k, v] of Object.entries(c.customFields)) {
          if (!(k in rowObj)) {
            rowObj[k] = v;
          }
        }
      }
      return rowObj;
    });

    const csvContent = Papa.unparse(csvRows);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=admin_crm_contacts_${Date.now()}.csv`,
      },
    });
  }

  // 9. Dynamic Sorting
  contacts.sort((a, b) => {
    let valA: any = a[sortBy as keyof typeof a] ?? '';
    let valB: any = b[sortBy as keyof typeof b] ?? '';

    if (sortBy === 'createdAt' || sortBy === 'lastActivityAt' || sortBy === 'lastAttemptAt') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 10. Server-Side Pagination
  const total = contacts.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedContacts = contacts.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    contacts: paginatedContacts,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    summaryMetrics,
    options: {
      users: registeredUsers,
      leadLists: allLists,
      campaigns: allCampaigns,
      countries: allCountries,
      customFields: Array.from(customFieldKeysSet),
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
    if (Array.isArray(body.contacts)) {
      const synced = AdminLeadStore.syncLeads(body.contacts);
      return NextResponse.json({ success: true, count: synced.length });
    }

    if (body.id && body.ownerEmail) {
      const saved = AdminLeadStore.saveLead(body);
      return NextResponse.json({ success: true, contact: saved });
    }

    return NextResponse.json({ error: 'Invalid contact payload.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync CRM contacts.' }, { status: 500 });
  }
}
