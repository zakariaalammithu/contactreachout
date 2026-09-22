'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  Users,
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
  Plus,
  Trash2,
  Tag,
  Briefcase,
  Activity,
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

interface AdminCrmContact {
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
  lastActivityAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  httpStatus?: number | null;
  sourceFileName?: string | null;
  customFields?: Record<string, any>;
  submissionHistory?: any[];
  statusHistory?: any[];
}

interface SummaryMetrics {
  totalContacts: number;
  totalLists: number;
  activeCampaignContacts: number;
  delivered: number;
  pending: number;
  failed: number;
  noForm: number;
  review: number;
  replied: number;
}

interface FilterRule {
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

export default function AdminCrmPage() {
  // API Data States
  const [contacts, setContacts] = useState<AdminCrmContact[]>([]);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [leadListsOptions, setLeadListsOptions] = useState<string[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [customFieldKeys, setCustomFieldKeys] = useState<string[]>([]);

  const [metrics, setMetrics] = useState<SummaryMetrics>({
    totalContacts: 0,
    totalLists: 0,
    activeCampaignContacts: 0,
    delivered: 0,
    pending: 0,
    failed: 0,
    noForm: 0,
    review: 0,
    replied: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorState, setErrorState] = useState<{ status: number; message: string } | null>(null);

  // Search & Basic Filter States
  const [search, setSearch] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedListFilter, setSelectedListFilter] = useState('all');
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Advanced Filter Rules with AND/OR Logic
  const [logicMode, setLogicMode] = useState<'AND' | 'OR'>('AND');
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection & Columns State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState({
    owner: true,
    website: true,
    company: true,
    leadList: true,
    firstName: true,
    lastName: true,
    email: true,
    country: true,
    status: true,
    campaign: true,
    dateAdded: true,
    lastActivity: true,
  });
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);

  // Inspect Drawer State
  const [inspectContact, setInspectContact] = useState<AdminCrmContact | null>(null);

  // Fetch CRM Contacts from Backend API
  const fetchContacts = async () => {
    setIsLoading(true);
    setErrorState(null);

    try {
      // Sync local user imported leads / CRM records to server store if available
      if (typeof window !== 'undefined') {
        const storedLocal = localStorage.getItem('user_imported_leads');
        if (storedLocal) {
          try {
            const parsedLocal = JSON.parse(storedLocal);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              const activeEmail = (localStorage.getItem('active_account_email') || 'mithusquare@gmail.com').toLowerCase();
              const payload = parsedLocal.map((l: any) => ({
                id: l.id || `crm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
                listName: l.listId || l.sourceFileName ? l.listId || l.sourceFileName.replace(/\.[^/.]+$/, '') : 'Direct Import',
                createdAt: l.createdAt || new Date().toISOString(),
                customFields: l.customFields || {
                  Phone: l.phone,
                  Title: l.title,
                  Industry: l.industry,
                },
              }));

              await fetch('/api/admin/crm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: payload }),
              });
            }
          } catch (e) {
            console.error('Local CRM sync error:', e);
          }
        }
      }

      const queryParams = new URLSearchParams({
        q: search.trim(),
        userEmail: selectedUserFilter,
        listName: selectedListFilter,
        campaignName: selectedCampaignFilter,
        status: selectedStatusFilter,
        country: selectedCountryFilter,
        logic: logicMode,
        filters: JSON.stringify(filterRules),
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/admin/crm?${queryParams.toString()}`);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErrorState({
            status: res.status,
            message: 'Access Denied: Super Admin or Admin privileges are required to access global CRM repository.',
          });
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to load CRM contacts (HTTP ${res.status})`);
      }

      const data = await res.json();
      setContacts(data.contacts || []);
      setTotalCount(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      if (data.summaryMetrics) setMetrics(data.summaryMetrics);
      if (data.options) {
        setUsersList(data.options.users || []);
        setLeadListsOptions(data.options.leadLists || []);
        setCampaignOptions(data.options.campaigns || []);
        setCountryOptions(data.options.countries || []);
        setCustomFieldKeys(data.options.customFields || []);
      }
    } catch (err: any) {
      console.error('Fetch admin CRM error:', err);
      setErrorState({
        status: 500,
        message: err.message || 'An error occurred while communicating with the server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [
    search,
    selectedUserFilter,
    selectedListFilter,
    selectedCampaignFilter,
    selectedStatusFilter,
    selectedCountryFilter,
    logicMode,
    filterRules,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  // Add a new filter rule
  const handleAddRule = () => {
    setFilterRules((prev) => [
      ...prev,
      { field: 'company', operator: 'contains', value: '' },
    ]);
  };

  // Remove a filter rule
  const handleRemoveRule = (index: number) => {
    setFilterRules((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a filter rule
  const handleUpdateRule = (index: number, key: keyof FilterRule, val: string) => {
    setFilterRules((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  // Export CSV Handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams({
        q: search.trim(),
        userEmail: selectedUserFilter,
        listName: selectedListFilter,
        campaignName: selectedCampaignFilter,
        status: selectedStatusFilter,
        country: selectedCountryFilter,
        logic: logicMode,
        filters: JSON.stringify(filterRules),
        export: 'csv',
      });

      const res = await fetch(`/api/admin/crm?${queryParams.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `admin_global_crm_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Failed to generate CRM export file.');
      }
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    } finally {
      setIsExporting(false);
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
    const s = (status || '').toUpperCase().replace('-', '_');
    switch (s) {
      case 'DELIVERED':
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            DELIVERED
          </span>
        );
      case 'REPLIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            REPLIED
          </span>
        );
      case 'PENDING':
      case 'UNCONTACTED':
      case 'PROSPECTS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            {s}
          </span>
        );
      case 'REVIEW':
      case 'REVIEW_REQUIRED':
      case 'CAPTCHA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            REVIEW
          </span>
        );
      case 'FAILED':
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            FAILED
          </span>
        );
      case 'NO_FORM':
      case 'NO-FORM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            NO-FORM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {s || 'PROSPECTS'}
          </span>
        );
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length && contacts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // If user is forbidden
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
              <Users className="h-5 w-5" />
            </div>
            Global CRM Architecture
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Platform-wide multi-tenant CRM workspace, lead list relations, and custom field matrix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || contacts.length === 0}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            {isExporting ? 'Exporting...' : 'Export CSV / XLSX'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchContacts}
            disabled={isLoading}
            className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Summary Metrics Grid (Calculated Directly from Real Database Query) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-2.5">
        <Card className="p-3 bg-white border border-slate-200/80 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Contacts</div>
          <div className="text-lg font-bold font-mono text-[#111827] mt-0.5">
            {metrics.totalContacts.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3 bg-white border border-slate-200/80 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Lists</div>
          <div className="text-lg font-bold font-mono text-[#0e6de4] mt-0.5">
            {metrics.totalLists.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3 bg-white border border-slate-200/80 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Campaign</div>
          <div className="text-lg font-bold font-mono text-slate-700 mt-0.5">
            {metrics.activeCampaignContacts.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3 bg-emerald-50/60 border border-emerald-100 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Delivered</div>
          <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
            {metrics.delivered.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3 bg-blue-50/60 border border-blue-100 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Pending</div>
          <div className="text-lg font-bold font-mono text-blue-700 mt-0.5">
            {metrics.pending.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3 bg-red-50/60 border border-red-100 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-red-700 uppercase tracking-wider">Failed</div>
          <div className="text-lg font-bold font-mono text-red-700 mt-0.5">
            {metrics.failed.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3 bg-slate-50 border border-slate-200 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">No-Form</div>
          <div className="text-lg font-bold font-mono text-slate-700 mt-0.5">
            {metrics.noForm.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3 bg-amber-50/60 border border-amber-100 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Review</div>
          <div className="text-lg font-bold font-mono text-amber-700 mt-0.5">
            {metrics.review.toLocaleString()}
          </div>
        </Card>

        <Card className="p-3 bg-emerald-100/60 border border-emerald-200 shadow-xs text-center rounded-xl">
          <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Replied</div>
          <div className="text-lg font-bold font-mono text-emerald-800 mt-0.5">
            {metrics.replied.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Primary Search & Filter Bar */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Omni Search Box */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Company, Domain, Email, Name, Custom Fields..."
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

          {/* Super Admin Owner Filter */}
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

          {/* Lead List Filter */}
          <div className="md:col-span-3">
            <div className="relative">
              <FileSpreadsheet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedListFilter}
                onChange={(e) => {
                  setSelectedListFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/20 focus:border-[#0e6de4] appearance-none"
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

          {/* Toggle Controls */}
          <div className="md:col-span-2 flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`h-9 text-xs border-slate-200 ${
                showAdvancedFilters ? 'bg-[#0e6de4]/10 text-[#0e6de4] border-[#0e6de4]/30' : 'text-slate-700 bg-white'
              }`}
            >
              <Filter className="h-3.5 w-3.5 mr-1" />
              Rules {filterRules.length > 0 ? `(${filterRules.length})` : ''}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
              className="h-9 text-xs border-slate-200 text-slate-700 bg-white"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Secondary Filter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[#111827] focus:outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value="PROSPECTS">PROSPECTS</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="NO_FORM">NO-FORM</option>
              <option value="REVIEW">REVIEW</option>
              <option value="REPLIED">REPLIED</option>
            </select>
          </div>

          {/* Campaign Filter */}
          <div>
            <select
              value={selectedCampaignFilter}
              onChange={(e) => {
                setSelectedCampaignFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[#111827] focus:outline-none"
            >
              <option value="all">Campaign: All</option>
              {campaignOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[#111827] focus:outline-none"
            >
              <option value="all">Country: All</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="lastActivityAt-desc">Recent Activity</option>
              <option value="companyName-asc">Company (A-Z)</option>
              <option value="status-asc">Status</option>
            </select>
          </div>
        </div>

        {/* Advanced Filter Rules Builder with AND/OR Logic */}
        {showAdvancedFilters && (
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs text-[#111827]">Advanced Rule Matrix</span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5 text-xs">
                  <button
                    onClick={() => setLogicMode('AND')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      logicMode === 'AND' ? 'bg-[#0e6de4] text-white' : 'text-slate-600 hover:text-[#111827]'
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setLogicMode('OR')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      logicMode === 'OR' ? 'bg-[#0e6de4] text-white' : 'text-slate-600 hover:text-[#111827]'
                    }`}
                  >
                    OR
                  </button>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRule}
                className="h-7 text-xs border-slate-200 text-slate-700 bg-white"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Condition
              </Button>
            </div>

            {filterRules.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No custom rules added. Click "Add Condition" to create advanced filter statements.</p>
            ) : (
              <div className="space-y-2">
                {filterRules.map((rule, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-[10px] text-slate-400 w-6">
                      {idx === 0 ? 'IF' : logicMode}
                    </span>

                    {/* Select Field */}
                    <select
                      value={rule.field}
                      onChange={(e) => handleUpdateRule(idx, 'field', e.target.value)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-[#111827]"
                    >
                      <option value="company">Company</option>
                      <option value="domain">Domain</option>
                      <option value="website">Website</option>
                      <option value="email">Email</option>
                      <option value="firstName">First Name</option>
                      <option value="lastName">Last Name</option>
                      <option value="country">Country</option>
                      <option value="status">Status</option>
                      <option value="listName">Lead List</option>
                      <option value="campaignName">Campaign</option>
                      <option value="ownerEmail">Owner Email</option>
                      {customFieldKeys.map((k) => (
                        <option key={k} value={k}>
                          Custom: {k}
                        </option>
                      ))}
                    </select>

                    {/* Select Operator */}
                    <select
                      value={rule.operator}
                      onChange={(e) => handleUpdateRule(idx, 'operator', e.target.value as any)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-[#111827]"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="starts_with">Starts With</option>
                      <option value="does_not_contain">Does Not Contain</option>
                      <option value="greater_than">Greater Than (&gt;)</option>
                      <option value="less_than">Less Than (&lt;)</option>
                      <option value="before">Before Date</option>
                      <option value="after">After Date</option>
                    </select>

                    {/* Value Input */}
                    <input
                      type="text"
                      placeholder="Target Value..."
                      value={rule.value}
                      onChange={(e) => handleUpdateRule(idx, 'value', e.target.value)}
                      className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-[#111827] focus:outline-none flex-1 min-w-[120px]"
                    />

                    <button
                      onClick={() => handleRemoveRule(idx)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Column Customizer Panel */}
        {showColumnCustomizer && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap gap-4 text-xs">
            <div className="font-semibold text-slate-600">Toggle Visible Columns:</div>
            {Object.keys(visibleColumns).map((col) => (
              <label key={col} className="flex items-center gap-1.5 cursor-pointer capitalize text-slate-700">
                <input
                  type="checkbox"
                  checked={visibleColumns[col as keyof typeof visibleColumns]}
                  onChange={(e) =>
                    setVisibleColumns({
                      ...visibleColumns,
                      [col]: e.target.checked,
                    })
                  }
                  className="rounded text-[#0e6de4] focus:ring-[#0e6de4]"
                />
                {col.replace(/([A-Z])/g, ' $1')}
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* Main CRM Table */}
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0e6de4] border-t-transparent mb-3"></div>
            <p className="text-xs text-slate-500 font-medium">Executing multi-tenant CRM query...</p>
          </div>
        ) : contacts.length === 0 ? (
          /* Clean Real Empty State (Zero Hardcoded Mock Data) */
          <div className="p-16 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-[#111827]">No contacts found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || selectedUserFilter !== 'all' || selectedStatusFilter !== 'ALL' || filterRules.length > 0
                ? 'No CRM contact records match your active search or filter rules.'
                : 'There are currently no CRM contacts stored in the database.'}
            </p>
            {(search || selectedUserFilter !== 'all' || selectedStatusFilter !== 'ALL' || filterRules.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedUserFilter('all');
                  setSelectedListFilter('all');
                  setSelectedCampaignFilter('all');
                  setSelectedStatusFilter('ALL');
                  setSelectedCountryFilter('all');
                  setFilterRules([]);
                }}
                className="mt-4 text-xs border-slate-200 text-slate-700"
              >
                Reset Filters & Rules
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === contacts.length && contacts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-[#0e6de4] focus:ring-[#0e6de4]"
                    />
                  </th>
                  {visibleColumns.owner && <th className="px-4 py-3.5">Owner</th>}
                  {visibleColumns.website && <th className="px-4 py-3.5">Website & Domain</th>}
                  {visibleColumns.company && <th className="px-4 py-3.5">Company</th>}
                  {visibleColumns.leadList && <th className="px-4 py-3.5">Lead List</th>}
                  {visibleColumns.firstName && <th className="px-4 py-3.5">First Name</th>}
                  {visibleColumns.lastName && <th className="px-4 py-3.5">Last Name</th>}
                  {visibleColumns.email && <th className="px-4 py-3.5">Email</th>}
                  {visibleColumns.country && <th className="px-4 py-3.5">Country</th>}
                  {visibleColumns.status && <th className="px-4 py-3.5">Status</th>}
                  {visibleColumns.campaign && <th className="px-4 py-3.5">Campaign</th>}
                  {visibleColumns.dateAdded && <th className="px-4 py-3.5">Date Added</th>}
                  {visibleColumns.lastActivity && <th className="px-4 py-3.5">Last Activity</th>}
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Checkbox */}
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded text-[#0e6de4] focus:ring-[#0e6de4]"
                      />
                    </td>

                    {/* Owner Column (Default Visible in Admin View) */}
                    {visibleColumns.owner && (
                      <td className="px-4 py-3.5 text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#0e6de4]/10 text-[#0e6de4] flex items-center justify-center font-bold text-[11px] border border-[#0e6de4]/20 flex-shrink-0">
                            {c.ownerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-[#111827] truncate">{c.ownerName}</div>
                            <div className="text-[10px] text-slate-400 truncate">{c.ownerEmail}</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Website */}
                    {visibleColumns.website && (
                      <td className="px-4 py-3.5">
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#0e6de4] hover:underline font-mono truncate max-w-[140px] inline-block"
                        >
                          {c.domain}
                        </a>
                      </td>
                    )}

                    {/* Company */}
                    {visibleColumns.company && (
                      <td className="px-4 py-3.5 font-semibold text-xs text-[#111827]">
                        {c.companyName}
                      </td>
                    )}

                    {/* Lead List */}
                    {visibleColumns.leadList && (
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {c.listName || 'General Import'}
                        </span>
                      </td>
                    )}

                    {/* First Name */}
                    {visibleColumns.firstName && (
                      <td className="px-4 py-3.5 text-slate-700">{c.firstName || 'N/A'}</td>
                    )}

                    {/* Last Name */}
                    {visibleColumns.lastName && (
                      <td className="px-4 py-3.5 text-slate-700">{c.lastName || 'N/A'}</td>
                    )}

                    {/* Email */}
                    {visibleColumns.email && (
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 truncate max-w-[140px]">
                        {c.email || 'N/A'}
                      </td>
                    )}

                    {/* Country */}
                    {visibleColumns.country && (
                      <td className="px-4 py-3.5 text-slate-600">{c.country || 'N/A'}</td>
                    )}

                    {/* Status Badge */}
                    {visibleColumns.status && <td className="px-4 py-3.5">{renderStatusBadge(c.status)}</td>}

                    {/* Campaign */}
                    {visibleColumns.campaign && (
                      <td className="px-4 py-3.5">
                        {c.campaignName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                            <Tag className="w-3 h-3 text-blue-500" />
                            {c.campaignName}
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                    )}

                    {/* Date Added */}
                    {visibleColumns.dateAdded && (
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                        {formatDate(c.createdAt)}
                      </td>
                    )}

                    {/* Last Activity */}
                    {visibleColumns.lastActivity && (
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                        {formatDate(c.lastActivityAt)}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectContact(c)}
                        className="h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#0e6de4]"
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
        {contacts.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-[#111827]">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-[#111827]">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold text-[#111827]">{totalCount}</span> CRM contacts
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

      {/* Single Contact Inspection Slide-Over Drawer */}
      {inspectContact && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 transform transition-all duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#0e6de4]" />
                  CRM Contact Record Inspection
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {inspectContact.id}</p>
              </div>
              <button
                onClick={() => setInspectContact(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {/* Title & Status Card */}
              <Card className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">{inspectContact.companyName}</h3>
                    <a
                      href={inspectContact.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#0e6de4] hover:underline font-mono"
                    >
                      {inspectContact.website}
                    </a>
                  </div>
                  <div>{renderStatusBadge(inspectContact.status)}</div>
                </div>
              </Card>

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Information</h4>
                <Card className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">First Name</div>
                      <div className="font-semibold text-[#111827]">{inspectContact.firstName || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Last Name</div>
                      <div className="font-semibold text-[#111827]">{inspectContact.lastName || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Email Address</div>
                      <div className="font-mono text-[#111827]">{inspectContact.email || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Country / Location</div>
                      <div className="text-[#111827]">{inspectContact.country || 'N/A'}</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Ownership & Lists */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ownership & Lead List</h4>
                <Card className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0e6de4]/10 text-[#0e6de4] flex items-center justify-center font-bold text-xs border border-[#0e6de4]/20">
                      {inspectContact.ownerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[#111827]">{inspectContact.ownerName}</div>
                      <div className="text-[11px] text-slate-500">{inspectContact.ownerEmail}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between font-mono">
                    <span>User ID: {inspectContact.ownerUserId || 'N/A'}</span>
                    <span>Lead List: {inspectContact.listName || 'General Import'}</span>
                  </div>
                </Card>
              </div>

              {/* Campaign Relation */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campaign Association</h4>
                <Card className="p-3.5 bg-white border border-slate-200 rounded-xl">
                  {inspectContact.campaignName ? (
                    <div>
                      <div className="font-semibold text-xs text-[#111827]">{inspectContact.campaignName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Campaign ID: {inspectContact.campaignId || 'N/A'}</div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">No campaign currently associated with this contact.</div>
                  )}
                </Card>
              </div>

              {/* Custom Fields */}
              {inspectContact.customFields && Object.keys(inspectContact.customFields).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Custom Imported Fields</h4>
                  <Card className="p-3.5 bg-white border border-slate-200 rounded-xl grid grid-cols-2 gap-3">
                    {Object.entries(inspectContact.customFields).map(([k, v]) => (
                      <div key={k}>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">{k}</div>
                        <div className="font-medium text-[#111827] mt-0.5">{String(v) || 'N/A'}</div>
                      </div>
                    ))}
                  </Card>
                </div>
              )}

              {/* Activity & History */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Activity & Telemetry</h4>
                <Card className="p-3.5 bg-white border border-slate-200 rounded-xl grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Date Added</div>
                    <div className="text-xs font-medium text-[#111827] mt-0.5">{formatDate(inspectContact.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Last Activity</div>
                    <div className="text-xs font-medium text-[#111827] mt-0.5">{formatDate(inspectContact.lastActivityAt)}</div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectContact(null)}
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
