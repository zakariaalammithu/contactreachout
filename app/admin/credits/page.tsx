'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Coins,
  CreditCard,
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminCreditDashboardPage() {
  const [timeRange, setTimeRange] = useState('This Month');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Coins className="h-5 w-5" />
            </div>
            <span>Admin Credit Telemetry & Revenue Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Global system credit grants, paid package sales, daily consumption trends, and revenue metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/pricing">
            <Button variant="outline" size="sm" className="text-xs">
              Pricing Specs ($20/500)
            </Button>
          </Link>
          <Link href="/admin/credits/rules">
            <Button variant="outline" size="sm" className="text-xs">
              Credit Rules
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-500 uppercase">
            <span>Free Credits Granted</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">1,400</p>
          <p className="text-[10px] text-emerald-700 font-mono font-bold">14 active accounts • 100/mo free</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-500 uppercase">
            <span>Paid Credits Sold</span>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">5,000</p>
          <p className="text-[10px] text-blue-700 font-mono font-bold">10 packages @ $20 USD</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-500 uppercase">
            <span>Total Credits Used</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">3,840</p>
          <p className="text-[10px] text-purple-700 font-mono font-bold">1.0 success • 0.5 failed real</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-500 uppercase">
            <span>Total Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 font-mono">$200.00</p>
          <p className="text-[10px] text-emerald-600 font-mono font-bold">Stripe Verified • 100% Paid</p>
        </Card>
      </div>

      {/* Daily Credit Usage & Revenue Chart */}
      <Card className="p-6 space-y-4 border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-indigo-600" />
            <span>Daily Credit Consumption & Package Sales Trend</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Last 7 Days Telemetry</span>
        </div>

        <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 text-[10px] font-mono text-slate-500 border-b border-slate-200 pb-2">
          {[
            { day: 'Mon', free: 240, paid: 100 },
            { day: 'Tue', free: 310, paid: 150 },
            { day: 'Wed', free: 290, paid: 200 },
            { day: 'Thu', free: 380, paid: 120 },
            { day: 'Fri', free: 420, paid: 250 },
            { day: 'Sat', free: 180, paid: 50 },
            { day: 'Today', free: 500, paid: 300 },
          ].map((item) => (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="w-full max-w-[32px] bg-slate-100 rounded-t-md flex flex-col justify-end overflow-hidden" style={{ height: '100%' }}>
                <div className="bg-blue-600 transition-all" style={{ height: `${(item.paid / 600) * 100}%` }} title={`Paid: ${item.paid}`} />
                <div className="bg-emerald-500 transition-all" style={{ height: `${(item.free / 600) * 100}%` }} title={`Free: ${item.free}`} />
              </div>
              <span>{item.day}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-6 text-xs font-semibold text-slate-600 pt-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-emerald-500" />
            <span>Free Monthly Credits Used</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-blue-600" />
            <span>Paid Credits Package Used</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
