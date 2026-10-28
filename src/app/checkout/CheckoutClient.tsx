'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StripeService } from '@/lib/services/stripe-service';

export default function CheckoutClient() {
  const params = useSearchParams();
  const credits = Number(params?.get('credits')) || 5000;
  const period = (params?.get('period') || 'yearly') === 'monthly' ? 'monthly' : 'yearly';
  const sessionId = params?.get('session_id');
  const statusParam = params?.get('status');

  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'ready' | 'pending' | 'paid' | 'cancelled' | 'error'>(
    statusParam === 'cancelled' ? 'cancelled' : sessionId ? 'pending' : 'ready'
  );
  const [message, setMessage] = useState(
    statusParam === 'cancelled' ? 'Checkout was cancelled. No charge was made.' : ''
  );

  // Compute exact server purchase breakdown for checkout display
  const purchaseInfo = useMemo(() => {
    try {
      return StripeService.getPurchase(credits, period);
    } catch {
      return StripeService.getPurchase(5000, 'yearly');
    }
  }, [credits, period]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    fetch(`/api/billing/status?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (!active) return;
        if (data.status === 'paid' && data.credited) {
          setState('paid');
          setMessage(`${Number(data.credits).toLocaleString()} credits were added to your account.`);
        } else {
          setState('pending');
          setMessage('Stripe is confirming this payment. Refresh in a moment.');
        }
      })
      .catch((error) => {
        if (active) {
          setState('error');
          setMessage(error.message || 'Payment could not be verified.');
        }
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const startCheckout = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: purchaseInfo.credits, period: purchaseInfo.period }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.href = `/login?tab=signin&next=${encodeURIComponent(
          `/checkout?credits=${purchaseInfo.credits}&period=${purchaseInfo.period}`
        )}`;
        return;
      }
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started.');
      window.location.assign(data.url);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Checkout could not be started.');
      setBusy(false);
    }
  };

  const isYearly = purchaseInfo.period === 'yearly';

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16 font-sans">
      <div className="flex items-center justify-between border-b border-blue-900 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <CreditCard className="h-6 w-6 text-blue-400" />
            Secure Stripe Checkout
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Payment details are entered only on Stripe&apos;s hosted checkout.
          </p>
        </div>
        <Link href="/pricing">
          <Button variant="outline" size="sm" className="border-zinc-700 font-bold">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Pricing
          </Button>
        </Link>
      </div>

      <Card className="space-y-6 border-blue-900 bg-zinc-950 p-7 shadow-lg rounded-3xl">
        {/* Selected Plan Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-3 py-1 rounded-full border border-blue-900">
              {purchaseInfo.planName} Plan — {isYearly ? 'Annual Billing' : 'Monthly Billing'}
            </span>
            <div className="pt-2">
              <span className="text-3xl font-extrabold text-white font-mono">
                ${isYearly ? purchaseInfo.actualAnnualCharge.toLocaleString() : purchaseInfo.displayMonthlyPrice.toLocaleString()} USD
              </span>
              <span className="text-sm font-bold text-zinc-400 font-mono">
                {isYearly ? ' / year' : ' / month'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium pt-1">
              {isYearly
                ? `(Equivalent to $${purchaseInfo.displayMonthlyPrice}/month • Billed $${purchaseInfo.actualAnnualCharge} annually • Save 20%)`
                : 'Billed monthly • Cancel anytime'}
            </p>
          </div>

          <ShieldCheck className="h-10 w-10 text-blue-400 shrink-0" />
        </div>

        {/* Plan Feature Summary */}
        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-zinc-300">
            <span>Outreach Credit Allocation:</span>
            <strong className="text-zinc-100">
              {isYearly
                ? `${(purchaseInfo.credits * 12).toLocaleString()} Credits/year (${purchaseInfo.credits.toLocaleString()} Credits/mo)`
                : `${purchaseInfo.credits.toLocaleString()} Credits/month`}
            </strong>
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>Billing Interval:</span>
            <strong className="text-blue-400 uppercase">
              {isYearly ? 'Billed Annually ($' + purchaseInfo.actualAnnualCharge + ' / yr)' : 'Billed Monthly ($' + purchaseInfo.displayMonthlyPrice + ' / mo)'}
            </strong>
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>Payment Processor:</span>
            <strong className="text-zinc-100">Stripe Encrypted (256-bit SSL)</strong>
          </div>
        </div>

        {/* Error / Status Banner */}
        {state !== 'ready' && (
          <div
            className={`flex gap-3 rounded-2xl border p-4 text-sm font-semibold ${
              state === 'paid'
                ? 'border-emerald-900 bg-emerald-950 text-emerald-300'
                : state === 'error'
                ? 'border-rose-900 bg-rose-950 text-rose-300'
                : 'border-blue-900 bg-blue-950 text-blue-300'
            }`}
          >
            {state === 'paid' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : state === 'pending' ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-400" />
            ) : (
              <TriangleAlert className="h-5 w-5 shrink-0 text-rose-400" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* CTA Payment Button */}
        {state === 'paid' ? (
          <Link href="/credits" className="block">
            <Button className="w-full bg-[#0e6de4] hover:bg-[#0758bd] py-3 text-xs font-extrabold cursor-pointer">
              View Credit Wallet
            </Button>
          </Link>
        ) : (
          <Button
            onClick={startCheckout}
            disabled={busy || state === 'pending'}
            className="w-full bg-[#0e6de4] hover:bg-[#0758bd] py-3.5 text-xs font-extrabold shadow-md transition-all cursor-pointer"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            <span>
              {isYearly
                ? `Pay $${purchaseInfo.actualAnnualCharge} USD / Year on Stripe`
                : `Pay $${purchaseInfo.displayMonthlyPrice} USD / Month on Stripe`}
            </span>
          </Button>
        )}

        <p className="text-center text-xs leading-5 text-zinc-400">
          No card data is collected or stored by ContactReachout. Credits activate only after server-side Stripe verification.
        </p>
      </Card>
    </div>
  );
}
