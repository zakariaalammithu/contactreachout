'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  Send,
  User,
  Users,
  ShieldAlert,
  ShieldCheck,
  Search,
  RotateCcw,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface NotificationLogItem {
  id: string;
  recipientScope: 'ALL_USERS' | 'SPECIFIC_USER' | 'ADMINS' | 'SUPER_ADMINS';
  recipientUserId?: string | null;
  recipientUserEmail?: string | null;
  recipientUserName?: string | null;
  recipientCount: number;
  title: string;
  message: string;
  sentByUserId: string;
  sentByEmail: string;
  sentByName: string;
  sentAt: string;
  status: 'SENT' | 'FAILED';
  errorMessage?: string | null;
}

export default function AdminNotificationsPage() {
  // Users state
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form state
  const [recipientScope, setRecipientScope] = useState<
    'ALL_USERS' | 'SPECIFIC_USER' | 'ADMINS' | 'SUPER_ADMINS'
  >('ALL_USERS');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // History state
  const [history, setHistory] = useState<NotificationLogItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  // Filter state
  const [search, setSearch] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  // Modal state
  const [selectedLog, setSelectedLog] = useState<NotificationLogItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch initial users and history
  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      const userList = Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : [];
      setUsers(userList);
      if (userList.length > 0 && !selectedUserId) {
        setSelectedUserId(userList[0].id);
      }
    } catch (err) {
      console.error('Failed to load user registry:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (scopeFilter !== 'ALL') query.set('scope', scopeFilter);
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (dateFilter !== 'ALL') query.set('dateRange', dateFilter);

      const res = await fetch(`/api/admin/notifications?${query.toString()}`);
      const data = await res.json();
      if (res.ok && data.history) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to load notification history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Re-fetch history whenever filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, scopeFilter, statusFilter, dateFilter]);

  const handleClearFilters = () => {
    setSearch('');
    setScopeFilter('ALL');
    setStatusFilter('ALL');
    setDateFilter('ALL');
  };

  // Form Validation
  const isFormValid =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (recipientScope !== 'SPECIFIC_USER' || Boolean(selectedUserId));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientScope,
          recipientUserId: recipientScope === 'SPECIFIC_USER' ? selectedUserId : undefined,
          title: title.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch notification.');
      }

      setFeedback({
        type: 'success',
        msg: `Notification successfully sent to ${data.recipients} recipient${data.recipients === 1 ? '' : 's'}.`,
      });

      // Reset text inputs
      setTitle('');
      setMessage('');

      // Refresh history table
      fetchHistory();
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'An error occurred while sending notification.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Are you sure you want to remove this notification history record?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        if (selectedLog?.id === id) setSelectedLog(null);
      }
    } catch (err) {
      console.error('Failed to delete history record:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const renderScopeBadge = (scope: string, email?: string | null, count?: number) => {
    switch (scope) {
      case 'ALL_USERS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#0e6de4] border border-blue-200">
            <Users className="w-3.5 h-3.5" />
            All Standard Users ({count || 'all'})
          </span>
        );
      case 'SPECIFIC_USER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <User className="w-3.5 h-3.5 text-slate-600" />
            {email || 'Specific User'}
          </span>
        );
      case 'ADMINS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            All Admins ({count || 'all'})
          </span>
        );
      case 'SUPER_ADMINS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0e6de4]/10 text-[#0e6de4] border border-blue-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admins Only ({count || 'all'})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {scope}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0e6de4]">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              User & System Notifications
            </h1>
            <p className="mt-0.5 text-sm text-slate-600 font-medium">
              Dispatch platform updates, account alerts, and announcements to users or system admins.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="lg:col-span-2 border border-slate-200 bg-white p-6 shadow-xs rounded-xl space-y-5">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Send className="w-4 h-4 text-[#0e6de4]" />
            Compose Notification
          </h2>

          <form onSubmit={handleSend} className="space-y-5">
            {/* Recipient Target Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Target Recipient Group <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'ALL_USERS',
                    title: 'All Standard Users',
                    desc: 'Broadcast to all user accounts',
                    icon: Users,
                  },
                  {
                    id: 'SPECIFIC_USER',
                    title: 'Specific User',
                    desc: 'Select a individual user account',
                    icon: User,
                  },
                  {
                    id: 'ADMINS',
                    title: 'All Admins',
                    desc: 'Admins & Super Admins',
                    icon: ShieldAlert,
                  },
                  {
                    id: 'SUPER_ADMINS',
                    title: 'Super Admins Only',
                    desc: 'Platform owner accounts',
                    icon: ShieldCheck,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = recipientScope === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setRecipientScope(
                          item.id as 'ALL_USERS' | 'SPECIFIC_USER' | 'ADMINS' | 'SUPER_ADMINS'
                        )
                      }
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-[#0e6de4] bg-blue-50/50 ring-1 ring-[#0e6de4]'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center mt-0.5 ${
                          isSelected ? 'bg-[#0e6de4] text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-bold ${
                            isSelected ? 'text-[#0e6de4]' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Specific User Dropdown (if SPECIFIC_USER selected) */}
            {recipientScope === 'SPECIFIC_USER' && (
              <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="block text-xs font-bold text-slate-900">
                  Select Target User Account <span className="text-red-500">*</span>
                </label>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0e6de4]" />
                    Loading user registry...
                  </div>
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-[#0e6de4] focus:border-[#0e6de4] outline-none"
                  >
                    {users.length === 0 ? (
                      <option value="">No registered users found</option>
                    ) : (
                      users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email} ({u.role})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            )}

            {/* Notification Title Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-900">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {title.length}/100 max
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="e.g. System Maintenance Scheduled for Weekend"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0e6de4] focus:border-[#0e6de4] outline-none transition-all"
              />
            </div>

            {/* Notification Message Textarea */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-900">
                  Notification Message <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {message.length}/1000 max
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={5}
                placeholder="Type full notification content to be delivered to recipient inbox..."
                className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0e6de4] focus:border-[#0e6de4] outline-none transition-all resize-none"
              />
            </div>

            {/* Feedback Alert Banner */}
            {feedback && (
              <div
                className={`p-3.5 rounded-lg border text-sm font-medium flex items-center gap-2.5 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{feedback.msg}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Recipient scope: <strong className="text-slate-800">{recipientScope}</strong>
              </p>
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="bg-[#0e6de4] hover:bg-[#0b5ac0] text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Sending notification...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Side Panel */}
        <div className="space-y-4">
          <Card className="border border-slate-200 bg-white p-5 rounded-xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0e6de4]" />
              Notification Delivery Policy
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0e6de4] mt-1.5 shrink-0" />
                <span>
                  <strong>Instant Delivery:</strong> Notifications appear immediately in recipient
                  inboxes upon dispatch.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0e6de4] mt-1.5 shrink-0" />
                <span>
                  <strong>Tenant Scope Isolation:</strong> Users only receive notifications explicitly
                  addressed to their account or broadcast tiers.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0e6de4] mt-1.5 shrink-0" />
                <span>
                  <strong>Audit Logged:</strong> Every dispatch record is permanently recorded in
                  the admin notification history below.
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Dispatch History Log</h2>
          <p className="text-xs text-slate-600 font-medium">
            Real backend notification dispatch telemetry and recipient delivery status.
          </p>
        </div>

        {/* Compact Search & Filter Bar */}
        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, message, or recipient..."
                className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0e6de4] focus:border-[#0e6de4] outline-none"
              />
            </div>

            {/* Scope Filter */}
            <div>
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0e6de4] outline-none"
              >
                <option value="ALL">All Recipient Scopes</option>
                <option value="ALL_USERS">All Standard Users</option>
                <option value="SPECIFIC_USER">Specific User</option>
                <option value="ADMINS">All Admins</option>
                <option value="SUPER_ADMINS">Super Admins Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0e6de4] outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0e6de4] outline-none"
              >
                <option value="ALL">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Active filter count / Clear button */}
          {(search || scopeFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter !== 'ALL') && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                Showing filtered history ({history.length} record{history.length === 1 ? '' : 's'})
              </span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 text-[#0e6de4] font-semibold hover:underline"
              >
                <RotateCcw className="w-3 h-3" /> Clear Filters
              </button>
            </div>
          )}
        </Card>

        {/* History Table */}
        <Card className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
          {loadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0e6de4]" />
              Loading dispatch history logs...
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Notification Records Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No notification history records match your current search or filter settings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Title & Message</th>
                    <th className="py-3 px-4">Sent By</th>
                    <th className="py-3 px-4">Sent At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800 font-medium">
                  {history.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        {renderScopeBadge(log.recipientScope, log.recipientUserEmail, log.recipientCount)}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 line-clamp-1">{log.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{log.message}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{log.sentByName}</p>
                        <p className="text-[11px] text-slate-500">{log.sentByEmail}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {new Date(log.sentAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            SENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-600 hover:text-[#0e6de4] hover:bg-slate-100 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(log.id)}
                          disabled={deletingId === log.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Delete History Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Inspector Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <Card className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-[#0e6de4] uppercase tracking-wider">
                  Notification Audit Inspector
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedLog.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <span className="text-slate-500 font-semibold block">Target Group:</span>
                  <div className="mt-1">
                    {renderScopeBadge(
                      selectedLog.recipientScope,
                      selectedLog.recipientUserEmail,
                      selectedLog.recipientCount
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Recipients Count:</span>
                  <p className="font-bold text-slate-900 mt-1">{selectedLog.recipientCount} User(s)</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Sent By Admin:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedLog.sentByName}</p>
                  <p className="text-[11px] text-slate-500">{selectedLog.sentByEmail}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Timestamp:</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {new Date(selectedLog.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Full Message Content:</span>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                  {selectedLog.message}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2 rounded-lg"
              >
                Close Inspector
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
