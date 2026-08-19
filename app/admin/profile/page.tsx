'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Shield,
  KeyRound,
  Save,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }

    setIsSavingPass(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPassSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPassSuccess(null), 3500);
      } else {
        alert(data.error || 'Failed to update password.');
      }
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!confirm('Terminate all other active sessions? You will stay logged into this browser.')) return;
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout_all_sessions' }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionMsg('All other sessions terminated.');
        setTimeout(() => setSessionMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-indigo-400" />
          Super Admin Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Manage root administrator credentials, active session tokens, and authentication settings.
        </p>
      </div>

      {passSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {passSuccess}
        </div>
      )}

      {sessionMsg && (
        <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs font-semibold text-indigo-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {sessionMsg}
        </div>
      )}

      {/* Account Info Card */}
      <Card className="glass-panel p-6 space-y-4 border-white/[0.08]">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-xl font-extrabold text-white shadow-lg shadow-indigo-500/30">
            MA
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Mithu Alam (Root Super Admin)</h3>
            <p className="text-xs text-slate-400 font-mono">mithusquare@gmail.com</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30">
                ROLE: SUPER_ADMIN
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                STATUS: ROOT ACTIVE
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password Card */}
      <Card className="glass-panel p-6 space-y-4 border-white/[0.08]">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <KeyRound className="h-4 w-4 text-purple-400" />
          Update Master Password
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">New Master Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters with numbers & symbols"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.08]">
            <Button variant="primary" size="md" type="submit" isLoading={isSavingPass}>
              <Save className="h-4 w-4 mr-1.5" />
              Update Master Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Session Management */}
      <Card className="glass-panel p-6 space-y-3 border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Active Sessions & Token Revocation</h3>
            <p className="text-xs text-slate-400 mt-0.5">Revoke all active browser tokens if suspicious activity is suspected.</p>
          </div>

          <Button variant="destructive" size="sm" onClick={handleRevokeSessions}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Revoke All Other Sessions
          </Button>
        </div>
      </Card>
    </div>
  );
}
