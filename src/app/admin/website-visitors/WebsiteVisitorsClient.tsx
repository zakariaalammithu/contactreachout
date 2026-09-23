'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock,
  Globe2,
  Laptop,
  MonitorSmartphone,
  MousePointerClick,
  RefreshCw,
  Repeat,
  Search,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Tablet,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { VisitorSessionDetail } from '@/lib/services/website-analytics-service';

type RangeKey = 'today' | 'yesterday' | 'last-7-days' | 'last-30-days' | 'this-month' | 'custom';

interface VisitorAnalytics {
  hasData: boolean;
  metrics: {
    totalVisitors: number;
    uniqueVisitors: number;
    newVisitors: number;
    returningVisitors: number;
    pageViews: number;
    averageSessionDurationMs: number;
    bounceRate: number;
  } | null;
  trend: Array<{ date: string; visitors: number; uniqueVisitors: number; pageViews: number }>;
  countries: Array<{ country: string; visitors: number; uniqueVisitors: number; percentage: number }>;
  sources: Array<{ source: string; visitors: number; percentage: number }>;
  topPages: Array<{ path: string; pageViews: number; uniqueVisitors: number; averageTimeMs: number }>;
  devices: Array<{ name: string; visitors: number; percentage: number }>;
  browsers: Array<{ name: string; visitors: number; percentage: number }>;
  realtime: { activeVisitors: number; countries: string[]; pages: string[] };
  recentSessions?: VisitorSessionDetail[];
  storageMode: 'supabase' | 'in-memory';
}

interface PlatformAnalytics {
  users: { total: number; new: number; active: number; verified: number; paid: number };
  funnel: {
    websiteVisitors: number | null;
    signups: number;
    emailVerified: number;
    campaignCreated: number | null;
    firstSubmission: number | null;
    paidCustomers: number;
    visitorToSignupRate: number | null;
    signupToVerifiedRate: number | null;
    verifiedToCampaignRate: number | null;
    campaignToPaidRate: number | null;
  };
  productUsage: {
    activeCampaigns: number | null;
    totalCampaigns: number | null;
    totalProspects: number | null;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    creditsUsed: number | null;
    creditsPurchased: number;
    aiPersonalizationUsage: number | null;
  };
  revenue: {
    todayCents: number;
    thisMonthCents: number;
    totalCents: number;
    successfulTransactions: number;
    failedTransactions: number;
    creditsPurchased: number;
  };
}

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last-7-days', label: 'Last 7 Days' },
  { key: 'last-30-days', label: 'Last 30 Days' },
  { key: 'this-month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];

const tabs = ['Overview', 'Visitors', 'Sources', 'Countries', 'Devices', 'Users & Funnel', 'Product & Revenue'] as const;
type Tab = typeof tabs[number];

function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '—';
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MetricCard({ label, value, icon, hint }: { label: string; value: string; icon: React.ReactNode; hint?: string }) {
  return (
    <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</p>}
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5 text-[#0e6de4]">{icon}</div>
      </div>
    </Card>
  );
}

function EmptyAnalytics() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <BarChart3 className="h-6 w-6 text-slate-400" />
      <p className="text-sm font-bold text-slate-700">No visitor data available yet.</p>
      <p className="max-w-md text-xs text-slate-500">Analytics will appear after real website visits are recorded.</p>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-50">
            {headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
          {rows.map((row, index) => (
            <tr key={index} className="transition hover:bg-slate-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cn('px-4 py-3 font-semibold', cellIndex === 0 ? 'text-slate-900' : 'text-slate-600')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProgressRow({ label, value, percentage }: { label: string; value: string; percentage: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs font-bold">
        <span className="truncate text-slate-800">{label}</span>
        <span className="shrink-0 text-slate-500">{value} · {percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
        <div className="h-full rounded-full bg-[#0e6de4]" style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }} />
      </div>
    </div>
  );
}

export function WebsiteVisitorsClient() {
  const [range, setRange] = useState<RangeKey>('last-7-days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [visitorData, setVisitorData] = useState<VisitorAnalytics | null>(null);
  const [platformData, setPlatformData] = useState<PlatformAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Visitors table search, filter, pagination
  const [sessionSearch, setSessionSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const query = useMemo(() => {
    const params = new URLSearchParams({ range });
    if (range === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    return params.toString();
  }, [endDate, range, startDate]);

  const fetchData = useCallback(async () => {
    if (range === 'custom' && (!startDate || !endDate)) {
      setVisitorData(null);
      setPlatformData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [visitorResponse, platformResponse] = await Promise.all([
        fetch(`/api/admin/analytics/website-visitors?${query}`),
        fetch(`/api/admin/analytics/platform?${query}`),
      ]);
      if (!visitorResponse.ok || !platformResponse.ok) throw new Error('Analytics request failed');
      setVisitorData(await visitorResponse.json());
      setPlatformData(await platformResponse.json());
    } catch {
      setVisitorData(null);
      setPlatformData(null);
      setError('Analytics data is currently unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [endDate, query, range, startDate]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const metrics = visitorData?.metrics || null;
  const noVisitorData = !visitorData?.hasData;

  // Filtered session records for Visitors tab
  const filteredSessions = useMemo(() => {
    const list = visitorData?.recentSessions || [];
    return list.filter((item) => {
      const matchesSearch =
        !sessionSearch ||
        item.visitorIdMasked.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        item.entryPath.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        item.country.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        item.source.toLowerCase().includes(sessionSearch.toLowerCase());
      const matchesDevice = deviceFilter === 'ALL' || item.device.toUpperCase() === deviceFilter.toUpperCase();
      return matchesSearch && matchesDevice;
    });
  }, [visitorData?.recentSessions, sessionSearch, deviceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const paginatedSessions = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredSessions.slice(startIdx, startIdx + pageSize);
  }, [filteredSessions, currentPage]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            <BarChart3 className="h-7 w-7 text-[#0e6de4]" />
            Website Visitors & Analytics
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">
            Real first-party visitor telemetry, acquisition channels, geography, conversion funnel, and product usage.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-bold',
            visitorData?.storageMode === 'supabase'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-blue-200 bg-blue-50 text-[#0e6de4]'
          )}>
            {visitorData?.storageMode === 'supabase' ? 'Supabase Database' : 'Server Analytics Store'}
          </span>
          <Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={isLoading} className="border-slate-200 hover:border-[#0e6de4] hover:text-[#0e6de4]">
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4 border border-slate-200 bg-white rounded-xl shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setRange(option.key)}
                className={cn(
                  'rounded-xl border px-3.5 py-2 text-xs font-bold transition-all',
                  range === option.key
                    ? 'border-[#0e6de4] bg-[#0e6de4] text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-[#0e6de4]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-[#0e6de4] outline-none" />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-[#0e6de4] outline-none" />
            </div>
          )}
        </div>
      </Card>

      {/* Analytics Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={cn(
              'shrink-0 rounded-t-xl px-4 py-2.5 text-xs font-bold transition-all border-b-2',
              activeTab === tab
                ? 'border-[#0e6de4] bg-blue-50/70 text-[#0e6de4]'
                : 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {isLoading && (
        <Card className="p-12 text-center text-xs font-semibold text-slate-500 border border-slate-200 rounded-xl">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0e6de4] mb-2" />
          Loading analytics telemetry from server backend...
        </Card>
      )}

      {/* OVERVIEW TAB */}
      {!isLoading && activeTab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Visitors" value={metrics ? metrics.totalVisitors.toLocaleString() : '—'} icon={<Users className="h-4 w-4" />} />
            <MetricCard label="Unique Visitors" value={metrics ? metrics.uniqueVisitors.toLocaleString() : '—'} icon={<UserPlus className="h-4 w-4" />} />
            <MetricCard label="New Visitors" value={metrics ? metrics.newVisitors.toLocaleString() : '—'} icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Returning Visitors" value={metrics ? metrics.returningVisitors.toLocaleString() : '—'} icon={<Repeat className="h-4 w-4" />} />
            <MetricCard label="Page Views" value={metrics ? metrics.pageViews.toLocaleString() : '—'} icon={<MousePointerClick className="h-4 w-4" />} />
            <MetricCard label="Avg. Session" value={metrics ? formatDuration(metrics.averageSessionDurationMs) : '—'} icon={<Clock className="h-4 w-4" />} />
            <MetricCard label="Bounce Rate" value={metrics ? `${metrics.bounceRate}%` : '—'} icon={<Activity className="h-4 w-4" />} />
            <MetricCard label="Live Visitors Now" value={visitorData ? visitorData.realtime.activeVisitors.toLocaleString() : '—'} icon={<Globe2 className="h-4 w-4" />} hint={visitorData?.realtime.countries.slice(0, 2).join(', ')} />
          </div>

          <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Visitor Trend Over Time</h2>
                <p className="text-xs text-slate-500">Visitors, unique visitors, and page views over selected period</p>
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Automatic bucket aggregation</span>
            </div>
            <div className="mt-5 h-80">
              {noVisitorData ? <EmptyAnalytics /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitorData?.trend || []} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Line type="monotone" dataKey="visitors" stroke="#0e6de4" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="uniqueVisitors" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pageViews" stroke="#0284c7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* VISITORS TAB */}
      {!isLoading && activeTab === 'Visitors' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
              <h2 className="text-base font-bold text-slate-900">Top Pages</h2>
              <div className="mt-4">
                {noVisitorData ? <EmptyAnalytics /> : (
                  <DataTable
                    headers={['Page Path', 'Page Views', 'Unique Visitors', 'Avg. Time']}
                    rows={(visitorData?.topPages || []).map((page) => [
                      page.path,
                      page.pageViews.toLocaleString(),
                      page.uniqueVisitors.toLocaleString(),
                      formatDuration(page.averageTimeMs),
                    ])}
                  />
                )}
              </div>
            </Card>
            <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
              <h2 className="text-base font-bold text-slate-900">Recent Active Pages</h2>
              <p className="mt-1 text-xs text-slate-500">Pages with active visitor sessions in the last 5 minutes</p>
              <div className="mt-4">
                {visitorData?.realtime.pages.length ? (
                  <div className="space-y-2">
                    {visitorData.realtime.pages.map((page) => (
                      <div key={page} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800">
                        <span className="truncate">{page}</span>
                        <span className="ml-3 flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      </div>
                    ))}
                  </div>
                ) : <EmptyAnalytics />}
              </div>
            </Card>
          </div>

          {/* Real Visitor Sessions Repository */}
          <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Real Visitor Sessions Log</h2>
                <p className="text-xs text-slate-500">Privacy-masked telemetry records collected from backend tracking</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={sessionSearch}
                    onChange={(e) => { setSessionSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search path, country..."
                    className="pl-8 pr-3 py-1.5 h-8 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-[#0e6de4] outline-none"
                  />
                </div>
                <select
                  value={deviceFilter}
                  onChange={(e) => { setDeviceFilter(e.target.value); setCurrentPage(1); }}
                  className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="ALL">All Devices</option>
                  <option value="DESKTOP">Desktop</option>
                  <option value="MOBILE">Mobile</option>
                  <option value="TABLET">Tablet</option>
                </select>
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <EmptyAnalytics />
            ) : (
              <div className="space-y-4">
                <DataTable
                  headers={['Visitor ID', 'Entry Path', 'Country', 'Device / Browser', 'Source', 'Views', 'Started At']}
                  rows={paginatedSessions.map((s) => [
                    <span className="font-mono text-[11px] text-slate-700">{s.visitorIdMasked}</span>,
                    <span className="font-semibold text-slate-900">{s.entryPath}</span>,
                    <span className="font-bold text-slate-800">{s.country}</span>,
                    <span>{s.device} · {s.browser}</span>,
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{s.source}</span>,
                    <span className="font-bold text-slate-900">{s.pageViewsCount}</span>,
                    <span className="text-slate-500 whitespace-nowrap">{new Date(s.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>,
                  ])}
                />

                {/* Pagination */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSessions.length)} of {filteredSessions.length} sessions
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 px-2 border-slate-200 text-slate-700"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="px-2 font-bold text-slate-800">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="h-7 px-2 border-slate-200 text-slate-700"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SOURCES TAB */}
      {!isLoading && activeTab === 'Sources' && (
        <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
          <h2 className="text-base font-bold text-slate-900">Traffic Sources Breakdown</h2>
          <p className="mt-1 text-xs text-slate-500">Direct, organic search, social media, referral, and UTM campaign traffic</p>
          <div className="mt-5 space-y-4">
            {noVisitorData ? <EmptyAnalytics /> : (visitorData?.sources || []).map((source) => (
              <ProgressRow key={source.source} label={source.source} value={source.visitors.toLocaleString()} percentage={source.percentage} />
            ))}
          </div>
        </Card>
      )}

      {/* COUNTRIES TAB */}
      {!isLoading && activeTab === 'Countries' && (
        <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
          <h2 className="text-base font-bold text-slate-900">Visitors by Country</h2>
          <p className="mt-1 text-xs text-slate-500">Geographic origin derived from edge HTTP IP headers</p>
          <div className="mt-4">
            {noVisitorData ? <EmptyAnalytics /> : (
              <DataTable
                headers={['Country', 'Visitors', 'Unique Visitors', 'Percentage']}
                rows={(visitorData?.countries || []).map((country) => [
                  country.country,
                  country.visitors.toLocaleString(),
                  country.uniqueVisitors.toLocaleString(),
                  `${country.percentage}%`,
                ])}
              />
            )}
          </div>
        </Card>
      )}

      {/* DEVICES TAB */}
      {!isLoading && activeTab === 'Devices' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><MonitorSmartphone className="h-4 w-4 text-[#0e6de4]" /> Devices</h2>
            <div className="mt-5 space-y-4">
              {noVisitorData ? <EmptyAnalytics /> : (visitorData?.devices || []).map((device) => (
                <ProgressRow key={device.name} label={device.name} value={device.visitors.toLocaleString()} percentage={device.percentage} />
              ))}
            </div>
          </Card>
          <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Laptop className="h-4 w-4 text-[#0e6de4]" /> Browsers</h2>
            <div className="mt-5 space-y-4">
              {noVisitorData ? <EmptyAnalytics /> : (visitorData?.browsers || []).map((browser) => (
                <ProgressRow key={browser.name} label={browser.name} value={browser.visitors.toLocaleString()} percentage={browser.percentage} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* USERS & FUNNEL TAB */}
      {!isLoading && activeTab === 'Users & Funnel' && platformData && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Total Users" value={platformData.users.total.toLocaleString()} icon={<Users className="h-4 w-4" />} />
            <MetricCard label="New Users" value={platformData.users.new.toLocaleString()} icon={<UserPlus className="h-4 w-4" />} />
            <MetricCard label="Active Users" value={platformData.users.active.toLocaleString()} icon={<Activity className="h-4 w-4" />} />
            <MetricCard label="Verified Users" value={platformData.users.verified.toLocaleString()} icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Paid Users" value={platformData.users.paid.toLocaleString()} icon={<Smartphone className="h-4 w-4" />} />
          </div>
          <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs">
            <h2 className="text-base font-bold text-slate-900">Visitor → Customer Conversion Funnel</h2>
            <p className="mt-1 text-xs text-slate-500">Real platform user conversion pipeline from anonymous visitors to paid subscribers.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Website Visitors', platformData.funnel.websiteVisitors],
                ['Signups', platformData.funnel.signups],
                ['Email Verified', platformData.funnel.emailVerified],
                ['Campaign Created', platformData.funnel.campaignCreated],
                ['First Submission', platformData.funnel.firstSubmission],
                ['Paid Customer', platformData.funnel.paidCustomers],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-extrabold text-slate-900">{value === null || value === undefined ? 'Not available' : Number(value).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Visitor → Signup', platformData.funnel.visitorToSignupRate],
                ['Signup → Verified', platformData.funnel.signupToVerifiedRate],
                ['Verified → Campaign', platformData.funnel.verifiedToCampaignRate],
                ['Campaign → Paid', platformData.funnel.campaignToPaidRate],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-[#0e6de4]">
                  {label}: {value === null || value === undefined ? 'Not available' : `${value}%`}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* PRODUCT & REVENUE TAB */}
      {!isLoading && activeTab === 'Product & Revenue' && platformData && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Submissions" value={platformData.productUsage.totalSubmissions.toLocaleString()} icon={<Activity className="h-4 w-4" />} />
            <MetricCard label="Successful" value={platformData.productUsage.successfulSubmissions.toLocaleString()} icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Failed" value={platformData.productUsage.failedSubmissions.toLocaleString()} icon={<AlertCircle className="h-4 w-4" />} />
            <MetricCard label="Credits Purchased" value={platformData.productUsage.creditsPurchased.toLocaleString()} icon={<Tablet className="h-4 w-4" />} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Today's Revenue" value={formatMoney(platformData.revenue.todayCents)} icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="This Month's Revenue" value={formatMoney(platformData.revenue.thisMonthCents)} icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Total Revenue" value={formatMoney(platformData.revenue.totalCents)} icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Successful Transactions" value={platformData.revenue.successfulTransactions.toLocaleString()} icon={<Activity className="h-4 w-4" />} />
            <MetricCard label="Failed Transactions" value={platformData.revenue.failedTransactions.toLocaleString()} icon={<AlertCircle className="h-4 w-4" />} />
            <MetricCard label="Total Credits Purchased" value={platformData.revenue.creditsPurchased.toLocaleString()} icon={<Tablet className="h-4 w-4" />} />
          </div>
        </div>
      )}
    </div>
  );
}
