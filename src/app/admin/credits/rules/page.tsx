'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Check,
  Save,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PricingService, SystemPricingConfig, CreditRule } from '@/lib/services/pricing-service';

export default function AdminCreditRulesPage() {
  const [config, setConfig] = useState<SystemPricingConfig>(() => PricingService.getPricingConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRules() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/credits/rules');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.creditRules) {
            setConfig((prev) => ({
              ...prev,
              creditRules: data.creditRules,
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching credit rules from server:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRules();
  }, []);

  const handleSaveRules = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(null);
      setSaveError(null);

      // Validate inputs client-side first
      for (const [key, rule] of Object.entries(config.creditRules)) {
        if (typeof rule.creditCost !== 'number' || isNaN(rule.creditCost) || rule.creditCost < 0) {
          setSaveError(`Invalid credit cost for "${key}": Must be a non-negative number.`);
          setIsSaving(false);
          return;
        }
      }

      const res = await fetch('/api/admin/credits/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: config.creditRules }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save credit rules.');
      }

      if (data.creditRules) {
        setConfig((prev) => ({ ...prev, creditRules: data.creditRules }));
      }

      setSaveSuccess(data.message || 'Credit rules updated successfully!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save credit rules.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <Sliders className="h-5 w-5" />
            </div>
            <span>Credit Deduction Rules & Outcome Costs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Configure exact credit costs per submission outcome. Changes apply strictly to future transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveRules}
            disabled={isSaving || isLoading}
            className="font-bold bg-[#0e6de4] hover:bg-[#0c5bc2] text-white disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Credit Rules
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success Feedback Banner */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Error Feedback Banner */}
      {saveError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Canonical Rule Summary Box */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-slate-700 text-xs space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <ShieldCheck className="h-4 w-4 text-[#0e6de4]" />
          <span>Canonical Credit Deduction Policy</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-600 font-mono text-[11px] leading-relaxed">
          <li>
            <strong className="text-slate-900">SUCCESSFUL_SUBMISSION:</strong> 1 successfully submitted contact-form message = 1 credit deduction.
          </li>
          <li>
            <strong className="text-slate-900">Zero-Cost Outcomes:</strong> Unreachable, captcha, bot protection, validation failure, timeout, or failed form attempts deduct 0 credits.
          </li>
          <li>
            <strong className="text-slate-900">AI Personalization:</strong> Uses 0 credits on paid plans. Free plan accounts are gated by plan limits.
          </li>
          <li>
            <strong className="text-slate-900">Future-Only Scope:</strong> Saved rules take effect immediately for future outreach without altering historical ledger entries.
          </li>
        </ul>
      </div>

      {/* Rules Table Card */}
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
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[#0e6de4]" />
                    <span>Loading canonical credit rules...</span>
                  </td>
                </tr>
              ) : (
                Object.entries(config.creditRules).map(([key, rule]) => (
                  <tr key={key} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-slate-900">
                      <span className={key === 'SUCCESSFUL_SUBMISSION' ? 'text-[#0e6de4] font-black' : ''}>
                        {key}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold font-mono">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        disabled={isSaving}
                        value={rule.creditCost}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const cost = isNaN(val) ? 0 : Math.max(0, val);
                          setConfig((prev) => ({
                            ...prev,
                            creditRules: {
                              ...prev.creditRules,
                              [key]: { ...rule, creditCost: cost },
                            },
                          }));
                        }}
                        className="w-20 p-1.5 rounded-lg border border-slate-300 text-center font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e6de4]/30 focus:border-[#0e6de4] disabled:bg-slate-100"
                      />
                    </td>
                    <td className="p-3.5 text-slate-500">{rule.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
