'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, ShieldCheck, CheckCircle2, Lock, ArrowLeft, Flame, Coins, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const creditAmount = searchParams ? Number(searchParams.get('credits')) || 500 : 500;
  const totalPrice = searchParams ? Number(searchParams.get('price')) || 20 : 20;

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

    setTimeout(() => {
      CreditWalletService.addPaidCredits(creditAmount, `ch_stripe_${Date.now()}`);

      setIsProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        router.push('/credits');
      }, 1800);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>Secure Checkout</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            256-Bit Encrypted Payment Processing • Guaranteed Instant Credit Activation
          </p>
        </div>

        <Link href="/credits">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Wallet
          </Button>
        </Link>
      </div>

      {paymentSuccess ? (
        <Card className="p-8 text-center space-y-4 border-emerald-200 bg-emerald-50/20 max-w-md mx-auto">
          <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Payment Successful!</h2>
          <p className="text-xs text-slate-600">
            {creditAmount.toLocaleString()} paid credits have been added to your account. Redirecting to wallet...
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4 border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Order Summary</h2>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Selected Package</span>
              <span className="font-bold text-slate-900 font-mono">{creditAmount.toLocaleString()} Credits</span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
              <span className="font-bold text-slate-900">Total Due Today</span>
              <span className="text-lg font-extrabold text-blue-600 font-mono">${totalPrice} USD</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4 border-blue-200 bg-blue-50/10">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Payment Details</h2>

            <form onSubmit={handleProcessPayment} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">CVC</label>
                  <input
                    type="password"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-center"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isProcessing}
                variant="primary"
                className="w-full font-bold bg-blue-600 hover:bg-blue-700 py-3 text-xs flex items-center justify-center gap-2 mt-4"
              >
                {isProcessing ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Pay ${totalPrice} USD Now</span>
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
