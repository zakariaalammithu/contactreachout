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
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-400 hover:bg-zinc-900 hover:text-blue-400 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">
              Revenue Analytics
            </h1>
            <p className="text-xs font-medium text-zinc-400 mt-0.5">
              Financial telemetry, Stripe verified gross revenue, and credit package sales breakdown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/credits/rules">
            <Button variant="outline" size="sm" className="text-xs border-zinc-800 hover:border-[#0e6de4] hover:text-blue-400">
              <CreditCard className="h-3.5 w-3.5 mr-1 text-blue-400" />
              Credit Rules
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchRevenueData()}
            disabled={isLoading}
            className="text-xs border-zinc-800 hover:border-[#0e6de4] hover:text-blue-400"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-zinc-100">Analysis Period:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setRange(option.key)}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
                  range === option.key
                    ? 'border-[#0e6de4] bg-[#0e6de4] text-white shadow-xs'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-blue-900 hover:text-blue-400'
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
                className="rounded-xl border border-zinc-700 px-3 py-1 text-xs text-zinc-100 focus:ring-2 focus:ring-[#0e6de4] outline-none"
              />
              <span className="text-xs font-bold text-zinc-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-zinc-700 px-3 py-1 text-xs text-zinc-100 focus:ring-2 focus:ring-[#0e6de4] outline-none"
              />
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-900 bg-rose-950 p-4 text-xs font-bold text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          {error}
        </div>
      )}

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5 space-y-2 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>Revenue Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-300">
            {isLoading ? '—' : metrics ? metrics.todayFormatted : '$0.00'}
          </div>
          <p className="text-xs font-medium text-zinc-400">Gross revenue since midnight</p>
        </Card>

        <Card className="p-5 space-y-2 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>Revenue This Month</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-900 flex items-center justify-center text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-400">
            {isLoading ? '—' : metrics ? metrics.thisMonthFormatted : '$0.00'}
          </div>
          <p className="text-xs font-medium text-zinc-400">Gross revenue for current month</p>
        </Card>

        <Card className="p-5 space-y-2 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-wider">
            <span>All-Time Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-zinc-100">
            {isLoading ? '—' : metrics ? metrics.totalFormatted : '$0.00'}
          </div>
          <p className="text-xs font-medium text-zinc-400">Cumulative Stripe verified earnings</p>
        </Card>
      </div>

      {/* Revenue Growth Trend Chart */}
      <Card className="p-5 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Revenue & Sales Volume Trend</h2>
            <p className="text-xs text-zinc-400">Stripe checkout revenue collected over selected period</p>
          </div>
          <span className="text-[10px] font-bold uppercase text-zinc-400">Automatic time buckets</span>
        </div>

        <div className="h-72">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              Loading revenue trend...
            </div>
          ) : revenueTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium">
              No revenue records logged for selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#27272a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #27272a', backgroundColor: '#09090b', color: '#fafafa', fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#0e6de4" strokeWidth={2.5} dot={false} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Approved Package Sales Breakdown Table */}
      <Card className="p-6 space-y-4 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-zinc-100">Approved Credit Package Sales Breakdown</h3>
            <p className="text-xs text-zinc-400">
              Canonical ContactReachout pricing plans (5,000 to 300,000 credit packages).
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-900 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Pricing Specs Synchronized
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-semibold text-zinc-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            Loading package sales breakdown...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 font-bold text-zinc-300 text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3">Plan Name</th>
                  <th className="px-4 py-3">Billing Cycle</th>
                  <th className="px-4 py-3">Credits Volume</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Number of Sales</th>
                  <th className="px-4 py-3">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-medium text-zinc-200">
                {packageSales.map((item) => (
                  <tr key={item.key} className="hover:bg-zinc-900/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-zinc-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0e6de4]" />
                      {item.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.cycle === 'Yearly'
                            ? 'bg-blue-950 text-blue-400 border border-blue-900'
                            : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        {item.cycle}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-zinc-100">
                      {item.credits.toLocaleString()} Credits
                    </td>
                    <td className="px-4 py-3.5 font-bold text-zinc-100">{item.priceFormatted}</td>
                    <td className="px-4 py-3.5 font-bold text-zinc-100">{item.salesCount}</td>
                    <td className="px-4 py-3.5 font-extrabold text-emerald-300">
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
