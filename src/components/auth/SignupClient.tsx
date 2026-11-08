'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, KeyRound, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';
import { COUNTRY_DIAL_CODES, normalizePhoneNumber } from '@/lib/services/phone-normalization';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function SignupClient() {
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams?.get('ref')?.trim().toUpperCase() || '';

  // Signup Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Sender identity, collected at signup so every campaign after this
  // one already has its default contact details (name, reply email,
  // phone, WhatsApp). Country defaults to the United States (+1), the
  // same default the profile phone fields use.
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('1');
  const [whatsApp, setWhatsApp] = useState('');
  const [whatsAppCountry, setWhatsAppCountry] = useState('1');

  // 6-Digit Code Verification State
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignup = () => {
    // Use the same OAuth entry point as Login; the callback creates/finds the
    // account and establishes the normal server session.
    window.location.href = '/api/auth/google/redirect';
  };

  // Send 6-Digit Verification Code via Resend
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    // Normalize both numbers to E.164 before sending; the server
    // re-validates, but a bad number should stop here with a clear
    // message instead of a failed signup.
    const cleanPhone = normalizePhoneNumber(phone, phoneCountry);
    if (!cleanPhone) {
      setErrorMessage('Enter a valid phone number.');
      return;
    }
    const cleanWhatsApp = normalizePhoneNumber(whatsApp, whatsAppCountry);
    if (!cleanWhatsApp) {
      setErrorMessage('Enter a valid WhatsApp number.');
      return;
    }

    setIsSendingCode(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, email, phone: cleanPhone, whatsApp: cleanWhatsApp, password, confirmPassword: password, referralCode: referralCode || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create account.');
      setIsSendingCode(false);
      setIsVerificationStep(true);
    } catch (error: any) {
      setIsSendingCode(false);
      setErrorMessage(error.message || 'Unable to create account.');
    }
  };

  // Resend the 6-digit code (server enforces its own cooldown; the
  // client adds a 60s button cooldown so users cannot spam requests).
  const handleResendCode = async () => {
    if (isResendingCode || resendCooldown > 0) return;
    setIsResendingCode(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'signup' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to resend verification code.');
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((current) => {
          if (current <= 1) { clearInterval(timer); return 0; }
          return current - 1;
        });
      }, 1000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to resend verification code.');
    } finally {
      setIsResendingCode(false);
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
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center">
            <img src={theme === 'light' ? '/brand/logo-full.png' : '/brand/logo-full-dark.png'} alt="ContactReachout logo" width="190" height="42" className="h-10 w-auto max-w-[200px] object-contain" />
          </Link>
          <p className="text-xs text-zinc-400 font-mono">
            Create your ContactReachout account
          </p>
        </div>

        {/* Referral Indicator Card */}
        {referralCode && (
          <div className="rounded-2xl bg-blue-950 border border-blue-900 p-4 text-left text-xs text-blue-200 space-y-1 shadow-2xs animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5 font-extrabold text-blue-400">
              <span>🎁 Referral Bonus</span>
            </div>
            <p className="font-extrabold text-zinc-100 font-sans">You're joining through a ContactReachout referral.</p>
            <p className="text-[11px] text-blue-300 font-mono">Complete email verification and receive 50 bonus credits.</p>
          </div>
        )}

        {/* Auth Card */}
        <div className="rounded-3xl border border-blue-900 bg-zinc-950 p-8 shadow-xl shadow-blue-900/60 space-y-6">
          {!isVerificationStep ? (
            /* STEP 1: SIGNUP DETAILS */
            <>
            <button type="button" onClick={handleGoogleSignup} className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 py-3 text-xs font-bold text-zinc-300 shadow-sm transition hover:bg-zinc-900">
              <GoogleIcon className="h-4 w-4 shrink-0" />
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-[10px] text-zinc-400"><span className="h-px flex-1 bg-zinc-800" /><span>OR</span><span className="h-px flex-1 bg-zinc-800" /></div>
            <form onSubmit={handleSendVerification} className="space-y-4">
              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-white">Create Your Free Account</h2>
                <p className="text-xs text-zinc-400">No credit card required</p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder="Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="email"
                      required
                      placeholder="alex@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Phone Number — Required for live campaigns</label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      aria-label="Phone country code"
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2.5 text-xs font-bold text-zinc-200 focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      {COUNTRY_DIAL_CODES.map((c) => (<option key={`${c.code}-${c.dial}`} value={c.dial}>{c.label}</option>))}
                    </select>
                    <div className="relative min-w-0 flex-1">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                      <input
                        type="tel"
                        required
                        placeholder={phoneCountry === '1' ? '(555) 234-5678' : `+${phoneCountry}...`}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">WhatsApp Number — Required for live campaigns</label>
                  <div className="flex gap-2">
                    <select
                      value={whatsAppCountry}
                      onChange={(e) => setWhatsAppCountry(e.target.value)}
                      aria-label="WhatsApp country code"
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2.5 text-xs font-bold text-zinc-200 focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      {COUNTRY_DIAL_CODES.map((c) => (<option key={`${c.code}-${c.dial}`} value={c.dial}>{c.label}</option>))}
                    </select>
                    <div className="relative min-w-0 flex-1">
                      <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                      <input
                        type="tel"
                        required
                        placeholder={whatsAppCountry === '1' ? '(555) 234-5678' : `+${whatsAppCountry}...`}
                        value={whatsApp}
                        onChange={(e) => setWhatsApp(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500">Saved to your account and used as the default sender identity for every campaign. You can change it anytime in Settings &amp; Profile.</p>
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

              <p className="text-[11px] text-center text-zinc-400">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-400 font-bold hover:underline">
                  Log in
                </Link>
              </p>
            </form>
            </>
          ) : (
            /* STEP 2: 6-DIGIT EMAIL CODE VERIFICATION */
            <form onSubmit={handleVerifyCode} className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center space-y-1">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-white pt-2">Enter Verification Code</h2>
                <p className="text-xs text-zinc-400 font-mono">
                  We sent a 6-digit code to <strong className="text-blue-400">{email}</strong>
                </p>
                <p className="text-[11px] text-zinc-400">Codes expire in 2 minutes. Didn&apos;t get it? Resend a fresh code below.</p>
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
                  className="w-full text-center text-2xl font-extrabold tracking-widest py-3 rounded-2xl border border-zinc-700 bg-zinc-950 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-400">Enter the 6 digits to verify and activate your account.</p>
              </div>

              <Button
                type="submit"
                disabled={isVerifyingCode}
                className="w-full py-3 font-bold text-xs bg-[#0e6de4] hover:bg-[#0758bd] text-white shadow-md cursor-pointer"
              >
                {isVerifyingCode ? 'Verifying Code...' : 'Verify Code & Activate Account'}
              </Button>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setIsVerificationStep(false); setVerificationCode(''); setErrorMessage(null); }}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResendingCode || resendCooldown > 0}
                  className="text-xs font-bold text-blue-400 hover:underline disabled:text-zinc-500 disabled:no-underline cursor-pointer"
                >
                  {isResendingCode ? 'Sending…' : resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
