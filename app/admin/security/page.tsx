'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Save,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminSecurityPage() {
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [rateLimit, setRateLimit] = useState(10);
  const [lockoutThreshold, setLockoutThreshold] = useState(5);
  const [lockoutDuration, setLockoutDuration] = useState(15);
  const [twoFactorReady, setTwoFactorReady] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/security')
      .then((res) => res.json())
      .then((data) => {
        if (data.sessionTimeoutMinutes) setSessionTimeout(data.sessionTimeoutMinutes);
        if (data.loginRateLimitPerMinute) setRateLimit(data.loginRateLimitPerMinute);
        if (data.failedLoginLockoutThreshold) setLockoutThreshold(data.failedLoginLockoutThreshold);
        if (data.lockoutDurationMinutes) setLockoutDuration(data.lockoutDurationMinutes);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionTimeoutMinutes: sessionTimeout,
          loginRateLimitPerMinute: rateLimit,
          failedLoginLockoutThreshold: lockoutThreshold,
          lockoutDurationMinutes: lockoutDuration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-400" />
          Security Policies & Brute-Force Shield
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Configure authentication timeouts, failed attempt lockouts, IP rate limits, and origin whitelists.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          Security policies updated and active across all authentication gates.
        </div>
      )}

      <Card className="glass-panel p-6 space-y-6 border-white/[0.08]">
        <h3 className="font-bold text-white text-sm border-b border-white/[0.08] pb-3">
          Authentication & Session Governance
        </h3>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Session Idle Timeout (Minutes)
              </label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500">Auto-expires inactive admin sessions.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                Login Rate Limit (Reqs / Minute / IP)
              </label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500">Shields against credential stuffing.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Ban className="h-3.5 w-3.5 text-rose-400" />
                Failed Attempts Before Lockout
              </label>
              <input
                type="number"
                value={lockoutThreshold}
                onChange={(e) => setLockoutThreshold(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500">Default: 5 consecutive failures.</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-rose-400" />
                Lockout Duration (Minutes)
              </label>
              <input
                type="number"
                value={lockoutDuration}
                onChange={(e) => setLockoutDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white font-mono"
              />
              <p className="text-[11px] text-slate-500">Cool-down before next attempt allowed.</p>
            </div>
          </div>

          {/* Active Security Headers Banner */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs text-indigo-300 space-y-2">
            <p className="font-bold text-indigo-200">Active HTTP Security Headers (OWASP Compliant)</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
              <div>✓ Content-Security-Policy</div>
              <div>✓ X-Content-Type-Options: nosniff</div>
              <div>✓ X-Frame-Options: DENY</div>
              <div>✓ Strict-Transport-Security: HSTS</div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.08]">
            <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Security Policies
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
