'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  CreditCard,
  Sparkles,
  Calendar,
  AlertCircle,
  BarChart2,
  CheckCircle2,
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

type RangeKey = 'today' | 'yesterday' | 'last-7-days' | 'last-30-days' | 'this-month' | 'this-year' | 'custom';

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last-7-days', label: 'Last 7 Days' },
  { key: 'last-30-days', label: 'Last 30 Days' },
  { key: 'this-month', label: 'This Month' },
  { key: 'this-year', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
];

interface RevenueMetrics {
  todayCents: number;
  todayFormatted: string;
  thisMonthCents: number;
  thisMonthFormatted: string;
  totalCents: number;
  totalFormatted: string;
  successfulTransactionsCount: number;
}

interface PackageSaleItem {
  key: string;
  name: string;
  cycle: string;
  credits: number;
  priceFormatted: string;
  priceCents: number;
  salesCount: number;
  revenueCents: number;
  revenueFormatted: string;
}

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  salesCount: number;
}

export default function RevenuePage() {
  const [range, setRange] = useState<RangeKey>('last-30-days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [packageSales, setPackageSales] = useState<PackageSaleItem[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
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

  const fetchRevenueData = useCallback(async () => {
    if (range === 'custom' && (!startDate || !endDate)) {
      setMetrics(null);
      setPackageSales([]);
      setRevenueTrend([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/revenue?${query}`);
      if (!res.ok) throw new Error('Failed to fetch revenue analytics telemetry.');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setPackageSales(data.packageSalesBreakdown || []);
        setRevenueTrend(data.revenueTrend || []);
      } else {
        throw new Error(data.error || 'Invalid revenue response.');
      }
    } catch (err) {
      setMetrics(null);
      setPackageSales([]);
      setRevenueTrend([]);
      setError(err instanceof Error ? err.message : 'Revenue telemetry unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [endDate, query, range, startDate]);

  useEffect(() => {
    void fetchRevenueData();
  }, [fetchRevenueData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-[#0e6de4] transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Revenue Analytics
            </h1>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Financial telemetry, Stripe verified gross revenue, and credit package sales breakdown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/credits/rules">
            <Button variant="outline" size="sm" className="text-xs border-slate-200 hover:border-[#0e6de4] hover:text-[#0e6de4]">
              <CreditCard className="h-3.5 w-3.5 mr-1 text-[#0e6de4]" />
              Credit Rules
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchRevenueData()}
            disabled={isLoading}
            className="text-xs border-slate-200 hover:border-[#0e6de4] hover:text-[#0e6de4]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin text-[#0e6de4]' : ''}`} />
            Refresh Data
          </Button>
        </div>
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

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Revenue Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">
            {isLoading ? '—' : metrics ? metrics.todayFormatted : '$0.00'}
          </div>
          <p className="text-xs font-medium text-slate-500">Gross revenue since midnight</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Revenue This Month</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0e6de4]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0e6de4]">
            {isLoading ? '—' : metrics ? metrics.thisMonthFormatted : '$0.00'}
          </div>
          <p className="text-xs font-medium text-slate-500">Gross revenue for current month</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>All-Time Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {isLoading ? '—' : metrics ? metrics.totalFormatted : '$0.00'}
          </div>
          <p className="text-xs font-medium text-slate-500">Cumulative Stripe verified earnings</p>
        </Card>
      </div>

      {/* Revenue Growth Trend Chart */}
      <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Revenue & Sales Volume Trend</h2>
            <p className="text-xs text-slate-500">Stripe checkout revenue collected over selected period</p>
          </div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Automatic time buckets</span>
        </div>

        <div className="h-72">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0e6de4]" />
              Loading revenue trend...
            </div>
          ) : revenueTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
              No revenue records logged for selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#0e6de4" strokeWidth={2.5} dot={false} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Approved Package Sales Breakdown Table */}
      <Card className="p-6 space-y-4 border border-slate-200 bg-white rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Approved Credit Package Sales Breakdown</h3>
            <p className="text-xs text-slate-500">
              Canonical ContactReachout pricing plans (5,000 to 300,000 credit packages).
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Pricing Specs Synchronized
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0e6de4]" />
            Loading package sales breakdown...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3">Plan Name</th>
                  <th className="px-4 py-3">Billing Cycle</th>
                  <th className="px-4 py-3">Credits Volume</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Number of Sales</th>
                  <th className="px-4 py-3">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {packageSales.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0e6de4]" />
                      {item.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.cycle === 'Yearly'
                            ? 'bg-blue-50 text-[#0e6de4] border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {item.cycle}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {item.credits.toLocaleString()} Credits
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{item.priceFormatted}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{item.salesCount}</td>
                    <td className="px-4 py-3.5 font-extrabold text-emerald-700">
                      {item.revenueFormatted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
