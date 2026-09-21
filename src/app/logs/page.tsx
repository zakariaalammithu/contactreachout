'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Layers,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { mockLogs } from '@/lib/store/mock-data';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

interface UserSubmissionRecord {
  id: string;
  timestamp: string;
  campaignName: string;
  website: string;
  domain: string;
  status: 'DELIVERED' | 'PENDING' | 'FAILED' | 'NO_FORM' | 'REVIEW' | 'REPLIED';
  creditUsed: number;
  creditSource?: 'FREE' | 'PAID';
  resultDescription: string;
  ownerEmail: string;
}

export default function UsageAndHistoryPage() {
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin Technical Telemetry State
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');

  // Normal User Usage & History State
  const [userSubmissions, setUserSubmissions] = useState<UserSubmissionRecord[]>([]);
  const [walletStats, setWalletStats] = useState({
    availableCredits: 100,
    usedCredits: 0,
    purchasedCredits: 0,
    freeMonthlyCredits: 100,
  });

  // Normal User Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [creditFilter, setCreditFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load Session & User Data
  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        setLoading(true);
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.authenticated && data.user) {
            const email = (data.user.email || '').toLowerCase().trim();
            const role = data.user.role || 'USER';
            const name = data.user.name || email.split('@')[0];
            const userObj = { email, role, name };
            setCurrentUser(userObj);

            const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN' || email === 'mithusquare@gmail.com';

            if (isAdmin) {
              // Fetch Admin Technical Audit Logs
              try {
                const logsRes = await fetch(`/api/logs?level=${levelFilter}&search=${encodeURIComponent(adminSearchTerm)}`);
                if (logsRes.ok) {
                  const logsData = await logsRes.json();
                  if (isMounted && logsData.logs) {
                    setAdminLogs(logsData.logs);
                  }
                } else {
                  if (isMounted) setAdminLogs(mockLogs);
                }
              } catch {
                if (isMounted) setAdminLogs(mockLogs);
              }
            } else {
              // Load User-Specific Wallet & Submissions
              loadUserUsageData(email);
            }
          }
        }
      } catch (err) {
        console.error('Session load error on Usage page:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadUserUsageData = (userEmail: string) => {
    if (typeof window === 'undefined') return;

    const emailLower = userEmail.toLowerCase().trim();

    // 1. Load User Credit Wallet
    const wallet = CreditWalletService.getWallet(emailLower);
    setWalletStats({
      availableCredits: wallet.totalCreditsAvailable,
      usedCredits: wallet.lifetimeCreditsUsed || wallet.freeMonthlyUsed || 0,
      purchasedCredits: wallet.paidCredits || wallet.lifetimeCreditsPurchased || 0,
      freeMonthlyCredits: wallet.freeMonthlyCredits || 100,
    });

    // 2. Load User Submissions from localStorage or generate from user campaigns/imported leads
    try {
      const storedSubmissions = localStorage.getItem(`user_submissions_${emailLower}`);
      if (storedSubmissions) {
        const parsed = JSON.parse(storedSubmissions);
        if (Array.isArray(parsed)) {
          setUserSubmissions(parsed.filter((item: any) => !item.ownerEmail || item.ownerEmail.toLowerCase() === emailLower));
          return;
        }
      }

      // Generate realistic user submission records from user's campaigns/leads if any
      const storedLeads = localStorage.getItem('user_imported_leads');
      const storedCampaigns = localStorage.getItem('user_campaigns');

      let userLeads: any[] = [];
      if (storedLeads) {
        const parsedLeads = JSON.parse(storedLeads);
        if (Array.isArray(parsedLeads)) {
          userLeads = parsedLeads.filter((l: any) => !l.ownerEmail || l.ownerEmail.toLowerCase() === emailLower);
        }
      }

      let userCampaignsList: any[] = [];
      if (storedCampaigns) {
        const parsedCamps = JSON.parse(storedCampaigns);
        if (Array.isArray(parsedCamps)) {
          userCampaignsList = parsedCamps.filter((c: any) => !c.ownerEmail || c.ownerEmail.toLowerCase() === emailLower);
        }
      }

      const generatedRecords: UserSubmissionRecord[] = userLeads.map((ld: any, idx: number) => {
        const campaignName = userCampaignsList[idx % Math.max(userCampaignsList.length, 1)]?.name || 'Contact Form Outreach';
        const rawStatus = String(ld.status || 'DELIVERED').toUpperCase().trim();
        let mappedStatus: 'DELIVERED' | 'PENDING' | 'FAILED' | 'NO_FORM' | 'REVIEW' | 'REPLIED' = 'DELIVERED';
        let resultDesc = 'Website contact form submitted successfully.';

        if (rawStatus === 'FAILED') {
          mappedStatus = 'FAILED';
          resultDesc = 'Form submission failed (Timeout or server error).';
        } else if (rawStatus === 'NO_FORM' || rawStatus === 'NO_CONTACT_PAGE') {
          mappedStatus = 'NO_FORM';
          resultDesc = 'No contact form page found on website.';
        } else if (rawStatus === 'REVIEW' || rawStatus === 'CAPTCHA') {
          mappedStatus = 'REVIEW';
          resultDesc = 'CAPTCHA / Bot challenge required manual review.';
        } else if (rawStatus === 'REPLIED' || rawStatus === 'INTERESTED') {
          mappedStatus = 'REPLIED';
          resultDesc = 'Recipient replied to outreach submission.';
        } else if (rawStatus === 'PENDING') {
          mappedStatus = 'PENDING';
          resultDesc = 'Queued for delivery attempt.';
        }

        return {
          id: `sub-${Date.now()}-${idx}`,
          timestamp: ld.lastAttemptAt || ld.createdAt || new Date(Date.now() - idx * 3600000 * 3).toISOString(),
          campaignName: campaignName,
          website: ld.website || `https://${ld.domain || 'domain.com'}`,
          domain: ld.domain || ld.website || 'domain.com',
          status: mappedStatus,
          creditUsed: mappedStatus === 'NO_FORM' || mappedStatus === 'FAILED' ? 0 : 1,
          creditSource: 'FREE',
          resultDescription: resultDesc,
          ownerEmail: emailLower,
        };
      });

      setUserSubmissions(generatedRecords);
    } catch (e) {
      console.error('Error loading submission history:', e);
    }
  };

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.email === 'mithusquare@gmail.com';

  // Available User Campaign Names for Filter Dropdown
  const userCampaignNames = useMemo(() => {
    return Array.from(new Set(userSubmissions.map((s) => s.campaignName).filter(Boolean)));
  }, [userSubmissions]);

  // Filtered Normal User Submissions
  const filteredSubmissions = useMemo(() => {
    return userSubmissions.filter((sub) => {
      const searchLower = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        sub.campaignName.toLowerCase().includes(searchLower) ||
        sub.website.toLowerCase().includes(searchLower) ||
        sub.domain.toLowerCase().includes(searchLower) ||
        sub.resultDescription.toLowerCase().includes(searchLower);

      const matchesCampaign = campaignFilter === 'ALL' || sub.campaignName === campaignFilter;

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = sub.status === statusFilter;
      }

      let matchesDate = true;
      if (dateFilter !== 'ALL') {
        const subTime = new Date(sub.timestamp).getTime();
        const now = Date.now();
        if (dateFilter === 'TODAY') {
          matchesDate = now - subTime < 86400000;
        } else if (dateFilter === '7DAYS') {
          matchesDate = now - subTime < 7 * 86400000;
        } else if (dateFilter === '30DAYS') {
          matchesDate = now - subTime < 30 * 86400000;
        }
      }

      let matchesCredit = true;
      if (creditFilter !== 'ALL') {
        if (creditFilter === 'USED') {
          matchesCredit = sub.creditUsed > 0;
        } else if (creditFilter === 'FREE') {
          matchesCredit = sub.creditSource === 'FREE';
        } else if (creditFilter === 'PAID') {
          matchesCredit = sub.creditSource === 'PAID';
        }
      }

      return matchesSearch && matchesCampaign && matchesStatus && matchesDate && matchesCredit;
    });
  }, [userSubmissions, searchTerm, campaignFilter, statusFilter, dateFilter, creditFilter]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, campaignFilter, statusFilter, dateFilter, creditFilter, pageSize]);

  // Submissions Pagination Slices
  const totalRecords = filteredSubmissions.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const currentPaginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // Normal User Submission Metrics
  const totalSubmissions = userSubmissions.length;
  const successfulSubmissions = userSubmissions.filter((s) => s.status === 'DELIVERED' || s.status === 'REPLIED').length;
  const failedSubmissions = userSubmissions.filter((s) => s.status === 'FAILED' || s.status === 'NO_FORM' || s.status === 'REVIEW').length;

  // Filtered Admin Technical Logs
  const filteredAdminLogs = useMemo(() => {
    return adminLogs.filter((log) => {
      const matchesLevel = levelFilter === 'ALL' || log.level.toUpperCase() === levelFilter;
      const matchesSearch =
        !adminSearchTerm ||
        log.traceId.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
        log.message.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
        (log.domain && log.domain.toLowerCase().includes(adminSearchTerm.toLowerCase()));
      return matchesLevel && matchesSearch;
    });
  }, [adminLogs, levelFilter, adminSearchTerm]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) {
      alert('No submission records match your applied filters.');
      return;
    }

    const headers = ['Date & Time', 'Campaign Name', 'Website URL', 'Domain', 'Status', 'Credit Used', 'Result Description'];
    const rows = filteredSubmissions.map((s) => [
      `"${new Date(s.timestamp).toLocaleString()}"`,
      `"${s.campaignName.replace(/"/g, '""')}"`,
      `"${s.website.replace(/"/g, '""')}"`,
      `"${s.domain.replace(/"/g, '""')}"`,
      `"${s.status}"`,
      s.creditUsed,
      `"${s.resultDescription.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ContactReachout_Usage_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // XLSX Export Handler (Formatted Excel CSV)
  const handleExportXLSX = () => {
    if (filteredSubmissions.length === 0) {
      alert('No submission records match your applied filters.');
      return;
    }

    const headers = ['Date & Time\tCampaign Name\tWebsite URL\tDomain\tStatus\tCredit Used\tResult Description'];
    const rows = filteredSubmissions.map((s) =>
      `${new Date(s.timestamp).toLocaleString()}\t${s.campaignName}\t${s.website}\t${s.domain}\t${s.status}\t${s.creditUsed}\t${s.resultDescription}`
    );

    const xlsxContent = [headers.join(''), ...rows].join('\n');
    const blob = new Blob([xlsxContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ContactReachout_Usage_History_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm font-semibold text-slate-500">
        Loading Usage & History...
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-[1750px] pb-12">
      {/* Role Badge & Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {isAdmin ? 'System & Worker Audit Logs' : 'Usage & Submission History'}
            </h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isAdmin ? 'bg-blue-100 text-[#0e6de4]' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isAdmin ? (currentUser?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN') : 'USER'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Distributed execution telemetry, browser worker events, and system audit traces.'
              : 'Track your credit consumption, outreach submissions, campaign activity, and form delivery results.'}
          </p>
        </div>

        {isAdmin ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetch(`/api/logs?level=${levelFilter}&search=${encodeURIComponent(adminSearchTerm)}`)
                .then((r) => r.json())
                .then((d) => d.logs && setAdminLogs(d.logs))
                .catch(() => undefined);
            }}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Telemetry
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#0e6de4]" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportXLSX}
              className="flex items-center gap-1.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white px-4 py-2 text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export XLSX</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. SUPER ADMIN / ADMIN VIEW: Technical Worker Audit Logs */}
      {/* ========================================================= */}
      {isAdmin && (
        <div className="space-y-5">
          {/* Admin Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Trace ID, domain, or event message..."
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:outline-none shadow-2xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    levelFilter === lvl
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Logs Table */}
          <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3.5 font-bold">Timestamp</th>
                    <th className="p-3.5 font-bold">Level</th>
                    <th className="p-3.5 font-bold">Trace ID</th>
                    <th className="p-3.5 font-bold">Domain</th>
                    <th className="p-3.5 font-bold">Phase / Step</th>
                    <th className="p-3.5 font-bold">Event Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {filteredAdminLogs.length > 0 ? (
                    filteredAdminLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${
                              log.level === 'error'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : log.level === 'warn'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {log.level}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#0e6de4] font-bold">{log.traceId}</td>
                        <td className="p-3.5 font-semibold text-slate-900">{log.domain || '—'}</td>
                        <td className="p-3.5 text-slate-600 font-bold">{log.step || 'WORKER_TELEMETRY'}</td>
                        <td className="p-3.5 max-w-lg truncate text-slate-800">{log.message}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                        No technical logs found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. NORMAL USER VIEW: Clean Usage Summary & Submission History */}
      {/* ========================================================= */}
      {!isAdmin && (
        <div className="space-y-6">
          {/* Summary Cards Grid (7 Key Metrics) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {/* Card 1: Available Credits */}
            <Card className="p-4 border-slate-200 bg-white shadow-xs rounded-2xl">
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Available Credits</span>
              <p className="mt-1 text-xl font-extrabold text-[#0e6de4] font-mono">{walletStats.availableCredits.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Ready for outreach</p>
            </Card>

            {/* Card 2: Used Credits */}
            <Card className="p-4 border-slate-200 bg-white shadow-xs rounded-2xl">
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Used Credits</span>
              <p className="mt-1 text-xl font-extrabold text-slate-900 font-mono">{walletStats.usedCredits.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Consumed to date</p>
            </Card>

            {/* Card 3: Purchased Credits */}
            <Card className="p-4 border-slate-200 bg-white shadow-xs rounded-2xl">
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Purchased Credits</span>
              <p className="mt-1 text-xl font-extrabold text-slate-900 font-mono">{walletStats.purchasedCredits.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Add-on balance</p>
            </Card>

            {/* Card 4: Free/Monthly Credits */}
            <Card className="p-4 border-slate-200 bg-white shadow-xs rounded-2xl">
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Free Monthly</span>
              <p className="mt-1 text-xl font-extrabold text-slate-900 font-mono">{walletStats.freeMonthlyCredits.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Monthly allocation</p>
            </Card>

            {/* Card 5: Total Submissions */}
            <Card className="p-4 border-slate-200 bg-white shadow-xs rounded-2xl">
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Total Submissions</span>
              <p className="mt-1 text-xl font-extrabold text-slate-900 font-mono">{totalSubmissions}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Total attempts</p>
            </Card>

            {/* Card 6: Successful Submissions */}
            <Card className="p-4 border-slate-200 bg-white shadow-xs rounded-2xl">
              <span className="text-[10px] font-bold font-mono text-emerald-600 uppercase tracking-wider">Successful</span>
              <p className="mt-1 text-xl font-extrabold text-emerald-700 font-mono">{successfulSubmissions}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Delivered & Replied</p>
            </Card>

            {/* Card 7: Failed Submissions */}
            <Card className="p-4 border-slate-200 bg-white shadow-xs rounded-2xl">
              <span className="text-[10px] font-bold font-mono text-rose-600 uppercase tracking-wider">Failed / Review</span>
              <p className="mt-1 text-xl font-extrabold text-rose-700 font-mono">{failedSubmissions}</p>
              <p className="text-[10px] text-rose-600 mt-0.5">No-Form / Blocked</p>
            </Card>
          </div>

          {/* Filter Toolbar (Search, Campaign, Status, Date, Credit Usage) */}
          <Card className="p-4 border-slate-200 bg-white shadow-xs rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaign, website..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:outline-none"
                />
              </div>

              {/* Campaign Filter */}
              <div>
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0e6de4] focus:outline-none"
                >
                  <option value="ALL">All Campaigns</option>
                  {userCampaignNames.map((cName) => (
                    <option key={cName} value={cName}>
                      {cName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0e6de4] focus:outline-none font-bold"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="NO_FORM">No-Form</option>
                  <option value="REVIEW">Review</option>
                  <option value="REPLIED">Replied</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0e6de4] focus:outline-none"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="7DAYS">Last 7 Days</option>
                  <option value="30DAYS">Last 30 Days</option>
                </select>
              </div>

              {/* Credit Usage Filter */}
              <div>
                <select
                  value={creditFilter}
                  onChange={(e) => setCreditFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0e6de4] focus:outline-none"
                >
                  <option value="ALL">All Credit Usage</option>
                  <option value="USED">Credits Used (&gt; 0)</option>
                  <option value="FREE">Free Credits</option>
                  <option value="PAID">Paid Credits</option>
                </select>
              </div>
            </div>

            {/* Active Filters Clear Action */}
            {(searchTerm || campaignFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter !== 'ALL' || creditFilter !== 'ALL') && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Showing <strong>{filteredSubmissions.length}</strong> matching records
                </span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCampaignFilter('ALL');
                    setStatusFilter('ALL');
                    setDateFilter('ALL');
                    setCreditFilter('ALL');
                  }}
                  className="text-[#0e6de4] hover:underline font-bold text-[11px] cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </Card>

          {/* Submission History Table */}
          <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm rounded-2xl flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3.5 font-bold">Date & Time</th>
                    <th className="p-3.5 font-bold">Campaign</th>
                    <th className="p-3.5 font-bold">Website</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 font-bold text-center">Credit Used</th>
                    <th className="p-3.5 font-bold">Result</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {currentPaginatedSubmissions.length > 0 ? (
                    currentPaginatedSubmissions.map((sub, idx) => (
                      <tr key={sub.id || idx} className="hover:bg-slate-50 transition-colors">
                        {/* Date & Time */}
                        <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(sub.timestamp).toLocaleString()}
                        </td>

                        {/* Campaign */}
                        <td className="p-3.5 font-bold text-slate-900">{sub.campaignName}</td>

                        {/* Website */}
                        <td className="p-3.5 font-medium">
                          <a
                            href={sub.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-700 hover:text-[#0e6de4] hover:underline font-mono flex items-center gap-1 text-[11px]"
                          >
                            {sub.domain || sub.website}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          {(() => {
                            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                            if (sub.status === 'DELIVERED') {
                              badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                            } else if (sub.status === 'FAILED') {
                              badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
                            } else if (sub.status === 'NO_FORM') {
                              badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                            } else if (sub.status === 'REVIEW') {
                              badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
                            } else if (sub.status === 'REPLIED') {
                              badgeStyle = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                            } else if (sub.status === 'PENDING') {
                              badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200';
                            }
                            return (
                              <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${badgeStyle}`}>
                                {sub.status.replace(/_/g, ' ')}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Credit Used */}
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                          {sub.creditUsed > 0 ? (
                            <span className="text-[#0e6de4] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[11px]">
                              -{sub.creditUsed} Credit
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Result Description */}
                        <td className="p-3.5 text-slate-600 text-xs">{sub.resultDescription}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500">
                        <div className="mx-auto max-w-sm space-y-2">
                          <ScrollText className="h-8 w-8 text-slate-300 mx-auto" />
                          <p className="text-sm font-extrabold text-slate-800">No Submission History Found</p>
                          <p className="text-xs text-slate-500">
                            {userSubmissions.length === 0
                              ? 'No outreach attempts recorded yet. Start a campaign to track form submissions.'
                              : 'No submission records match your active search or filter criteria.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer Bar */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-600 font-mono">
                <span>
                  Showing <strong className="text-slate-900">{totalRecords > 0 ? startIndex + 1 : 0}</strong> to{' '}
                  <strong className="text-slate-900">{endIndex}</strong> of{' '}
                  <strong className="text-slate-900">{totalRecords}</strong> Total Records
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-[#0e6de4] text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalRecords === 0}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
