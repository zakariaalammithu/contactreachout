'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Receipt,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Search,
  RotateCcw,
  Eye,
  CreditCard,
  User,
  Clock,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface TransactionSummary {
  successfulPayments: number;
  failedPayments: number;
  creditsPurchased: number;
  totalRevenueCents: number;
  totalRevenueFormatted: string;
}

interface EnrichedTransactionRecord {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  credits: number;
  amountCents: number;
  amountFormatted: string;
  currency: string;
  status: 'paid' | 'failed' | 'pending' | 'cancelled';
  credited: boolean;
  planName: string;
  createdAt: string;
  completedAt?: string | null;
}

export default function TransactionsPage() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [transactions, setTransactions] = useState<EnrichedTransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Selected Transaction for Inspector Modal
  const [selectedTx, setSelectedTx] = useState<EnrichedTransactionRecord | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (planFilter !== 'ALL') query.set('plan', planFilter);
      if (dateFilter !== 'ALL') query.set('dateRange', dateFilter);

      const res = await fetch(`/api/admin/billing/transactions?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transaction records.');
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setTransactions(data.transactions || []);
      } else {
        throw new Error(data.error || 'Invalid transaction response.');
      }
    } catch (err) {
      setSummary(null);
      setTransactions([]);
      setError(err instanceof Error ? err.message : 'Transaction data unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, planFilter, dateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTransactions();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPlanFilter('ALL');
    setDateFilter('ALL');
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PAID
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            FAILED
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-[#0e6de4] transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Payment Transactions
            </h1>
            <p className="text-xs font-medium text-slate-600 mt-0.5">
              Real-time Stripe checkout records, billing transaction ledger, and credit top-up history.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchTransactions()}
          disabled={isLoading}
          className="text-xs border-slate-200 hover:border-[#0e6de4] hover:text-[#0e6de4]"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin text-[#0e6de4]' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* Top 3 Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Successful Payments</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">
            {isLoading ? '—' : summary ? summary.successfulPayments.toLocaleString() : '0'}
          </div>
          <p className="text-xs font-medium text-slate-500">Stripe verified paid checkouts</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Failed Payments</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-700">
            {isLoading ? '—' : summary ? summary.failedPayments.toLocaleString() : '0'}
          </div>
          <p className="text-xs font-medium text-slate-500">Declined or aborted attempts</p>
        </Card>

        <Card className="p-5 space-y-2 border border-slate-200 bg-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Credits Purchased</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0e6de4]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {isLoading ? '—' : summary ? summary.creditsPurchased.toLocaleString() : '0'}
          </div>
          <p className="text-xs font-medium text-slate-500">Total outreach credits added to wallets</p>
        </Card>
      </div>

      {/* Transaction History Section */}
      <Card className="p-6 space-y-4 border border-slate-200 bg-white rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Transaction History</h3>
            <p className="text-xs text-slate-500">
              Verified transaction records sourced from Stripe and server credit ledger stores.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Records: {transactions.length}
          </span>
        </div>

        {/* Compact Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user email, session ID, or amount..."
              className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0e6de4] outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0e6de4] outline-none"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="paid">Paid (Successful)</option>
              <option value="failed">Failed / Declined</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0e6de4] outline-none"
            >
              <option value="ALL">All Credit Packages</option>
              <option value="5000">Starter (5,000 Credits)</option>
              <option value="10000">Growth (10,000 Credits)</option>
              <option value="100000">Scale (100,000 Credits)</option>
              <option value="300000">Enterprise (300,000 Credits)</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0e6de4] outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this-month">This Month</option>
            </select>
          </div>
        </div>

        {(search || statusFilter !== 'ALL' || planFilter !== 'ALL' || dateFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-500 font-medium">
              Filtered records: <strong className="text-slate-800">{transactions.length}</strong>
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-[#0e6de4] font-semibold hover:underline"
            >
              <RotateCcw className="w-3 h-3" /> Clear Filters
            </button>
          </div>
        )}

        {/* Transaction History Table */}
        {isLoading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0e6de4]" />
            Loading transaction ledger records...
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center space-y-2">
            <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No billing transactions recorded yet.</p>
            <p className="max-w-md text-xs text-slate-500 mx-auto">
              Billing checkout records will appear here as customers purchase credit packages via Stripe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Session / Tx ID</th>
                  <th className="px-4 py-3">Package Plan</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Grant Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.sessionId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{tx.userName}</p>
                      <p className="text-[11px] text-slate-500">{tx.userEmail}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 max-w-[150px] truncate" title={tx.sessionId}>
                      {tx.sessionId}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{tx.planName}</td>
                    <td className="px-4 py-3.5 font-black text-slate-900">
                      {tx.credits.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-emerald-700">
                      {tx.amountFormatted}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderStatusBadge(tx.status)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {tx.credited ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Credited
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          Not Credited
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="p-1.5 text-slate-600 hover:text-[#0e6de4] hover:bg-slate-100 rounded-md transition-colors"
                        title="View Full Inspector Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction Details Inspector Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-[#0e6de4] uppercase tracking-wider">
                  Transaction Audit Inspector
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {selectedTx.planName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-500 font-semibold block">Customer Name:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedTx.userName}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Customer Email:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedTx.userEmail}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Credits Package:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedTx.credits.toLocaleString()} Credits</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Amount Paid:</span>
                  <p className="font-extrabold text-emerald-700 mt-0.5">{selectedTx.amountFormatted} {selectedTx.currency}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Payment Status:</span>
                  <div className="mt-1">{renderStatusBadge(selectedTx.status)}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Credit Grant Status:</span>
                  <p className="font-bold text-emerald-700 mt-1">
                    {selectedTx.credited ? '✓ Wallet Credited Successfully' : 'Pending Wallet Credit'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-500 font-semibold block">Stripe Checkout Session ID:</span>
                <p className="font-mono text-slate-900 font-bold select-all break-all">{selectedTx.sessionId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="text-slate-500 font-semibold block">Checkout Initiated:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{new Date(selectedTx.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Payment Completed:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedTx.completedAt ? new Date(selectedTx.completedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                onClick={() => setSelectedTx(null)}
                className="bg-[#0e6de4] hover:bg-[#0b5ac0] text-white font-semibold text-xs px-4 py-2 rounded-lg"
              >
                Close Inspector
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
