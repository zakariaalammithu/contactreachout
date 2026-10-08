'use client';

import { useEffect, useState } from 'react';
import { Mail, CheckCircle2, ShieldAlert, ArrowRight, RefreshCw, KeyRound, Check, Save } from 'lucide-react';

export function ContactReplySettings() {
  const [fullName, setFullName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Change Email Modal / Step State
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const fetchSettings = async () => {
    setError(null);
    try {
      const profileRes = await fetch('/api/profile', { cache: 'no-store' });
      if (profileRes.ok) {
        const pData = await profileRes.json();
        if (pData.user) {
          setFullName(pData.user.name || '');
          setPhone(pData.user.phone || '');
          setWhatsApp(pData.user.whatsApp || '');
          setAccountEmail(pData.user.email || '');
          setReplyEmail(pData.user.replyEmail || pData.user.email || '');
          setIsVerified(Boolean(pData.user.replyEmailVerified));
        }
      }

      const activeEmail = (typeof window !== 'undefined' ? localStorage.getItem('active_account_email') || localStorage.getItem('user_auth_email') || '' : '');
      const headers: Record<string, string> = activeEmail ? { 'x-account-email': activeEmail } : {};
      const res = await fetch('/api/user/reply-email', { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setReplyEmail(data.replyEmail);
        setIsVerified(data.replyEmailVerified);
        setAccountEmail(data.accountEmail);
      }
    } catch (err: any) {
      // Gracefully retain local state if network error occurs
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSaveContactIdentity = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          phone: phone.trim(),
          whatsApp: whatsApp.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('✓ Contact identity updated successfully!');
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('user_sender_profile');
          const parsed = stored ? JSON.parse(stored) : {};
          localStorage.setItem(
            'user_sender_profile',
            JSON.stringify({
              ...parsed,
              name: fullName.trim(),
              phone: phone.trim(),
              whatsApp: whatsApp.trim(),
            })
          );
        }
      } else {
        setError(data.error || 'Failed to update contact identity.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving contact identity.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestOtp = async () => {
    const cleanEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSendingOtp(true);
    setError(null);
    setSuccessMsg(null);
    setCooldown(0);

    try {
      const res = await fetch('/api/user/reply-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', newReplyEmail: cleanEmail }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.immediateVerified) {
          setReplyEmail(data.replyEmail);
          setIsVerified(true);
          setShowModal(false);
          setSuccessMsg(`✓ Reply email successfully set to your verified account email (${data.replyEmail}).`);
        } else {
          setStep('verify');
          setCooldown(data.cooldownSeconds || 20);
          setError(null);
        }
      } else {
        setCooldown(0);
        setError(data.error || data.message || 'Verification email could not be sent. Please check your email address or try again later.');
      }
    } catch (err: any) {
      setCooldown(0);
      setError(err.message || 'Verification email could not be sent. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    setError(null);

    try {
      const res = await fetch('/api/user/reply-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          newReplyEmail: newEmail.trim(),
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setReplyEmail(data.replyEmail);
        setIsVerified(true);
        setShowModal(false);
        setSuccessMsg(data.message || '✓ Reply Email verified and saved successfully!');
        setStep('input');
        setNewEmail('');
        setOtpCode('');
      } else {
        setError(data.error || 'Invalid verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Error verifying OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[#0e6de4]">
            CONTACT & REPLY IDENTITY
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-900">
            Account Contact Identity Settings
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage your account contact details. All four fields are optional and automatically fill website contact forms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Status: Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Verification Pending
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-xs font-bold text-slate-400 animate-pulse">
          Loading contact identity settings...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* 1. Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Full Name <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#0e6de4] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* 2. Reply Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Reply Email</span>
                <span className="text-[10px] text-emerald-600 font-bold font-mono">Verified</span>
              </label>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    readOnly
                    value={replyEmail || accountEmail}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(true);
                    setStep('input');
                    setNewEmail('');
                    setOtpCode('');
                    setError(null);
                  }}
                  className="shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0e6de4] px-3.5 py-3 text-xs font-bold transition-all cursor-pointer"
                >
                  Change Email
                </button>
              </div>
            </div>

            {/* 3. Phone Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Phone Number <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 234-5678"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#0e6de4] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* 4. WhatsApp Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                WhatsApp Number <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={whatsApp}
                onChange={(e) => setWhatsApp(e.target.value)}
                placeholder="e.g. +1 (555) 987-6543"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#0e6de4] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              All four fields are optional. When a target website form requests your contact identity, ContactReachout uses these values automatically.
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveContactIdentity}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e6de4] px-6 py-3 text-xs font-bold text-white hover:bg-[#0758bd] disabled:opacity-60 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* CHANGE REPLY EMAIL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl space-y-5 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-[#0e6de4]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Change Reply Email</h4>
                  <p className="text-[11px] text-slate-500">Requires OTP Verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                {error}
              </div>
            )}

            {step === 'input' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">New Reply Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. sales@company.com"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs font-bold text-slate-900 focus:border-[#0e6de4] focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    A 6-digit verification code will be sent to this email.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={handleRequestOtp}
                    className="rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white px-5 py-2.5 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {sendingOtp ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 space-y-1">
                  <p className="font-bold">Verification code sent to:</p>
                  <p className="font-mono text-[#0e6de4]">{newEmail}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-[#0e6de4]" />
                    <span>Enter 6-Digit Verification Code</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.4em] font-mono text-lg font-black rounded-xl border border-slate-300 p-3 text-slate-900 focus:border-[#0e6de4] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={cooldown > 0 || sendingOtp}
                    onClick={handleRequestOtp}
                    className="text-xs font-bold text-[#0e6de4] hover:underline disabled:text-slate-400 cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={verifyingOtp}
                      onClick={handleVerifyOtp}
                      className="rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1"
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>{verifyingOtp ? 'Verifying...' : 'Verify & Set Email'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
