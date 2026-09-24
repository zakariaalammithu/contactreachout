'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Gift, Link2, Mail, Users, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

interface ReferralData {
  userId: string;
  referralCode: string;
  referralUrl: string;
  fullReferralUrl: string;
  bonusCredits: number;
  payoutEmail: string;
  totals: {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    referralRewards: number;
    availableReferralCredits: number;
  };
  referredUsers: Array<{
    id: string;
    name: string;
    joinedAt: string;
    status: string;
    rewardCredits: number;
  }>;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [payoutEmail, setPayoutEmail] = useState('');
  const [copied, setCopied] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/referral', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load referral details.');

        const syncKey = `contactreachout_referral_bonus_synced_${payload.userId}`;
        const alreadySynced = Number(localStorage.getItem(syncKey) || 0);
        const creditsToSync = Math.max(0, payload.bonusCredits - alreadySynced);
        if (creditsToSync > 0) {
          CreditWalletService.addBonusCredits(creditsToSync, 'Verified referral rewards', payload.userId);
          localStorage.setItem(syncKey, String(payload.bonusCredits));
        }

        setData(payload);
        setPayoutEmail(payload.payoutEmail || '');
      })
      .catch((error) => setMessage(error.message));
  }, []);

  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  };

  const savePayoutEmail = async () => {
    setMessage('');
    const response = await fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payoutEmail }),
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Wise account email saved.' : payload.error || 'Unable to save email.');
  };

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">
        {message || 'Loading your referral dashboard…'}
      </div>
    );
  }

  const fullReferralUrl =
    typeof window === 'undefined'
      ? data.fullReferralUrl || data.referralUrl
      : `${window.location.origin}${data.referralUrl}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Banner */}
      <div className="rounded-3xl bg-[#0e6de4] p-7 text-white shadow-xl shadow-blue-100 sm:p-9">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-3">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">Refer & Earn</p>
            <h1 className="mt-1 text-3xl font-black">Grow together with ContactReachout</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-base font-extrabold text-white leading-relaxed">
          Refer a friend → They get 50 bonus credits. You get 100 bonus credits after their email verification.
        </p>
        <p className="mt-1.5 max-w-2xl text-xs text-blue-100 font-medium">
          Invite a new user and earn 100 bonus credits when they complete email verification. Your referred user also receives 50 bonus credits.
        </p>
      </div>

      {/* Referral Link & Overview Cards Grid */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">My Referral Link & Code</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your unique referral link and code are server-generated and securely tied to your account.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Referral Code</label>
            <div className="mt-1.5 flex items-center justify-between rounded-2xl bg-slate-950 p-4 text-white">
              <span className="font-mono text-2xl font-black tracking-[0.18em]">{data.referralCode}</span>
              <button
                type="button"
                onClick={() => copyValue('code', data.referralCode)}
                className="rounded-xl bg-white/10 p-2.5 hover:bg-white/20 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                aria-label="Copy referral code"
              >
                {copied === 'code' ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">My Referral Link</label>
            <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Link2 className="h-4 w-4 shrink-0 text-[#0e6de4]" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">{fullReferralUrl}</span>
              <button
                type="button"
                onClick={() => copyValue('link', fullReferralUrl)}
                className="rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                aria-label="Copy referral link"
              >
                {copied === 'link' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 5 Real Metric Counters */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="rounded-xl bg-blue-50 p-3 text-[#0e6de4]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 font-mono">{data.totals.totalReferrals}</p>
              <p className="text-xs font-bold text-slate-500">Total Referrals</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-800 font-mono">{data.totals.successfulReferrals}</p>
              <p className="text-xs font-bold text-emerald-700">Successful Referrals</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-800 font-mono">{data.totals.pendingReferrals}</p>
              <p className="text-xs font-bold text-amber-700">Pending Referrals</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-2xs">
            <div className="rounded-xl bg-blue-100 p-3 text-[#0e6de4]">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#0e6de4] font-mono">{data.totals.referralRewards}</p>
              <p className="text-xs font-bold text-slate-600">Referral Rewards Earned</p>
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 shadow-2xs">
            <div className="rounded-xl bg-white p-3 text-[#0e6de4] shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 font-mono">{data.totals.availableReferralCredits}</p>
              <p className="text-xs font-bold text-slate-600">Available Referral Credits Balance</p>
            </div>
          </div>
        </div>
      </section>

      {/* How rewards work */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-xl font-black text-slate-900">How referral rewards work</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ['1', 'Share your link', 'Send your unique referral link or code to a new user.'],
            ['2', 'They verify their account', 'The new user signs up through your referral link and completes email verification. They receive 50 one-time bonus credits.'],
            ['3', 'You earn credits', "You receive 100 one-time bonus credits after the referred user's account is successfully verified."],
          ].map(([number, title, description]) => (
            <div key={number} className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0e6de4] text-xs font-black text-white">
                {number}
              </span>
              <h3 className="mt-4 font-black text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Referred Users Table */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-xl font-black text-slate-900">Referred Users Audit</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-400 font-mono">
              <tr>
                <th className="pb-3">Date Joined</th>
                <th className="pb-3">User</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {data.referredUsers.length ? (
                data.referredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 text-slate-500 text-xs">
                      {new Date(user.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 font-bold text-slate-900 font-sans">{user.name}</td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          user.status === 'Successful'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-[#0e6de4]">
                      +{user.rewardCredits} credits
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500 font-sans">
                    No referred users recorded yet. Share your link to start earning bonus credits.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Optional Wise Payment Details */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-[#0e6de4]" />
          <h2 className="text-xl font-black text-slate-900">Affiliate Payout Settings (Optional)</h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed font-sans">
          <strong>Important Note:</strong> Standard referral rewards are <strong>CREDIT rewards</strong> (+100 credits for referrer, +50 credits for referred user) and are credited automatically upon email verification. Saving a Wise email address below is optional for future cash affiliate payout programs.
        </p>
        <div className="flex max-w-xl flex-col gap-3 sm:flex-row pt-1">
          <input
            value={payoutEmail}
            onChange={(event) => setPayoutEmail(event.target.value)}
            type="email"
            placeholder="alex@company.com (Wise Account Email)"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs outline-none focus:border-blue-500 font-mono"
          />
          <Button onClick={savePayoutEmail} className="bg-[#0e6de4] text-white hover:bg-[#0758bd] text-xs font-bold">
            Save Email
          </Button>
        </div>
        {message && <p className="text-xs font-bold text-slate-600">{message}</p>}
      </section>
    </div>
  );
}
