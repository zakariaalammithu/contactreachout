'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Coins,
  Save,
  Check,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Sliders,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PricingService, SystemPricingConfig } from '@/lib/services/pricing-service';

export default function AdminPricingPage() {
  const [config, setConfig] = useState<SystemPricingConfig>(() => PricingService.getPricingConfig());
  const [saveToast, setSaveToast] = useState(false);

  const handleSavePricing = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_pricing_config_overrides', JSON.stringify(config));
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset to system default pricing ($20 / 1,000 credits, $80 / 5,000 credits, $140 / 10,000 credits)?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user_pricing_config_overrides');
      }
      setConfig(PricingService.getPricingConfig());
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    }
  };

  const freePlan = config?.freePlan || PricingService.getPricingConfig().freePlan;
  const paidPackage = config?.paidPackage || PricingService.getPricingConfig().paidPackage;
  const package5000 = config?.package5000 || PricingService.getPricingConfig().package5000;
  const package10000 = config?.package10000 || PricingService.getPricingConfig().package10000;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <span>Super Admin Pricing & Package Governance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Single source of truth pricing configuration. Controls public pricing page, checkout, and credit grants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults} className="text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={handleSavePricing} className="font-bold bg-[#2563EB]">
            <Save className="h-3.5 w-3.5 mr-1" />
            Save Pricing Specs
          </Button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Pricing configuration saved successfully! Synchronized across all application pages.</span>
        </div>
      )}

      {/* Free Plan Spec */}
      <Card className="p-6 space-y-4 border-slate-200">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>FREE PLAN (100 Monthly Credits)</span>
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

      {/* 1,000 Credits Package ($20) */}
      <Card className="p-6 space-y-4 border-blue-200 bg-blue-50/20">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-blue-100 pb-3">
          <Coins className="h-4 w-4 text-blue-600" />
          <span>1,000 CREDITS PACKAGE ($20 USD)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Name</label>
            <input
              type="text"
              value={paidPackage.name}
              onChange={(e) => setConfig({ ...config, paidPackage: { ...paidPackage, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Credits</label>
            <input
              type="number"
              value={paidPackage.credits}
              onChange={(e) => setConfig({ ...config, paidPackage: { ...paidPackage, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Price ($ USD)</label>
            <input
              type="number"
              value={paidPackage.price}
              onChange={(e) => setConfig({ ...config, paidPackage: { ...paidPackage, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-blue-700 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* 5,000 Credits Package ($80) */}
      <Card className="p-6 space-y-4 border-indigo-200 bg-indigo-50/20">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-indigo-100 pb-3">
          <Coins className="h-4 w-4 text-indigo-600" />
          <span>5,000 CREDITS PACKAGE ($80 USD)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Name</label>
            <input
              type="text"
              value={package5000.name}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Credits</label>
            <input
              type="number"
              value={package5000.credits}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Price ($ USD)</label>
            <input
              type="number"
              value={package5000.price}
              onChange={(e) => setConfig({ ...config, package5000: { ...package5000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* 10,000 Credits Package ($140) */}
      <Card className="p-6 space-y-4 border-purple-200 bg-purple-50/20">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-purple-100 pb-3">
          <Crown className="h-4 w-4 text-purple-600" />
          <span>10,000 CREDITS PACKAGE ($140 USD - AGENCY SCALE)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Name</label>
            <input
              type="text"
              value={package10000.name}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, name: e.target.value } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Credits</label>
            <input
              type="number"
              value={package10000.credits}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, credits: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">Package Price ($ USD)</label>
            <input
              type="number"
              value={package10000.price}
              onChange={(e) => setConfig({ ...config, package10000: { ...package10000, price: Number(e.target.value) } })}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-purple-700 focus:outline-none"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
