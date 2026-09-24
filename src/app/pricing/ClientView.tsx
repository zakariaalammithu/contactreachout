'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Calculator,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Gift,
} from 'lucide-react';
import { PricingService, PLAN_PRICING_DETAILS } from '@/lib/services/pricing-service';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export default function PricingPage() {
  const config = PricingService.getPricingConfig();
  const { freePlan, package5000, package10000, package100000, package300000 } = config;

  // Custom Interactive Credit Calculator State (up to 300,000 credits)
  const [customCredits, setCustomCredits] = useState<number>(5000);
  // Default selected billing period is Yearly
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  const isYearly = billingPeriod === 'yearly';
  const customPriceInfo = PricingService.calculateCustomCreditPrice(customCredits);

  return (
    <div className="pricing-public-page min-h-screen bg-[#f3f6fa] text-slate-900 font-sans flex flex-col justify-between">
      <div>
        <LandingHeader />

        {/* Hero Header */}
        <section className="pt-14 pb-8 px-4 text-center max-w-4xl mx-auto space-y-3">
          <span className="text-xs font-bold text-[#0e6de4] uppercase tracking-wider bg-blue-50/80 px-4 py-1.5 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#0e6de4]" />
            TRANSPARENT OUTREACH PRICING
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Flexible outreach pricing. <br className="hidden sm:inline" />
            <span className="text-[#0e6de4]">Choose your plan or buy credits as needed.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            No hidden fees. Choose annual billing to save 20% or choose the plan that fits your outreach volume.
          </p>
        </section>

        {/* Value Chips */}
        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-3.5 px-4 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['1 credit', 'per successful website message'],
            ['0 credits', 'AI Personalization on eligible plans'],
            ['Save 20%', 'with annual subscription billing'],
            ['No hidden fees', 'transparent Stripe checkout'],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-2xl border border-blue-100 bg-white p-4 text-center shadow-xs">
              <p className="text-base font-black text-[#0e6de4]">{title}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">{detail}</p>
            </div>
          ))}
        </section>

        {/* Billing Toggle (YEARLY | MONTHLY) - YEARLY DEFAULT */}
        <div className="mx-auto mb-8 flex w-fit items-center gap-1 rounded-2xl border border-blue-200 bg-white p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setBillingPeriod('yearly')}
            className={`rounded-xl px-6 py-2.5 text-xs font-black transition-all cursor-pointer ${
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
            className={`rounded-xl px-6 py-2.5 text-xs font-black transition-all cursor-pointer ${
              !isYearly
                ? 'bg-[#0e6de4] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            MONTHLY
          </button>
        </div>

        {/* 5 Pricing Cards Grid */}
        <section className="py-4 px-4 sm:px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 items-stretch">
          {/* CARD 1: FREE */}
          <div className="pricing-plan-card rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs hover:border-blue-300 transition-all relative">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  FREE
                </span>
                <span className="text-[10px] text-slate-500 font-medium">No Card Required</span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  100 Credits/month
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{freePlan.description}</p>
              </div>

              <div className="py-3 border-y border-slate-100 space-y-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">$0</span>
                  <span className="text-xs font-bold text-slate-500">/ month</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                  Free plan • 100 monthly credits
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Features:</p>
                {freePlan.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0e6de4] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex justify-center">
              <Link href="/signup" className="w-full">
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl border-2 border-[#0e6de4] text-[#0e6de4] hover:bg-blue-50 font-black text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
                >
                  Start Free
                </button>
              </Link>
            </div>
          </div>

          {/* CARD 2: STARTER */}
          <div className="pricing-plan-card rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs hover:border-blue-300 transition-all relative">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  STARTER
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">$0.0100 / credit</span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  5,000 Credits/month
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{package5000.description}</p>
              </div>

              <div className="py-3 border-y border-slate-100 space-y-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    ${isYearly ? PLAN_PRICING_DETAILS[5000].yearlyEffectiveMonthly : PLAN_PRICING_DETAILS[5000].monthlyPrice}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/ month</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                  {isYearly ? `Billed $${PLAN_PRICING_DETAILS[5000].yearlyAnnualCharge} annually • Save 20%` : 'Billed $50 monthly'}
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Features:</p>
                {package5000.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0e6de4] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex justify-center">
              <Link href={`/checkout?credits=5000&period=${billingPeriod}`} className="w-full">
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-black text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
                >
                  Buy Starter
                </button>
              </Link>
            </div>
          </div>

          {/* CARD 3: GROWTH (MOST POPULAR) */}
          <div className="pricing-plan-card rounded-3xl border-2 border-[#0e6de4] bg-white p-6 flex flex-col justify-between shadow-md relative">
            <div className="absolute -top-3.5 right-4 px-3 py-0.5 rounded-full bg-[#0e6de4] text-white text-[10px] font-black font-mono uppercase shadow-xs">
              MOST POPULAR
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  GROWTH
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">$0.0099 / credit</span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  10,000 Credits/month
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{package10000.description}</p>
              </div>

              <div className="py-3 border-y border-slate-100 space-y-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    ${isYearly ? PLAN_PRICING_DETAILS[10000].yearlyEffectiveMonthly : PLAN_PRICING_DETAILS[10000].monthlyPrice}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/ month</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                  {isYearly ? `Billed $${PLAN_PRICING_DETAILS[10000].yearlyAnnualCharge} annually • Save 20%` : 'Billed $99 monthly'}
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Features:</p>
                {package10000.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0e6de4] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex justify-center">
              <Link href={`/checkout?credits=10000&period=${billingPeriod}`} className="w-full">
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
                >
                  Buy Growth
                </button>
              </Link>
            </div>
          </div>

          {/* CARD 4: AGENCY (AI POWERED) */}
          <div className="pricing-plan-card rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs hover:border-blue-300 transition-all relative">
            <div className="absolute -top-3.5 right-4 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black font-mono uppercase shadow-xs">
              AI POWERED
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  AGENCY
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">$0.00199 / credit</span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  100,000 Credits/month
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{package100000.description}</p>
              </div>

              <div className="py-3 border-y border-slate-100 space-y-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    ${isYearly ? PLAN_PRICING_DETAILS[100000].yearlyEffectiveMonthly : PLAN_PRICING_DETAILS[100000].monthlyPrice}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/ month</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                  {isYearly ? `Billed $${PLAN_PRICING_DETAILS[100000].yearlyAnnualCharge} annually • Save 20%` : 'Billed $199 monthly'}
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Features:</p>
                {package100000.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0e6de4] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex justify-center">
              <Link href={`/checkout?credits=100000&period=${billingPeriod}`} className="w-full">
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-black text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
                >
                  Buy Agency
                </button>
              </Link>
            </div>
          </div>

          {/* CARD 5: ENTERPRISE (BEST VALUE) */}
          <div className="pricing-plan-card rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs hover:border-blue-300 transition-all relative">
            <div className="absolute -top-3.5 right-4 px-3 py-0.5 rounded-full bg-blue-900 text-white text-[10px] font-black font-mono uppercase shadow-xs">
              BEST VALUE
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black font-mono text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  ENTERPRISE
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">$0.00099 / credit</span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  300,000 Credits/month
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{package300000.description}</p>
              </div>

              <div className="py-3 border-y border-slate-100 space-y-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    ${isYearly ? PLAN_PRICING_DETAILS[300000].yearlyEffectiveMonthly : PLAN_PRICING_DETAILS[300000].monthlyPrice}
                  </span>
                  <span className="text-xs font-bold text-slate-500">/ month</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                  {isYearly ? `Billed $${PLAN_PRICING_DETAILS[300000].yearlyAnnualCharge} annually • Save 20%` : 'Billed $299 monthly'}
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Features:</p>
                {package300000.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0e6de4] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex justify-center">
              <Link href={`/checkout?credits=300000&period=${billingPeriod}`} className="w-full">
                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-black text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
                >
                  Buy Enterprise
                </button>
              </Link>
            </div>
          </div>

          {/* Secondary Referral Benefit Note */}
          <div className="mt-8 p-4 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs max-w-4xl mx-auto shadow-2xs font-sans">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white text-[#0e6de4] shadow-2xs shrink-0">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block text-xs">Want extra credits?</span>
                <span className="text-slate-600 text-xs">Refer a new ContactReachout user and earn 100 bonus credits. Your referral receives 50 bonus credits after email verification.</span>
              </div>
            </div>
            <Link href="/referral" className="rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white px-4 py-2 text-xs font-bold shrink-0 transition-colors shadow-2xs flex items-center gap-1">
              Refer & Earn
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Interactive Custom Credit Amount Calculator Slider */}
        <section className="py-12 px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="pricing-calculator rounded-3xl border border-blue-100 bg-white p-8 space-y-6 shadow-xs">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono font-bold text-[#0e6de4] uppercase tracking-wider bg-blue-50 px-3.5 py-1 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-[#0e6de4]" />
                CUSTOM VOLUME CALCULATOR
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                Slide to Set Any Custom Credit Amount
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium">
                Adjust the credit quantity slider up to 300,000 credits to estimate your monthly or annual investment.
              </p>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto pt-2">
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { qty: 5000, label: '5K Starter' },
                  { qty: 10000, label: '10K Growth' },
                  { qty: 100000, label: '100K Agency' },
                  { qty: 300000, label: '300K Enterprise' },
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
                    <label htmlFor="custom-credits-input" className="text-xs text-slate-500 uppercase tracking-wider font-bold">Selected Volume:</label>
                    <p className="text-2xl font-black text-slate-900">{customCredits.toLocaleString()} Credits</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="custom-credits-input"
                      type="number"
                      min="1000"
                      max="300000"
                      step="1000"
                      value={customCredits}
                      onChange={(e) => setCustomCredits(Math.max(1000, Math.min(300000, Number(e.target.value))))}
                      className="w-36 p-2.5 text-center font-bold text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0e6de4]"
                    />
                    <span className="text-xs text-slate-500 font-bold">Qty</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="1000"
                  max="300000"
                  step="1000"
                  value={customCredits}
                  aria-label="Select custom credit volume"
                  onChange={(e) => setCustomCredits(Number(e.target.value))}
                  className="w-full h-3 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-[#0e6de4]"
                />
              </div>

              {/* Action for Calculator */}
              <div className="pt-2 flex justify-center">
                <Link
                  href={`/checkout?credits=${customCredits}&period=${billingPeriod}`}
                  className="w-full"
                >
                  <button
                    type="button"
                    className="w-full py-3.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center text-center uppercase tracking-wider"
                  >
                    Proceed with {customCredits.toLocaleString()} Credits (${isYearly ? `${(customPriceInfo.price * 12).toLocaleString()}/year` : `${customPriceInfo.price}/month`})
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Factual Trust / Social Proof Section */}
        <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center sm:p-10 shadow-xs">
            <p className="text-xs font-black uppercase tracking-widest text-[#0e6de4]">
              Built for Serious Outreach Teams
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
              Accountable Contact-Form Outreach
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
              <div className="rounded-2xl bg-blue-50/50 p-6 border border-blue-100">
                <ShieldCheck className="h-7 w-7 text-[#0e6de4] mx-auto" />
                <h3 className="mt-3 text-base font-black text-slate-900">100% Screenshot Proofs</h3>
                <p className="mt-1 text-xs text-slate-600 font-medium">Every successful contact form submission generates visual proof in your dashboard.</p>
              </div>
              <div className="rounded-2xl bg-blue-50/50 p-6 border border-blue-100">
                <Zap className="h-7 w-7 text-[#0e6de4] mx-auto" />
                <h3 className="mt-3 text-base font-black text-slate-900">Zero-Credit Loss</h3>
                <p className="mt-1 text-xs text-slate-600 font-medium">Credits are deducted strictly on successful form submissions. Unreachable sites cost 0 credits.</p>
              </div>
              <div className="rounded-2xl bg-blue-50/50 p-6 border border-blue-100">
                <HelpCircle className="h-7 w-7 text-[#0e6de4] mx-auto" />
                <h3 className="mt-3 text-base font-black text-slate-900">Dedicated Support</h3>
                <p className="mt-1 text-xs text-slate-600 font-medium">Get direct email assistance for campaign setup, lead imports, and account management.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="px-4 pb-16 pt-4 sm:px-6">
          <div className="mx-auto max-w-7xl rounded-3xl bg-[#0e6de4] p-9 text-center text-white shadow-xl shadow-blue-500/10 sm:p-12">
            <h2 className="text-3xl font-black text-white sm:text-4xl">
              Ready to Reach More Prospects?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-blue-100 font-medium">
              Start building smarter website contact-form outreach campaigns with ContactReachout today.
            </p>
            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-black text-[#0e6de4] shadow-md transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white"
              >
                Start Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <LandingFooter />
    </div>
  );
}
