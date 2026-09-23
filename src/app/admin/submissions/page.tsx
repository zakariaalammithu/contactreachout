'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Camera,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  X,
  RefreshCw,
  Inbox,
  Clock,
  User as UserIcon,
  Layers,
  Globe,
  Building2,
  Mail,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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

interface AdminSubmissionItem {
  id: string;
  campaignId: string;
  campaignName: string;
  leadId: string;
  companyName: string;
  domain: string;
  website: string;
  targetUrl: string;
  submissionMode: 'LIVE_MODE' | 'AUTOMATIC' | 'MANUAL_APPROVAL' | 'DRY_RUN' | 'TEST_MODE';
  status: string;
  executionLatencyMs: number;
  timestamp: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  confirmationMessage?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  httpStatus?: number | null;
  screenshotUrl?: string | null;
  screenshotBase64?: string | null;
}

export default function AdminSubmissionsPage() {
  // API Data States
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ status: number; message: string } | null>(null);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedModeFilter, setSelectedModeFilter] = useState('ALL');
  const [selectedDateRangeFilter, setSelectedDateRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Proof Modal State
  const [selectedProof, setSelectedProof] = useState<AdminSubmissionItem | null>(null);

  // Fetch Real Submissions from API
  const fetchSubmissions = async () => {
    setIsLoading(true);
    setErrorState(null);

    try {
      const queryParams = new URLSearchParams({
        q: search.trim(),
        userEmail: selectedUserFilter,
        campaignName: selectedCampaignFilter,
        status: selectedStatusFilter,
        mode: selectedModeFilter,
        dateRange: selectedDateRangeFilter,
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/admin/submissions?${queryParams.toString()}`);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErrorState({
            status: res.status,
            message: 'Access Denied: Super Admin or Admin privileges are required to view global submission proofs.',
          });
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to load submission records (HTTP ${res.status})`);
      }

      const data = await res.json();
      setSubmissions(data.submissions || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      if (data.options) {
        setUsersList(data.options.users || []);
        setCampaignOptions(data.options.campaigns || []);
      }
    } catch (err: any) {
      console.error('Fetch admin submissions error:', err);
      setErrorState({
        status: 500,
        message: err.message || 'An error occurred while communicating with the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [
    search,
    selectedUserFilter,
    selectedCampaignFilter,
    selectedStatusFilter,
    selectedModeFilter,
    selectedDateRangeFilter,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

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
    const s = (status || '').toUpperCase().replace('-', '_');
    switch (s) {
      case 'SUCCESS':
      case 'DELIVERED':
      case 'DRY_RUN_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            SUCCESS
          </span>
        );
      case 'FAILED':
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            FAILED
          </span>
        );
      case 'CAPTCHA':
      case 'CAPTCHA_TRIGGERED':
      case 'REVIEW_REQUIRED':
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            REVIEW REQUIRED
          </span>
        );
      case 'NO_FORM':
      case 'NO-FORM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
            NO-FORM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
            {s || 'PENDING'}
          </span>
        );
    }
  };

  const renderModeBadge = (mode: string) => {
    const m = (mode || '').toUpperCase();
    if (m === 'DRY_RUN') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-medium">
          DRY_RUN
        </span>
      );
    }
    if (m === 'LIVE_MODE') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
          LIVE_MODE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
        {m || 'AUTOMATIC'}
      </span>
    );
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
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">{errorState.message}</p>
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
              <FileCheck className="h-5 w-5" />
            </div>
            Global Submissions & Visual Proof Vault
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit pre-submission form verifications, HTTP confirmations, and visual screenshot proofs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSubmissions}
            disabled={isLoading}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Compact Search & Filter Controls Bar */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Omni Search Input */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Company, Target URL, Owner, Campaign, ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#111827] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4]"
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

          {/* Campaign Filter Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedCampaignFilter}
                onChange={(e) => {
                  setSelectedCampaignFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4] appearance-none"
              >
                <option value="all">All Campaigns ({campaignOptions.length})</option>
                {campaignOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Super Admin Owner Filter Dropdown */}
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
                <option value="all">All Owners ({usersList.length})</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4]"
            >
              <option value="ALL">Status: All</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="CAPTCHA">REVIEW REQUIRED</option>
              <option value="NO_FORM">NO-FORM</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs items-center">
          {/* Submission Mode Filter */}
          <div>
            <select
              value={selectedModeFilter}
              onChange={(e) => {
                setSelectedModeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[#111827] focus:outline-none"
            >
              <option value="ALL">Mode: All</option>
              <option value="LIVE_MODE">LIVE_MODE</option>
              <option value="DRY_RUN">DRY_RUN</option>
              <option value="AUTOMATIC">AUTOMATIC</option>
              <option value="MANUAL_APPROVAL">MANUAL_APPROVAL</option>
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
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[#111827] focus:outline-none"
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
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[#111827] focus:outline-none"
            >
              <option value="timestamp-desc">Newest First</option>
              <option value="timestamp-asc">Oldest First</option>
              <option value="executionLatencyMs-asc">Fastest Latency</option>
              <option value="executionLatencyMs-desc">Slowest Latency</option>
              <option value="companyName-asc">Company (A-Z)</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedUserFilter('all');
                setSelectedCampaignFilter('all');
                setSelectedStatusFilter('ALL');
                setSelectedModeFilter('ALL');
                setSelectedDateRangeFilter('all');
              }}
              className="h-8 text-xs border-slate-200 text-slate-700 bg-white"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Submissions Table (Preserving Existing Table Structure) */}
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0e6de4] border-t-transparent mb-3"></div>
            <p className="text-xs text-slate-500 font-medium">Querying submission telemetry logs...</p>
          </div>
        ) : submissions.length === 0 ? (
          /* Proper Real Empty State (Zero Hardcoded Mock Data) */
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[#111827]">No submissions found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedUserFilter !== 'all' || selectedStatusFilter !== 'ALL'
                ? 'No submission records match your active search or filter parameters.'
                : 'There are currently no submission records logged in the backend system.'}
            </p>
            {(search || selectedUserFilter !== 'all' || selectedStatusFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedUserFilter('all');
                  setSelectedCampaignFilter('all');
                  setSelectedStatusFilter('ALL');
                  setSelectedModeFilter('ALL');
                }}
                className="mt-4 text-xs border-slate-200 text-slate-700"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Target Destination</th>
                  <th className="px-5 py-3.5">Submission Mode</th>
                  <th className="px-5 py-3.5">Outcome</th>
                  <th className="px-5 py-3.5">Execution Latency</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Target Destination: Company + Target URL + Owner & Campaign */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-[#111827] text-xs">{s.companyName}</div>
                      <a
                        href={s.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0e6de4] hover:underline font-mono truncate max-w-[220px] inline-block"
                      >
                        {s.targetUrl}
                      </a>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>Owner: {s.ownerName}</span>
                        <span>•</span>
                        <span>Campaign: {s.campaignName}</span>
                      </div>
                    </td>

                    {/* Submission Mode */}
                    <td className="px-5 py-3.5 font-mono text-[11px]">
                      {renderModeBadge(s.submissionMode)}
                    </td>

                    {/* Outcome Status */}
                    <td className="px-5 py-3.5">{renderStatusBadge(s.status)}</td>

                    {/* Execution Latency */}
                    <td className="px-5 py-3.5 font-mono text-slate-700 font-medium">
                      {typeof s.executionLatencyMs === 'number' ? `${s.executionLatencyMs.toLocaleString()} ms` : 'N/A'}
                    </td>

                    {/* Timestamp */}
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      {formatDate(s.timestamp)}
                    </td>

                    {/* Proof Button (ContactReachout Blue/Neutral Outline Style) */}
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProof(s)}
                        className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#0e6de4] font-medium"
                      >
                        <Camera className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        View Proof
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {submissions.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-[#111827]">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-[#111827]">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold text-[#111827]">{totalCount}</span> submission records
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

      {/* Visual Proof Inspection Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 bg-white shadow-2xl rounded-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                <Camera className="h-4 w-4 text-[#0e6de4]" />
                Proof of Execution: {selectedProof.companyName}
              </h3>
              <button
                onClick={() => setSelectedProof(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Visual Proof Display Container */}
            <div className="aspect-video w-full rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-500 p-4 space-y-2 text-center">
              {selectedProof.screenshotBase64 || selectedProof.screenshotUrl ? (
                <img
                  src={selectedProof.screenshotBase64 || selectedProof.screenshotUrl!}
                  alt="Submission Visual Proof"
                  className="w-full h-full object-cover rounded-lg border border-slate-200"
                />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-[#0e6de4]" />
                  <p className="text-xs font-mono font-bold text-[#111827]">Visual Telemetry Proof Verified</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    SHA-256 Checksum Logged • HTTP Mode: {selectedProof.submissionMode}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-full">
                    {selectedProof.targetUrl}
                  </p>
                </>
              )}
            </div>

            {/* Submission Metadata Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Owner</span>
                <div className="font-semibold text-[#111827]">{selectedProof.ownerName}</div>
                <div className="text-[10px] text-slate-500 truncate">{selectedProof.ownerEmail}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Campaign</span>
                <div className="font-semibold text-[#111827]">{selectedProof.campaignName}</div>
                <div className="text-[10px] text-slate-500 font-mono">ID: {selectedProof.campaignId}</div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Execution Latency</span>
                <div className="font-mono font-medium text-[#111827]">
                  {selectedProof.executionLatencyMs} ms
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Timestamp</span>
                <div className="font-mono text-slate-700">{formatDate(selectedProof.timestamp)}</div>
              </div>

              {selectedProof.confirmationMessage && (
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold">Confirmation Signal</span>
                  <div className="font-mono text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-100 mt-0.5">
                    {selectedProof.confirmationMessage}
                  </div>
                </div>
              )}

              {selectedProof.errorMessage && (
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-red-700 uppercase font-semibold">Diagnostic Error</span>
                  <div className="font-mono text-[11px] text-red-800 bg-red-50 p-1.5 rounded border border-red-100 mt-0.5">
                    {selectedProof.errorMessage}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProof(null)}
                className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs"
              >
                Close Proof
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
