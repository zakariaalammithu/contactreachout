'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Coins,
  CreditCard,
  Plus,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreditWalletService, CreditWallet, CreditTransaction } from '@/lib/services/credit-wallet-service';
import { DEFAULT_PRICING_CONFIG } from '@/lib/services/pricing-service';

export default function CreditsClient() {
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string } | null>(null);
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSessionAndWallet() {
      try {
        let userEmail = (localStorage.getItem('active_account_email') || '').toLowerCase().trim();
        let userRole = 'USER';

        try {
          const res = await fetch('/api/auth/session', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              userEmail = (data.user.email || '').toLowerCase().trim();
              userRole = data.user.role || 'USER';
              setCurrentUser({ email: userEmail, role: userRole });
            }
          }
        } catch (e) {
          console.error('Session fetch error on Credits page:', e);
        }

        const effectiveEmail = userEmail || 'usr_guest';
        // The API is the authority when database persistence is configured.
        // Local storage is retained solely for offline/unconfigured development.
        let w: CreditWallet;
        let txs: CreditTransaction[];
        const walletResponse = await fetch('/api/credits', { cache: 'no-store' });
        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          w = walletData.wallet;
          txs = walletData.transactions || [];
        } else {
          w = CreditWalletService.getWallet(effectiveEmail);
          txs = CreditWalletService.getTransactions(effectiveEmail);
        }

        if (isMounted) {
          setWallet(w);
          setTransactions(txs);
        }
      } catch (err) {
        console.error('Error initializing credit page:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSessionAndWallet();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.email === 'mithusquare@gmail.com';

  // Dynamic Days until Monthly Free Credit Reset
  const daysUntilReset = useMemo(() => {
    if (!wallet?.freeCreditPeriodEnd) return '30 Days';
    const end = new Date(wallet.freeCreditPeriodEnd).getTime();
    const now = Date.now();
    const diff = Math.max(1, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return `${diff} Day${diff > 1 ? 's' : ''}`;
  }, [wallet?.freeCreditPeriodEnd]);

  // Approved ContactReachout Credit Packages from Single Source of Truth Pricing Configuration
  const packagesList = useMemo(() => {
    return [
      DEFAULT_PRICING_CONFIG.package5000,
      DEFAULT_PRICING_CONFIG.package10000,
      DEFAULT_PRICING_CONFIG.package100000,
      DEFAULT_PRICING_CONFIG.package300000,
    ];
  }, []);

  if (loading || !wallet) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-sm font-semibold text-zinc-400">
        Loading Credit Wallet & Ledger...
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-[1750px] mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
                <Coins className="h-5 w-5" />
              </div>
              <span>Credits Wallet & Balance</span>
            </h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isAdmin ? 'bg-blue-900 text-blue-400' : 'bg-zinc-900 text-zinc-300'
              }`}
            >
              {isAdmin ? (currentUser?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN') : 'FREE PLAN'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Manage your monthly free credits grant, paid non-expiring credit packages, and view transaction history.
          </p>
        </div>

        <a href="#buy-packages">
          <Button variant="primary" className="font-bold bg-[#0e6de4] hover:bg-[#0758bd] flex items-center gap-2 cursor-pointer shadow-md">
            <Plus className="h-4 w-4" />
            <span>Buy Credit Packages</span>
          </Button>
        </a>
      </div>

      {/* Credit Balances Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Available */}
        <div className="p-5 rounded-2xl border border-blue-900 bg-blue-950/40 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-blue-400 uppercase">
            <span>Total Available</span>
            <Coins className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-100 font-mono">
            {wallet.totalCreditsAvailable.toLocaleString()}
          </p>
          <p className="text-[11px] text-zinc-400 font-mono">
            Free + Paid + Bonus combined
          </p>
        </div>

        {/* Card 2: Free Monthly Credits */}
        <div className="p-5 rounded-2xl border border-blue-900 bg-zinc-950 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-zinc-300 uppercase">
            <span>Free Monthly</span>
            <Sparkles className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-100 font-mono">
            {Math.max(0, wallet.freeMonthlyCredits - wallet.freeMonthlyUsed).toLocaleString()}
          </p>
          <p className="text-[11px] text-zinc-400 font-mono">
            Out of 100 Granted • Resets monthly
          </p>
        </div>

        {/* Card 3: Paid Credits */}
        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-zinc-400 uppercase">
            <span>Paid Credits</span>
            <CreditCard className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="text-3xl font-extrabold text-zinc-100 font-mono">
            {wallet.paidCredits.toLocaleString()}
          </p>
          <p className="text-[11px] text-zinc-400 font-mono">
            One-time • Does not expire
          </p>
        </div>

        {/* Card 4: Admin Testing Credits (or Free Credit Reset Timer) */}
        {isAdmin ? (
          <div className="p-5 rounded-2xl border border-blue-900 bg-blue-950/70 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold font-mono text-blue-400 uppercase">
              <span>Admin Testing Credits</span>
              <ShieldCheck className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-3xl font-extrabold text-zinc-100 font-mono">
              {wallet.bonusCredits.toLocaleString()}
            </p>
            <p className="text-[11px] text-blue-400 font-mono font-bold">
              Authorized internal testing balance
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold font-mono text-zinc-400 uppercase">
              <span>Free Credit Reset</span>
              <Clock className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="text-2xl font-extrabold text-zinc-100 font-mono pt-0.5">
              {daysUntilReset}
            </p>
            <p className="text-[11px] text-zinc-400 font-mono">
              Next monthly 100 credits grant
            </p>
          </div>
        )}
      </div>

      {/* Referral Program Bonus Explanation Card */}
      <div className="p-4 rounded-2xl border border-blue-900 bg-zinc-950 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-zinc-100 text-xs">
            <Gift className="h-4 w-4 text-blue-400" />
            <span>Referral Program Credits Structure</span>
          </div>
          <Link href="/referral" className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1">
            <span>Referral Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-400 font-sans">
          <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-900 space-y-0.5">
            <span className="font-extrabold text-blue-400 block text-xs">Referral Bonus (+100 Credits)</span>
            <span className="text-[11px]">Earn 100 one-time bonus credits for each qualified referral after their email verification.</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-900 space-y-0.5">
            <span className="font-extrabold text-emerald-300 block text-xs">Referral Signup Bonus (+50 Credits)</span>
            <span className="text-[11px]">Receive 50 one-time bonus credits after email verification when joining through a referral link.</span>
          </div>
        </div>
      </div>

      {/* Priority Consumption Banner */}

      {/* Priority Consumption Banner */}
      <div className="p-4 rounded-2xl border border-blue-900 bg-blue-950/70 text-xs text-zinc-100 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0" />
          <div>
            <span className="font-bold text-zinc-100">Credit Priority Enforced:</span> Systems automatically consume <strong>FREE monthly credits</strong> first before using any PAID credits.
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold bg-zinc-950 text-blue-400 px-3 py-1 rounded-full border border-blue-900 shrink-0">
          Server-Side Validated
        </span>
      </div>

      {/* Credit Purchase CTA Section (ContactReachout Approved Pricing Structure) */}
      <div id="buy-packages" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-100 flex items-center gap-2">
              <span>Credit Packages</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-400 font-mono font-bold">
                Non-Expiring Paid Credits
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              One-time credit purchases for contact form outreach. Credits never expire and activate instantly after checkout.
            </p>
          </div>
          <Link href="/pricing" className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1">
            <span>View Full Pricing Matrix</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packagesList.map((pkg) => (
            <Card key={pkg.id} className="p-5 border-zinc-800 bg-zinc-950 hover:border-blue-800 transition-all shadow-xs flex flex-col justify-between rounded-2xl space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-400 font-mono uppercase">{pkg.name}</span>
                  <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-400 px-2 py-0.5 rounded-full">
                    {pkg.billingCycle === 'one_time' ? 'One-time' : 'Monthly'}
                  </span>
                </div>

                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-zinc-100 font-mono">${pkg.price}</span>
                  <span className="text-xs text-zinc-400 font-mono"> USD</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-mono">{pkg.description}</p>

                <div className="mt-4 space-y-2 border-t border-zinc-800 pt-3 text-xs text-zinc-300">
                  {pkg.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link href={`/checkout?credits=${pkg.credits}`} className="block w-full pt-2">
                <Button className="w-full font-bold bg-[#0e6de4] hover:bg-[#0758bd] text-white py-2.5 text-xs shadow-sm cursor-pointer">
                  BUY NOW
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* Transaction History Ledger Table */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span>Credit Transactions & Audit Ledger</span>
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {transactions.length} Total Transaction{transactions.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-x-auto shadow-2xs text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-300 font-mono text-[10px] uppercase">
              <tr>
                <th className="p-3 font-bold">Date</th>
                <th className="p-3 font-bold">Type</th>
                <th className="p-3 font-bold">Description</th>
                <th className="p-3 text-center font-bold">Credit Source</th>
                <th className="p-3 text-center font-bold">Amount</th>
                <th className="p-3 text-right font-bold">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300 font-mono">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-900 transition-colors">
                    <td className="p-3 text-zinc-400 text-[11px]">
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
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          tx.transactionType === 'REFERRAL_BONUS'
                            ? 'bg-blue-900 text-blue-200 border-blue-800 font-bold'
                            : tx.transactionType === 'REFERRAL_SIGNUP_BONUS'
                            ? 'bg-emerald-900 text-emerald-200 border-emerald-800 font-bold'
                            : tx.transactionType === 'FREE_MONTHLY_GRANT'
                            ? 'bg-blue-950 text-blue-400 border-blue-900'
                            : tx.transactionType === 'PURCHASE'
                            ? 'bg-blue-900 text-blue-300 border-blue-900'
                            : tx.transactionType === 'USAGE'
                            ? 'bg-zinc-900 text-zinc-200 border-zinc-800'
                            : 'bg-zinc-900 text-zinc-200 border-zinc-800'
                        }`}
                      >
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-zinc-100 font-sans">{tx.description}</td>
                    <td className="p-3 text-center font-mono font-bold text-zinc-400">{tx.creditSource}</td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className={tx.amount > 0 ? 'text-blue-400' : 'text-zinc-300'}>
                        {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-zinc-100">
                      {tx.balanceAfter.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-400 font-sans">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
