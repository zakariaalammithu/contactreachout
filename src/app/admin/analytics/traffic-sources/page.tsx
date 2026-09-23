'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Compass, RefreshCw, ArrowLeft, Globe, Search, Share2, Calendar, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SourceAnalytics } from '@/lib/services/website-analytics-service';

type RangeKey = 'today' | 'yesterday' | 'last-7-days' | 'last-30-days' | 'this-month' | 'custom';

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last-7-days', label: 'Last 7 Days' },
  { key: 'last-30-days', label: 'Last 30 Days' },
  { key: 'this-month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];

export default function TrafficSourcesPage() {
  const [range, setRange] = useState<RangeKey>('last-30-days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sources, setSources] = useState<SourceAnalytics[]>([]);
  const [hasData, setHasData] = useState<boolean>(false);
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

  const fetchTrafficSources = useCallback(async () => {
    if (range === 'custom' && (!startDate || !endDate)) {
      setSources([]);
      setHasData(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/website-visitors?${query}`);
      if (!res.ok) throw new Error('Failed to fetch traffic sources telemetry.');
      const data = await res.json();
      if (data && Array.isArray(data.sources)) {
        setSources(data.sources);
        setHasData(Boolean(data.hasData && data.sources.length > 0));
      } else {
        setSources([]);
        setHasData(false);
      }
    } catch (err) {
      setSources([]);
      setHasData(false);
      setError('Traffic source analytics are currently unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [endDate, query, range, startDate]);

  useEffect(() => {
    void fetchTrafficSources();
  }, [fetchTrafficSources]);

  // Aggregate Metrics for Top Summary Cards
  const directPct = useMemo(() => {
    const item = sources.find((s) => s.source === 'Direct');
    return item ? item.percentage : 0;
  }, [sources]);

  const searchPct = useMemo(() => {
    const items = sources.filter(
      (s) => s.source === 'Google' || s.source === 'Other Search' || s.source.toLowerCase().includes('search')
    );
    return items.reduce((acc, s) => acc + (s.percentage || 0), 0);
  }, [sources]);

  const referralPct = useMemo(() => {
    const items = sources.filter(
      (s) =>
        s.source !== 'Direct' &&
        s.source !== 'Google' &&
        s.source !== 'Other Search' &&
        !s.source.toLowerCase().includes('search')
    );
    return items.reduce((acc, s) => acc + (s.percentage || 0), 0);
  }, [sources]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/website-visitors"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-[#0e6de4] transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Traffic Sources Analytics
            </h1>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Canonical visitor channel attribution, search engines, direct entries, and campaign UTM tracking.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchTrafficSources()}
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

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Direct Traffic</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0e6de4]">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {hasData ? `${Math.round(directPct * 10) / 10}%` : '—'}
          </div>
          <p className="text-xs font-medium text-slate-500">Direct URL entries & browser bookmarks</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Search Engines</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Search className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {hasData ? `${Math.round(searchPct * 10) / 10}%` : '—'}
          </div>
          <p className="text-xs font-medium text-slate-500">Organic search traffic (Google, Bing, Yahoo)</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Referrals & Campaigns</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0e6de4]">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {hasData ? `${Math.round(referralPct * 10) / 10}%` : '—'}
          </div>
          <p className="text-xs font-medium text-slate-500">External referral links & UTM campaign tags</p>
        </Card>
      </div>

      {/* Traffic Distribution by Origin Table */}
      <Card className="p-6 space-y-4 border border-slate-200 bg-white rounded-xl shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Traffic Distribution by Origin</h3>
            <p className="text-xs text-slate-500">Real attribution breakdown per traffic origin channel</p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Total Channels: {sources.length}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0e6de4]" />
            Fetching traffic distribution analytics...
          </div>
        ) : !hasData || sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center space-y-2">
            <Compass className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No traffic source data available yet.</p>
            <p className="max-w-md text-xs text-slate-500 mx-auto">
              Attribution data will appear automatically when website visitors arrive via search engines, referral links, or UTM campaigns.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3">Source / Channel</th>
                  <th className="px-4 py-3">Unique Visitors</th>
                  <th className="px-4 py-3">Total Sessions</th>
                  <th className="px-4 py-3">Page Views</th>
                  <th className="px-4 py-3">Share (%)</th>
                  <th className="px-4 py-3">Visual Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {sources.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0e6de4]" />
                      {item.source}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {item.visitors?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {item.sessions?.toLocaleString() || item.visitors?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {item.pageViews?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#0e6de4]">
                      {item.percentage}%
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-2 w-full max-w-[220px] rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                          className="h-full bg-[#0e6de4] rounded-full"
                        />
                      </div>
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
