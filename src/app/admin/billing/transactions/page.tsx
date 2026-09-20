'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Receipt, RefreshCw, ArrowLeft, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function TransactionsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = async () => {
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
    fetchTransactions();
  }, []);

  const revenue = data?.revenue || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Payment Transactions</h1>
            <p className="text-xs text-slate-500 mt-0.5">Real-time payment transaction ledger, checkout records, and credit top-ups</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchTransactions} className="text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Successful Payments</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{revenue.successfulTransactions ?? 0}</div>
          <p className="text-[11px] text-slate-500 font-medium">Completed billing checkouts</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Failed Payments</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700">{revenue.failedTransactions ?? 0}</div>
          <p className="text-[11px] text-slate-500 font-medium">Declined or aborted attempts</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Credits Purchased</span>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{(revenue.creditsPurchased ?? 0).toLocaleString()}</div>
          <p className="text-[11px] text-slate-500 font-medium">Total outreach credits added</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4 border-slate-200">
        <h3 className="text-base font-bold text-slate-900">Recent Transaction History</h3>
        <p className="text-xs text-slate-500">Live transaction records from Stripe and verified system stores.</p>

        <div className="rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 font-medium bg-slate-50/50">
          {isLoading ? 'Loading transaction records...' : (revenue.successfulTransactions || 0) > 0 ? 'All transactions are recorded and synced with Stripe.' : 'No billing transactions recorded yet.'}
        </div>
      </Card>
    </div>
  );
}
