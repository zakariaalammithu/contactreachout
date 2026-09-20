'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, RefreshCw, ArrowLeft, TrendingUp, CreditCard, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRevenue = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/analytics/platform?range=this-month');
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const revenue = data?.revenue || {};

  const formatUsd = (cents: number) => {
    return `$${((cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Revenue Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Financial analytics, gross revenue breakdown, and credit package sales</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/credits/rules">
            <Button variant="outline" size="sm" className="text-xs">
              <CreditCard className="h-3.5 w-3.5 mr-1" />
              Credit Rules
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchRevenue} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Revenue Today</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{formatUsd(revenue.todayCents)}</div>
          <p className="text-[11px] text-slate-500">Gross revenue since midnight</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Revenue This Month</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700">{formatUsd(revenue.thisMonthCents)}</div>
          <p className="text-[11px] text-slate-500">Gross revenue for current month</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>All-Time Total Revenue</span>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700">{formatUsd(revenue.totalCents)}</div>
          <p className="text-[11px] text-slate-500">Cumulative verified earnings</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4 border-slate-200">
        <h3 className="text-base font-bold text-slate-900">Pricing & Packages Summary</h3>
        <p className="text-xs text-slate-500">Official ContactReachout credit package rate: $20 per 500 form submissions.</p>

        <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Standard Credit Package</span>
            <span className="text-[#0e6de4]">$20 / 500 Credits</span>
          </div>
          <p className="text-xs text-slate-500">Each credit grants 1 automated form submission with zero-bypass protections.</p>
        </div>
      </Card>
    </div>
  );
}
