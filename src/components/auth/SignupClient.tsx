'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams?.get('ref')?.trim().toUpperCase() || '';

  // Signup Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 6-Digit Code Verification State
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Send 6-Digit Verification Code via Resend
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter email and password.');
      return;
    }

    setIsSendingCode(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, email, password, confirmPassword: password, referralCode: referralCode || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create account.');
      setGeneratedOtp(data.debugCode || '');
      setIsSendingCode(false);
      setIsVerificationStep(true);
    } catch (error: any) {
      setIsSendingCode(false);
      setErrorMessage(error.message || 'Unable to create account.');
    }
  };

  // Verify 6-Digit Code & Activate Account
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingCode(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid verification code.');
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_auth_email', email);
          localStorage.setItem('user_auth_verified', 'true');
          if (data.bonusCredits > 0) {
            CreditWalletService.addBonusCredits(data.bonusCredits, 'Verified referral signup', data.user?.id);
          }
        }
        setIsVerifyingCode(false);
        router.push(data.redirectTo || '/dashboard');
    } catch (error: any) {
      setIsVerifyingCode(false);
      setErrorMessage(error.message || 'Invalid verification code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9ff] text-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img src="/logo-128.png" alt="ContactReachout logo" width="40" height="40" className="h-10 w-10 object-contain" />
            <span className="text-xl font-extrabold text-slate-950">ContactReachout</span>
          </Link>
          <p className="text-xs text-slate-500 font-mono">
            Create your ContactReachout account
          </p>
          {referralCode && <p className="text-xs font-bold text-blue-600">Referral {referralCode} applied · earn 50 extra one-time credits</p>}
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/60 space-y-6">
          {!isVerificationStep ? (
            /* STEP 1: SIGNUP DETAILS */
            <form onSubmit={handleSendVerification} className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-slate-950">Create Your Free Account</h2>
                <p className="text-xs text-slate-500">No credit card required</p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold uppercase tracking-wider text-[10px]">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-950 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold uppercase tracking-wider text-[10px]">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-950 focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold uppercase tracking-wider text-[10px]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-950 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSendingCode}
                  className="w-full py-3 font-bold text-xs bg-[#0e6de4] hover:bg-[#0758bd] text-white shadow-md cursor-pointer"
                >
                  {isSendingCode ? 'Sending 6-Digit Code via Resend...' : 'Send Verification Code'}
                </Button>
              </div>

              <p className="text-[11px] text-center text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-400 font-bold hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          ) : (
            /* STEP 2: 6-DIGIT EMAIL CODE VERIFICATION */
            <form onSubmit={handleVerifyCode} className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center space-y-1">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-950 pt-2">Enter Verification Code</h2>
                <p className="text-xs text-slate-500 font-mono">
                  We sent a 6-digit code to <strong className="text-blue-400">{email}</strong>
                </p>

                {generatedOtp && (
                  <div className="p-2 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-300 text-[11px] font-mono mt-2">
                    Development verification code: <strong className="text-white tracking-widest">{generatedOtp}</strong>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2 text-center">
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full text-center text-2xl font-extrabold tracking-widest py-3 rounded-2xl border border-slate-300 bg-white text-slate-950 font-mono focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500">Enter the 6 digits to verify and activate your account.</p>
              </div>

              <Button
                type="submit"
                disabled={isVerifyingCode}
                className="w-full py-3 font-bold text-xs bg-[#0e6de4] hover:bg-[#0758bd] text-white shadow-md cursor-pointer"
              >
                {isVerifyingCode ? 'Verifying Code...' : 'Verify Code & Activate Account'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
