'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Clock,
  Sliders,
  Calculator,
  Coins,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PricingService } from '@/lib/services/pricing-service';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export default function PricingPage() {
  const config = PricingService.getPricingConfig();
  const { freePlan, package5000, package10000, package100000, package300000 } = config;

  // Custom Interactive Credit Calculator State (up to 500,000 credits)
  const [customCredits, setCustomCredits] = useState<number>(5000);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const customPriceInfo = PricingService.calculateCustomCreditPrice(customCredits);
  const yearlyMultiplier = billingPeriod === 'yearly' ? 0.8 * 12 : 1;
  const displayPrice = (monthly: number) => Math.round(monthly * yearlyMultiplier);
  const price5000 = displayPrice(50);
  const price10000 = displayPrice(99);
  const price100000 = displayPrice(199);
  const price300000 = displayPrice(299);
  const customDisplayPrice = displayPrice(customPriceInfo.price);

  return (
    <div className="pricing-public-page min-h-screen bg-[#f4f8fd] text-slate-950 font-sans">
      <LandingHeader />

      {/* Hero Header */}
      <section className="pt-16 pb-10 px-4 text-center max-w-4xl mx-auto space-y-4">
        <span className="text-xs font-mono font-bold text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          SIMPLE & TRANSPARENT OUTREACH PRICING
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
          Flexible outreach pricing. <br className="hidden sm:inline" />
          <span className="text-[#0e6de4]">Buy the credits your campaigns need.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          No subscription. Purchase non-expiring credit packages whenever you need additional outreach volume.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        {[['2 credits', 'per website submission'], ['+1 credit', 'optional AI personalization'], ['Pay-as-you-go', 'buy credits when needed'], ['No subscription', 'one-time credit packages']].map(([title, detail]) => <div key={title} className="rounded-2xl border border-blue-100 bg-white p-5 text-center shadow-sm"><p className="text-lg font-black text-[#0e6de4]">{title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p></div>)}
      </section>
      <div className="mx-auto mb-4 flex w-fit items-center gap-1 rounded-2xl border border-blue-100 bg-white p-1 shadow-sm"><button type="button" onClick={() => setBillingPeriod('monthly')} className={`rounded-xl px-5 py-2 text-sm font-black ${billingPeriod === 'monthly' ? 'bg-[#0e6de4] text-white' : 'text-slate-600'}`}>Monthly</button><button type="button" onClick={() => setBillingPeriod('yearly')} className={`rounded-xl px-5 py-2 text-sm font-black ${billingPeriod === 'yearly' ? 'bg-[#0e6de4] text-white' : 'text-slate-600'}`}>Yearly <span className="ml-1 text-[10px]">Save 20%</span></button></div>
      {billingPeriod === 'yearly' && <div className="mx-auto mb-6 grid max-w-5xl grid-cols-2 gap-3 px-4 sm:grid-cols-4"><div className="col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-center sm:col-span-4"><p className="text-xs font-black uppercase tracking-wide text-[#0e6de4]">Yearly billing — 20% saved</p><p className="mt-1 text-sm font-semibold text-slate-700">12-month totals are shown below and update instantly.</p></div>{[[5000,price5000],[10000,price10000],[100000,price100000],[300000,price300000]].map(([credits,total]) => <div key={credits} className="rounded-2xl border border-blue-100 bg-white p-3 text-center shadow-sm"><p className="text-xs font-bold text-slate-500">{Number(credits).toLocaleString()} credits</p><p className="mt-1 text-lg font-black text-[#0e6de4]">${Number(total).toLocaleString()}</p><p className="text-[10px] font-semibold text-slate-500">12-month total</p></div>)}</div>}

      {/* 5 Card Pricing Grid */}
      <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 items-stretch">
        {/* 1. 100 CREDITS FREE */}
        <div className="pricing-plan-card rounded-3xl border border-blue-100 bg-white p-6 space-y-6 flex flex-col justify-between shadow-xl relative">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-wider bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                100% FREE
              </span>
              <span className="text-[10px] text-slate-400 font-mono">No Card</span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">100 Credits</h3>
              <p className="text-xs text-slate-400 mt-1">No credit card required</p>
            </div>

            <div className="flex items-baseline gap-1 py-2 border-y border-slate-800/80">
              <span className="text-3xl font-extrabold text-white">$0</span>
              <span className="text-xs font-semibold text-slate-400">/ month</span>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-300 font-mono uppercase">Includes:</p>
              {freePlan.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-emerald-950 border border-emerald-600/40 text-emerald-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Link href="/signup">
              <Button variant="secondary" className="w-full py-2.5 font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. 5,000 CREDITS ($50 USD) */}
        <div className="pricing-plan-card pricing-plan-card-popular rounded-3xl border-2 border-[#0e6de4] bg-white p-6 space-y-6 flex flex-col justify-between shadow-xl relative">
          <div className="absolute -top-3 right-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[9px] font-extrabold font-mono uppercase shadow-md">
            MOST POPULAR
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-wider bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800/80">
                5,000 CREDITS
              </span>
              <span className="text-[10px] text-blue-300 font-mono font-bold">$0.01 / credit</span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">5,000 Credits</h3>
              <p className="text-xs text-slate-400 mt-1">$0.01 per credit • Non-expiring</p>
            </div>

            <div className="flex items-baseline gap-1.5 py-2 border-y border-slate-800/80">
              <span className="text-3xl font-extrabold text-white">${price5000}</span>
              <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-300 font-mono uppercase">Advantages:</p>
              {package5000.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-200 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-blue-950 border border-blue-500/50 text-blue-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Link href={`/checkout?credits=5000&price=50&period=${billingPeriod}`}>
              <Button variant="primary" className="w-full py-2.5 font-bold text-xs bg-[#2563EB] hover:bg-blue-600 text-white shadow-lg">
                Buy 5,000 Credits (${price5000})
              </Button>
            </Link>
          </div>
        </div>

        {/* 3. 10,000 CREDITS ($99 USD) */}
        <div className="pricing-plan-card rounded-3xl border border-blue-100 bg-white p-6 space-y-6 flex flex-col justify-between shadow-xl relative">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-wider bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/80">
                10,000 CREDITS
              </span>
              <span className="text-[10px] text-indigo-300 font-mono font-bold">$0.0099 / credit</span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">10,000 Credits</h3>
              <p className="text-xs text-slate-400 mt-1">$0.0099 per credit</p>
            </div>

            <div className="flex items-baseline gap-1.5 py-2 border-y border-slate-800/80">
              <span className="text-3xl font-extrabold text-white">${price10000}</span>
              <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-300 font-mono uppercase">Key Features:</p>
              {package10000.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-200 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-indigo-950 border border-indigo-500/50 text-indigo-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Link href={`/checkout?credits=10000&price=99&period=${billingPeriod}`}>
              <Button variant="primary" className="w-full py-2.5 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                Buy 10,000 Credits (${price10000})
              </Button>
            </Link>
          </div>
        </div>

        {/* 4. 100,000 CREDITS ($199 USD) */}
        <div className="pricing-plan-card rounded-3xl border border-blue-100 bg-white p-6 space-y-6 flex flex-col justify-between shadow-xl relative">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-wider bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-800/80">
                100,000 CREDITS
              </span>
              <span className="text-[10px] text-purple-300 font-mono font-bold">$0.0019 / credit</span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">100,000 Credits</h3>
              <p className="text-xs text-slate-400 mt-1">$0.0019 per credit</p>
            </div>

            <div className="flex items-baseline gap-1.5 py-2 border-y border-slate-800/80">
              <span className="text-3xl font-extrabold text-white">${price100000}</span>
              <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-300 font-mono uppercase">Scale Features:</p>
              {package100000.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-200 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-purple-950 border border-purple-500/50 text-purple-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Link href={`/checkout?credits=100000&price=199&period=${billingPeriod}`}>
              <Button variant="primary" className="w-full py-2.5 font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
                Buy 100,000 Credits (${price100000})
              </Button>
            </Link>
          </div>
        </div>

        {/* 5. 300,000 CREDITS PROMO CARD ($299 USD — Was $399 Flat $100 Off) */}
        <div className="pricing-plan-card rounded-3xl border border-blue-100 bg-white p-6 space-y-6 flex flex-col justify-between shadow-xl relative">
          <div className="absolute -top-3 right-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[9px] font-extrabold font-mono uppercase shadow-md">
            BEST VALUE · $100 OFF
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-pink-400 uppercase tracking-wider bg-pink-950/80 px-2.5 py-0.5 rounded-full border border-pink-800/80 flex items-center gap-1">
                <Crown className="h-3 w-3 text-amber-400" /> 300,000 CREDITS
              </span>
              <span className="text-[10px] text-pink-300 font-mono font-bold">$0.0009 / credit</span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">300,000 Credits</h3>
              <p className="text-xs text-slate-400 mt-1">Promo • $0.0009 per credit</p>
            </div>

            <div className="flex items-baseline gap-2 py-2 border-y border-slate-800/80">
              <span className="text-lg font-bold text-slate-400 line-through">$399</span>
              <span className="text-3xl font-extrabold text-white">${price300000}</span>
              <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-300 font-mono uppercase">Promo Perks:</p>
              {package300000.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-200 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-pink-950 border border-pink-500/50 text-pink-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Link href={`/checkout?credits=300000&price=299&period=${billingPeriod}`}>
              <Button variant="primary" className="w-full py-2.5 font-bold text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white shadow-lg">
                Buy 300,000 Credits (${price300000})
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Custom Credit Amount Calculator Slider (up to 500,000 Credits) */}
      <section className="py-10 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="pricing-calculator rounded-3xl border border-blue-100 bg-white p-8 space-y-6 shadow-xl">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              BULK CREDIT CALCULATOR (UP TO 500,000 CREDITS)
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Slide to Set Any Custom Credit Amount
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Drag the slider or enter credit quantity up to 500,000 credits. Price and volume discounts update instantly!
            </p>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto pt-2">
            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { qty: 5000, label: '5K Credits ($50)' },
                { qty: 10000, label: '10K Credits ($99)' },
                { qty: 100000, label: '100K Credits ($199)' },
                { qty: 300000, label: '300K PROMO ($299)' },
                { qty: 500000, label: '500K Max Scale ($450)' },
              ].map((p) => (
                <button
                  key={p.qty}
                  onClick={() => setCustomCredits(p.qty)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    customCredits === p.qty
                      ? 'bg-[#0e6de4] border-[#0e6de4] text-white shadow-md'
                      : 'bg-white border-blue-100 text-slate-600 hover:bg-blue-50 hover:text-[#0e6de4]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Range Slider & Input Box */}
            <div className="space-y-4 bg-[#f8fbff] p-6 rounded-2xl border border-blue-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
                <div className="space-y-1 text-center sm:text-left">
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Selected Outreach Volume:</label>
                  <p className="text-2xl font-extrabold text-white">{customCredits.toLocaleString()} Credits</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1000"
                    max="500000"
                    step="1000"
                    value={customCredits}
                    onChange={(e) => setCustomCredits(Number(e.target.value))}
                    className="w-36 p-2.5 text-center font-bold text-sm bg-white border border-blue-200 rounded-xl text-[#0e6de4] focus:outline-none focus:border-[#0e6de4]"
                  />
                  <span className="text-xs text-slate-400 font-bold">Qty</span>
                </div>
              </div>

              <input
                type="range"
                min="1000"
                max="500000"
                step="1000"
                value={customCredits}
                onChange={(e) => setCustomCredits(Number(e.target.value))}
                className="w-full h-3.5 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-[#0e6de4]"
              />

              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>5K ($50)</span>
                <span>10K ($99)</span>
                <span>100K ($199)</span>
                <span>300K ($299 PROMO)</span>
                <span>500K ($450 MAX)</span>
              </div>
            </div>

            {/* Price Summary Calculation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-[#f8fbff] border border-blue-100">
                <p className="text-[11px] font-bold text-slate-400 font-mono uppercase">Calculated Price</p>
                <p className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">${customDisplayPrice.toLocaleString()} USD</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{billingPeriod === 'yearly' ? '12-month total' : 'One-time purchase'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8fbff] border border-blue-100">
                <p className="text-[11px] font-bold text-slate-400 font-mono uppercase">Rate Per Credit</p>
                <p className="text-2xl font-extrabold text-blue-400 mt-1 font-mono">${customPriceInfo.ratePerCredit.toFixed(4)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Volume tier rate</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f8fbff] border border-blue-100">
                <p className="text-[11px] font-bold text-slate-400 font-mono uppercase">Volume Savings</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                  {customPriceInfo.discountPercent > 0 ? `${customPriceInfo.discountPercent}% OFF` : 'Standard'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Non-expiring credits</p>
              </div>
            </div>

            {/* Direct Checkout Link Button */}
            <div className="pt-2">
              <Link href={`/checkout?credits=${customCredits}&price=${customDisplayPrice}&period=${billingPeriod}`}>
                <Button variant="primary" className="w-full py-3.5 font-extrabold text-sm bg-[#0e6de4] hover:bg-[#0758bd] text-white shadow-xl cursor-pointer">
                  Buy {customCredits.toLocaleString()} Credits (${customDisplayPrice.toLocaleString()} USD)
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Credit Deduction Rules Table */}
      <section className="py-10 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-950">Transparent Credit Deduction Rules</h2>
          <p className="text-xs text-slate-400 font-mono">
            Credits are deducted ONLY when processing results are finalized according to strict outcome rules:
          </p>
        </div>

        <div className="pricing-rules rounded-2xl border border-blue-100 bg-white overflow-hidden text-xs shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-blue-50 border-b border-blue-100 text-slate-600 font-mono text-[11px] uppercase">
              <tr>
                <th className="p-3.5">Submission Outcome Result</th>
                <th className="p-3.5 text-center">Credit Cost</th>
                <th className="p-3.5">Rule Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              <tr>
                <td className="p-3.5 font-bold text-emerald-400">SUCCESSFUL_SUBMISSION</td>
                <td className="p-3.5 text-center font-bold font-mono text-emerald-400">2.00 Credits</td>
                <td className="p-3.5 text-slate-400">Form page found, fields mapped, form filled & submitted successfully.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-violet-400">AI_PERSONALIZATION (OPTIONAL)</td>
                <td className="p-3.5 text-center font-bold font-mono text-violet-400">+1.00 Credit</td>
                <td className="p-3.5 text-slate-400">Added only when optional AI personalization is selected.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-amber-400">FAILED_SUBMISSION_AFTER_REAL_ATTEMPT</td>
                <td className="p-3.5 text-center font-bold font-mono text-amber-400">0.50 Credit</td>
                <td className="p-3.5 text-slate-400">Form found and mapped, but actual network submission attempt failed.</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-400">WEBSITE_UNREACHABLE / NO_FORM / CAPTCHA</td>
                <td className="p-3.5 text-center font-bold font-mono text-slate-400">0.00 Credit</td>
                <td className="p-3.5 text-slate-400">Website offline, no form present, or CAPTCHA detected. Zero cost.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
