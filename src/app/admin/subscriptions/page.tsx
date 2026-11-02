'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type SubscriptionRow = {
  id: string;
  userEmail: string;
  userName: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  planName: string | null;
  creditsPerPeriod: number | null;
  amountCents: number | null;
  period: string | null;
  status: string;
  purchaseDate: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  lastRenewalAt: string | null;
  renewalCount: number;
  cancelAtPeriodEnd: boolean;
  daysRemaining: number | null;
  isExpired: boolean;
  reminders: Array<{ id: string; periodEnd: string; reminderType: string; daysLeft: number | null; channel: string; sentAt: string }>;
  payments: Array<{ sessionId: string; credits: number; amountCents: number; status: string; createdAt?: string }>;
};

type Aggregates = {
  totalActive: number;
  totalExpired: number;
  expiringIn5Days: number;
  totalRenewed: number;
  packageWiseUsers: Record<string, number>;
  packageWiseCurrentPeriodCents: Record<string, number>;
  totalRevenueCents: number;
  recentPurchases: Array<{ sessionId: string; userId: string; credits: number; amountCents: number; status: string; createdAt?: string }>;
  upcomingRenewals: Array<{ userEmail: string; planName: string | null; currentPeriodEnd: string | null; daysRemaining: number | null }>;
};

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [tablesAvailable, setTablesAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (expiringOnly) params.set('expiringWithinDays', '5');
      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch subscriptions.');
      setRows(data.subscriptions || []);
      setAggregates(data.aggregates || null);
      setTablesAvailable(Boolean(data.tablesAvailable));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, expiringOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      <div className="flex items-center justify-between border-b border-blue-900 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white">Subscriptions</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Every user&apos;s package, price, dates, renewal status and payment history — synced from Stripe webhooks.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-zinc-700 font-bold">
          Refresh
        </Button>
      </div>

      {tablesAvailable === false && (
        <Card className="border-amber-900 bg-amber-950 p-4 text-sm font-semibold text-amber-300">
          Subscription tables are not applied yet (migration pending). This page will stay empty until the owner
          applies the migration — no rows are fabricated.
        </Card>
      )}
      {error && (
        <Card className="border-rose-900 bg-rose-950 p-4 text-sm font-semibold text-rose-300">{error}</Card>
      )}

      {aggregates && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-zinc-400">Active Subscriptions</p>
            <p className="mt-1 text-2xl font-black text-white">{aggregates.totalActive}</p>
          </Card>
          <Card className="border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-zinc-400">Expired Subscriptions</p>
            <p className="mt-1 text-2xl font-black text-rose-300">{aggregates.totalExpired}</p>
          </Card>
          <Card className="border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-zinc-400">Expiring in 5 Days</p>
            <p className="mt-1 text-2xl font-black text-amber-300">{aggregates.expiringIn5Days}</p>
          </Card>
          <Card className="border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-zinc-400">Renewed Subscriptions</p>
            <p className="mt-1 text-2xl font-black text-emerald-300">{aggregates.totalRenewed}</p>
          </Card>
          <Card className="border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-zinc-400">Package-wise Active Users</p>
            <p className="mt-1 text-sm font-bold text-white">
              {Object.entries(aggregates.packageWiseUsers).map(([plan, n]) => `${plan}: ${n}`).join(' • ') || '—'}
            </p>
          </Card>
          <Card className="border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-zinc-400">Package-wise Current Period Value</p>
            <p className="mt-1 text-sm font-bold text-white">
              {Object.entries(aggregates.packageWiseCurrentPeriodCents).map(([plan, c]) => `${plan}: ${fmtMoney(c)}`).join(' • ') || '—'}
            </p>
          </Card>
          <Card className="border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-zinc-400">Total Revenue (paid sessions)</p>
            <p className="mt-1 text-2xl font-black text-white">{fmtMoney(aggregates.totalRevenueCents)}</p>
          </Card>
          <Card className="border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs font-bold text-zinc-400">Upcoming Renewals (5d)</p>
            <p className="mt-1 text-sm font-bold text-white">
              {aggregates.upcomingRenewals.map((r) => `${r.userEmail} (${r.daysRemaining}d)`).join(' • ') || '—'}
            </p>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {['all', 'active', 'past_due', 'cancelled', 'expired'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-extrabold cursor-pointer ${statusFilter === s ? 'bg-[#0e6de4] text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setExpiringOnly((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-xs font-extrabold cursor-pointer ${expiringOnly ? 'bg-amber-500 text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}
        >
          Expiring in 5 days
        </button>
      </div>

      <Card className="overflow-x-auto border-zinc-800 bg-zinc-950 p-0">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Purchase</th>
              <th className="px-3 py-2">Start</th>
              <th className="px-3 py-2">Expiry</th>
              <th className="px-3 py-2">Days left</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Renewals</th>
              <th className="px-3 py-2">Subscription ID</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-zinc-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-zinc-400">No subscriptions found.</td></tr>
            ) : (
              rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="border-b border-zinc-900 text-zinc-200">
                    <td className="px-3 py-2">
                      <div className="font-bold text-white">{r.userName || '—'}</div>
                      <div className="text-zinc-400">{r.userEmail}</div>
                    </td>
                    <td className="px-3 py-2">{r.planName || '—'}</td>
                    <td className="px-3 py-2">{fmtMoney(r.amountCents)}</td>
                    <td className="px-3 py-2">{fmtDate(r.purchaseDate)}</td>
                    <td className="px-3 py-2">{fmtDate(r.currentPeriodStart)}</td>
                    <td className="px-3 py-2">{fmtDate(r.currentPeriodEnd)}</td>
                    <td className="px-3 py-2 font-bold">{r.daysRemaining === null ? '—' : r.daysRemaining}</td>
                    <td className="px-3 py-2">
                      <span className={r.isExpired ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>{r.status}</span>
                      {r.cancelAtPeriodEnd && <span className="block text-zinc-400">cancels at period end</span>}
                    </td>
                    <td className="px-3 py-2">{r.renewalCount}{r.lastRenewalAt ? ` (last ${fmtDate(r.lastRenewalAt)})` : ''}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{r.stripeSubscriptionId || '—'}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="font-bold text-blue-400 cursor-pointer">
                        {expandedId === r.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className="border-b border-zinc-900 bg-zinc-900/50">
                      <td colSpan={11} className="px-3 py-3 text-zinc-300">
                        <p><strong className="text-white">Stripe customer:</strong> {r.stripeCustomerId || '—'}</p>
                        <p className="mt-2 font-bold text-white">Reminder history</p>
                        {r.reminders.length === 0 ? (
                          <p className="text-zinc-400">No reminders sent yet.</p>
                        ) : (
                          <ul className="list-disc pl-5">
                            {r.reminders.map((m) => (
                              <li key={m.id}>{m.reminderType} — {m.daysLeft} days left — {m.channel} — {fmtDate(m.sentAt)}</li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-2 font-bold text-white">Recent payments</p>
                        {r.payments.length === 0 ? (
                          <p className="text-zinc-400">No payments on record.</p>
                        ) : (
                          <ul className="list-disc pl-5">
                            {r.payments.map((p) => (
                              <li key={p.sessionId}>{p.sessionId} — {p.credits.toLocaleString()} credits — {fmtMoney(p.amountCents)} — {p.status}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {aggregates && aggregates.recentPurchases.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-950 p-4">
          <p className="font-bold text-white">Recent Purchases</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-zinc-300">
            {aggregates.recentPurchases.slice(0, 10).map((p) => (
              <li key={p.sessionId}>{p.userId} — {p.credits.toLocaleString()} credits — {fmtMoney(p.amountCents)} — {p.status} — {fmtDate(p.createdAt)}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
