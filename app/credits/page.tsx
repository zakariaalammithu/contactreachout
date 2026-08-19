'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  CreditCard,
  Plus,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Download,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreditWalletService, CreditWallet, CreditTransaction } from '@/lib/services/credit-wallet-service';
import { PricingService } from '@/lib/services/pricing-service';

export default function UserCreditsPage() {
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    const w = CreditWalletService.getWallet();
    const txs = CreditWalletService.getTransactions();
    setWallet(w);
    setTransactions(txs);
  }, []);

  const config = PricingService.getPricingConfig();

  if (!wallet) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Coins className="h-5 w-5" />
            </div>
            <span>Credits Wallet & Balance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Manage your monthly free credits grant, paid non-expiring credit packages, and view transaction history.
          </p>
        </div>

        <Link href="/checkout">
          <Button variant="primary" className="font-bold bg-[#2563EB] hover:bg-blue-600 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Buy 500 Credits ($20)</span>
          </Button>
        </Link>
      </div>

      {/* Credit Balances Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available */}
        <div className="p-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-blue-600 uppercase">
            <span>Total Available</span>
            <Coins className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {wallet.totalCreditsAvailable}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Free + Paid + Bonus combined
          </p>
        </div>

        {/* Free Monthly Credits */}
        <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-emerald-700 uppercase">
            <span>Free Monthly</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-900 font-mono">
            {Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed)}
          </p>
          <p className="text-[11px] text-emerald-700 font-mono">
            Out of 100 Granted • Resets monthly
          </p>
        </div>

        {/* Paid Credits */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-500 uppercase">
            <span>Paid Credits</span>
            <CreditCard className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {wallet.paidCredits}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            One-time • Does not expire
          </p>
        </div>

        {/* Monthly Reset Timer */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-500 uppercase">
            <span>Free Credit Reset</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-mono pt-1">
            28 Days
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Next 100 free credits grant
          </p>
        </div>
      </div>

      {/* Priority Consumption Banner */}
      <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 text-xs text-blue-900 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <span className="font-bold">Credit Priority Enforced:</span> Systems automatically consume <strong>FREE monthly credits</strong> first before using any PAID credits.
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold bg-white px-3 py-1 rounded-full border border-blue-200">
          Server-Side Validated
        </span>
      </div>

      {/* Credit Purchase CTA Section */}
      <Card className="glass-panel p-6 space-y-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              PRIMARY CREDIT PACKAGE
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1">
              500 Credits Package — $20 USD
            </h3>
            <p className="text-xs text-slate-500">
              Only $0.04 per credit. Non-expiring, one-time purchase with instant activation.
            </p>
          </div>

          <Link href="/checkout">
            <Button variant="primary" className="font-bold bg-[#2563EB] hover:bg-blue-600 px-6 py-2.5 text-xs shadow-md">
              Buy 500 Credits ($20)
            </Button>
          </Link>
        </div>
      </Card>

      {/* Transaction History Ledger Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>Credit Transactions & Audit Ledger</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {transactions.length} Total Transactions
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Credit Source</th>
                <th className="p-3 text-center">Amount</th>
                <th className="p-3 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-[11px] text-slate-500">
                    {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-3 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        tx.transactionType === 'FREE_MONTHLY_GRANT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.transactionType === 'PURCHASE'
                          ? 'bg-blue-100 text-blue-800'
                          : tx.transactionType === 'USAGE'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {tx.transactionType}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-800">{tx.description}</td>
                  <td className="p-3 text-center font-mono font-bold text-slate-600">{tx.creditSource}</td>
                  <td className="p-3 text-center font-mono font-bold">
                    <span className={tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{tx.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
