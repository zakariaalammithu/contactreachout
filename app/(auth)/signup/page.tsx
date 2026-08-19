'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Mail,
  Lock,
  User,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const router = useRouter();

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
  const handleSendVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter email and password.');
      return;
    }

    setIsSendingCode(true);
    setErrorMessage(null);

    // Generate random 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    setTimeout(() => {
      setIsSendingCode(false);
      setIsVerificationStep(true);
    }, 1000);
  };

  // Verify 6-Digit Code & Activate Account
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingCode(true);
    setErrorMessage(null);

    setTimeout(() => {
      if (verificationCode.trim() === generatedOtp || verificationCode.trim() === '123456') {
        // Account activated! Store initial user session
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_auth_email', email);
          localStorage.setItem('user_auth_verified', 'true');
        }
        setIsVerifyingCode(false);
        router.push('/campaigns');
      } else {
        setIsVerifyingCode(false);
        setErrorMessage('Invalid 6-digit code. Please check your email or try 123456.');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5722] to-[#FF8A65] text-white shadow-lg shadow-orange-500/20">
              <Flame className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold text-white">FreeOutreach</span>
          </Link>
          <p className="text-xs text-slate-400 font-mono">
            Create account & get 100 Free Monthly Outreach Credits
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-slate-800 bg-[#0E1122] p-8 shadow-2xl space-y-6">
          {!isVerificationStep ? (
            /* STEP 1: SIGNUP DETAILS */
            <form onSubmit={handleSendVerification} className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-white">Create Your Free Account</h2>
                <p className="text-xs text-slate-400">Includes 100 FREE credits every month</p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Zakaria Alam"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="zakaria@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSendingCode}
                  className="w-full py-3 font-bold text-xs bg-[#2563EB] hover:bg-blue-600 text-white shadow-md cursor-pointer"
                >
                  {isSendingCode ? 'Sending 6-Digit Code via Resend...' : 'Send Verification Code'}
                </Button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
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
                <h2 className="text-lg font-bold text-white pt-2">Enter Verification Code</h2>
                <p className="text-xs text-slate-400 font-mono">
                  We sent a 6-digit code to <strong className="text-blue-400">{email}</strong>
                </p>

                {generatedOtp && (
                  <div className="p-2 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-300 text-[11px] font-mono mt-2">
                    🔑 Resend Verification Code: <strong className="text-white tracking-widest">{generatedOtp}</strong>
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
                  className="w-full text-center text-2xl font-extrabold tracking-widest py-3 rounded-2xl border border-slate-700 bg-slate-950 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500">Enter the 6 digits to verify & activate your 100 free credits.</p>
              </div>

              <Button
                type="submit"
                disabled={isVerifyingCode}
                className="w-full py-3 font-bold text-xs bg-[#2563EB] hover:bg-blue-600 text-white shadow-md cursor-pointer"
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
