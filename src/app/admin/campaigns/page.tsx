'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Send,
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
  Sparkles,
  BarChart2,
  Mail,
  Building2,
  Calendar,
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

interface AdminCampaignItem {
  id: string;
  name: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  organizationName?: string | null;
  status: 'draft' | 'ready' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
  totalProspects: number;
  processedProspects: number;
  deliveredCount: number;
  failedCount: number;
  noFormCount: number;
  reviewCount: number;
  repliedCount: number;
  progressText: string;
  progressPercentage: number;
  successRateText: string;
  successRateValue: number | null;
  tag?: string;
  logsCount?: number;
}

export default function AdminCampaignsPage() {
  const [isPending, startTransition] = useTransition();

  // API Data States
  const [campaigns, setCampaigns] = useState<AdminCampaignItem[]>([]);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('SUPER_ADMIN');
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ status: number; message: string } | null>(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspect Drawer State
  const [inspectCampaign, setInspectCampaign] = useState<AdminCampaignItem | null>(null);
  const [inspectDetails, setInspectDetails] = useState<any | null>(null);
  const [isInspectLoading, setIsInspectLoading] = useState(false);

  // Load Admin Campaigns from Backend API
  const fetchCampaigns = async () => {
    setIsLoading(true);
    setErrorState(null);

    try {
      // Sync local user campaigns to server store first if present
      if (typeof window !== 'undefined') {
        const storedLocal = localStorage.getItem('user_campaigns');
        if (storedLocal) {
          try {
            const parsedLocal = JSON.parse(storedLocal);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              const activeEmail = (localStorage.getItem('active_account_email') || 'mithusquare@gmail.com').toLowerCase();
              const payload = parsedLocal.map((c: any) => ({
                id: c.id,
                name: c.name,
                ownerEmail: c.ownerEmail || activeEmail,
                status: c.status === 'active' || c.status === 'running' ? 'running' : c.status === 'paused' ? 'paused' : 'draft',
                createdAt: c.createdAt || new Date().toISOString(),
                totalProspects: Array.isArray(c.prospectsList) ? c.prospectsList.length : typeof c.totalLeads === 'number' ? c.totalLeads : c.prospects || 0,
                processedProspects: (c.sentCount || 0) + (c.failedCount || 0) + (c.noFormCount || 0) + (c.captchaCount || 0),
                deliveredCount: c.sentCount || c.reached || 0,
                failedCount: c.failedCount || c.failed || 0,
                noFormCount: c.noFormCount || c.noContactPage || 0,
                reviewCount: c.captchaCount || c.captchaBlocked || 0,
                repliedCount: c.repliedCount || c.replied || 0,
                prospectsList: c.prospectsList || [],
                logs: c.logs || [],
              }));
              await fetch('/api/admin/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaigns: payload }),
              });
            }
          } catch (e) {
            console.error('Local campaign sync error:', e);
          }
        }
      }

      const queryParams = new URLSearchParams({
        q: search.trim(),
        userEmail: selectedUserFilter,
        status: selectedStatusFilter,
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/admin/campaigns?${queryParams.toString()}`);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErrorState({
            status: res.status,
            message: 'Access Denied: Super Admin or Admin privileges are required to view global user campaigns.',
          });
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to load campaigns (HTTP ${res.status})`);
      }

      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setUsersList(data.users || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      if (data.currentUser) {
        setCurrentUserRole(data.currentUser.role || 'SUPER_ADMIN');
      }
    } catch (err: any) {
      console.error('Fetch admin campaigns error:', err);
      setErrorState({
        status: 500,
        message: err.message || 'An error occurred while communicating with the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [search, selectedUserFilter, selectedStatusFilter, sortBy, sortOrder, page, limit]);

  // Open Campaign Inspect Drawer & fetch real details
  const handleInspectClick = async (c: AdminCampaignItem) => {
    setInspectCampaign(c);
    setInspectDetails(null);
    setIsInspectLoading(true);

    try {
      const res = await fetch(`/api/admin/campaigns/${encodeURIComponent(c.id)}`);
      if (res.ok) {
        const data = await res.json();
        setInspectDetails(data.campaign);
      } else {
        setInspectDetails(c);
      }
    } catch (e) {
      setInspectDetails(c);
    } finally {
      setIsInspectLoading(false);
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
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'RUNNING':
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            RUNNING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            COMPLETED
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            PAUSED
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            {s}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {s || 'DRAFT'}
          </span>
        );
    }
  };

  // If user is forbidden or unauthorized
  if (errorState && (errorState.status === 401 || errorState.status === 403)) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card className="p-8 bg-white border border-red-100 shadow-sm text-center">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-[#111827]">403 — Unauthorized Access</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">
            {errorState.message}
          </p>
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/dashboard')}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
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
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#0e6de4]/10 text-[#0e6de4]">
              <Send className="h-5 w-5" />
            </div>
            Global Tenant Campaigns Inspector
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Role-aware multi-tenant outreach campaign governance & live metric monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCampaigns}
            disabled={isLoading}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Omni Search Box */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Campaign Name, Owner, Email, or ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#111827] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Super Admin User Filter Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedUserFilter}
                onChange={(e) => {
                  setSelectedUserFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4] appearance-none"
              >
                <option value="all">All Users ({usersList.length > 0 ? usersList.length : 'All'})</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => {
                  setSelectedStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4] appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="running">RUNNING</option>
                <option value="paused">PAUSED</option>
                <option value="completed">COMPLETED</option>
                <option value="draft">DRAFT</option>
                <option value="ready">READY</option>
                <option value="failed">FAILED</option>
              </select>
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="md:col-span-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4]"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="progress-desc">Highest Progress</option>
              <option value="successRate-desc">Highest Success Rate</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Campaign Data Table */}
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0e6de4] border-t-transparent mb-3"></div>
            <p className="text-xs text-slate-500 font-medium">Fetching real campaign telemetry...</p>
          </div>
        ) : campaigns.length === 0 ? (
          /* Clean Real Empty State (No Hardcoded Fake Data) */
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[#111827]">No campaigns found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedUserFilter !== 'all' || selectedStatusFilter !== 'all'
                ? 'No outreach campaigns match your active search or filter criteria.'
                : 'There are currently no campaigns created in the system database.'}
            </p>
            {(search || selectedUserFilter !== 'all' || selectedStatusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedUserFilter('all');
                  setSelectedStatusFilter('all');
                }}
                className="mt-4 text-xs border-slate-200 text-slate-700"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Campaign Name</th>
                  <th className="px-5 py-3.5">Owner / User</th>
                  <th className="px-5 py-3.5">Progress</th>
                  <th className="px-5 py-3.5">Success Rate</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Campaign Name & Details */}
                    <td className="px-5 py-3.5 font-medium text-[#111827]">
                      <div className="font-semibold text-sm text-[#111827]">{c.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-slate-400">
                        <span>ID: {c.id}</span>
                        {c.tag && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-sans text-[10px]">
                            {c.tag}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Owner / User Column */}
                    <td className="px-5 py-3.5 text-slate-600">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0e6de4]/10 text-[#0e6de4] flex items-center justify-center font-semibold text-xs border border-[#0e6de4]/20 flex-shrink-0">
                          {c.ownerAvatarUrl ? (
                            <img src={c.ownerAvatarUrl} alt={c.ownerName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            c.ownerName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-xs text-[#111827] truncate">{c.ownerName}</div>
                          <div className="text-[11px] text-slate-400 truncate">{c.ownerEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Progress: Processed / Total (%) */}
                    <td className="px-5 py-3.5 font-mono text-slate-700 font-medium">
                      {c.progressText}
                    </td>

                    {/* Success Rate */}
                    <td className="px-5 py-3.5 font-mono">
                      {c.successRateText === '—' ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="font-bold text-emerald-600">{c.successRateText}</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5">
                      {renderStatusBadge(c.status)}
                    </td>

                    {/* Inspect Button */}
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInspectClick(c)}
                        className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#0e6de4] font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {campaigns.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-[#111827]">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-[#111827]">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold text-[#111827]">{totalCount}</span> campaigns
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
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-[#111827] focus:outline-none"
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
                  className="h-7 px-2 border-slate-200 text-slate-700 bg-white"
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
                  className="h-7 px-2 border-slate-200 text-slate-700 bg-white"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Inspect Campaign Detail Slide-Over Drawer */}
      {inspectCampaign && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-all duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
                  <Send className="h-4 w-4 text-[#0e6de4]" />
                  Campaign Inspection
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {inspectCampaign.id}</p>
              </div>
              <button
                onClick={() => setInspectCampaign(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {isInspectLoading ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-[#0e6de4] border-t-transparent mb-2"></div>
                  <p className="text-xs text-slate-500">Loading campaign parameters...</p>
                </div>
              ) : (
                <>
                  {/* Title & Status Card */}
                  <Card className="p-4 bg-slate-50/60 border border-slate-200/80 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-[#111827]">{inspectCampaign.name}</h3>
                        {inspectCampaign.organizationName ? (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {inspectCampaign.organizationName}
                          </div>
                        ) : null}
                      </div>
                      <div>{renderStatusBadge(inspectCampaign.status)}</div>
                    </div>
                  </Card>

                  {/* Campaign Owner Information */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                      Owner Information
                    </h4>
                    <Card className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0e6de4]/10 text-[#0e6de4] flex items-center justify-center font-bold text-sm border border-[#0e6de4]/20">
                          {inspectCampaign.ownerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#111827]">{inspectCampaign.ownerName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {inspectCampaign.ownerEmail}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                        User ID: {inspectCampaign.ownerUserId || 'N/A'}
                      </div>
                    </Card>
                  </div>

                  {/* Campaign Timestamps */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Lifecycle Timestamps
                    </h4>
                    <Card className="p-4 bg-white border border-slate-200 rounded-xl grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Created At</div>
                        <div className="text-xs font-medium text-[#111827] mt-1">
                          {formatDate(inspectCampaign.createdAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Started At</div>
                        <div className="text-xs font-medium text-[#111827] mt-1">
                          {formatDate(inspectCampaign.startedAt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Completed At</div>
                        <div className="text-xs font-medium text-[#111827] mt-1">
                          {formatDate(inspectCampaign.completedAt)}
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Real Metrics Grid */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <BarChart2 className="h-3.5 w-3.5 text-slate-400" />
                      Prospect & Submission Telemetry
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card className="p-3 bg-slate-50/50 border border-slate-200 text-center rounded-xl">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Prospects</div>
                        <div className="text-base font-bold font-mono text-[#111827] mt-0.5">
                          {inspectCampaign.totalProspects.toLocaleString()}
                        </div>
                      </Card>

                      <Card className="p-3 bg-emerald-50/50 border border-emerald-100 text-center rounded-xl">
                        <div className="text-[10px] text-emerald-700 font-semibold uppercase">Delivered (Sent)</div>
                        <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                          {inspectCampaign.deliveredCount.toLocaleString()}
                        </div>
                      </Card>

                      <Card className="p-3 bg-amber-50/50 border border-amber-100 text-center rounded-xl">
                        <div className="text-[10px] text-amber-700 font-semibold uppercase">Pending</div>
                        <div className="text-base font-bold font-mono text-amber-700 mt-0.5">
                          {Math.max(
                            0,
                            inspectCampaign.totalProspects - inspectCampaign.processedProspects
                          ).toLocaleString()}
                        </div>
                      </Card>

                      <Card className="p-3 bg-red-50/50 border border-red-100 text-center rounded-xl">
                        <div className="text-[10px] text-red-700 font-semibold uppercase">Failed</div>
                        <div className="text-base font-bold font-mono text-red-700 mt-0.5">
                          {inspectCampaign.failedCount.toLocaleString()}
                        </div>
                      </Card>

                      <Card className="p-3 bg-slate-50/50 border border-slate-200 text-center rounded-xl">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">No-Form</div>
                        <div className="text-base font-bold font-mono text-[#111827] mt-0.5">
                          {inspectCampaign.noFormCount.toLocaleString()}
                        </div>
                      </Card>

                      <Card className="p-3 bg-indigo-50/50 border border-indigo-100 text-center rounded-xl">
                        <div className="text-[10px] text-indigo-700 font-semibold uppercase">Review / CAPTCHA</div>
                        <div className="text-base font-bold font-mono text-indigo-700 mt-0.5">
                          {inspectCampaign.reviewCount.toLocaleString()}
                        </div>
                      </Card>

                      <Card className="p-3 bg-blue-50/50 border border-blue-100 text-center rounded-xl">
                        <div className="text-[10px] text-blue-700 font-semibold uppercase">Replied</div>
                        <div className="text-base font-bold font-mono text-blue-700 mt-0.5">
                          {inspectCampaign.repliedCount.toLocaleString()}
                        </div>
                      </Card>

                      <Card className="p-3 bg-emerald-50 border border-emerald-200 text-center rounded-xl">
                        <div className="text-[10px] text-emerald-800 font-bold uppercase">Success Rate</div>
                        <div className="text-base font-bold font-mono text-emerald-800 mt-0.5">
                          {inspectCampaign.successRateText}
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Telemetry Logs if present */}
                  {inspectDetails?.logs && inspectDetails.logs.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                        Recent Processing Logs ({inspectDetails.logs.length})
                      </h4>
                      <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5">
                        {inspectDetails.logs.map((log: any, idx: number) => (
                          <div key={idx} className="border-b border-slate-800 pb-1.5 last:border-0 last:pb-0">
                            <span className="text-slate-400">[{log.time || log.timestamp || 'LOG'}]</span>{' '}
                            <span className="text-blue-400">{log.domain || 'Target'}</span>:{' '}
                            <span
                              className={
                                log.status === 'DELIVERED'
                                  ? 'text-emerald-400'
                                  : log.status === 'FAILED'
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }
                            >
                              {log.status}
                            </span>{' '}
                            — {log.code || 'Processed'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectCampaign(null)}
                className="border-slate-200 text-slate-700 hover:bg-slate-100"
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
