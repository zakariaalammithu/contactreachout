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
import { getInboxReplyError, isAcceptedInboxReply } from '@/lib/services/inbox-reply-response';
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
  mailboxId?: string;
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
  const [durableInbox, setDurableInbox] = useState(false);

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
      const data = await res.json();
      if (res.ok) {
        const msgList: LeadReply[] = data.durable ? (data.conversations || []).map((conversation: any) => {
          const state = Array.isArray(conversation.app_inbox_conversation_members) ? conversation.app_inbox_conversation_members[0] : conversation.app_inbox_conversation_members;
          return { id: conversation.id, conversationId: conversation.provider_thread_id, mailboxId: conversation.connected_mailbox_id, prospectName: 'Gmail conversation', email: '', companyName: '', website: '', campaignName: 'Gmail', date: new Date(conversation.latest_message_at).toLocaleTimeString(), createdAt: conversation.latest_message_at, isUnread: !state?.is_read, isArchived: Boolean(state?.is_archived), status: conversation.status === 'UNMATCHED' ? 'UNMATCHED' : conversation.status === 'REPLIED' ? 'REPLIED' : 'NEW', originalSubject: conversation.subject_preview || '(No subject)', originalMessage: '', replyMessage: '', forwardedToEmail: '' } as LeadReply;
        }) : data.messages || [];
        setDurableInbox(Boolean(data.durable));
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

    if (durableInbox) {
      try {
        const response = await fetch(`/api/inbox/${encodeURIComponent(rep.id)}`, { cache: 'no-store' });
        const detail = await response.json();
        if (!response.ok) throw new Error(detail.error || 'Unable to load conversation.');
        const latest = (detail.messages || []).at(-1);
        if (latest) setReplies((current) => current.map((item) => item.id === rep.id ? { ...item, email: latest.prospect_email || latest.sender_email || item.email, prospectName: latest.prospect_name || item.prospectName, originalSubject: latest.subject || item.originalSubject, replyMessage: latest.reply_message || item.replyMessage, originalMessage: latest.reply_message || item.originalMessage } : item));
      } catch (error) { setToastMessage(error instanceof Error ? error.message : 'Unable to load conversation.'); }
    }

    if (rep.isUnread) {
      setReplies((prev) =>
        prev.map((r) => (r.id === rep.id ? { ...r, isUnread: false } : r))
      );

      try {
        const endpoint = durableInbox ? `/api/inbox/${encodeURIComponent(rep.id)}` : '/api/inbox';
        await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(durableInbox ? { action: 'mark_read' } : { messageId: rep.id, action: 'mark_read' }),
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
      await fetch(durableInbox ? `/api/inbox/${encodeURIComponent(messageId)}` : '/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(durableInbox ? { action: nextUnread ? 'mark_unread' : 'mark_read' } : { messageId, action: nextUnread ? 'mark_unread' : 'mark_read' }),
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
      await fetch(durableInbox ? `/api/inbox/${encodeURIComponent(messageId)}` : '/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(durableInbox ? { action: nextArchived ? 'archive' : 'unarchive' } : { messageId, action: nextArchived ? 'archive' : 'unarchive' }),
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
      const res = await fetch(durableInbox ? `/api/inbox/${encodeURIComponent(targetId)}/reply` : '/api/inbox/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(durableInbox ? { mailboxId: activeReply.mailboxId } : { messageId: targetId }),
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
        alert(`Error sending email reply: ${getInboxReplyError(data)}`);
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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-900 text-zinc-100 overflow-hidden font-sans">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white shadow-xl transition-all animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-950 text-blue-400">
            <InboxIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-100 leading-tight">
              Inbox
            </h1>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Manage campaign replies and conversations in one place.
            </p>
          </div>
        </div>

        {/* Right Header Info Controls */}
        <div className="flex items-center gap-3">
          {/* Reply Forwarding Indicator */}
          {forwardEmail && (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-400">
              <Mail className="h-3.5 w-3.5 text-blue-400" />
              <span>Forwarding replies to:</span>
              <span className="font-semibold text-zinc-100">{forwardEmail}</span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchInboxData(true)}
            disabled={isRefreshing}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 transition-colors disabled:opacity-50"
            title="Refresh Inbox"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main 3-Panel Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ============================================================================== */}
        {/* LEFT PANEL: Search, Filter Tabs, Conversation List */}
        {/* ============================================================================== */}
        <div
          className={`w-full md:w-80 lg:w-88 flex-col border-r border-zinc-800 bg-zinc-950 shrink-0 ${
            mobileView === 'detail' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Box & Filter Header */}
          <div className="p-3 border-b border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, company, email..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-slate-400 focus:border-[#0e6de4] focus:bg-zinc-950 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-400"
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
                      ? 'border-[#0e6de4] bg-blue-950 text-blue-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-900'
                  }`}
                  title="Filter conversations"
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>

                {/* Filter Popover Dropdown */}
                {isFilterMenuOpen && (
                  <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-xl animate-in fade-in zoom-in-95">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
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
                            ? 'bg-blue-950 text-blue-400 font-bold'
                            : 'text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        <span>{st === 'ALL' ? 'All Statuses' : st}</span>
                        {statusFilter === st && <Check className="h-3.5 w-3.5 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Primary Navigation Tabs: All chats | Unread | Archived */}
          <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-900/50 p-1 gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-zinc-950 text-blue-400 shadow-2xs font-bold border border-zinc-800/80'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <span>All chats</span>
              {allCount > 0 && (
                <span className="rounded-full bg-zinc-900 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                  {allCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('unread')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'unread'
                  ? 'bg-zinc-950 text-blue-400 shadow-2xs font-bold border border-zinc-800/80'
                  : 'text-zinc-400 hover:text-zinc-100'
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
                  ? 'bg-zinc-950 text-blue-400 shadow-2xs font-bold border border-zinc-800/80'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <span>Archived</span>
              {archivedCount > 0 && (
                <span className="rounded-full bg-zinc-900 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                  {archivedCount}
                </span>
              )}
            </button>
          </div>

          {/* Conversation List Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#0e6de4] border-t-transparent mb-2"></div>
                Loading conversations...
              </div>
            ) : filteredReplies.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400 mb-3">
                  <InboxIcon className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-300">
                  {activeTab === 'unread'
                    ? 'No unread conversations'
                    : activeTab === 'archived'
                    ? 'No archived conversations'
                    : searchQuery
                    ? 'No matching results'
                    : 'No conversations yet'}
                </h3>
                <p className="mt-1 text-xs text-zinc-400 max-w-[200px] mx-auto">
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
                        ? 'bg-blue-950/70 border-l-4 border-l-[#0e6de4]'
                        : 'hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar Circle */}
                      <div
                        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold ${
                          isSelected
                            ? 'bg-[#0e6de4] text-white shadow-xs'
                            : item.isUnread
                            ? 'bg-blue-900 text-blue-400'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header: Name + Time */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-xs truncate ${
                              item.isUnread ? 'font-black text-zinc-100' : 'font-semibold text-zinc-200'
                            }`}
                          >
                            {item.prospectName}
                          </span>
                          <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                            {item.date}
                          </span>
                        </div>

                        {/* Company & Subject */}
                        <p className="text-[11px] text-zinc-400 truncate font-medium">
                          {item.companyName} {item.campaignName ? `• ${item.campaignName}` : ''}
                        </p>

                        {/* Message Preview Snippet */}
                        <p
                          className={`text-xs truncate mt-1 ${
                            item.isUnread ? 'text-zinc-100 font-medium' : 'text-zinc-400'
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
          className={`flex-1 flex flex-col bg-zinc-950 overflow-hidden ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeReply ? (
            <>
              {/* Selected Conversation Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-900"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="h-9 w-9 shrink-0 rounded-full bg-blue-900 text-blue-400 flex items-center justify-center text-xs font-bold">
                    {(activeReply.prospectName || 'CR').substring(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-zinc-100 truncate">
                        {activeReply.prospectName}
                      </h2>
                      <span className="rounded-full bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-900 font-mono">
                        {activeReply.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
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
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
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
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
                    title={activeReply.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    {activeReply.isArchived ? (
                      <ArchiveRestore className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Message Thread History Area */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-zinc-900/60">
                {/* 1. Original Outbound Form Submission Record */}
                {activeReply.originalMessage && (
                  <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                        <Send className="h-3.5 w-3.5 text-blue-400" />
                        Initial Website Contact-Form Submission
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">OUTBOUND</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-200 mb-1">
                      Subject: {activeReply.originalSubject || 'Outreach Inquiry'}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {activeReply.originalMessage}
                    </p>
                  </div>
                )}

                {/* 2. Inbound Prospect Reply Bubble */}
                <div className="flex items-start gap-3 max-w-2xl">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    {(activeReply.prospectName || 'P').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-100">
                        {activeReply.prospectName}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        INBOUND • {activeReply.date}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
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
              <div className="border-t border-zinc-800 bg-zinc-950 p-3 lg:p-4 shrink-0">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-2 focus-within:border-[#0e6de4] focus-within:bg-zinc-950 focus-within:ring-2 focus-within:ring-blue-900 transition-all">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write a reply to ${activeReply.prospectName}...`}
                    className="w-full resize-none bg-transparent p-1 text-xs text-zinc-100 placeholder-slate-400 focus:outline-none"
                  />

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                    <div className="text-[11px] text-zinc-400">
                      Sending to <span className="font-semibold text-zinc-300">{activeReply.email}</span>
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50">
              <div className="relative mb-6">
                <div className="h-24 w-24 rounded-3xl bg-blue-950 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <MessageSquare className="h-12 w-12" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <Check className="h-4 w-4" />
                </div>
              </div>

              <h2 className="text-base font-bold text-zinc-200">
                Your campaign replies will appear here
              </h2>
              <p className="mt-1.5 text-xs text-zinc-400 max-w-sm leading-relaxed">
                Select a conversation from the left to view messages and respond directly.
              </p>
            </div>
          )}
        </div>

        {/* ============================================================================== */}
        {/* RIGHT PANEL: Prospect Details & Campaign Context */}
        {/* ============================================================================== */}
        {activeReply && (
          <div className="hidden lg:flex w-72 flex-col border-l border-zinc-800 bg-zinc-950 p-4 overflow-y-auto shrink-0 space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono mb-3">
                Contact Details
              </h3>

              <div className="space-y-3">
                {/* Prospect Name */}
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-400">Contact</p>
                    <p className="text-xs font-bold text-zinc-100 truncate">
                      {activeReply.prospectName}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-400">Email Address</p>
                      <p className="text-xs font-medium text-zinc-100 truncate">
                        {activeReply.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(activeReply.email)}
                    className="p-1 text-zinc-400 hover:text-zinc-300"
                    title="Copy email address"
                  >
                    {copiedEmail ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Company Name */}
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-400">Company</p>
                    <p className="text-xs font-semibold text-zinc-100 truncate">
                      {activeReply.companyName}
                    </p>
                  </div>
                </div>

                {/* Website Link */}
                {activeReply.website && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Globe className="h-4 w-4 text-zinc-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-400">Website</p>
                        <p className="text-xs font-medium text-blue-400 truncate">
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
                      className="p-1 text-zinc-400 hover:text-blue-400"
                      title="Open website"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Campaign Information */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono mb-3">
                Campaign Info
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Tag className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-400">Campaign Name</p>
                    <p className="text-xs font-semibold text-zinc-100 truncate">
                      {activeReply.campaignName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-400">Received Date</p>
                    <p className="text-xs font-medium text-zinc-100 truncate">
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
