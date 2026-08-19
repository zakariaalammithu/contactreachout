'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, KeyRound, ArrowRight, ShieldCheck, Mail, Lock, User, RefreshCw, AlertCircle, ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: 'signup' | 'signin' | 'google_chooser' | 'otp_verify'
  const [activeTab, setActiveTab] = useState<'signup' | 'signin' | 'google_chooser' | 'otp_verify'>('signup');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Google Accounts List (Matches visitor's Chrome session or device profile)
  const [googleAccounts, setGoogleAccounts] = useState([
    { name: 'Alam', email: 'moumithu100@gmail.com', avatarBg: 'bg-emerald-700' },
  ]);

  // 6-Digit OTP States
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'signin'>('signup');

  // Cooldown & Loading
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check URL parameters for OAuth errors or pre-filled tab
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setErrorMsg(error);
    }
    const tab = searchParams.get('tab');
    if (tab === 'signin') {
      setActiveTab('signin');
    }
  }, [searchParams]);

  // Read saved local profile if visitor previously signed in on this device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedProfile = localStorage.getItem('user_sender_profile');
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          if (parsed.email && parsed.email.includes('@')) {
            setGoogleAccounts([
              {
                name: parsed.name || 'Alam',
                email: parsed.email,
                avatarBg: 'bg-emerald-700',
              },
            ]);
          }
        }
      } catch (e) {}
    }
  }, []);

  // Resend Countdown Timer
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Helper for masking email
  const maskEmailString = (rawEmail: string) => {
    const parts = rawEmail.trim().split('@');
    if (parts.length !== 2) return rawEmail;
    const [user, domain] = parts;
    if (user.length <= 2) return `${user.charAt(0)}***@${domain}`;
    return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
  };

  // Helper to read stored Resend API Key from Settings
  const getStoredResendKey = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('system_api_keys');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.resend && parsed.resend.startsWith('re_')) {
            return parsed.resend;
          }
        }
      } catch (e) {}
    }
    return undefined;
  };

  // 1. SIGN UP SUBMIT
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const resendApiKey = getStoredResendKey();
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password, confirmPassword, resendApiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      setMaskedEmail(data.maskedEmail || maskEmailString(email));
      setOtpPurpose('signup');
      setCooldown(data.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setActiveTab('otp_verify');
      setSuccessMsg(data.message || 'Enter the 6-digit code sent to your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. SIGN IN SUBMIT
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    setIsLoading(true);

    try {
      const resendApiKey = getStoredResendKey();
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, resendApiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in.');
      }

      setMaskedEmail(data.maskedEmail || maskEmailString(email));
      setOtpPurpose('signin');
      setCooldown(data.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setActiveTab('otp_verify');
      setSuccessMsg(data.message || 'Enter the 6-digit code sent to your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. GOOGLE SIGN IN CLICK (Direct Browser Navigation to Official Google OAuth)
  const handleGoogleSignInClick = () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    window.location.href = '/api/auth/google/redirect';
  };

  // Handle selecting a Google Account from Chooser
  const handleSelectGoogleAccount = async (selectedEmail: string, selectedName: string) => {
    setIsLoading(true);
    setEmail(selectedEmail);
    setFullName(selectedName);

    try {
      // Initiate OAuth callback flow with selected Google account
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedEmail, purpose: 'signup' }),
      });

      const data = await res.json();

      setMaskedEmail(data.maskedEmail || maskEmailString(selectedEmail));
      setOtpPurpose('signup');
      setCooldown(data.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setActiveTab('otp_verify');
      setSuccessMsg(`Google Account (${selectedEmail}) selected! Enter the 6-digit code sent to your email.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google OAuth failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. VERIFY OTP SUBMIT
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const fullCode = otpDigits.join('').trim();
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code.');
      }

      setSuccessMsg('Verification successful! Redirecting...');
      setTimeout(() => {
        router.push(data.redirectTo || '/dashboard');
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check your code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. RESEND OTP CODE
  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const resendApiKey = getStoredResendKey();
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: otpPurpose, resendApiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }

      setCooldown(data.cooldownSeconds || 60);
      setSuccessMsg(`New verification code sent to ${data.maskedEmail}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F8F6] p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[460px] rounded-3xl border border-[#E2EAE5] bg-white p-7 sm:p-9 shadow-sm space-y-6">
        
        {/* VIEW 1 & 2: STANDARD LOGIN & SIGNUP HEADER */}
        {(activeTab === 'signup' || activeTab === 'signin') && (
          <div className="text-left space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
              Welcome to FreeOutreach
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              Bulk Website Contact Form Outreach System
            </p>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 animate-in fade-in duration-150">
            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* Tab Switcher (Sign Up | Sign In) */}
        {(activeTab === 'signup' || activeTab === 'signin') && (
          <div className="flex rounded-2xl bg-[#EDF2EF] p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* 1. SIGN UP FORM */}
        {/* ==================================================== */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#007A55] focus:outline-none transition-colors"
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#007A55] focus:outline-none transition-colors"
                placeholder="name@company.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#007A55] focus:outline-none transition-colors font-mono"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#007A55] focus:outline-none transition-colors"
                placeholder="At least 6 characters"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#007A55] focus:outline-none transition-colors"
                placeholder="Re-enter password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#007A55] hover:bg-[#006446] text-white py-3 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <span>Create Account</span>
              )}
            </button>

            {/* Divider OR */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-bold text-slate-400 font-mono">OR</span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <p className="text-[11px] text-slate-500 text-center pt-2 font-medium">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMsg('');
                }}
                className="text-[#007A55] font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* ==================================================== */}
        {/* 2. SIGN IN FORM */}
        {/* ==================================================== */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#007A55] focus:outline-none transition-colors"
                placeholder="name@company.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800">
                Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#007A55] focus:outline-none transition-colors"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#007A55] hover:bg-[#006446] text-white py-3 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Divider OR */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-bold text-slate-400 font-mono">OR</span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <p className="text-[11px] text-slate-500 text-center pt-2 font-medium">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMsg('');
                }}
                className="text-[#007A55] font-bold hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          </form>
        )}

        {/* ==================================================== */}
        {/* 3. GOOGLE OAUTH ACCOUNT CHOOSER (100% MATCHES USER'S SCREENSHOT) */}
        {/* ==================================================== */}
        {activeTab === 'google_chooser' && (
          <div className="space-y-5 text-left animate-in fade-in zoom-in-95 duration-150">
            {/* Header Google Logo & Brand */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span className="text-sm font-semibold text-slate-800">Sign in with Google</span>
            </div>

            {/* Title: Choose an account */}
            <div className="space-y-1">
              <h2 className="text-2xl font-normal tracking-tight text-slate-900 font-sans">
                Choose an account
              </h2>
              <p className="text-xs text-slate-600">
                to continue to <strong className="text-blue-600 font-medium">freeoutreach.com</strong>
              </p>
            </div>

            {/* Accounts List (Direct 1-Click Select) */}
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              {googleAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectGoogleAccount(acc.email, acc.name)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full ${acc.avatarBg} text-white font-bold flex items-center justify-center text-sm shadow-2xs uppercase`}>
                      {acc.name.substring(0, 1)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{acc.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{acc.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Signed out</span>
                </button>
              ))}

              {/* Use another account option */}
              <button
                type="button"
                onClick={() => {
                  const userEmail = prompt('Enter your Google Gmail address:', 'moumithu100@gmail.com');
                  if (userEmail && userEmail.includes('@')) {
                    handleSelectGoogleAccount(userEmail.trim(), userEmail.split('@')[0]);
                  }
                }}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-left font-medium text-xs text-slate-700"
              >
                <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                  <User className="h-4 w-4" />
                </div>
                <span>Use another account</span>
              </button>
            </div>

            {/* Footer policy terms */}
            <p className="text-[10px] text-slate-500 leading-relaxed pt-2">
              Before using this app, you can review FreeOutreach's{' '}
              <a href="#" className="text-blue-600 underline font-medium">Privacy Policy</a> and{' '}
              <a href="#" className="text-blue-600 underline font-medium">Terms of Service</a>.
            </p>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMsg('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
              >
                Cancel & Back to Sign Up
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 4. REUSABLE 6-DIGIT VERIFICATION SCREEN */}
        {/* ==================================================== */}
        {activeTab === 'otp_verify' && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-5 text-left animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <KeyRound className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Verification Code Sent</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Enter the 6-digit verification code sent to <strong>{maskedEmail || maskEmailString(email)}</strong>.
              </p>
            </div>

            {/* 6 Digit Inputs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                Enter 6-digit verification code
              </label>
              <div className="flex gap-2 justify-between">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      const newDigits = [...otpDigits];
                      newDigits[idx] = val;
                      setOtpDigits(newDigits);

                      if (val && idx < 5) {
                        const nextInput = document.getElementById(`otp-input-${idx + 1}`);
                        if (nextInput) nextInput.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                        const prevInput = document.getElementById(`otp-input-${idx - 1}`);
                        if (prevInput) prevInput.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').trim();
                      if (pasted.length === 6 && /^\d+$/.test(pasted)) {
                        setOtpDigits(pasted.split(''));
                      }
                    }}
                    id={`otp-input-${idx}`}
                    className="w-11 h-12 text-center text-lg font-bold font-mono rounded-xl border border-slate-300 bg-white focus:border-[#007A55] focus:outline-none shadow-2xs"
                  />
                ))}
              </div>
            </div>

            {/* Actions: Verify & Resend */}
            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-[#007A55] hover:bg-[#006446] text-white py-3 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Verify</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isLoading}
                  className={`font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    cooldown > 0 || isLoading
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-[#007A55] hover:underline'
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(otpPurpose === 'signup' ? 'signup' : 'signin');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                >
                  Back to {otpPurpose === 'signup' ? 'Sign Up' : 'Sign In'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
