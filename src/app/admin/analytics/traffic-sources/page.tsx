'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, RefreshCw, ArrowLeft, Globe, Search, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function TrafficSourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrafficSources = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/analytics/website-visitors?range=last-30-days');
      const data = await res.json();
      if (data.sources) {
        setSources(data.sources);
      }
    } catch {
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficSources();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/website-visitors" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Traffic Sources Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Referral channels, search engines, direct traffic, and campaign tracking</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchTrafficSources} className="text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Direct Traffic</span>
            <Globe className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {sources.find(s => s.source === 'Direct' || s.source === 'direct')?.percentage ?? '—'}%
          </div>
          <p className="text-[11px] text-slate-500">Direct URL entries & bookmarks</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Search Engines</span>
            <Search className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {sources.find(s => s.source === 'Google' || s.source === 'Search')?.percentage ?? '—'}%
          </div>
          <p className="text-[11px] text-slate-500">Organic search traffic (Google/Bing)</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Referrals & Campaigns</span>
            <Share2 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {sources.filter(s => s.source !== 'Direct' && s.source !== 'Google').reduce((acc, curr) => acc + (curr.percentage || 0), 0)}%
          </div>
          <p className="text-[11px] text-slate-500">External referral links & UTM tags</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4 border-slate-200">
        <h3 className="text-base font-bold text-slate-900">Traffic Distribution by Origin</h3>

        {sources.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Source / Channel</th>
                  <th className="px-4 py-3">Visitors</th>
                  <th className="px-4 py-3">Share (%)</th>
                  <th className="px-4 py-3">Visual Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sources.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.source}</td>
                    <td className="px-4 py-3">{item.visitors.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">{item.percentage}%</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-full max-w-[200px] rounded-full bg-slate-100 overflow-hidden">
                        <div style={{ width: `${item.percentage}%` }} className="h-full bg-[#0e6de4]" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading traffic sources...' : 'No external traffic source logs recorded yet.'}
          </div>
        )}
      </Card>
    </div>
  );
}
