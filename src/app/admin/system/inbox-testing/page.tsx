'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Send,
  User,
  Mail,
  Building2,
  Tag,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminInboxTestingPage() {
  const [prospectName, setProspectName] = useState('Alex Rivera (Test)');
  const [prospectEmail, setProspectEmail] = useState('alex.rivera@growthtech.io');
  const [companyName, setCompanyName] = useState('GrowthTech Solutions');
  const [targetUserEmail, setTargetUserEmail] = useState('mithusquare@gmail.com');
  const [campaignName, setCampaignName] = useState('Developer Test Campaign');
  const [replyMessage, setReplyMessage] = useState(
    'Thanks for reaching out via our website contact form! We would like to test ContactReachout.'
  );

  const [isSimulating, setIsSimulating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSimulateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospectEmail.trim() || !replyMessage.trim()) {
      setFeedback({ type: 'error', text: 'Please fill in prospect email and test reply message.' });
      return;
    }

    setIsSimulating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/inbox/simulate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectName: prospectName.trim(),
          prospectEmail: prospectEmail.trim(),
          companyName: companyName.trim(),
          replyMessage: replyMessage.trim(),
          targetUserEmail: targetUserEmail.trim(),
          campaignName: campaignName.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: 'success',
          text: `✅ Test reply generated for ${targetUserEmail}! View in your Inbox at /inbox.`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: `Error: ${data.error || 'Failed to simulate test reply.'}`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Network error: ${err.message}` });
    } fontically: {
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/70 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0e6de4] text-white shadow-md">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900">
                Developer Testing — Inbox Synchronization
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-[#0e6de4] font-mono">
                ADMIN ONLY
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Create a controlled test reply to verify Inbox synchronization, unread state, and conversation threading.
            </p>
          </div>
        </div>
      </div>

      {/* Security Disclaimer Box */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold mb-0.5">Internal Testing Safety Safeguard</p>
          Simulated test replies generated here are tagged as <span className="font-mono font-bold">[TEST / SIMULATED DATA]</span>.
          They do NOT deduct user credits, trigger live outbound campaign metrics, or affect production email deliverability.
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main Simulation Form */}
      <form onSubmit={handleSimulateReply} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Configure Controlled Test Prospect Reply
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Account Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={targetUserEmail}
                onChange={(e) => setTargetUserEmail(e.target.value)}
                placeholder="User email to receive test reply"
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-[#0e6de4] focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Inbox owner who will see this test conversation.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Campaign Name</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-[#0e6de4] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Simulated Prospect Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-[#0e6de4] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Simulated Prospect Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={prospectEmail}
                onChange={(e) => setProspectEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-[#0e6de4] focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-[#0e6de4] focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Simulated Reply Message</label>
            <textarea
              rows={4}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-[#0e6de4] focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <a
            href="/inbox"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0e6de4] hover:underline"
          >
            Go to User Inbox (/inbox) <ArrowRight className="h-3.5 w-3.5" />
          </a>

          <Button
            type="submit"
            disabled={isSimulating}
            className="bg-[#0e6de4] hover:bg-[#0758bd] text-white rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-2"
          >
            {isSimulating ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Simulate & Sync Test Reply</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
