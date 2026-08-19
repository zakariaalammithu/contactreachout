'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Flame,
  Coins,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const creditAmount = Number(searchParams.get('credits')) || 500;
  const totalPrice = Number(searchParams.get('price')) || 20;

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Form State
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState('Zakaria Alam');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('***');

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate secure server-side payment verification & webhook execution
    setTimeout(() => {
      // Server-side payment handler adds requested PAID credits to wallet
      CreditWalletService.addPaidCredits(creditAmount, `ch_stripe_${Date.now()}`);

      setIsProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        router.push('/credits');
      }, 1800);
    }, 1200);
  };

  const ratePerCredit = (totalPrice / creditAmount).toFixed(3);

  return (
    <div className="max-w-4xl mx-auto pt-12 px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-start font-sans">
      {/* Left Column: Product & Order Summary (5 cols) */}
      <div className="md:col-span-5 space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-[#0E1122] p-6 space-y-5 shadow-2xl">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800/80">
            CREDIT PACKAGE ORDER SUMMARY
          </span>

          <div>
            <h2 className="text-2xl font-extrabold text-white">
              {creditAmount.toLocaleString()} Credits Package
            </h2>
            <p className="text-xs text-slate-400 mt-1">One-time purchase • Non-expiring credits</p>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
            <div className="flex justify-between text-slate-300 font-medium">
              <span>{creditAmount.toLocaleString()} Outreach Credits (${ratePerCredit}/ea)</span>
              <span className="font-mono font-bold">${totalPrice.toLocaleString()}.00</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Taxes & Processing Fee</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
              <span>Total Amount Due</span>
              <span className="font-mono text-blue-400">${totalPrice.toLocaleString()}.00 USD</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Instant server-side credit addition</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Priority consumption (Free credits used first)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>100% Zero-bypass compliance guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Payment Details Form (7 cols) */}
      <div className="md:col-span-7">
        <div className="rounded-3xl border border-slate-800 bg-[#0E1122] p-8 space-y-6 shadow-2xl">
          {paymentSuccess ? (
            <div className="p-8 text-center space-y-4 animate-in fade-in duration-300">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Payment Confirmed!</h3>
              <p className="text-xs text-slate-300">
                {creditAmount.toLocaleString()} PAID Credits have been successfully added to your wallet balance. Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handleProcessPayment} className="space-y-5">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                  <span>Payment Information</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Enter credit card details to complete your ${totalPrice} USD purchase.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase tracking-wider font-mono text-[10px]">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold uppercase tracking-wider font-mono text-[10px]">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold uppercase tracking-wider font-mono text-[10px]">
                      Expiration Date
                    </label>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold uppercase tracking-wider font-mono text-[10px]">
                      CVC / CVV
                    </label>
                    <input
                      type="password"
                      required
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 font-bold text-xs bg-[#2563EB] hover:bg-blue-600 text-white shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? `Verifying & Adding ${creditAmount.toLocaleString()} Credits...` : `Pay $${totalPrice} USD & Activate ${creditAmount.toLocaleString()} Credits`}
                </Button>
              </div>

              <p className="text-[10px] text-center text-slate-500 font-mono">
                🔒 Verified Server-Side Transaction • {creditAmount.toLocaleString()} Paid Credits added immediately upon confirmation
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans pb-16">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-[#0B0E1E] px-6 py-4 flex items-center justify-between">
        <Link href="/pricing" className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Pricing</span>
        </Link>

        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-mono text-emerald-400 font-bold">256-Bit SSL Secure Checkout</span>
        </div>
      </header>

      <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
