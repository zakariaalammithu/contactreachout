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
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</p>}
        </div>
        <div className="rounded-xl bg-blue-50 p-2 text-[#0e6de4]">{icon}</div>
      </div>
    </Card>
  );
}

function EmptyAnalytics() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
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
          <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
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
        <span className="truncate text-slate-700">{label}</span>
        <span className="shrink-0 text-slate-500">{value} · {percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            <BarChart3 className="h-7 w-7 text-[#0e6de4]" />
            Website Visitors & Analytics
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Real first-party visitor activity, acquisition channels, geography, conversion, product usage, and revenue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'rounded-full border px-3 py-1 text-[10px] font-bold',
            visitorData?.storageMode === 'supabase'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          )}>
            {visitorData?.storageMode === 'supabase' ? 'Supabase storage' : 'Local development storage'}
          </span>
          <Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={isLoading}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setRange(option.key)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-bold transition',
                  range === option.key
                    ? 'border-[#0e6de4] bg-[#0e6de4] text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-[#0e6de4]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition',
              activeTab === tab ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {isLoading && (
        <Card className="p-8 text-center text-sm font-semibold text-slate-500">Loading analytics…</Card>
      )}

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

          <Card className="p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Visitor Trend</h2>
                <p className="text-xs text-slate-500">Visitors, unique visitors, and page views over time</p>
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Automatic daily / weekly / monthly buckets</span>
            </div>
            <div className="mt-5 h-80">
              {noVisitorData ? <EmptyAnalytics /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitorData?.trend || []} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Line type="monotone" dataKey="visitors" stroke="#0e6de4" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="uniqueVisitors" stroke="#14b8a6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pageViews" stroke="#a855f7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}

      {!isLoading && activeTab === 'Visitors' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-900">Top Pages</h2>
            <div className="mt-4">
              {noVisitorData ? <EmptyAnalytics /> : (
                <DataTable
                  headers={['Page', 'Views', 'Unique', 'Avg. Time']}
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
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-900">Recent Active Pages</h2>
            <p className="mt-1 text-xs text-slate-500">Pages from sessions active in the last five minutes</p>
            <div className="mt-4">
              {visitorData?.realtime.pages.length ? (
                <div className="space-y-2">
                  {visitorData.realtime.pages.map((page) => (
                    <div key={page} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700">
                      <span className="truncate">{page}</span>
                      <span className="ml-3 flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    </div>
                  ))}
                </div>
              ) : <EmptyAnalytics />}
            </div>
          </Card>
        </div>
      )}

      {!isLoading && activeTab === 'Sources' && (
        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-900">Traffic Sources</h2>
          <p className="mt-1 text-xs text-slate-500">Direct, search, social, referral, and UTM campaign traffic</p>
          <div className="mt-5 space-y-4">
            {noVisitorData ? <EmptyAnalytics /> : (visitorData?.sources || []).map((source) => (
              <ProgressRow key={source.source} label={source.source} value={source.visitors.toLocaleString()} percentage={source.percentage} />
            ))}
          </div>
        </Card>
      )}

      {!isLoading && activeTab === 'Countries' && (
        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-900">Visitors by Country</h2>
          <p className="mt-1 text-xs text-slate-500">Country is recorded only when reliably supplied by the hosting edge</p>
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

      {!isLoading && activeTab === 'Devices' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><MonitorSmartphone className="h-4 w-4 text-[#0e6de4]" /> Devices</h2>
            <div className="mt-5 space-y-4">
              {noVisitorData ? <EmptyAnalytics /> : (visitorData?.devices || []).map((device) => (
                <ProgressRow key={device.name} label={device.name} value={device.visitors.toLocaleString()} percentage={device.percentage} />
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Laptop className="h-4 w-4 text-[#0e6de4]" /> Browsers</h2>
            <div className="mt-5 space-y-4">
              {noVisitorData ? <EmptyAnalytics /> : (visitorData?.browsers || []).map((browser) => (
                <ProgressRow key={browser.name} label={browser.name} value={browser.visitors.toLocaleString()} percentage={browser.percentage} />
              ))}
            </div>
          </Card>
        </div>
      )}

      {!isLoading && activeTab === 'Users & Funnel' && platformData && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Total Users" value={platformData.users.total.toLocaleString()} icon={<Users className="h-4 w-4" />} />
            <MetricCard label="New Users" value={platformData.users.new.toLocaleString()} icon={<UserPlus className="h-4 w-4" />} />
            <MetricCard label="Active Users" value={platformData.users.active.toLocaleString()} icon={<Activity className="h-4 w-4" />} />
            <MetricCard label="Verified Users" value={platformData.users.verified.toLocaleString()} icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Paid Users" value={platformData.users.paid.toLocaleString()} icon={<Smartphone className="h-4 w-4" />} />
          </div>
          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-900">Visitor → Customer Funnel</h2>
            <p className="mt-1 text-xs text-slate-500">Unavailable stages are shown only when the current data model cannot calculate them accurately.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Website Visitors', platformData.funnel.websiteVisitors],
                ['Signups', platformData.funnel.signups],
                ['Email Verified', platformData.funnel.emailVerified],
                ['Campaign Created', platformData.funnel.campaignCreated],
                ['First Submission', platformData.funnel.firstSubmission],
                ['Paid Customer', platformData.funnel.paidCustomers],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
                <div key={String(label)} className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-[#0e6de4]">
                  {label}: {value === null || value === undefined ? 'Not available' : `${value}%`}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

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
