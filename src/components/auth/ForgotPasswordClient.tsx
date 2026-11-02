'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function ForgotPasswordClient() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) { clearInterval(timer); return 0; }
        return current - 1;
      });
    }, 1000);
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to request a reset code.');
      setMessage(data.message);
      setCodeSent(true);
      startCooldown();
    } catch (err: any) {
      setError(err.message || 'Unable to request a reset code.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to reset password.');
      setMessage(data.message);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center">
            <img src={theme === 'light' ? '/brand/logo-full.png' : '/brand/logo-full-dark.png'} alt="ContactReachout logo" width="190" height="42" className="h-10 w-auto max-w-[200px] object-contain" />
          </Link>
          <p className="text-xs text-zinc-400 font-mono">Reset your ContactReachout password</p>
        </div>

        <div className="rounded-3xl border border-blue-900 bg-zinc-950 p-8 shadow-xl shadow-blue-900/60 space-y-6">
          {!codeSent ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-white">Forgot Password?</h2>
                <p className="text-xs text-zinc-400">Enter your account email and we&apos;ll send a 6-digit reset code. Codes expire in 2 minutes.</p>
              </div>
              {error && <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold">{error}</div>}
              {message && <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">{message}</div>}
              <div className="space-y-1">
                <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input type="email" required placeholder="alex@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs text-white focus:border-blue-500 focus:outline-none font-mono" />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full py-3 font-bold text-xs bg-[#0e6de4] hover:bg-[#0758bd] text-white shadow-md cursor-pointer">
                {busy ? 'Sending Code…' : 'Send Reset Code'}
              </Button>
              <p className="text-[11px] text-center text-zinc-400">
                Remember your password?{' '}
                <Link href="/login" className="text-blue-400 font-bold hover:underline">Log in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-white pt-2">Enter Reset Code</h2>
                <p className="text-xs text-zinc-400 font-mono">We sent a 6-digit code to <strong className="text-blue-400">{email}</strong></p>
              </div>
              {error && <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold">{error}</div>}
              {message && <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">{message}</div>}
              <div className="space-y-1">
                <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Reset Code</label>
                <input type="text" maxLength={6} required placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} className="w-full text-center text-2xl font-extrabold tracking-widest py-3 rounded-2xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input type="password" required placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs text-white focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input type="password" required placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs text-white focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full py-3 font-bold text-xs bg-[#0e6de4] hover:bg-[#0758bd] text-white shadow-md cursor-pointer">
                {busy ? 'Updating…' : 'Reset Password'}
              </Button>
              <div className="flex items-center justify-between gap-3 pt-1">
                <button type="button" onClick={() => { setCodeSent(false); setCode(''); setError(null); setMessage(null); }} className="text-xs font-bold text-zinc-400 hover:text-zinc-200 underline cursor-pointer">
                  ← Use a different email
                </button>
                <button type="button" onClick={handleRequestCode} disabled={busy || resendCooldown > 0} className="text-xs font-bold text-blue-400 hover:underline disabled:text-zinc-500 disabled:no-underline cursor-pointer">
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                </button>
              </div>
              <p className="text-[11px] text-center text-zinc-400">
                Password updated?{' '}
                <Link href="/login" className="text-blue-400 font-bold hover:underline">Log in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
