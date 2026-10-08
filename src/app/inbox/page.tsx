'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Inbox as InboxIcon,
  Search,
  Filter,
  Send,
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronLeft,
  FlaskConical,
  RefreshCw,
  Globe,
  Tag,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface LeadReply {
  id: string;
  userId?: string;
  userEmail?: string;
  campaignId?: string;
  leadId?: string;
  conversationId?: string;
  externalMessageId?: string;
  direction?: 'inbound' | 'outbound';
  prospectName: string;
  email: string;
  companyName: string;
  website: string;
  campaignName: string;
  date: string;
  createdAt: string;
  isUnread: boolean;
  isArchived?: boolean;
  status: 'INTERESTED' | 'QUESTION' | 'REPLIED' | 'NEW' | 'UNMATCHED';
  originalSubject: string;
  originalMessage: string;
  replyMessage: string;
  replySent?: string;
  replySentAt?: string;
  forwardedToEmail: string;
}

export default function InboxPage() {
  const [replies, setReplies] = useState<LeadReply[]>([]);
  const [selectedReplyId, setSelectedReplyId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Authenticated user details from API
  const [forwardEmail, setForwardEmail] = useState('');
  const [availableCredits, setAvailableCredits] = useState<number>(0);

  // Mobile layout panel view toggle ('list' or 'detail')
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // Developer Sandbox Test Reply Modal
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [syncProspectName, setSyncProspectName] = useState('Alex Rivera');
  const [syncProspectEmail, setSyncProspectEmail] = useState('alex.rivera@growthtech.io');
  const [syncCompanyName, setSyncCompanyName] = useState('GrowthTech Solutions');
  const [syncReplyMessage, setSyncReplyMessage] = useState(
    'Thanks for reaching out via our website contact form! We would like to learn more about ContactReachout.'
  );

  const fetchInboxData = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch('/api/inbox');
      if (res.ok) {
        const data = await res.json();
        const msgList: LeadReply[] = data.messages || [];
        setReplies(msgList);
        if (data.forwardingEmail) setForwardEmail(data.forwardingEmail);
        if (typeof data.availableCredits === 'number') setAvailableCredits(data.availableCredits);

        if (msgList.length > 0) {
          if (!selectedReplyId || !msgList.some((m) => m.id === selectedReplyId)) {
            setSelectedReplyId(msgList[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch inbox data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInboxData();
    // Auto-refresh interval every 12 seconds for background sync
    const interval = setInterval(() => fetchInboxData(false), 12000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Conversations Computation
  const filteredReplies = useMemo(() => {
    return replies.filter((item) => {
      // 1. Tab Filter
      if (activeTab === 'unread') {
        if (!item.isUnread || item.isArchived) return false;
      } else if (activeTab === 'archived') {
        if (!item.isArchived) return false;
      } else {
        // 'all' tab: exclude archived conversations by default
        if (item.isArchived) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (item.prospectName || '').toLowerCase().includes(q);
        const emailMatch = (item.email || '').toLowerCase().includes(q);
        const companyMatch = (item.companyName || '').toLowerCase().includes(q);
        const subjectMatch = (item.originalSubject || '').toLowerCase().includes(q);
        const msgMatch = (item.replyMessage || '').toLowerCase().includes(q);
        const websiteMatch = (item.website || '').toLowerCase().includes(q);
        const campaignMatch = (item.campaignName || '').toLowerCase().includes(q);

        if (
          !nameMatch &&
          !emailMatch &&
          !companyMatch &&
          !subjectMatch &&
          !msgMatch &&
          !websiteMatch &&
          !campaignMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [replies, activeTab, statusFilter, searchQuery]);

  // Tab counts
  const unreadCount = useMemo(
    () => replies.filter((r) => r.isUnread && !r.isArchived).length,
    [replies]
  );
  const archivedCount = useMemo(
    () => replies.filter((r) => r.isArchived).length,
    [replies]
  );
  const allCount = useMemo(
    () => replies.filter((r) => !r.isArchived).length,
    [replies]
  );

  const activeReply = useMemo(() => {
    return replies.find((r) => r.id === selectedReplyId) || null;
  }, [replies, selectedReplyId]);

  // Select conversation & automatically mark as read
  const handleSelectReply = async (rep: LeadReply) => {
    setSelectedReplyId(rep.id);
    setMobileView('detail');

    if (rep.isUnread) {
      setReplies((prev) =>
        prev.map((r) => (r.id === rep.id ? { ...r, isUnread: false } : r))
      );

      try {
        await fetch('/api/inbox', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: rep.id, action: 'mark_read' }),
        });
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    }
  };

  // Toggle Read / Unread State
  const handleToggleReadStatus = async (messageId: string, currentUnread: boolean) => {
    const nextUnread = !currentUnread;
    setReplies((prev) =>
      prev.map((r) => (r.id === messageId ? { ...r, isUnread: nextUnread } : r))
    );

    try {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          action: nextUnread ? 'mark_unread' : 'mark_read',
        }),
      });
    } catch (err) {
      console.error('Error toggling read status:', err);
    }
  };

  // Archive / Unarchive Handler
  const handleToggleArchive = async (messageId: string, currentArchived: boolean) => {
    const nextArchived = !currentArchived;

    setReplies((prev) =>
      prev.map((r) => (r.id === messageId ? { ...r, isArchived: nextArchived } : r))
    );

    setToastMessage(
      nextArchived
        ? 'Conversation moved to Archived.'
        : 'Conversation restored to All chats.'
    );
    setTimeout(() => setToastMessage(null), 3500);

    try {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          action: nextArchived ? 'archive' : 'unarchive',
        }),
      });
    } catch (err) {
      console.error('Error toggling archive status:', err);
    }
  };

  // Dispatch Real Outbound Email Reply
  const handleSendEmailReply = async () => {
    if (!replyText.trim()) {
      alert('Please enter a reply message before sending.');
      return;
    }
    if (!activeReply) return;

    setIsSendingReply(true);
    const sentMessageText = replyText.trim();
    const targetId = activeReply.id;

    try {
      const res = await fetch('/api/inbox/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: targetId,
          recipientEmail: activeReply.email,
          subject: activeReply.originalSubject || 'Re: Outreach Inquiry',
          replyText: sentMessageText,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setReplies((prev) =>
          prev.map((r) =>
            r.id === targetId
              ? { ...r, replySent: sentMessageText, status: 'REPLIED', isUnread: false }
              : r
          )
        );
        setReplyText('');
        setToastMessage(
          data.message || `Reply email transmitted successfully to ${activeReply.email}!`
        );
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(`Error sending email reply: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      console.error('Error sending reply email:', err);
      alert(`Error sending email reply: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Developer Sandbox Simulated Inbound Reply Trigger
  const handleSimulateSandboxReply = async () => {
    if (!syncProspectEmail.trim() || !syncReplyMessage.trim()) {
      alert('Please provide a valid prospect email and message.');
      return;
    }

    try {
      const res = await fetch('/api/inbox/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectName: syncProspectName.trim() || 'Alex Rivera',
          prospectEmail: syncProspectEmail.trim(),
          companyName: syncCompanyName.trim() || 'GrowthTech Solutions',
          website: `https://${(syncCompanyName.trim() || 'growthtech').toLowerCase().replace(/[^a-z0-9]/g, '')}.io`,
          subject: 'Website Outreach Inquiry & Demo Request',
          replyMessage: syncReplyMessage.trim(),
          userEmail: forwardEmail,
          campaignName: 'Product Demo Campaign',
          status: 'INTERESTED',
        }),
      });

      if (res.ok) {
        setShowSandboxModal(false);
        setToastMessage('✅ Inbound test reply synced to Inbox!');
        setTimeout(() => setToastMessage(null), 4000);
        await fetchInboxData(true);
      } else {
        alert('Failed to simulate test reply');
      }
    } catch (err) {
      console.error('Error simulating test reply:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl transition-all animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0e6de4]">
            <InboxIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
              Inbox
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Manage campaign replies and conversations in one place.
            </p>
          </div>
        </div>

        {/* Right Header Info Controls */}
        <div className="flex items-center gap-3">
          {/* Reply Forwarding Indicator */}
          {forwardEmail && (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              <Mail className="h-3.5 w-3.5 text-[#0e6de4]" />
              <span>Forwarding replies to:</span>
              <span className="font-semibold text-slate-900">{forwardEmail}</span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchInboxData(true)}
            disabled={isRefreshing}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh Inbox"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#0e6de4]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main 3-Panel Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ============================================================================== */}
        {/* LEFT PANEL: Search, Filter Tabs, Conversation List */}
        {/* ============================================================================== */}
        <div
          className={`w-full md:w-80 lg:w-88 flex-col border-r border-slate-200 bg-white shrink-0 ${
            mobileView === 'detail' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Box & Filter Header */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, company, email..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0e6de4] focus:bg-white focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                    statusFilter !== 'ALL'
                      ? 'border-[#0e6de4] bg-blue-50 text-[#0e6de4]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Filter conversations"
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>

                {/* Filter Popover Dropdown */}
                {isFilterMenuOpen && (
                  <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Filter by Status
                    </p>
                    {['ALL', 'INTERESTED', 'QUESTION', 'REPLIED', 'NEW', 'UNMATCHED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setStatusFilter(st);
                          setIsFilterMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          statusFilter === st
                            ? 'bg-blue-50 text-[#0e6de4] font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{st === 'ALL' ? 'All Statuses' : st}</span>
                        {statusFilter === st && <Check className="h-3.5 w-3.5 text-[#0e6de4]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Primary Navigation Tabs: All chats | Unread | Archived */}
          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/50 p-1 gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-[#0e6de4] shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All chats</span>
              {allCount > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
                  {allCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('unread')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'unread'
                  ? 'bg-white text-[#0e6de4] shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#0e6de4] px-1.5 py-0.2 text-[10px] font-mono font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('archived')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'archived'
                  ? 'bg-white text-[#0e6de4] shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Archived</span>
              {archivedCount > 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
                  {archivedCount}
                </span>
              )}
            </button>
          </div>

          {/* Conversation List Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#0e6de4] border-t-transparent mb-2"></div>
                Loading conversations...
              </div>
            ) : filteredReplies.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <InboxIcon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">
                  {activeTab === 'unread'
                    ? 'No unread conversations'
                    : activeTab === 'archived'
                    ? 'No archived conversations'
                    : searchQuery
                    ? 'No matching results'
                    : 'No conversations yet'}
                </h3>
                <p className="mt-1 text-xs text-slate-400 max-w-[200px] mx-auto">
                  {activeTab === 'unread'
                    ? 'All incoming prospect replies have been read.'
                    : searchQuery
                    ? 'Try searching with a different contact name or email.'
                    : 'Prospect responses from your outreach campaigns will appear here.'}
                </p>
              </div>
            ) : (
              filteredReplies.map((item) => {
                const isSelected = item.id === selectedReplyId;
                const initials = (item.prospectName || item.email || 'CR')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectReply(item)}
                    className={`w-full text-left p-3.5 transition-all relative ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-l-[#0e6de4]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar Circle */}
                      <div
                        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          isSelected
                            ? 'bg-[#0e6de4] text-white shadow-xs'
                            : item.isUnread
                            ? 'bg-blue-100 text-[#0e6de4]'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header: Name + Time */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-xs truncate ${
                              item.isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-800'
                            }`}
                          >
                            {item.prospectName}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {item.date}
                          </span>
                        </div>

                        {/* Company & Subject */}
                        <p className="text-[11px] text-slate-500 truncate font-medium">
                          {item.companyName} {item.campaignName ? `• ${item.campaignName}` : ''}
                        </p>

                        {/* Message Preview Snippet */}
                        <p
                          className={`text-xs truncate mt-1 ${
                            item.isUnread ? 'text-slate-900 font-medium' : 'text-slate-500'
                          }`}
                        >
                          {item.replySent ? `You: ${item.replySent}` : item.replyMessage}
                        </p>
                      </div>

                      {/* Unread Blue Indicator Dot */}
                      {item.isUnread && (
                        <div className="h-2 w-2 rounded-full bg-[#0e6de4] shrink-0 mt-1.5" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================================== */}
        {/* MIDDLE PANEL: Thread History, Selected Conversation Header, Reply Composer */}
        {/* ============================================================================== */}
        <div
          className={`flex-1 flex flex-col bg-white overflow-hidden ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeReply ? (
            <>
              {/* Selected Conversation Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 text-[#0e6de4] flex items-center justify-center text-xs font-bold">
                    {(activeReply.prospectName || 'CR').substring(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {activeReply.prospectName}
                      </h2>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0e6de4] border border-blue-100 font-mono">
                        {activeReply.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {activeReply.email} • {activeReply.companyName}
                    </p>
                  </div>
                </div>

                {/* Conversation Header Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Toggle Read/Unread */}
                  <button
                    onClick={() =>
                      handleToggleReadStatus(activeReply.id, activeReply.isUnread)
                    }
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    title={activeReply.isUnread ? 'Mark as read' : 'Mark as unread'}
                  >
                    {activeReply.isUnread ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  {/* Archive / Unarchive Button */}
                  <button
                    onClick={() =>
                      handleToggleArchive(activeReply.id, Boolean(activeReply.isArchived))
                    }
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    title={activeReply.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    {activeReply.isArchived ? (
                      <ArchiveRestore className="h-4 w-4 text-[#0e6de4]" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Message Thread History Area */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-slate-50/60">
                {/* 1. Original Outbound Form Submission Record */}
                {activeReply.originalMessage && (
                  <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Send className="h-3.5 w-3.5 text-[#0e6de4]" />
                        Initial Website Contact-Form Submission
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">OUTBOUND</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mb-1">
                      Subject: {activeReply.originalSubject || 'Outreach Inquiry'}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {activeReply.originalMessage}
                    </p>
                  </div>
                )}

                {/* 2. Inbound Prospect Reply Bubble */}
                <div className="flex items-start gap-3 max-w-2xl">
                  <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    {(activeReply.prospectName || 'P').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">
                        {activeReply.prospectName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        INBOUND • {activeReply.date}
                      </span>
                    </div>
                    <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {activeReply.replyMessage}
                    </div>
                  </div>
                </div>

                {/* 3. Outbound Email Reply Bubble (if sent) */}
                {activeReply.replySent && (
                  <div className="flex items-start justify-end gap-3 max-w-2xl ml-auto">
                    <div className="flex-1 rounded-2xl bg-[#0e6de4] text-white p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-2 opacity-90 border-b border-white/20 pb-1.5">
                        <span className="text-xs font-bold">You (Outbound Reply)</span>
                        <span className="text-[10px] font-mono opacity-80">
                          OUTBOUND • Delivered
                        </span>
                      </div>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap text-white">
                        {activeReply.replySent}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Reply Composer Bottom Section */}
              <div className="border-t border-slate-200 bg-white p-3 lg:p-4 shrink-0">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-2 focus-within:border-[#0e6de4] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write a reply to ${activeReply.prospectName}...`}
                    className="w-full resize-none bg-transparent p-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                  />

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <div className="text-[11px] text-slate-400">
                      Sending to <span className="font-semibold text-slate-700">{activeReply.email}</span>
                    </div>

                    <Button
                      type="button"
                      onClick={handleSendEmailReply}
                      disabled={isSendingReply || !replyText.trim()}
                      className="bg-[#0e6de4] hover:bg-[#0758bd] text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isSendingReply ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Send Reply</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty State when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
              <div className="relative mb-6">
                <div className="h-24 w-24 rounded-3xl bg-blue-50 text-[#0e6de4] flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <MessageSquare className="h-12 w-12" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <Check className="h-4 w-4" />
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-800">
                Your campaign replies will appear here
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 max-w-sm leading-relaxed">
                Select a conversation from the left to view messages and respond directly.
              </p>
            </div>
          )}
        </div>

        {/* ============================================================================== */}
        {/* RIGHT PANEL: Prospect Details & Campaign Context */}
        {/* ============================================================================== */}
        {activeReply && (
          <div className="hidden lg:flex w-72 flex-col border-l border-slate-200 bg-white p-4 overflow-y-auto shrink-0 space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
                Contact Details
              </h3>

              <div className="space-y-3">
                {/* Prospect Name */}
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400">Contact</p>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {activeReply.prospectName}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">Email Address</p>
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {activeReply.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(activeReply.email)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                    title="Copy email address"
                  >
                    {copiedEmail ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Company Name */}
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400">Company</p>
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {activeReply.companyName}
                    </p>
                  </div>
                </div>

                {/* Website Link */}
                {activeReply.website && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400">Website</p>
                        <p className="text-xs font-medium text-[#0e6de4] truncate">
                          {activeReply.website.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                    </div>
                    <a
                      href={
                        activeReply.website.startsWith('http')
                          ? activeReply.website
                          : `https://${activeReply.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-[#0e6de4]"
                      title="Open website"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Campaign Information */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
                Campaign Info
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Tag className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400">Campaign Name</p>
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {activeReply.campaignName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400">Received Date</p>
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {activeReply.date}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
