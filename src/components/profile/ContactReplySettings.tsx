'use client';

import { useEffect, useState } from 'react';
import { Mail, CheckCircle2, ShieldAlert, ArrowRight, RefreshCw, KeyRound, Check } from 'lucide-react';

export function ContactReplySettings() {
  const [replyEmail, setReplyEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(true);
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
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/reply-email');
      const data = await res.json();
      if (res.ok && data.success) {
        setReplyEmail(data.replyEmail);
        setIsVerified(data.replyEmailVerified);
        setAccountEmail(data.accountEmail);
      } else {
        setError(data.error || 'Failed to load reply email settings.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server.');
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

  const handleRequestOtp = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSendingOtp(true);
    setError(null);
    setSuccessMsg(null);
    setDebugCode(null);

    try {
      const res = await fetch('/api/user/reply-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_otp', newReplyEmail: newEmail.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.immediateVerified) {
          setReplyEmail(data.replyEmail);
          setIsVerified(true);
          setShowModal(false);
          setSuccessMsg(`✓ Reply email successfully restored to your verified account email (${data.replyEmail}).`);
        } else {
          setStep('verify');
          setCooldown(data.cooldownSeconds || 60);
          setSuccessMsg(data.message || 'Verification code dispatched to your new reply email.');
          if (data.debugCode) {
            setDebugCode(data.debugCode);
          }
        }
      } else {
        setError(data.error || 'Failed to request verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Error requesting verification code.');
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
            Contact & Reply Settings
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-900">
            Campaign Reply Email Identity
          </h3>
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
          Loading reply email settings...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-12 items-end">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Reply Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  readOnly
                  value={replyEmail || accountEmail}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(true);
                  setStep('input');
                  setNewEmail('');
                  setOtpCode('');
                  setError(null);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e6de4] px-4 py-3 text-xs font-bold text-white hover:bg-[#0758bd] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span>Change Reply Email</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            This email is used when a website contact form requires an email address. Replies from prospects may also be delivered to this inbox.
          </p>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-600 space-y-1 font-mono">
            <p className="font-bold text-slate-800 font-sans">Default Reply Email Behavior:</p>
            <p>• Account Verified Email: <strong>{accountEmail}</strong></p>
            <p>• Active Campaign Submission Email: <strong>{replyEmail || accountEmail}</strong></p>
            <p>• Incoming prospect replies automatically forward to this address and appear in your ContactReachout Inbox.</p>
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

            {debugCode && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-mono space-y-1">
                <p className="font-bold">⚡ Sandbox Verification Code:</p>
                <p className="text-base font-extrabold tracking-widest text-amber-700">{debugCode}</p>
                <p className="text-[10px] text-amber-800">Resend API key unconfigured in development. Use code above to verify.</p>
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
                    onChange={(e) => setNewEmail(e.target.value)}
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
