'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  RefreshCw,
  ArrowLeft,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
  CreditCard,
  UserCheck,
  UserX,
  Lock,
  ChevronRight,
  BarChart3,
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
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type RangeKey = 'last-7-days' | 'last-30-days' | 'last-90-days' | 'this-year' | 'custom';

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: 'last-7-days', label: 'Last 7 Days' },
  { key: 'last-30-days', label: 'Last 30 Days' },
  { key: 'last-90-days', label: 'Last 90 Days' },
  { key: 'this-year', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
];

interface UserAnalyticsData {
  users: {
    total: number;
    new: number;
    active: number;
    suspended: number;
    verified: number;
    unverified: number;
    paid: number;
    free: number;
    paidInRange: number;
    verificationRate: number;
    paidConversionRate: number;
  };
  userTrend: Array<{ date: string; newUsers: number; cumulativeUsers: number }>;
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
}

export default function UserGrowthPage() {
  const [range, setRange] = useState<RangeKey>('last-30-days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<UserAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ range });
    if (range === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    return params.toString();
  }, [endDate, range, startDate]);

  const fetchUserGrowth = useCallback(async () => {
    if (range === 'custom' && (!startDate || !endDate)) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/platform?${query}`);
      if (!res.ok) throw new Error('Failed to fetch user growth analytics telemetry.');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData(null);
      setError('User growth telemetry is currently unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [endDate, query, range, startDate]);

  useEffect(() => {
    void fetchUserGrowth();
  }, [fetchUserGrowth]);

  const users = data?.users;
  const funnel = data?.funnel;
  const userTrend = data?.userTrend || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-[#0e6de4] transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              User Growth & Conversion Analytics
            </h1>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Registration velocity, active accounts standing, verification rate, and subscriber conversion funnel.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchUserGrowth()}
          disabled={isLoading}
          className="border-slate-200 text-slate-700 hover:border-[#0e6de4] hover:text-[#0e6de4] shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin text-[#0e6de4]' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4 border border-slate-200 bg-white rounded-xl shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0e6de4]" />
            <span className="text-xs font-bold text-slate-900">Analysis Period:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setRange(option.key)}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
                  range === option.key
                    ? 'border-[#0e6de4] bg-[#0e6de4] text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-[#0e6de4]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-[#0e6de4] outline-none"
              />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-1 text-xs text-slate-900 focus:ring-2 focus:ring-[#0e6de4] outline-none"
              />
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* Top 4 Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0e6de4]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {isLoading ? '—' : users ? users.total.toLocaleString() : '0'}
          </div>
          <p className="text-xs font-medium text-slate-500">All platform registered accounts</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>New Users (Period)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">
            {isLoading ? '—' : users ? users.new.toLocaleString() : '0'}
          </div>
          <p className="text-xs font-semibold text-emerald-600">New signups in selected timeframe</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0e6de4]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0e6de4]">
            {isLoading ? '—' : users ? users.active.toLocaleString() : '0'}
          </div>
          <p className="text-xs font-medium text-slate-500">Active non-suspended user accounts</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Email Verified</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {isLoading ? '—' : users ? users.verified.toLocaleString() : '0'}
          </div>
          <p className="text-xs font-medium text-slate-500">Accounts with confirmed emails</p>
        </Card>
      </div>

      {/* User Growth Trend Chart */}
      <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">User Acquisition & Growth Trend</h2>
            <p className="text-xs text-slate-500">New registration velocity and cumulative platform user base</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> New Users
            </span>
            <span className="flex items-center gap-1.5 text-[#0e6de4]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0e6de4]" /> Cumulative Total
            </span>
          </div>
        </div>

        <div className="h-72 mt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0e6de4]" />
              Loading growth trend data...
            </div>
          ) : userTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
              No growth trend data available for selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userTrend} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="newUsers" stroke="#10b981" strokeWidth={2.5} dot={false} name="New Users" />
                <Line type="monotone" dataKey="cumulativeUsers" stroke="#0e6de4" strokeWidth={2} dot={false} name="Cumulative Total" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* User Conversion & Account Breakdown Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversion Rate Card */}
        <Card className="p-6 border border-slate-200 bg-white rounded-xl shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0e6de4]" />
            Key User Conversion Rates
          </h3>
          <p className="text-xs text-slate-500">
            Real ratio calculations derived from registered accounts and payment history.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50/70">
              <span className="text-[11px] font-bold uppercase text-slate-500">Verification Rate</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {isLoading ? '—' : users ? `${users.verificationRate}%` : '0%'}
              </div>
              <p className="text-[11px] text-slate-500">
                {users?.verified || 0} of {users?.total || 0} users email verified
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 p-4 space-y-2 bg-emerald-50/50">
              <span className="text-[11px] font-bold uppercase text-emerald-800">Paid Conversion Rate</span>
              <div className="text-2xl font-extrabold text-emerald-700">
                {isLoading ? '—' : users ? `${users.paidConversionRate}%` : '0%'}
              </div>
              <p className="text-[11px] text-emerald-700">
                {users?.paid || 0} paid customers of {users?.total || 0} total users
              </p>
            </div>
          </div>
        </Card>

        {/* User Account Breakdown Card */}
        <Card className="p-6 border border-slate-200 bg-white rounded-xl shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#0e6de4]" />
            User Account Distribution
          </h3>
          <p className="text-xs text-slate-500">
            Current account composition by tier, verification, and active standing.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-1 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Tiers</span>
              <p className="text-sm font-black text-slate-900 mt-1">
                {users?.free || 0} <span className="text-xs font-normal text-slate-500">Free</span>
              </p>
              <p className="text-sm font-black text-emerald-700 mt-0.5">
                {users?.paid || 0} <span className="text-xs font-normal text-emerald-600">Paid</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Verification</span>
              <p className="text-sm font-black text-slate-900 mt-1">
                {users?.verified || 0} <span className="text-xs font-normal text-slate-500">Verified</span>
              </p>
              <p className="text-sm font-black text-amber-700 mt-0.5">
                {users?.unverified || 0} <span className="text-xs font-normal text-amber-600">Pending</span>
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Standing</span>
              <p className="text-sm font-black text-[#0e6de4] mt-1">
                {users?.active || 0} <span className="text-xs font-normal text-slate-500">Active</span>
              </p>
              <p className="text-sm font-black text-rose-700 mt-0.5">
                {users?.suspended || 0} <span className="text-xs font-normal text-rose-600">Suspended</span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Platform Conversion Funnel */}
      <Card className="p-6 border border-slate-200 bg-white rounded-xl shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">User Growth & Lifecycle Funnel</h3>
          <p className="text-xs text-slate-500">
            Real platform user progression from website visitor to paid customer.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { label: 'Website Visitors', value: funnel?.websiteVisitors },
            { label: 'Signups', value: funnel?.signups },
            { label: 'Email Verified', value: funnel?.emailVerified },
            { label: 'Campaign Created', value: funnel?.campaignCreated },
            { label: 'Campaign Started', value: funnel?.firstSubmission },
            { label: 'Paid Customers', value: funnel?.paidCustomers },
          ].map((stage, idx) => (
            <div key={stage.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">{stage.label}</span>
              <p className="text-lg font-extrabold text-slate-900">
                {stage.value === null || stage.value === undefined ? 'Not available' : Number(stage.value).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          {[
            { label: 'Visitor → Signup', rate: funnel?.visitorToSignupRate },
            { label: 'Signup → Verified', rate: funnel?.signupToVerifiedRate },
            { label: 'Verified → Campaign', rate: funnel?.verifiedToCampaignRate },
            { label: 'Campaign → Paid', rate: funnel?.campaignToPaidRate },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs font-bold text-[#0e6de4] flex justify-between items-center">
              <span>{item.label}:</span>
              <span>{item.rate === null || item.rate === undefined ? 'Not available' : `${item.rate}%`}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
