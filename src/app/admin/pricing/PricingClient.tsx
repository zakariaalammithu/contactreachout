'use client';

import React, { useState } from 'react';
import { DollarSign, Coins, Save, Check, Sparkles, RotateCcw, Crown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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

  const [saveToast, setSaveToast] = useState(false);

  const handleSavePricing = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_pricing_config_overrides', JSON.stringify(config));
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset to system default pricing ($0 Free, $50 Starter, $99 Growth, $199 Agency, $299 Enterprise)?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_pricing_config_overrides');
      }
      setConfig(DEFAULT_PRICING_CONFIG);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <DollarSign className="h-5 w-5" />
            </div>
            <span>Super Admin Pricing & Entitlement Governance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Single source of truth pricing configuration across Free, Starter, Growth, Agency, and Enterprise tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults} className="text-xs font-bold">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={handleSavePricing} className="font-bold bg-[#0e6de4] hover:bg-[#0758bd]">
            <Save className="h-3.5 w-3.5 mr-1" />
            Save Pricing Specs
          </Button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Pricing configuration saved successfully! Synchronized across all application modules.</span>
        </div>
      )}

      {/* Free Plan Spec */}
      <Card className="p-6 space-y-4 border-slate-200">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
          <Sparkles className="h-4 w-4 text-[#0e6de4]" />
          <span>FREE PLAN</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={freePlan.name}
              onChange={(e) => setConfig({ ...config, freePlan: { ...freePlan, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Monthly Free Credits</label>
            <input
              type="number"
              value={freePlan.credits}
              onChange={(e) => setConfig({ ...config, freePlan: { ...freePlan, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($)</label>
            <input
              type="number"
              disabled
              value={0}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono font-bold"
            />
          </div>
        </div>
      </Card>

      {/* Starter Plan Spec ($50) */}
      <Card className="p-6 space-y-4 border-blue-200 bg-blue-50/20">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900 border-b border-blue-100 pb-3">
          <Coins className="h-4 w-4 text-[#0e6de4]" />
          <span>STARTER PLAN (5,000 CREDITS — $50/mo)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={package5000.name}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Monthly Credits</label>
            <input
              type="number"
              value={package5000.credits}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($ USD)</label>
            <input
              type="number"
              value={package5000.price}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-[#0e6de4] focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Growth Plan Spec ($99) */}
      <Card className="p-6 space-y-4 border-blue-200 bg-blue-50/20">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900 border-b border-blue-100 pb-3">
          <Crown className="h-4 w-4 text-[#0e6de4]" />
          <span>GROWTH PLAN (10,000 CREDITS — $99/mo) — MOST POPULAR</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={package10000.name}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Monthly Credits</label>
            <input
              type="number"
              value={package10000.credits}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($ USD)</label>
            <input
              type="number"
              value={package10000.price}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-[#0e6de4] focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Agency Plan Spec ($199) */}
      <Card className="p-6 space-y-4 border-slate-300 bg-slate-900 text-white">
        <div className="flex items-center gap-2 text-sm font-black text-white border-b border-slate-800 pb-3">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          <span>AGENCY PLAN (100,000 CREDITS — $199/mo) — AI POWERED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={package100000.name}
              onChange={(e) => setConfig({ ...config, package100000: { ...package100000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">Monthly Credits</label>
            <input
              type="number"
              value={package100000.credits}
              onChange={(e) => setConfig({ ...config, package100000: { ...package100000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($ USD)</label>
            <input
              type="number"
              value={package100000.price}
              onChange={(e) => setConfig({ ...config, package100000: { ...package100000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-blue-400 font-mono font-bold focus:outline-none"
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
            <label className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">Plan Name</label>
            <input
              type="text"
              value={package300000.name}
              onChange={(e) => setConfig({ ...config, package300000: { ...package300000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-blue-900 bg-blue-900/60 text-white font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">Monthly Credits</label>
            <input
              type="number"
              value={package300000.credits}
              onChange={(e) => setConfig({ ...config, package300000: { ...package300000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-blue-900 bg-blue-900/60 text-white font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">Monthly Price ($ USD)</label>
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
