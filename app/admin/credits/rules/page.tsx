'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Check,
  Save,
  RotateCcw,
  ShieldCheck,
  HelpCircle,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PricingService, SystemPricingConfig } from '@/lib/services/pricing-service';

export default function AdminCreditRulesPage() {
  const [config, setConfig] = useState<SystemPricingConfig>(() => PricingService.getPricingConfig());
  const [saveToast, setSaveToast] = useState(false);

  const handleSaveRules = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_pricing_config_overrides', JSON.stringify(config));
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Sliders className="h-5 w-5" />
            </div>
            <span>Credit Deduction Rules & Outcome Costs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Configure exact credit costs per submission outcome. Changes apply strictly to future transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleSaveRules} className="font-bold bg-[#2563EB]">
            <Save className="h-3.5 w-3.5 mr-1" />
            Save Credit Rules
          </Button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Credit rules updated successfully!</span>
        </div>
      )}

      {/* Rules Table */}
      <Card className="p-6 space-y-4 border-slate-200">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase">
              <tr>
                <th className="p-3.5">Submission Outcome Result</th>
                <th className="p-3.5 text-center">Credit Cost</th>
                <th className="p-3.5">Rule Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {Object.entries(config.creditRules).map(([key, rule]) => (
                <tr key={key} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold font-mono text-slate-900">{key}</td>
                  <td className="p-3.5 text-center font-bold font-mono">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={rule.creditCost}
                      onChange={(e) => {
                        const cost = parseFloat(e.target.value) || 0;
                        setConfig({
                          ...config,
                          creditRules: {
                            ...config.creditRules,
                            [key]: { ...rule, creditCost: cost },
                          },
                        });
                      }}
                      className="w-20 p-1.5 rounded-lg border border-slate-300 text-center font-bold font-mono focus:outline-none"
                    />
                  </td>
                  <td className="p-3.5 text-slate-500">{rule.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
