'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Filter,
  User as UserIcon,
  Eye,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  Inbox,
  Download,
  Building2,
  Globe,
  Mail,
  Calendar,
  Layers,
  FileSpreadsheet,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface AdminLeadItem {
  id: string;
  companyName: string;
  domain: string;
  website: string;
  contactPageUrl?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  title?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  status: string;
  formConfidence?: number | null;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  listId?: string | null;
  listName?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  createdAt: string;
  lastAttemptAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  httpStatus?: number | null;
  sourceFileName?: string | null;
}

interface SummaryMetrics {
  totalLeads: number;
  totalLeadLists: number;
  usersWithLeads: number;
  submittedCount: number;
  pendingCount: number;
  failedCount: number;
  reviewRequiredCount: number;
}

export default function AdminLeadsPage() {
  // API Data States
  const [leads, setLeads] = useState<AdminLeadItem[]>([]);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [leadListsOptions, setLeadListsOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<SummaryMetrics>({
    totalLeads: 0,
    totalLeadLists: 0,
    usersWithLeads: 0,
    submittedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    reviewRequiredCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorState, setErrorState] = useState<{ status: number; message: string } | null>(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedListFilter, setSelectedListFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedConfidenceFilter, setSelectedConfidenceFilter] = useState('all');
  const [selectedDateRangeFilter, setSelectedDateRangeFilter] = useState('all');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('all');
  const [jobTitleFilter, setJobTitleFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('');
  const [fileNameFilter, setFileNameFilter] = useState('');
  const [showBulkSearch, setShowBulkSearch] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [bulkListName, setBulkListName] = useState('');
  const [isBulkSearching, setIsBulkSearching] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ createdCount: number; failed: Array<{ url: string; error: string }> } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection & Columns State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    owner: true,
    company: true,
    contactPage: true,
    recipient: true,
    country: true,
    leadList: true,
    confidence: true,
    status: true,
    dateAdded: true,
  });
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);

  // Inspect Drawer State
  const [inspectLead, setInspectLead] = useState<AdminLeadItem | null>(null);

  // Fetch Leads from Backend API
  const fetchLeads = async () => {
    setIsLoading(true);
    setErrorState(null);

    try {
      // Sync local user imported leads to server store if available
      if (typeof window !== 'undefined') {
        const storedLocal = localStorage.getItem('user_imported_leads');
        if (storedLocal) {
          try {
            const parsedLocal = JSON.parse(storedLocal);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              const activeEmail = (localStorage.getItem('active_account_email') || 'mithusquare@gmail.com').toLowerCase();
              const payload = parsedLocal.map((l: any) => ({
                id: l.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                companyName: l.companyName || l.company_name || 'Company',
                domain: l.domain || (l.website ? l.website.replace(/^https?:\/\//, '').split('/')[0] : ''),
                website: l.website || (l.domain ? `https://${l.domain}` : ''),
                contactPageUrl: l.contactPageUrl || l.contactUrl || null,
                email: l.email || null,
                firstName: l.firstName || l.first_name || null,
                lastName: l.lastName || l.last_name || null,
                phone: l.phone || null,
                title: l.title || null,
                industry: l.industry || null,
                city: l.city || null,
                country: l.country || null,
                status: (l.status || 'UNCONTACTED').toUpperCase(),
                formConfidence: typeof l.formConfidence === 'number' ? l.formConfidence : null,
                ownerEmail: l.ownerEmail || activeEmail,
                listName:
                  l.listName ||
                  (l.listId || l.sourceFileName
                    ? l.listId || l.sourceFileName.replace(/\.[^/.]+$/, '')
                    : 'Direct Import'),
                sourceFileName: l.sourceFileName || null,
                createdAt: l.createdAt || new Date().toISOString(),
              }));

              await fetch('/api/admin/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leads: payload }),
              });
            }
          } catch (e) {
            console.error('Local lead sync error:', e);
          }
        }
      }

      const queryParams = new URLSearchParams({
        q: search.trim(),
        jobTitle: jobTitleFilter.trim(),
        company: companyFilter.trim(),
        website: websiteFilter.trim(),
        fileName: fileNameFilter.trim(),
        userEmail: selectedUserFilter,
        listName: selectedListFilter,
        status: selectedStatusFilter,
        confidence: selectedConfidenceFilter,
        dateRange: selectedDateRangeFilter,
        country: selectedCountryFilter,
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/admin/leads?${queryParams.toString()}`);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErrorState({
            status: res.status,
            message: 'Access Denied: Super Admin or Admin privileges are required to access global lead repository.',
          });
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to load leads (HTTP ${res.status})`);
      }

      const data = await res.json();
      setLeads(data.leads || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      if (data.summaryMetrics) setMetrics(data.summaryMetrics);
      if (data.options) {
        setUsersList(data.options.users || []);
        setLeadListsOptions(data.options.leadLists || []);
        setCountryOptions(data.options.countries || []);
      }
    } catch (err: any) {
      console.error('Fetch admin leads error:', err);
      setErrorState({
        status: 500,
        message: err.message || 'An error occurred while communicating with the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [
    search,
    jobTitleFilter,
    companyFilter,
    websiteFilter,
    fileNameFilter,
    selectedUserFilter,
    selectedListFilter,
    selectedStatusFilter,
    selectedConfidenceFilter,
    selectedDateRangeFilter,
    selectedCountryFilter,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  // Export CSV Handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams({
        q: search.trim(),
        userEmail: selectedUserFilter,
        listName: selectedListFilter,
        status: selectedStatusFilter,
        confidence: selectedConfidenceFilter,
        dateRange: selectedDateRangeFilter,
        country: selectedCountryFilter,
        export: 'csv',
      });

      const res = await fetch(`/api/admin/leads?${queryParams.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `admin_global_leads_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Failed to generate export file.');
      }
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Delete leads from the admin store AND from local uploaded leads,
  // so they do not reappear when the page re-syncs on reload.
  const handleDeleteLeads = async (ids: string[]) => {
    if (ids.length === 0 || isDeleting) return;
    const label = ids.length === 1 ? '1 lead' : `${ids.length} leads`;
    if (
      !window.confirm(
        `Delete ${label}? This removes them from Leads/CRM and from your uploaded leads, so they will not reappear on reload.`
      )
    )
      return;
    setIsDeleting(true);
    try {
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
          } catch (e) {
            console.error('Delete lead error:', id, e);
          }
        })
      );
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('user_imported_leads');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              localStorage.setItem(
                'user_imported_leads',
                JSON.stringify(parsed.filter((l: any) => l && !ids.includes(l.id)))
              );
            }
          }
        } catch (e) {
          console.error('Local lead delete error:', e);
        }
      }
      setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
      setTotalCount((prev) => Math.max(0, prev - ids.length));
      setMetrics((prev) => ({ ...prev, totalLeads: Math.max(0, prev.totalLeads - ids.length) }));
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk website search: fetch many company websites at once and save each
  // as a lead. Company info comes from the page itself; no job titles,
  // emails, or other data are invented for these leads.
  const handleBulkWebsiteSearch = async () => {
    const urls = bulkUrls
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (urls.length === 0 || isBulkSearching) return;
    setIsBulkSearching(true);
    setBulkError(null);
    setBulkResult(null);
    try {
      const res = await fetch('/api/admin/bulk-website-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, listName: bulkListName.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Bulk search failed (HTTP ${res.status}).`);
      }
      const created = Array.isArray(data.created) ? data.created : [];
      if (created.length > 0 && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('user_imported_leads');
          const existing = stored ? JSON.parse(stored) : [];
          const merged = Array.isArray(existing) ? [...existing, ...created] : [...created];
          localStorage.setItem('user_imported_leads', JSON.stringify(merged));
        } catch (e) {
          console.error('Local bulk lead save error:', e);
        }
      }
      setBulkResult({ createdCount: created.length, failed: Array.isArray(data.failed) ? data.failed : [] });
      await fetchLeads();
    } catch (e: any) {
      setBulkError(e.message || 'Bulk search failed.');
    } finally {
      setIsBulkSearching(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-900">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            SUBMITTED
          </span>
        );
      case 'REPLIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
            REPLIED
          </span>
        );
      case 'PENDING':
      case 'UNCONTACTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-900">
            <Clock className="w-3 h-3 text-blue-400" />
            {s}
          </span>
        );
      case 'REVIEW_REQUIRED':
      case 'CAPTCHA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-900">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            REVIEW REQUIRED
          </span>
        );
      case 'FAILED':
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950 text-red-300 border border-red-900">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            {s}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800">
            {s || 'UNCONTACTED'}
          </span>
        );
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length && leads.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // If user is forbidden
  if (errorState && (errorState.status === 401 || errorState.status === 403)) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card className="p-8 bg-zinc-950 border border-red-900 shadow-sm text-center">
          <div className="w-14 h-14 bg-red-950 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">403 — Unauthorized Access</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mt-2">{errorState.message}</p>
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/dashboard')}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0e6de4]/10 text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            Global Leads Repository
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Centralized multi-tenant lead governance, heuristics audit, and cross-user list repository.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || leads.length === 0}
            className="h-9 border-zinc-800 text-zinc-300 hover:bg-zinc-900 bg-zinc-950"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeads}
            disabled={isLoading}
            className="h-9 border-zinc-800 text-zinc-300 hover:bg-zinc-900 bg-zinc-950"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteLeads(selectedIds)}
            disabled={selectedIds.length === 0 || isDeleting}
            className="h-9 border-red-900 text-red-400 hover:bg-red-950 bg-zinc-950 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {isDeleting ? 'Deleting...' : selectedIds.length > 0 ? `Delete selected (${selectedIds.length})` : 'Delete selected'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkSearch(!showBulkSearch)}
            className={`h-9 border-zinc-800 bg-zinc-950 ${
              showBulkSearch ? 'bg-[#0e6de4]/10 text-blue-400 border-[#0e6de4]/30' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <Globe className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
            Bulk Website Search
          </Button>
        </div>
      </div>

      {/* Top Real Summary Metrics (Calculated Directly from Database Query) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        <Card className="p-3.5 bg-zinc-950 border border-zinc-800/80 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total Leads</div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-0.5">
            {metrics.totalLeads.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3.5 bg-zinc-950 border border-zinc-800/80 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Lead Lists</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">
            {metrics.totalLeadLists.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3.5 bg-zinc-950 border border-zinc-800/80 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Users With Leads</div>
          <div className="text-xl font-bold font-mono text-zinc-300 mt-0.5">
            {metrics.usersWithLeads.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3.5 bg-emerald-950/60 border border-emerald-900 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Submitted</div>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">
            {metrics.submittedCount.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3.5 bg-blue-950/60 border border-blue-900 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider">Pending</div>
          <div className="text-xl font-bold font-mono text-blue-300 mt-0.5">
            {metrics.pendingCount.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3.5 bg-red-950/60 border border-red-900 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-red-300 uppercase tracking-wider">Failed</div>
          <div className="text-xl font-bold font-mono text-red-300 mt-0.5">
            {metrics.failedCount.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3.5 bg-amber-950/60 border border-amber-900 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Review Req.</div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
            {metrics.reviewRequiredCount.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Filter & Omni Search Controls */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800/80 shadow-sm rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Omni Search Box */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search Company, Domain, Email, Owner, List..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Super Admin Owner Filter */}
          <div className="md:col-span-3">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <select
                value={selectedUserFilter}
                onChange={(e) => {
                  setSelectedUserFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4] appearance-none"
              >
                <option value="all">All Owners ({usersList.length})</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lead List Filter */}
          <div className="md:col-span-3">
            <div className="relative">
              <FileSpreadsheet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <select
                value={selectedListFilter}
                onChange={(e) => {
                  setSelectedListFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4] appearance-none"
              >
                <option value="all">All Lead Lists ({leadListsOptions.length})</option>
                {leadListsOptions.map((list) => (
                  <option key={list} value={list}>
                    {list}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customize Columns Button */}
          <div className="md:col-span-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
              className="h-9 w-full text-xs border-zinc-800 text-zinc-300 bg-zinc-950"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              Columns
            </Button>
          </div>
        </div>

        {/* Secondary Filters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-zinc-800 text-xs">
          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REVIEW_REQUIRED">REVIEW REQUIRED</option>
              <option value="NO_FORM">NO FORM</option>
              <option value="REPLIED">REPLIED</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div>
            <select
              value={selectedConfidenceFilter}
              onChange={(e) => {
                setSelectedConfidenceFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none"
            >
              <option value="all">Confidence: All</option>
              <option value="high">High (≥90%)</option>
              <option value="medium">Medium (70-89%)</option>
              <option value="low">Low (&lt;70%)</option>
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <select
              value={selectedCountryFilter}
              onChange={(e) => {
                setSelectedCountryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none"
            >
              <option value="all">Country: All</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={selectedDateRangeFilter}
              onChange={(e) => {
                setSelectedDateRangeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="companyName-asc">Company (A-Z)</option>
              <option value="formConfidence-desc">Confidence (High-Low)</option>
              <option value="status-asc">Status</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters (Apollo-style: job title, company, website, file name) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800 text-xs">
          <div>
            <div className="font-semibold text-zinc-400 mb-1">Advanced Filters</div>
            <input
              type="text"
              placeholder="Job Title..."
              value={jobTitleFilter}
              onChange={(e) => {
                setJobTitleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <div className="font-semibold text-zinc-400 mb-1">&nbsp;</div>
            <input
              type="text"
              placeholder="Company Name..."
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <div className="font-semibold text-zinc-400 mb-1">&nbsp;</div>
            <input
              type="text"
              placeholder="Website / Domain..."
              value={websiteFilter}
              onChange={(e) => {
                setWebsiteFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <div className="font-semibold text-zinc-400 mb-1">&nbsp;</div>
            <input
              type="text"
              placeholder="File Name..."
              value={fileNameFilter}
              onChange={(e) => {
                setFileNameFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Column Customizer Dropdown Drawer */}
        {showColumnCustomizer && (
          <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 flex flex-wrap gap-4 text-xs">
            <div className="font-semibold text-zinc-400">Toggle Column Visibility:</div>
            {Object.keys(visibleColumns).map((col) => (
              <label key={col} className="flex items-center gap-1.5 cursor-pointer capitalize text-zinc-300">
                <input
                  type="checkbox"
                  checked={visibleColumns[col as keyof typeof visibleColumns]}
                  onChange={(e) =>
                    setVisibleColumns({
                      ...visibleColumns,
                      [col]: e.target.checked,
                    })
                  }
                  className="rounded text-blue-400 focus:ring-[#0e6de4]"
                />
                {col.replace(/([A-Z])/g, ' $1')}
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* Bulk Website Search Panel */}
      {showBulkSearch && (
        <Card className="p-4 bg-zinc-950 border border-zinc-800/80 shadow-sm rounded-xl space-y-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Bulk Website Search</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Paste up to 100 company website URLs (one per line). Each site is fetched and saved as a lead with its
              page title, description, and contact-page link. No job titles or emails are invented.
            </p>
          </div>
          <textarea
            rows={6}
            placeholder={'One website URL per line (e.g. example.com)'}
            value={bulkUrls}
            onChange={(e) => setBulkUrls(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4] font-mono"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="List name (optional)"
              value={bulkListName}
              onChange={(e) => setBulkListName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-slate-400 focus:outline-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkWebsiteSearch}
              disabled={isBulkSearching || bulkUrls.trim().length === 0}
              className="h-9 border-zinc-800 text-zinc-300 hover:bg-zinc-900 bg-zinc-950 disabled:opacity-50"
            >
              {isBulkSearching ? 'Searching...' : 'Search Websites'}
            </Button>
          </div>
          {bulkError && <p className="text-xs font-medium text-red-400">{bulkError}</p>}
          {bulkResult && (
            <div className="text-xs text-zinc-400 space-y-1">
              <p>
                <span className="font-bold text-zinc-100">{bulkResult.createdCount} lead(s) created.</span>{' '}
                {bulkResult.failed.length > 0 && `${bulkResult.failed.length} failed.`}
              </p>
              {bulkResult.failed.length > 0 && (
                <ul className="space-y-0.5">
                  {bulkResult.failed.map((f) => (
                    <li key={f.url} className="font-mono text-[11px] text-red-400">
                      {f.url} — {f.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Main Global Lead Table */}
      <Card className="bg-zinc-950 border border-zinc-800/80 shadow-sm rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0e6de4] border-t-transparent mb-3"></div>
            <p className="text-xs text-zinc-400 font-medium">Querying global lead repository...</p>
          </div>
        ) : leads.length === 0 ? (
          /* Clean Real Empty State (Zero Hardcoded Mock Data) */
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-zinc-900 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100">No leads found</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {search || selectedUserFilter !== 'all' || selectedStatusFilter !== 'ALL'
                ? 'No lead records match your current search or filter parameters.'
                : 'There are currently no leads stored in the system repository.'}
            </p>
            {(search ||
              jobTitleFilter ||
              companyFilter ||
              websiteFilter ||
              fileNameFilter ||
              selectedUserFilter !== 'all' ||
              selectedStatusFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setJobTitleFilter('');
                  setCompanyFilter('');
                  setWebsiteFilter('');
                  setFileNameFilter('');
                  setSelectedUserFilter('all');
                  setSelectedListFilter('all');
                  setSelectedStatusFilter('ALL');
                  setSelectedConfidenceFilter('all');
                  setSelectedCountryFilter('all');
                  setSelectedDateRangeFilter('all');
                }}
                className="mt-4 text-xs border-zinc-800 text-zinc-300"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-blue-400 focus:ring-[#0e6de4]"
                    />
                  </th>
                  {visibleColumns.owner && <th className="px-4 py-3.5">Owner</th>}
                  {visibleColumns.company && <th className="px-4 py-3.5">Company & Domain</th>}
                  {visibleColumns.contactPage && <th className="px-4 py-3.5">Discovered Page</th>}
                  {visibleColumns.recipient && <th className="px-4 py-3.5">Recipient</th>}
                  {visibleColumns.country && <th className="px-4 py-3.5">Country</th>}
                  {visibleColumns.leadList && <th className="px-4 py-3.5">Lead List</th>}
                  {visibleColumns.confidence && <th className="px-4 py-3.5">Confidence</th>}
                  {visibleColumns.status && <th className="px-4 py-3.5">Status</th>}
                  {visibleColumns.dateAdded && <th className="px-4 py-3.5">Date Added</th>}
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-900/60 transition-colors">
                    {/* Checkbox */}
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(l.id)}
                        onChange={() => toggleSelect(l.id)}
                        className="rounded text-blue-400 focus:ring-[#0e6de4]"
                      />
                    </td>

                    {/* Owner Column (Default Visible) */}
                    {visibleColumns.owner && (
                      <td className="px-4 py-3.5 text-zinc-400">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#0e6de4]/10 text-blue-400 flex items-center justify-center font-bold text-[11px] border border-[#0e6de4]/20 flex-shrink-0">
                            {l.ownerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-zinc-100 truncate">{l.ownerName}</div>
                            <div className="text-[10px] text-zinc-400 truncate">{l.ownerEmail}</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Company & Domain */}
                    {visibleColumns.company && (
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-xs text-zinc-100">{l.companyName}</div>
                        <a
                          href={l.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 hover:underline font-mono truncate max-w-[150px] inline-block"
                        >
                          {l.domain}
                        </a>
                      </td>
                    )}

                    {/* Discovered Contact Page */}
                    {visibleColumns.contactPage && (
                      <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-400 max-w-[160px] truncate">
                        {l.contactPageUrl ? (
                          <a
                            href={l.contactPageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-400 hover:text-blue-400 hover:underline"
                          >
                            {l.contactPageUrl}
                          </a>
                        ) : (
                          <span className="text-zinc-400">N/A</span>
                        )}
                      </td>
                    )}

                    {/* Recipient */}
                    {visibleColumns.recipient && (
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-zinc-100 font-medium">
                          {`${l.firstName || ''} ${l.lastName || ''}`.trim() || 'General Recipient'}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate max-w-[140px]">
                          {l.email || 'N/A'}
                        </div>
                      </td>
                    )}

                    {/* Country */}
                    {visibleColumns.country && (
                      <td className="px-4 py-3.5 text-xs text-zinc-400">{l.country || 'N/A'}</td>
                    )}

                    {/* Lead List */}
                    {visibleColumns.leadList && (
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-zinc-300">
                          {l.listName || 'General Import'}
                        </span>
                      </td>
                    )}

                    {/* Confidence Score */}
                    {visibleColumns.confidence && (
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        {typeof l.formConfidence === 'number' ? (
                          <span
                            className={
                              l.formConfidence >= 90
                                ? 'text-emerald-400 font-bold'
                                : l.formConfidence >= 70
                                ? 'text-blue-400'
                                : 'text-amber-400'
                            }
                          >
                            {l.formConfidence}%
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    )}

                    {/* Status Badge */}
                    {visibleColumns.status && <td className="px-4 py-3.5">{renderStatusBadge(l.status)}</td>}

                    {/* Date Added */}
                    {visibleColumns.dateAdded && (
                      <td className="px-4 py-3.5 text-zinc-400 font-mono text-[11px]">
                        {formatDate(l.createdAt)}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectLead(l)}
                        className="h-7 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-blue-400"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                        Inspect
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLeads([l.id])}
                        disabled={isDeleting}
                        title="Delete this lead"
                        className="h-7 text-xs border-red-900 text-red-400 hover:bg-red-950 ml-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {leads.length > 0 && (
          <div className="px-5 py-3.5 bg-zinc-900/50 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
            <div>
              Showing <span className="font-semibold text-zinc-100">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-zinc-100">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold text-zinc-100">{totalCount}</span> leads
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2 border-zinc-800 text-zinc-300 bg-zinc-950"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-mono text-xs">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 px-2 border-zinc-800 text-zinc-300 bg-zinc-950"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Single Lead Inspection Slide-Over Drawer */}
      {inspectLead && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-zinc-950 h-full shadow-2xl flex flex-col border-l border-zinc-800 transform transition-all duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
              <div>
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  Lead Record Inspection
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">ID: {inspectLead.id}</p>
              </div>
              <button
                onClick={() => setInspectLead(null)}
                className="p-1 text-zinc-400 hover:text-zinc-400 rounded-lg hover:bg-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {/* Title & Status Card */}
              <Card className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">{inspectLead.companyName}</h3>
                    <a
                      href={inspectLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-400 hover:underline font-mono"
                    >
                      {inspectLead.website}
                    </a>
                  </div>
                  <div>{renderStatusBadge(inspectLead.status)}</div>
                </div>
              </Card>

              {/* Owner Information */}
              <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Owner Information</h4>
                <Card className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0e6de4]/10 text-blue-400 flex items-center justify-center font-bold text-xs border border-[#0e6de4]/20">
                      {inspectLead.ownerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-zinc-100">{inspectLead.ownerName}</div>
                      <div className="text-[11px] text-zinc-400">{inspectLead.ownerEmail}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 font-mono">
                    User ID: {inspectLead.ownerUserId || 'N/A'}
                  </div>
                </Card>
              </div>

              {/* Lead List & Campaign Relation */}
              <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Source & Campaign Association
                </h4>
                <Card className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Lead List</div>
                    <div className="font-semibold text-xs text-zinc-100 mt-0.5">
                      {inspectLead.listName || 'General Import'}
                    </div>
                    {inspectLead.sourceFileName && (
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">File: {inspectLead.sourceFileName}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Associated Campaign</div>
                    <div className="font-semibold text-xs text-zinc-100 mt-0.5">
                      {inspectLead.campaignName || 'N/A'}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Company & Contact Details */}
              <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Company & Recipient Details
                </h4>
                <Card className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase">Recipient Name</div>
                      <div className="font-medium text-zinc-100">
                        {`${inspectLead.firstName || ''} ${inspectLead.lastName || ''}`.trim() || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase">Recipient Email</div>
                      <div className="font-mono text-zinc-100">{inspectLead.email || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase">Discovered Contact URL</div>
                      <div className="font-mono text-blue-400 truncate">{inspectLead.contactPageUrl || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase">Country / City</div>
                      <div className="text-zinc-100">
                        {inspectLead.city ? `${inspectLead.city}, ${inspectLead.country}` : inspectLead.country || 'N/A'}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Heuristics & Status Metrics */}
              <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Detection Heuristics & History
                </h4>
                <Card className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase">Form Confidence</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                      {typeof inspectLead.formConfidence === 'number' ? `${inspectLead.formConfidence}%` : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase">Date Added</div>
                    <div className="text-xs font-medium text-zinc-100 mt-0.5">
                      {formatDate(inspectLead.createdAt)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase">Last Attempt</div>
                    <div className="text-xs font-medium text-zinc-100 mt-0.5">
                      {formatDate(inspectLead.lastAttemptAt)}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Error / Diagnostic Info if present */}
              {(inspectLead.errorCode || inspectLead.errorMessage) && (
                <div>
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                    Diagnostic Information
                  </h4>
                  <div className="bg-red-950 border border-red-900 rounded-xl p-3 font-mono text-[11px] text-red-300 space-y-1">
                    <div>Code: {inspectLead.errorCode || 'N/A'}</div>
                    <div>Message: {inspectLead.errorMessage || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/80 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectLead(null)}
                className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
