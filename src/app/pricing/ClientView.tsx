'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import { PricingService, PLAN_PRICING_DETAILS } from '@/lib/services/pricing-service';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export default function PricingPage() {
  const config = PricingService.getPricingConfig();
  const { freePlan, package5000, package10000, package100000, package300000 } = config;

  // Custom Interactive Credit Calculator State (up to 500,000 credits)
  const [customCredits, setCustomCredits] = useState<number>(5000);
  // Default selected MUST be Yearly
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  const isYearly = billingPeriod === 'yearly';
  const customPriceInfo = PricingService.calculateCustomCreditPrice(customCredits);

  return (
    <div className="pricing-public-page min-h-screen bg-[#f8fbff] text-slate-900 font-sans">
      <LandingHeader />

      {/* Hero Header */}
      <section className="pt-14 pb-8 px-4 text-center max-w-4xl mx-auto space-y-3">
        <span className="text-xs font-mono font-bold text-[#0e6de4] uppercase tracking-wider bg-blue-50/80 px-4 py-1.5 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#0e6de4]" />
          SIMPLE & TRANSPARENT OUTREACH PRICING
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Flexible outreach pricing. <br className="hidden sm:inline" />
          <span className="text-[#0e6de4]">Choose your plan or buy credits as needed.</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          No hidden fees. Choose annual billing to save 20% or choose pay-as-you-go credit packages.
        </p>
      </section>

      {/* Value Chips */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-3.5 px-4 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['1 credit', 'per successful website message'],
          ['0 credits', 'AI Personalization included on paid plans'],
          ['Save 20%', 'on annual subscription plans'],
          ['No hidden fees', 'transparent Stripe checkout'],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-2xl border border-blue-100 bg-white p-4 text-center shadow-2xs">
            <p className="text-base font-black text-[#0e6de4]">{title}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{detail}</p>
          </div>
        ))}
      </section>

      {/* Billing Toggle (YEARLY | MONTHLY) - YEARLY DEFAULT */}
      <div className="mx-auto mb-8 flex w-fit items-center gap-1 rounded-2xl border border-blue-200 bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setBillingPeriod('yearly')}
          className={`rounded-xl px-6 py-2 text-xs font-extrabold transition-all cursor-pointer ${
            isYearly
              ? 'bg-[#0e6de4] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          YEARLY <span className="ml-1 text-[10px] font-mono opacity-90">(Save 20%)</span>
        </button>
        <button
          type="button"
          onClick={() => setBillingPeriod('monthly')}
          className={`rounded-xl px-6 py-2 text-xs font-extrabold transition-all cursor-pointer ${
            !isYearly
              ? 'bg-[#0e6de4] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          MONTHLY
        </button>
      </div>

      {/* 5 Pricing Cards Grid - Clean Heights & Alignment */}
      <section className="py-4 px-4 sm:px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 items-stretch">
        {/* CARD 1: FREE PLAN */}
        <div className="pricing-plan-card rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-all relative">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                100% FREE
              </span>
              <span className="text-[10px] text-slate-400 font-mono">No Card</span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isYearly ? '12,000 Credits/year' : '100 Credits'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">100 free credits every month</p>
            </div>

            <div className="py-2.5 border-y border-slate-100 space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">$0</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">
                {isYearly ? 'Free plan • Resets monthly' : 'Free plan • Resets monthly'}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-700 font-mono uppercase">Includes:</p>
              {freePlan.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-700 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-blue-50 border border-blue-200 text-[#0e6de4] flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex justify-center">
            <Link href="/signup" className="w-full">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
              >
                GET STARTED FREE
              </button>
            </Link>
          </div>
        </div>

        {/* CARD 2: STARTER (5,000 Credits) */}
        <div className="pricing-plan-card rounded-3xl border-2 border-[#0e6de4] bg-white p-6 flex flex-col justify-between shadow-md relative">
          <div className="absolute -top-3 right-3 px-2.5 py-0.5 rounded-full bg-[#0e6de4] text-white text-[9px] font-extrabold font-mono uppercase shadow-2xs">
            POPULAR
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                STARTER
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">$0.01 / credit</span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isYearly ? '60,000 Credits/year' : '5,000 Credits'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isYearly ? '5,000 Credits/month equivalent' : '5,000 Credits/month'}
              </p>
            </div>

            <div className="py-2.5 border-y border-slate-100 space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  ${isYearly ? PLAN_PRICING_DETAILS[5000].yearlyEffectiveMonthly : PLAN_PRICING_DETAILS[5000].monthlyPrice}
                </span>
                <span className="text-xs font-bold text-slate-600 font-mono">/ month</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">
                {isYearly ? `Billed $${PLAN_PRICING_DETAILS[5000].yearlyAnnualCharge} annually • Save 20%` : 'Billed monthly'}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-700 font-mono uppercase">Advantages:</p>
              {package5000.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-700 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-blue-50 border border-blue-200 text-[#0e6de4] flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex justify-center">
            <Link
              href={`/checkout?credits=5000&period=${billingPeriod}`}
              className="w-full"
            >
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
              >
                BUY NOW
              </button>
            </Link>
          </div>
        </div>

        {/* CARD 3: GROWTH (10,000 Credits) */}
        <div className="pricing-plan-card rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-all relative">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                GROWTH
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">$0.0099 / credit</span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isYearly ? '120,000 Credits/year' : '10,000 Credits'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isYearly ? '10,000 Credits/month equivalent' : '10,000 Credits/month'}
              </p>
            </div>

            <div className="py-2.5 border-y border-slate-100 space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  ${isYearly ? PLAN_PRICING_DETAILS[10000].yearlyEffectiveMonthly : PLAN_PRICING_DETAILS[10000].monthlyPrice}
                </span>
                <span className="text-xs font-bold text-slate-600 font-mono">/ month</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">
                {isYearly ? `Billed $${PLAN_PRICING_DETAILS[10000].yearlyAnnualCharge} annually • Save 20%` : 'Billed monthly'}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-700 font-mono uppercase">Key Features:</p>
              {package10000.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-700 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-blue-50 border border-blue-200 text-[#0e6de4] flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex justify-center">
            <Link
              href={`/checkout?credits=10000&period=${billingPeriod}`}
              className="w-full"
            >
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
              >
                BUY NOW
              </button>
            </Link>
          </div>
        </div>

        {/* CARD 4: SCALE (100,000 Credits) */}
        <div className="pricing-plan-card rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-all relative">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                SCALE
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">$0.0019 / credit</span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isYearly ? '1,200,000 Credits/year' : '100,000 Credits'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isYearly ? '100,000 Credits/month equivalent' : '100,000 Credits/month'}
              </p>
            </div>

            <div className="py-2.5 border-y border-slate-100 space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  ${isYearly ? PLAN_PRICING_DETAILS[100000].yearlyEffectiveMonthly : PLAN_PRICING_DETAILS[100000].monthlyPrice}
                </span>
                <span className="text-xs font-bold text-slate-600 font-mono">/ month</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">
                {isYearly ? `Billed $${PLAN_PRICING_DETAILS[100000].yearlyAnnualCharge} annually • Save 20%` : 'Billed monthly'}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-700 font-mono uppercase">Scale Features:</p>
              {package100000.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-700 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-blue-50 border border-blue-200 text-[#0e6de4] flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex justify-center">
            <Link
              href={`/checkout?credits=100000&period=${billingPeriod}`}
              className="w-full"
            >
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
              >
                BUY NOW
              </button>
            </Link>
          </div>
        </div>

        {/* CARD 5: ENTERPRISE (300,000 Credits) */}
        <div className="pricing-plan-card rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition-all relative">
          <div className="absolute -top-3 right-3 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-extrabold font-mono uppercase shadow-2xs">
            BEST VALUE
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                ENTERPRISE
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">$0.0009 / credit</span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isYearly ? '3,600,000 Credits/year' : '300,000 Credits'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isYearly ? '300,000 Credits/month equivalent' : '300,000 Credits/month'}
              </p>
            </div>

            <div className="py-2.5 border-y border-slate-100 space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-slate-400 line-through">
                  ${isYearly ? PLAN_PRICING_DETAILS[300000].strikethroughYearlyEffective : PLAN_PRICING_DETAILS[300000].strikethroughMonthly}
                </span>
                <span className="text-3xl font-extrabold text-slate-900">
                  ${isYearly ? PLAN_PRICING_DETAILS[300000].yearlyEffectiveMonthly : PLAN_PRICING_DETAILS[300000].monthlyPrice}
                </span>
                <span className="text-xs font-bold text-slate-600 font-mono">/ month</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">
                {isYearly ? `Billed $${PLAN_PRICING_DETAILS[300000].yearlyAnnualCharge} annually • Save 20%` : 'Billed monthly • Flat $100 Off'}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-bold text-slate-700 font-mono uppercase">Perks:</p>
              {package300000.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-[11px] text-slate-700 font-medium">
                  <div className="h-3.5 w-3.5 rounded-full bg-blue-50 border border-blue-200 text-[#0e6de4] flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex justify-center">
            <Link
              href={`/checkout?credits=300000&period=${billingPeriod}`}
              className="w-full"
            >
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
              >
                BUY NOW
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Custom Credit Amount Calculator Slider */}
      <section className="py-12 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="pricing-calculator rounded-3xl border border-blue-100 bg-white p-8 space-y-6 shadow-2xs">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-[#0e6de4]" />
              BULK CREDIT CALCULATOR (UP TO 500,000 CREDITS)
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Slide to Set Any Custom Credit Amount
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Drag the slider or enter credit quantity up to 500,000 credits. Price updates instantly!
            </p>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto pt-2">
            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { qty: 5000, label: '5K Credits' },
                { qty: 10000, label: '10K Credits' },
                { qty: 100000, label: '100K Credits' },
                { qty: 300000, label: '300K Credits' },
                { qty: 500000, label: '500K Max Scale' },
              ].map((p) => (
                <button
                  key={p.qty}
                  type="button"
                  onClick={() => setCustomCredits(p.qty)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    customCredits === p.qty
                      ? 'bg-[#0e6de4] border-[#0e6de4] text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-[#0e6de4]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Range Slider & Input Box */}
            <div className="space-y-4 bg-blue-50/40 p-6 rounded-2xl border border-blue-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
                <div className="space-y-1 text-center sm:text-left">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Selected Outreach Volume:</label>
                  <p className="text-2xl font-extrabold text-slate-900">{customCredits.toLocaleString()} Credits</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1000"
                    max="500000"
                    step="1000"
                    value={customCredits}
                    onChange={(e) => setCustomCredits(Number(e.target.value))}
                    className="w-36 p-2.5 text-center font-bold text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0e6de4]"
                  />
                  <span className="text-xs text-slate-500 font-bold">Qty</span>
                </div>
              </div>

              <input
                type="range"
                min="1000"
                max="500000"
                step="1000"
                value={customCredits}
                onChange={(e) => setCustomCredits(Number(e.target.value))}
                className="w-full h-3 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-[#0e6de4]"
              />
            </div>

            {/* Single Clean BUY NOW Purchase Action for Calculator */}
            <div className="pt-2 flex justify-center">
              <Link
                href={`/checkout?credits=${customCredits}&period=${billingPeriod}`}
                className="w-full"
              >
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
                >
                  BUY NOW (${isYearly ? Math.round(customPriceInfo.price * 0.8 * 12).toLocaleString() + ' / year' : customPriceInfo.price.toLocaleString() + ' / month'})
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
