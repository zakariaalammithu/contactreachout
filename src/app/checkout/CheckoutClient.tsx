'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

export default function CheckoutClient() {
  const params = useSearchParams();
  const credits = Number(params?.get('credits')) || 5000;
  const sessionId = params?.get('session_id');
  const statusParam = params?.get('status');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'ready' | 'pending' | 'paid' | 'cancelled' | 'error'>(statusParam === 'cancelled' ? 'cancelled' : sessionId ? 'pending' : 'ready');
  const [message, setMessage] = useState(statusParam === 'cancelled' ? 'Checkout was cancelled. No charge was made.' : '');

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    fetch(`/api/billing/status?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then((data) => {
        if (!active) return;
        if (data.status === 'paid' && data.credited) {
          const claimKey = `stripe_checkout_claimed_${sessionId}`;
          if (!localStorage.getItem(claimKey)) {
            CreditWalletService.addPaidCredits(data.credits, sessionId);
            localStorage.setItem(claimKey, 'true');
          }
          setState('paid'); setMessage(`${Number(data.credits).toLocaleString()} credits were added to your account.`);
        } else { setState('pending'); setMessage('Stripe is still confirming this payment. Refresh this page in a moment.'); }
      })
      .catch((error) => { if (active) { setState('error'); setMessage(error.message || 'Payment could not be verified.'); } });
    return () => { active = false; };
  }, [sessionId]);

  const startCheckout = async () => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credits }) });
      const data = await response.json();
      if (response.status === 401) { window.location.href = `/login?tab=signin&next=${encodeURIComponent(`/checkout?credits=${credits}`)}`; return; }
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started.');
      window.location.assign(data.url);
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'Checkout could not be started.'); setBusy(false); }
  };

  return <div className="mx-auto max-w-2xl space-y-6 pb-16">
    <div className="flex items-center justify-between border-b border-blue-100 pb-4"><div><h1 className="flex items-center gap-2 text-2xl font-black text-slate-950"><CreditCard className="h-6 w-6 text-[#0e6de4]" />Secure Stripe Checkout</h1><p className="mt-1 text-sm text-slate-500">Payment details are entered only on Stripe&apos;s hosted checkout.</p></div><Link href="/pricing"><Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-4 w-4" />Pricing</Button></Link></div>
    <Card className="space-y-6 border-blue-100 bg-white p-7 shadow-lg">
      <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-500">Credit package</p><p className="mt-1 text-3xl font-black text-slate-950">{credits.toLocaleString()} credits</p></div><ShieldCheck className="h-10 w-10 text-[#0e6de4]" /></div>
      {state !== 'ready' && <div className={`flex gap-3 rounded-2xl border p-4 text-sm font-semibold ${state === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : state === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>{state === 'paid' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : state === 'pending' ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <TriangleAlert className="h-5 w-5 shrink-0" />}<span>{message}</span></div>}
      {state === 'paid' ? <Link href="/credits" className="block"><Button className="w-full">View credit wallet</Button></Link> : <Button onClick={startCheckout} disabled={busy || state === 'pending'} className="w-full py-3">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Continue to Stripe</Button>}
      <p className="text-center text-xs leading-5 text-slate-500">No card data is collected or stored by ContactReachout. Credits activate only after server-side Stripe verification.</p>
    </Card>
  </div>;
}
