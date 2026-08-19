'use client';

import React, { useState, useEffect } from 'react';
import {
  Inbox as InboxIcon,
  Search,
  Filter,
  Send,
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Flame,
  Check,
  ExternalLink,
  MessageSquare,
  CornerUpLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LeadReply {
  id: string;
  prospectName: string;
  email: string;
  companyName: string;
  website: string;
  campaignName: string;
  date: string;
  isUnread: boolean;
  status: 'INTERESTED' | 'QUESTION' | 'REPLIED';
  originalSubject: string;
  originalMessage: string;
  replyMessage: string;
  replySent?: string;
  forwardedToEmail: string;
}

const sampleReplies: LeadReply[] = [
  {
    id: 'rep-1',
    prospectName: 'Sarah Connor',
    email: 'sarah@acmeclouddynamics.com',
    companyName: 'Acme Cloud Dynamics',
    website: 'https://acmeclouddynamics.com',
    campaignName: '7.19.26-SaaS Company for Healthcare 2',
    date: '10 mins ago',
    isUnread: true,
    status: 'INTERESTED',
    forwardedToEmail: 'zakaria@outreachagency.com',
    originalSubject: 'Idea for Acme Cloud Dynamics website contact form outreach',
    originalMessage:
      'Hi Sarah,\n\nHope you are having a great week at Acme Cloud Dynamics.\n\nWe help teams in San Francisco reach 10,000+ target websites daily via contact forms for free.\n\nAre you open for a 5-minute call this Thursday?\n\nBest,\nZakaria Alam',
    replyMessage:
      'Hey Zakaria,\n\nThanks for reaching out! We are actually looking to expand our B2B lead generation via contact form submission this quarter.\n\nCould you share your pricing structure and a quick 5-min demo link? Thursday 2 PM PST works for me!\n\nBest regards,\nSarah Connor\nCTO, Acme Cloud Dynamics',
  },
  {
    id: 'rep-2',
    prospectName: 'John Vance',
    email: 'j.vance@dentalcarenet.io',
    companyName: 'DentalCare Network',
    website: 'https://dentalcarenet.io',
    campaignName: '6.16.26- Dantal list for web',
    date: '2 hours ago',
    isUnread: true,
    status: 'QUESTION',
    forwardedToEmail: 'zakaria@outreachagency.com',
    originalSubject: 'Question for John regarding DentalCare Network',
    originalMessage:
      'Hi John,\n\nFollowing up on my previous note regarding DentalCare Network.\n\nFreeOutreach automates bulk contact form messaging with 100% free delivery.\n\nBest,\nZakaria Alam',
    replyMessage:
      'Hello,\n\nDoes your system support Google CAPTCHA v3 bypass without getting blocked by Cloudflare? If yes, we have a list of 5,000 clinic websites to test.\n\nThanks,\nJohn Vance',
  },
  {
    id: 'rep-3',
    prospectName: 'Elena Rostova',
    email: 'elena@healthtechglobal.org',
    companyName: 'HealthTech Global',
    website: 'https://healthtechglobal.org',
    campaignName: '6.22.26- SaaS company for Healthcare',
    date: 'Yesterday at 4:15 PM',
    isUnread: false,
    status: 'REPLIED',
    forwardedToEmail: 'zakaria@outreachagency.com',
    originalSubject: 'Sequence 2: Tailored idea for HealthTech Global',
    originalMessage:
      'Hi Elena,\n\nScaling outreach often brings manual bottlenecks.\n\nFreeOutreach automates bulk contact form messaging with zero cost.\n\nBest,\nZakaria Alam',
    replyMessage:
      'Hi Zakaria,\n\nOur marketing VP handles vendor inquiries. I have cc-ed him here so you can coordinate directly. Thanks!\n\nElena',
    replySent: 'Thanks Elena! I will connect with your VP right away.',
  },
];

export default function UniboxPage() {
  const [replies, setReplies] = useState<LeadReply[]>(sampleReplies);
  const [selectedReplyId, setSelectedReplyId] = useState<string>('rep-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync forward email setting from localStorage or campaign settings
  const [forwardEmail, setForwardEmail] = useState('hello@contactreachout.com');

  // Test Reply Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProspectName, setSyncProspectName] = useState('Lead Prospect');
  const [syncProspectEmail, setSyncProspectEmail] = useState('prospect@targetcompany.com');
  const [syncCompanyName, setSyncCompanyName] = useState('Target Business Corp');
  const [syncReplyMessage, setSyncReplyMessage] = useState('Hi ContactReachout Team, I received your website inquiry regarding outbound B2B lead generation! We are interested in testing this for 5,000 clinic websites. Can we schedule a demo call this Thursday?');

  const loadInboxReplies = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('user_inbox_messages');
      const customReplies: LeadReply[] = stored ? JSON.parse(stored) : [];

      const storedSender = localStorage.getItem('user_sender_profile');
      if (storedSender) {
        const parsed = JSON.parse(storedSender);
        if (parsed.email) setForwardEmail(parsed.email);
      } else {
        const storedReplyEmail = localStorage.getItem('user_reply_to_email');
        if (storedReplyEmail) setForwardEmail(storedReplyEmail);
      }

      if (Array.isArray(customReplies) && customReplies.length > 0) {
        setReplies([...customReplies, ...sampleReplies]);
        if (customReplies[0]?.id) {
          setSelectedReplyId(customReplies[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading inbox replies:', err);
    }
  };

  useEffect(() => {
    loadInboxReplies();

    const handleNewReplyEvent = () => loadInboxReplies();
    window.addEventListener('inbox_reply_received', handleNewReplyEvent);
    return () => window.removeEventListener('inbox_reply_received', handleNewReplyEvent);
  }, []);

  // Handle Creating / Syncing a Test Reply
  const handleSimulateIncomingReply = () => {
    if (!syncProspectEmail.trim() || !syncReplyMessage.trim()) {
      alert('Please fill in prospect email and reply message.');
      return;
    }

    const newReplyObj: LeadReply = {
      id: `rep-${Date.now()}`,
      prospectName: syncProspectName.trim() || 'Zakaria Alam Mithu',
      email: syncProspectEmail.trim(),
      companyName: syncCompanyName.trim() || 'B2B GDC',
      website: `https://${(syncCompanyName.trim() || 'b2bgdc').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      campaignName: 'Live B2B Contact Form Outreach',
      date: 'Just now',
      isUnread: true,
      status: 'INTERESTED',
      forwardedToEmail: forwardEmail,
      originalSubject: 'Outreach Inquiry regarding growth',
      originalMessage: `Hi ${syncProspectName.split(' ')[0] || 'there'},\n\nReaching out via contact form regarding your growth services.\n\nBest regards,\n${forwardEmail}`,
      replyMessage: syncReplyMessage.trim(),
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_inbox_messages');
        const existing: LeadReply[] = stored ? JSON.parse(stored) : [];
        const updated = [newReplyObj, ...existing];
        localStorage.setItem('user_inbox_messages', JSON.stringify(updated));

        setReplies([newReplyObj, ...replies]);
        setSelectedReplyId(newReplyObj.id);
        setShowSyncModal(false);
        setToastMessage(`✅ Incoming reply received from ${newReplyObj.prospectName} (${newReplyObj.email}) and synced to Unibox!`);
        setTimeout(() => setToastMessage(null), 4000);
      } catch (err) {
        console.error('Error saving simulated reply:', err);
      }
    }
  };

  const activeReply = replies.find((r) => r.id === selectedReplyId) || replies[0];

  // Mark as read when selected
  const handleSelectReply = (rep: LeadReply) => {
    setSelectedReplyId(rep.id);
    setReplies((prev) =>
      prev.map((r) => (r.id === rep.id ? { ...r, isUnread: false } : r))
    );
  };

  // Send Outbound Reply Email Handler (Dispatches real email via /api/inbox/send-reply)
  const handleSendEmailReply = async () => {
    if (!replyText.trim()) {
      alert('Please enter a reply message before sending.');
      return;
    }

    setIsSendingReply(true);
    const sentMessageText = replyText.trim();
    const targetId = selectedReplyId || activeReply.id;

    try {
      // Call API to transmit real outbound reply email to recipient's email
      const res = await fetch('/api/inbox/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: activeReply.email,
          senderEmail: forwardEmail || 'mithusquare@gmail.com',
          subject: activeReply.originalSubject || 'Re: Outreach Inquiry',
          replyText: sentMessageText,
          prospectName: activeReply.prospectName,
        }),
      });

      const data = await res.json();

      setReplies((prev) =>
        prev.map((r) =>
          r.id === targetId || r.email === activeReply.email
            ? { ...r, replySent: sentMessageText, status: 'REPLIED', isUnread: false }
            : r
        )
      );

      // Persist outbound reply in user_inbox_messages
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('user_inbox_messages');
        const existing: LeadReply[] = stored ? JSON.parse(stored) : [];
        const updated = existing.map((r) =>
          r.id === targetId || r.email === activeReply.email
            ? { ...r, replySent: sentMessageText, status: 'REPLIED', isUnread: false }
            : r
        );
        localStorage.setItem('user_inbox_messages', JSON.stringify(updated));
      }

      setReplyText('');
      setToastMessage(data.message || `Reply email "${sentMessageText}" sent successfully to ${activeReply.email}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Error sending reply email:', err);
      alert(`Error sending email reply: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Filtered Replies List
  const filteredReplies = replies.filter((r) => {
    if (statusFilter === 'UNREAD' && !r.isUnread) return false;
    if (statusFilter === 'INTERESTED' && r.status !== 'INTERESTED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.prospectName.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.replyMessage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount = replies.filter((r) => r.isUnread).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <InboxIcon className="h-5 w-5" />
            </div>
            <span>Master Inbox</span>
            {unreadCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold font-mono">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            All replies from website contact form campaigns automatically sync here and forward to your email.
          </p>
        </div>

        {/* Right Action Bar (Forward Email Banner + Receive Test Reply Button) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-blue-900 font-semibold shadow-2xs">
            <Mail className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Forwarding Replies to: <strong className="font-mono text-blue-700">{forwardEmail}</strong></span>
          </div>

          <button
            onClick={() => setShowSyncModal(true)}
            id="receive-test-reply-btn"
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>+ Receive / Test Email Reply</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Inbox Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Messages List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads, company, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none shadow-2xs"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="UNREAD">Unread Only</option>
              <option value="INTERESTED">🔥 High Intent</option>
            </select>
          </div>

          {/* Lead Thread Cards */}
          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredReplies.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No replies found.
              </div>
            ) : (
              filteredReplies.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => handleSelectReply(rep)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 relative shadow-2xs ${
                    selectedReplyId === rep.id
                      ? 'border-[#2563EB] bg-blue-50/40 ring-2 ring-blue-500/20'
                      : rep.isUnread
                      ? 'border-slate-300 bg-white font-bold'
                      : 'border-slate-200 bg-white hover:border-slate-300 opacity-90'
                  }`}
                >
                  {rep.isUnread && (
                    <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-500" />
                  )}

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                      {rep.prospectName}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">{rep.date}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                    <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{rep.companyName}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-sans">
                    {rep.replyMessage}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                      {rep.campaignName}
                    </span>

                    {rep.status === 'INTERESTED' && (
                      <span className="text-[9px] font-bold font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        🔥 High Intent
                      </span>
                    )}
                    {rep.status === 'QUESTION' && (
                      <span className="text-[9px] font-bold font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        ⚡ Inquiry
                      </span>
                    )}
                    {rep.status === 'REPLIED' && (
                      <span className="text-[9px] font-bold font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        ✓ Replied
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Detailed Thread & Email Reply Composer (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeReply ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              {/* Thread Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{activeReply.prospectName}</span>
                    <span className="text-xs text-slate-400 font-normal">({activeReply.email})</span>
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1 text-slate-700 font-bold">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" /> {activeReply.companyName}
                    </span>
                    <span>•</span>
                    <a
                      href={activeReply.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {activeReply.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                    Campaign: {activeReply.campaignName}
                  </span>
                </div>
              </div>

              {/* Thread Message Chain */}
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {/* 1. Original Outreach Sent via Contact Form */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 text-[11px]">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-blue-600" />
                      Original Outreach Message Sent via Contact Form
                    </span>
                    <span className="text-slate-400 font-mono">Sent to {activeReply.website}</span>
                  </div>
                  <p className="font-bold text-slate-800 text-xs">Subject: {activeReply.originalSubject}</p>
                  <p className="whitespace-pre-line text-slate-700 leading-relaxed font-sans">
                    {activeReply.originalMessage}
                  </p>
                </div>

                {/* 2. Prospect's Incoming Reply */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-blue-200/80 pb-2 text-[11px]">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                      Incoming Reply from {activeReply.prospectName} ({activeReply.date})
                    </span>
                    <span className="text-blue-700 font-mono font-semibold bg-blue-100 px-2 py-0.5 rounded-full">
                      ✓ Auto-Forwarded to {forwardEmail}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-slate-800 leading-relaxed font-sans font-medium">
                    {activeReply.replyMessage}
                  </p>
                </div>

                {/* 3. Previously Sent Reply if any */}
                {activeReply.replySent && (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2 text-[11px]">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Your Reply Email Sent
                      </span>
                      <span className="text-emerald-700 font-mono">Sent to {activeReply.email}</span>
                    </div>
                    <p className="whitespace-pre-line text-emerald-900 leading-relaxed font-sans">
                      {activeReply.replySent}
                    </p>
                  </div>
                )}
              </div>

              {/* Interactive Email Reply Composer Box */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CornerUpLeft className="h-4 w-4 text-blue-600" />
                    <span>Send Email Reply to {activeReply.prospectName}</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    From: {forwardEmail}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-300 bg-white shadow-2xs overflow-hidden">
                  <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700 font-mono">
                    To: {activeReply.email} | Subject: Re: {activeReply.originalSubject}
                  </div>
                  <textarea
                    rows={5}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Type your reply to ${activeReply.prospectName}... (e.g. Thanks Sarah, here is our demo link and pricing breakdown...)`}
                    className="w-full p-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed font-sans"
                  />
                  <div className="border-t border-slate-200 px-4 py-2.5 bg-slate-50 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      ✓ Email will be sent directly & logged in campaign history
                    </span>
                    <button
                      onClick={handleSendEmailReply}
                      disabled={isSendingReply}
                      className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isSendingReply ? 'Sending Email Reply...' : 'Send Reply Email'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-sm">
              Select a message thread from the left list to view and reply.
            </div>
          )}
        </div>
      </div>

      {/* FLOATING SUCCESS TOAST */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900 text-white px-5 py-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="rounded-full bg-emerald-500/20 p-1.5 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white font-mono">Dual Reply Sync</h4>
            <p className="text-[11px] text-slate-300">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* RECEIVE / TEST EMAIL REPLY MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm font-sans">
          <div className="w-full max-w-lg p-6 space-y-4 bg-white shadow-2xl rounded-3xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Receive / Test Prospect Reply
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Simulate an incoming email reply to test Dual Reply Sync.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Prospect Name:</label>
                  <input
                    type="text"
                    value={syncProspectName}
                    onChange={(e) => setSyncProspectName(e.target.value)}
                    placeholder="Zakaria Alam Mithu"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Prospect Email:</label>
                  <input
                    type="email"
                    value={syncProspectEmail}
                    onChange={(e) => setSyncProspectEmail(e.target.value)}
                    placeholder="mithusquare@gmail.com"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Company Name:</label>
                <input
                  type="text"
                  value={syncCompanyName}
                  onChange={(e) => setSyncCompanyName(e.target.value)}
                  placeholder="B2B GDC"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Incoming Reply Message Text:</label>
                <textarea
                  rows={4}
                  value={syncReplyMessage}
                  onChange={(e) => setSyncReplyMessage(e.target.value)}
                  placeholder="Type simulated reply text..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 leading-relaxed font-sans focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] space-y-1 font-mono">
                <p className="font-bold">Dual Sync Target:</p>
                <p>1. Forwarding Email: <strong>{forwardEmail}</strong></p>
                <p>2. System Inbox: <strong>Master Inbox (/unibox)</strong></p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSyncModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateIncomingReply}
                id="submit-sync-reply-btn"
                className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Simulate & Sync Incoming Reply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
