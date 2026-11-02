'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ResetPasswordClient() {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('Reset link is missing. Ask an admin to issue a new reset link.');
      return;
    }
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/consume-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reset password.');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans">
      <Card className="w-full max-w-md space-y-5 border-zinc-800 bg-zinc-950 p-6 shadow-xs">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-zinc-100">
            <KeyRound className="h-6 w-6 text-blue-400" />
            Reset Password
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Set a new password using the reset link issued by an admin. Links work once and expire after 1 hour.
          </p>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-emerald-900 bg-emerald-950 p-3 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Password updated successfully. Please sign in with your new password.</span>
            </div>
            <Link href="/login" className="block">
              <Button variant="primary" size="md" className="w-full font-bold bg-[#0e6de4] hover:bg-[#0c5bc2] text-white">
                Go to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {token === null ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950 p-3 text-xs font-bold text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>Reset link is missing. Ask an admin to issue a new reset link.</span>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 focus:outline-none"
                  />
                </div>
              </>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950 p-3 text-xs font-bold text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={busy || token === null}
              className="w-full font-bold bg-[#0e6de4] hover:bg-[#0c5bc2] text-white disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Set New Password'
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
