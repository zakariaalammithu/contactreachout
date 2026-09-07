'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Gift, Link2, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

interface ReferralData {
  userId: string;
  referralCode: string;
  referralUrl: string;
  bonusCredits: number;
  payoutEmail: string;
  totals: { referredUsers: number; earnedCredits: number; linkClicks: number };
  referredUsers: Array<{ id: string; name: string; joinedAt: string; status: string }>;
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
    window.setTimeout(() => setCopied(''), 1500);
  };

  const savePayoutEmail = async () => {
    setMessage('');
    const response = await fetch('/api/referral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payoutEmail }) });
    const payload = await response.json();
    setMessage(response.ok ? 'Wise account email saved.' : payload.error || 'Unable to save email.');
  };

  if (!data) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">{message || 'Loading your referral dashboard…'}</div>;
  const fullReferralUrl = typeof window === 'undefined' ? data.referralUrl : `${window.location.origin}${data.referralUrl}`;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[#0e6de4] p-7 text-white shadow-xl shadow-blue-100 sm:p-9">
        <div className="flex items-center gap-3"><div className="rounded-2xl bg-white/15 p-3"><Gift className="h-6 w-6" /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-100">Refer & Earn</p><h1 className="mt-1 text-3xl font-black">Grow together with ContactReachout</h1></div></div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-blue-100">A new user who joins with your code receives 50 one-time bonus credits. You receive 100 one-time bonus credits after their verified account is created.</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">My Referral Code</h2><p className="mt-1 text-sm text-slate-500">Your code is generated automatically and cannot be changed.</p>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-950 p-4 text-white"><span className="font-mono text-2xl font-black tracking-[0.18em]">{data.referralCode}</span><button onClick={() => copyValue('code', data.referralCode)} className="rounded-xl bg-white/10 p-2.5" aria-label="Copy referral code">{copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 p-3"><Link2 className="h-4 w-4 shrink-0 text-violet-600" /><span className="min-w-0 flex-1 truncate text-xs text-slate-600">{fullReferralUrl}</span><button onClick={() => copyValue('link', fullReferralUrl)} className="rounded-lg bg-slate-100 p-2" aria-label="Copy referral link">{copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">{[
          { label: 'Referred Users', value: data.totals.referredUsers, icon: Users },
          { label: 'Credits Earned', value: data.totals.earnedCredits, icon: Gift },
          { label: 'Total Bonus Balance', value: data.bonusCredits, icon: Check },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="rounded-xl bg-violet-50 p-3 text-violet-600"><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-black">{value}</p><p className="text-xs font-bold text-slate-500">{label}</p></div></div>)}</div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">How rewards work</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{[['1', 'Share your link', 'Send your unique signup link to a new ContactReachout user.'], ['2', 'They verify', 'The referred user completes email verification and receives 50 bonus credits.'], ['3', 'You earn', 'Your account receives 100 bonus credits once for that verified signup.']].map(([number, title, description]) => <div key={number} className="rounded-2xl bg-slate-50 p-5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">{number}</span><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Referred Users</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-400"><tr><th className="pb-3">Date Joined</th><th className="pb-3">User</th><th className="pb-3">Status</th><th className="pb-3 text-right">Reward</th></tr></thead><tbody>{data.referredUsers.length ? data.referredUsers.map((user) => <tr key={user.id} className="border-b border-slate-100"><td className="py-4 text-slate-500">{new Date(user.joinedAt).toLocaleDateString()}</td><td className="py-4 font-bold">{user.name}</td><td className="py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{user.status}</span></td><td className="py-4 text-right font-black text-violet-600">+100 credits</td></tr>) : <tr><td colSpan={4} className="py-10 text-center text-slate-500">No referred users yet. Share your code to start earning.</td></tr>}</tbody></table></div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><Mail className="h-5 w-5 text-violet-600" /><h2 className="text-xl font-black">Payment Details</h2></div><p className="mt-2 text-sm text-slate-500">Optional: save the email associated with your Wise account for future affiliate payout features. Credit rewards do not require Wise.</p><div className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row"><input value={payoutEmail} onChange={(event) => setPayoutEmail(event.target.value)} type="email" placeholder="alex@company.com" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500" /><Button onClick={savePayoutEmail} className="bg-violet-600 text-white hover:bg-violet-700">Save</Button></div>{message && <p className="mt-3 text-xs font-bold text-slate-600">{message}</p>}</section>
    </div>
  );
}
