'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, Shield, RefreshCw } from 'lucide-react';

export default function AdminSettingsPage() {
  const [appName, setAppName] = useState('ContactReachout');
  const [systemContact, setSystemContact] = useState('mithusquare@gmail.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [userRole, setUserRole] = useState<string>('ADMIN');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setAppName(data.settings.appName || 'ContactReachout');
          setSystemContact(data.settings.masterRootAdminEmail || 'mithusquare@gmail.com');
          setMaintenanceMode(Boolean(data.settings.maintenanceMode));
        }
        if (data.userRole) {
          setUserRole(data.userRole);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(errJson.error || 'Failed to fetch settings from server.');
      }
    } catch {
      setErrorMessage('Network error while connecting to system settings API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setErrorMessage(null);

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: appName.trim(),
          masterRootAdminEmail: systemContact.trim(),
          maintenanceMode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.settings) {
        setAppName(data.settings.appName);
        setSystemContact(data.settings.masterRootAdminEmail);
        setMaintenanceMode(data.settings.maintenanceMode);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(data.error || 'Failed to save system settings.');
      }
    } catch {
      setErrorMessage('Network error while saving system settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#111827] flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-[#0e6de4]" />
            Global System Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            General application parameters, maintenance mode state, and administrator contact coordinates.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Reload Settings
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>System settings saved successfully and persisted across sessions.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-800 flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Application Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-[#111827] block">
              Application Title
            </label>
            <input
              type="text"
              required
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="ContactReachout"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-[#111827] font-semibold focus:border-[#0e6de4] focus:ring-2 focus:ring-blue-100 focus:outline-none shadow-2xs transition"
            />
            <p className="text-[11px] text-slate-500 font-medium">
              Official enterprise system name displayed in email headers and admin consoles.
            </p>
          </div>

          {/* Master Root Admin Email */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#111827] block">
                Master Root Admin Email
              </label>
              {!isSuperAdmin && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Super Admin Only
                </span>
              )}
            </div>
            <input
              type="email"
              required
              disabled={!isSuperAdmin}
              value={systemContact}
              onChange={(e) => setSystemContact(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono font-bold shadow-2xs transition ${
                isSuperAdmin
                  ? 'border-slate-300 bg-white text-[#111827] focus:border-[#0e6de4] focus:ring-2 focus:ring-blue-100 focus:outline-none'
                  : 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
              }`}
            />
            <p className="text-[11px] text-slate-500 font-medium">
              Sensitive system notification recipient. Modification requires Super Admin privileges.
            </p>
          </div>

          {/* System Maintenance Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition">
            <div className="space-y-0.5 pr-4">
              <p className="text-xs font-extrabold text-[#111827]">System Maintenance Mode</p>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Temporarily pause new campaign dispatches and outreach tasks for platform maintenance.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e6de4]" />
            </label>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e6de4] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0758bd] disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save System Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
