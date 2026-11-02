'use client';

import React, { useState } from 'react';
import { DollarSign, Coins, Sparkles, Crown, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PricingService, SystemPricingConfig, DEFAULT_PRICING_CONFIG, PricingPlan } from '@/lib/services/pricing-service';

export default function PricingClient() {
  const [config, setConfig] = useState<SystemPricingConfig>(() => {
    try {
      const cfg = PricingService.getPricingConfig();
      if (!cfg || typeof cfg !== 'object') return DEFAULT_PRICING_CONFIG;
      return {
        ...DEFAULT_PRICING_CONFIG,
        ...cfg,
        freePlan: { ...DEFAULT_PRICING_CONFIG.freePlan, ...(cfg.freePlan || {}) },
        package5000: { ...DEFAULT_PRICING_CONFIG.package5000, ...(cfg.package5000 || {}) },
        package10000: { ...DEFAULT_PRICING_CONFIG.package10000, ...(cfg.package10000 || {}) },
        package100000: { ...DEFAULT_PRICING_CONFIG.package100000, ...(cfg.package100000 || {}) },
        package300000: { ...DEFAULT_PRICING_CONFIG.package300000, ...(cfg.package300000 || {}) },
      };
    } catch {
      return DEFAULT_PRICING_CONFIG;
    }
  });


  const freePlan: PricingPlan = {
    ...DEFAULT_PRICING_CONFIG.freePlan,
    ...(config?.freePlan || {}),
  };

  const package5000: PricingPlan = {
    ...DEFAULT_PRICING_CONFIG.package5000,
    ...(config?.package5000 || {}),
  };

  const package10000: PricingPlan = {
    ...DEFAULT_PRICING_CONFIG.package10000,
    ...(config?.package10000 || {}),
  };

  const package100000: PricingPlan = {
    ...DEFAULT_PRICING_CONFIG.package100000,
    ...(config?.package100000 || {}),
  };

  const package300000: PricingPlan = {
    ...DEFAULT_PRICING_CONFIG.package300000,
    ...(config?.package300000 || {}),
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <span>Super Admin Pricing & Entitlement Governance</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Single source of truth pricing configuration across Free, Starter, Growth, Agency, and Enterprise tiers.
          </p>
        </div>

        <p className="max-w-md text-[11px] leading-relaxed text-zinc-400">
          Read-only: these specs are the system pricing defaults. Edits here previously saved only to this browser and never reached checkout, so the save controls were removed rather than pretend to sync.
        </p>
      </div>


      {/* Free Plan Spec */}
      <Card className="p-6 space-y-4 border-zinc-800">
        <div className="flex items-center gap-2 text-sm font-black text-zinc-100 border-b border-zinc-800 pb-3">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span>FREE PLAN</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={freePlan.name}
              onChange={(e) => setConfig({ ...config, freePlan: { ...freePlan, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Monthly Free Credits</label>
            <input
              type="number"
              value={freePlan.credits}
              onChange={(e) => setConfig({ ...config, freePlan: { ...freePlan, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($)</label>
            <input
              type="number"
              disabled
              value={0}
              className="w-full p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 font-mono font-bold"
            />
          </div>
        </div>
      </Card>

      {/* Starter Plan Spec ($50) */}
      <Card className="p-6 space-y-4 border-blue-900 bg-blue-950/20">
        <div className="flex items-center gap-2 text-sm font-black text-zinc-100 border-b border-blue-900 pb-3">
          <Coins className="h-4 w-4 text-blue-400" />
          <span>STARTER PLAN (5,000 CREDITS — $50/mo)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={package5000.name}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Monthly Credits</label>
            <input
              type="number"
              value={package5000.credits}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($ USD)</label>
            <input
              type="number"
              value={package5000.price}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 font-mono font-bold text-blue-400 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Growth Plan Spec ($99) */}
      <Card className="p-6 space-y-4 border-blue-900 bg-blue-950/20">
        <div className="flex items-center gap-2 text-sm font-black text-zinc-100 border-b border-blue-900 pb-3">
          <Crown className="h-4 w-4 text-blue-400" />
          <span>GROWTH PLAN (10,000 CREDITS — $99/mo) — MOST POPULAR</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={package10000.name}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Monthly Credits</label>
            <input
              type="number"
              value={package10000.credits}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-300 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($ USD)</label>
            <input
              type="number"
              value={package10000.price}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 font-mono font-bold text-blue-400 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Agency Plan Spec ($199) */}
      <Card className="p-6 space-y-4 border-zinc-700 bg-zinc-950 text-white">
        <div className="flex items-center gap-2 text-sm font-black text-white border-b border-zinc-700 pb-3">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          <span>AGENCY PLAN (100,000 CREDITS — $199/mo) — AI POWERED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={package100000.name}
              onChange={(e) => setConfig({ ...config, package100000: { ...package100000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Monthly Credits</label>
            <input
              type="number"
              value={package100000.credits}
              onChange={(e) => setConfig({ ...config, package100000: { ...package100000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($ USD)</label>
            <input
              type="number"
              value={package100000.price}
              onChange={(e) => setConfig({ ...config, package100000: { ...package100000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-blue-400 font-mono font-bold focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Enterprise Plan Spec ($299) */}
      <Card className="p-6 space-y-4 border-blue-900 bg-blue-950 text-white">
        <div className="flex items-center gap-2 text-sm font-black text-white border-b border-blue-900 pb-3">
          <Crown className="h-4 w-4 text-blue-300" />
          <span>ENTERPRISE PLAN (300,000 CREDITS — $299/mo) — BEST VALUE</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={package300000.name}
              onChange={(e) => setConfig({ ...config, package300000: { ...package300000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-blue-900 bg-blue-900/60 text-white font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Monthly Credits</label>
            <input
              type="number"
              value={package300000.credits}
              onChange={(e) => setConfig({ ...config, package300000: { ...package300000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-blue-900 bg-blue-900/60 text-white font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($ USD)</label>
            <input
              type="number"
              value={package300000.price}
              onChange={(e) => setConfig({ ...config, package300000: { ...package300000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-blue-900 bg-blue-900/60 text-blue-300 font-mono font-bold focus:outline-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
