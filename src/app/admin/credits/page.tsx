'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Coins,
  CreditCard,
  Sparkles,
  TrendingUp,
  DollarSign,
  BarChart2,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface CreditTelemetryData {
  freeCreditsGranted: number;
  activeUserCount: number;
  monthlyGrantPerUser: number;
  paidCreditsSold: number;
  paidPackagesCount: number;
  totalCreditsUsed: number;
  successfulSubmissionsCount: number;
  failedSubmissionsCount: number;
  totalRevenueCents: number;
  totalRevenueFormatted: string;
  stripeVerified: boolean;
  dailyTrend: Array<{
    day: string;
    date: string;
    freeUsed: number;
    paidUsed: number;
    paidCreditsSold: number;
  }>;
}

export default function AdminCreditDashboardPage() {
  const [telemetry, setTelemetry] = useState<CreditTelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  const fetchCreditTelemetry = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/credits');
      if (!res.ok) throw new Error('Failed to fetch credit telemetry.');
      const data = await res.json();
      if (data.success && data.telemetry) {
        setTelemetry(data.telemetry);
      } else {
        throw new Error(data.error || 'Invalid credit telemetry response.');
      }
    } catch (err) {
      setTelemetry(null);
      setError(err instanceof Error ? err.message : 'Credit telemetry unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCreditTelemetry();
  }, [fetchCreditTelemetry]);

  const maxTrendValue = useMemo(() => {
    if (!telemetry || !telemetry.dailyTrend.length) return 500;
    const maxVal = Math.max(
      ...telemetry.dailyTrend.map((d) => d.freeUsed + d.paidUsed + (d.paidCreditsSold > 0 ? 100 : 0))
    );
    return Math.max(100, maxVal);
  }, [telemetry]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950 border border-blue-900 text-blue-400">
              <Coins className="h-5 w-5" />
            </div>
            <span>Admin Credit Telemetry & Revenue Dashboard</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Global system credit grants, paid package sales, daily consumption trends, and revenue metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPricingModal(true)}
            className="text-xs border-zinc-800 hover:border-[#0e6de4] hover:text-blue-400"
          >
            Approved Pricing Specs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRulesModal(true)}
            className="text-xs border-zinc-800 hover:border-[#0e6de4] hover:text-blue-400"
          >
            Credit Deduction Rules
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchCreditTelemetry()}
            disabled={isLoading}
            className="text-xs border-zinc-800 hover:border-[#0e6de4] hover:text-blue-400"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-900 bg-rose-950 p-4 text-xs font-bold text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          {error}
        </div>
      )}

      {/* Top 4 Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 space-y-2 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span>Free Credits Granted</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-zinc-100">
            {isLoading ? '—' : telemetry ? telemetry.freeCreditsGranted.toLocaleString() : '0'}
          </p>
          <p className="text-[11px] text-emerald-300 font-semibold">
            {telemetry?.activeUserCount || 0} active accounts • 100/mo free per user
          </p>
        </Card>

        <Card className="p-5 space-y-2 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span>Paid Credits Sold</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-900 flex items-center justify-center text-blue-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-blue-400">
            {isLoading ? '—' : telemetry ? telemetry.paidCreditsSold.toLocaleString() : '0'}
          </p>
          <p className="text-[11px] text-blue-400 font-semibold">
            {telemetry?.paidPackagesCount || 0} package(s) purchased (5K–300K tiers)
          </p>
        </Card>

        <Card className="p-5 space-y-2 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span>Total Credits Used</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-900 flex items-center justify-center text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-zinc-100">
            {isLoading ? '—' : telemetry ? telemetry.totalCreditsUsed.toLocaleString() : '0'}
          </p>
          <p className="text-[11px] text-zinc-400 font-semibold">
            1.0 credit per successful submission (0 for failed)
          </p>
        </Card>

        <Card className="p-5 space-y-2 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span>Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-300">
            {isLoading ? '—' : telemetry ? telemetry.totalRevenueFormatted : '$0.00'}
          </p>
          <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" /> Stripe Verified Paid Transactions
          </p>
        </Card>
      </div>

      {/* Daily Credit Usage & Package Sales Chart */}
      <Card className="p-6 space-y-4 border border-zinc-800 bg-zinc-950 rounded-xl shadow-xs">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-blue-400" />
            <span>Daily Credit Consumption & Package Sales Trend</span>
          </h3>
          <span className="text-xs font-medium text-zinc-400">Last 7 Days Telemetry</span>
        </div>

        {isLoading ? (
          <div className="h-44 flex items-center justify-center text-xs text-zinc-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            Loading credit consumption trend...
          </div>
        ) : !telemetry || !telemetry.dailyTrend.length ? (
          <div className="h-44 flex items-center justify-center text-xs text-zinc-400">
            No credit usage logs recorded for selected period.
          </div>
        ) : (
          <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 text-xs text-zinc-400 border-b border-zinc-800 pb-2">
            {telemetry.dailyTrend.map((item) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full max-w-[36px] bg-zinc-900 rounded-t-md flex flex-col justify-end overflow-hidden" style={{ height: '100%' }}>
                  {item.paidCreditsSold > 0 && (
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ height: `${Math.min(40, (item.paidCreditsSold / maxTrendValue) * 100)}%` }}
                      title={`Purchased: ${item.paidCreditsSold} credits`}
                    />
                  )}
                  <div
                    className="bg-[#0e6de4] transition-all"
                    style={{ height: `${Math.min(60, (item.paidUsed / maxTrendValue) * 100)}%` }}
                    title={`Paid Used: ${item.paidUsed}`}
                  />
                  <div
                    className="bg-sky-400 transition-all"
                    style={{ height: `${Math.min(60, (item.freeUsed / maxTrendValue) * 100)}%` }}
                    title={`Free Used: ${item.freeUsed}`}
                  />
                </div>
                <span className="font-semibold text-zinc-200">{item.day}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-6 text-xs font-semibold text-zinc-400 pt-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-sky-400" />
            <span>Free Monthly Credits Used</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#0e6de4]" />
            <span>Paid Credits Package Used</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-emerald-500" />
            <span>New Credit Package Purchases</span>
          </div>
        </div>
      </Card>

      {/* Pricing Specs Inspector Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  ContactReachout Single Source of Truth
                </span>
                <h3 className="text-lg font-extrabold text-zinc-100">Approved Pricing Packages</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPricingModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { name: 'Starter Package', credits: '5,000 Credits', price: '$50 / mo', rate: '$0.01 per credit' },
                { name: 'Growth Package', credits: '10,000 Credits', price: '$99 / mo', rate: '$0.0099 per credit' },
                { name: 'Scale Package', credits: '100,000 Credits', price: '$199 / mo', rate: '$0.00199 per credit' },
                { name: 'Enterprise Package', credits: '300,000 Credits', price: '$299 / mo', rate: '$0.000996 per credit' },
              ].map((plan) => (
                <div key={plan.name} className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-100 text-sm">{plan.name}</span>
                    <span className="font-black text-blue-400 text-sm">{plan.price}</span>
                  </div>
                  <p className="font-bold text-zinc-200">{plan.credits}</p>
                  <p className="text-[11px] text-zinc-400">{plan.rate}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-xs text-zinc-400 font-medium">Free Plan: 100 free credits/month included</span>
              <Button
                onClick={() => setShowPricingModal(false)}
                className="bg-[#0e6de4] hover:bg-[#0b5ac0] text-white font-semibold text-xs px-4 py-2 rounded-lg"
              >
                Close Specs
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Credit Deduction Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  ContactReachout Billing Policy
                </span>
                <h3 className="text-lg font-extrabold text-zinc-100">Canonical Credit Deduction Rules</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { event: 'SUCCESSFUL_SUBMISSION', cost: '1.0 Credit', desc: 'Deducted only when contact form message is successfully accepted by target website.' },
                { event: 'FAILED_SUBMISSION', cost: '0.0 Credits', desc: 'No deduction if message fails or form errors out.' },
                { event: 'NO_CONTACT_FORM', cost: '0.0 Credits', desc: 'No deduction if no contact page or submitable HTML form is present.' },
                { event: 'CAPTCHA_DETECTED', cost: '0.0 Credits', desc: 'No deduction if form is blocked by reCAPTCHA / hCaptcha.' },
                { event: 'AI_PERSONALIZATION', cost: '0.0 Credits', desc: 'Included free on all paid packages.' },
              ].map((rule) => (
                <div key={rule.event} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-zinc-100 block">{rule.event}</span>
                    <span className="text-zinc-400 font-medium">{rule.desc}</span>
                  </div>
                  <span className="font-black text-emerald-300 shrink-0 bg-emerald-950 border border-emerald-900 px-2.5 py-1 rounded-md">
                    {rule.cost}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <Button
                onClick={() => setShowRulesModal(false)}
                className="bg-[#0e6de4] hover:bg-[#0b5ac0] text-white font-semibold text-xs px-4 py-2 rounded-lg"
              >
                Close Rules
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
