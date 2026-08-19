'use client';

import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, ShieldCheck, Database, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminSettingsPage() {
  const [appName, setAppName] = useState('BulkReach Outreach AI');
  const [systemContact, setSystemContact] = useState('mithusquare@gmail.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-400" />
          Global System Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          General application parameters, maintenance modes, and administrator contact coordinates.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          System settings saved successfully.
        </div>
      )}

      <Card className="glass-panel p-6 space-y-4 border-white/[0.08]">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Application Title</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Master Root Admin Email</label>
            <input
              type="email"
              disabled
              value={systemContact}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-400 font-mono"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div>
              <p className="text-xs font-semibold text-white">System Maintenance Mode</p>
              <p className="text-[11px] text-slate-400">Temporarily pause new campaign scheduling for platform maintenance.</p>
            </div>
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.08]">
            <Button variant="primary" size="md" type="submit">
              <Save className="h-4 w-4 mr-1.5" />
              Save System Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
