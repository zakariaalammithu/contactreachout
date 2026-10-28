'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Shield,
  KeyRound,
  Ban,
  CheckCircle2,
  Mail,
  UserCheck,
  Eye,
  Trash2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  CreditCard,
  BarChart3,
  AlertTriangle,
  MoreVertical,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface UserData {
  id: string;
  name: string;
  email: string;
  company?: string;
  avatarUrl?: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  isSuspended: boolean;
  isEmailVerified: boolean;
  plan: string;
  availableCredits: number;
  usedCredits: number;
  freeMonthlyCredits: number;
  purchasedCredits: number;
  bonusCredits: number;
  campaignsCount: number;
  prospectsCount: number;
  successfulSubmissions: number;
  failedSubmissions: number;
  noFormResults: number;
  reviewResults: number;
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  
  // Active 3-dot Dropdown Menu Row ID State
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  // Avatar loading error tracker per user ID
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  const handleAvatarError = (userId: string) => {
    setFailedAvatars((prev) => ({ ...prev, [userId]: true }));
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Bulk Selection
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'suspend' | 'activate'>('suspend');

  // Column Customizer State
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'user', label: 'User', visible: true },
    { key: 'role', label: 'Role', visible: true },
    { key: 'status', label: 'Account Status', visible: true },
    { key: 'verification', label: 'Email Verification', visible: true },
    { key: 'plan', label: 'Plan', visible: true },
    { key: 'credits', label: 'Credits', visible: true },
    { key: 'campaigns', label: 'Campaigns', visible: true },
    { key: 'createdAt', label: 'Created At', visible: true },
    { key: 'lastLogin', label: 'Last Login', visible: true },
    { key: 'actions', label: 'Actions', visible: true },
  ]);
  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);

  // Modals & Panels State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserData | null>(null);
  const [creditGrantAmount, setCreditGrantAmount] = useState('');
  const [creditGrantReason, setCreditGrantReason] = useState('');
  const [isGrantingCredits, setIsGrantingCredits] = useState(false);
  
  // Role Change Modal State
  const [roleModalData, setRoleModalData] = useState<{ user: UserData; targetRole: 'SUPER_ADMIN' | 'ADMIN' | 'USER' } | null>(null);
  
  // Suspend/Activate Modal State
  const [suspendModalData, setSuspendModalData] = useState<{ user: UserData; targetSuspended: boolean } | null>(null);

  // Password Reset Modal State
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<UserData | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  // Delete User Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<UserData | null>(null);
  const [deleteConfirmEmailInput, setDeleteConfirmEmailInput] = useState('');

  // Form State for Create User
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    company: '',
    avatarUrl: '',
    role: 'USER' as 'USER' | 'ADMIN',
    password: '',
    isEmailVerified: true,
    plan: 'Free',
    initialCredits: 0,
  });

  // Action Feedback Toast
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setActionError(null);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setActionSuccess(null);
    setTimeout(() => setActionError(null), 5000);
  };

  // Close 3-dot dropdown menu on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuUserId && !(event.target as HTMLElement).closest('.user-action-menu-container')) {
        setActiveMenuUserId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenuUserId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuUserId]);

  // Fetch Users Function
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        role: roleFilter,
        status: statusFilter,
        verification: verificationFilter,
        plan: planFilter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();

      if (json.users) {
        setUsers(json.users);
        setTotalUsers(json.pagination.total);
        setTotalPages(json.pagination.totalPages);
        if (json.currentUserEmail) setCurrentUserEmail(json.currentUserEmail);
        if (json.currentUserRole) setCurrentUserRole(json.currentUserRole);
      } else if (json.error) {
        showError(json.error);
      }
    } catch {
      showError('Failed to fetch user directory from server.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, verificationFilter, planFilter, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const grantCredits = async () => {
    if (!selectedUserForDetails || isGrantingCredits) return;
    const amount = Number(creditGrantAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      showError('Enter a valid positive whole-number credit amount.');
      return;
    }
    setIsGrantingCredits(true);
    try {
      const response = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserEmail: selectedUserForDetails.email, amount, reason: creditGrantReason, requestId: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Credit grant failed.');
      setSelectedUserForDetails((user) => user ? { ...user, availableCredits: data.wallet.totalCreditsAvailable, bonusCredits: data.wallet.bonusCredits } : user);
      setCreditGrantAmount('');
      setCreditGrantReason('');
      showSuccess(`${amount.toLocaleString()} credits granted to ${selectedUserForDetails.email}.`);
      void fetchUsers();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Credit grant failed.');
    } finally {
      setIsGrantingCredits(false);
    }
  };

  // Toggle Column Visibility
  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  const isColumnVisible = (key: string) => {
    const col = columns.find((c) => c.key === key);
    return col ? col.visible : true;
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();

      if (json.success) {
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          company: '',
          avatarUrl: '',
          role: 'USER',
          password: '',
          isEmailVerified: true,
          plan: 'Free',
          initialCredits: 0,
        });
        showSuccess(`Account for ${createForm.email} provisioned successfully.`);
        fetchUsers();
      } else {
        showError(json.error || 'Failed to create user account.');
      }
    } catch (err: any) {
      showError(err.message || 'Server error creating account.');
    }
  };

  // Confirm Role Change Handler
  const executeRoleChange = async () => {
    if (!roleModalData) return;
    const { user, targetRole } = roleModalData;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, role: targetRole }),
      });
      const json = await res.json();

      if (json.success) {
        setRoleModalData(null);
        showSuccess(`Role for ${user.email} updated to ${targetRole}.`);
        fetchUsers();
      } else {
        showError(json.error || 'Failed to change user role.');
      }
    } catch (err: any) {
      showError(err.message || 'Network error updating role.');
    }
  };

  // Confirm Suspend / Reactivate Handler
  const executeSuspendToggle = async () => {
    if (!suspendModalData) return;
    const { user, targetSuspended } = suspendModalData;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, isSuspended: targetSuspended }),
      });
      const json = await res.json();

      if (json.success) {
        setSuspendModalData(null);
        showSuccess(
          targetSuspended
            ? `Account ${user.email} suspended. Active sessions terminated.`
            : `Account ${user.email} reactivated successfully.`
        );
        fetchUsers();
      } else {
        showError(json.error || 'Failed to update account status.');
      }
    } catch (err: any) {
      showError(err.message || 'Network error updating account status.');
    }
  };

  // Password Reset Trigger Handler
  const executePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModalUser) return;

    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetPasswordModalUser.email,
          newPassword: tempPassword || undefined,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const targetEmail = resetPasswordModalUser.email;
        setResetPasswordModalUser(null);
        setTempPassword('');
        showSuccess(json.message || `Password reset process initiated for ${targetEmail}.`);
      } else {
        showError(json.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      showError(err.message || 'Network error initiating reset.');
    }
  };

  // Confirm Delete User Handler
  const executeDeleteUser = async () => {
    if (!deleteModalUser) return;

    if (deleteConfirmEmailInput.trim().toLowerCase() !== deleteModalUser.email.toLowerCase()) {
      showError('Entered email does not match target user email.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: deleteModalUser.email,
          confirmEmail: deleteConfirmEmailInput.trim(),
        }),
      });
      const json = await res.json();

      if (json.success) {
        const deletedEmail = deleteModalUser.email;
        setDeleteModalUser(null);
        setDeleteConfirmEmailInput('');
        showSuccess(`User ${deletedEmail} permanently deleted.`);
        fetchUsers();
      } else {
        showError(json.error || 'Failed to delete user.');
      }
    } catch (err: any) {
      showError(err.message || 'Network error deleting user.');
    }
  };

  // Bulk Action Execution Handler
  const executeBulkAction = async () => {
    if (selectedEmails.length === 0) return;
    const targetSuspended = bulkActionType === 'suspend';

    let successCount = 0;
    let failedCount = 0;

    for (const email of selectedEmails) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, isSuspended: targetSuspended }),
        });
        const json = await res.json();
        if (json.success) successCount++;
        else failedCount++;
      } catch {
        failedCount++;
      }
    }

    setIsBulkModalOpen(false);
    setSelectedEmails([]);
    fetchUsers();

    if (failedCount === 0) {
      showSuccess(`Bulk ${bulkActionType} completed for ${successCount} accounts.`);
    } else {
      showError(`Bulk action completed: ${successCount} updated, ${failedCount} failed.`);
    }
  };

  // Checkbox select handlers
  const toggleSelectAll = () => {
    if (selectedEmails.length === users.length) {
      setSelectedEmails([]);
    } else {
      const selectable = users
        .filter((u) => u.email !== currentUserEmail && u.email !== 'mithusquare@gmail.com')
        .map((u) => u.email);
      setSelectedEmails(selectable);
    }
  };

  const toggleSelectUser = (email: string) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  const activeFilterCount =
    (roleFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (verificationFilter !== 'all' ? 1 : 0) +
    (planFilter !== 'all' ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setVerificationFilter('all');
    setPlanFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-6 text-zinc-100">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-[#0e6de4]/10 text-blue-400 border-[#0e6de4]/25 text-[10px] font-mono uppercase tracking-wider font-semibold">
              SUPER ADMIN GOVERNANCE
            </Badge>
            <span className="text-xs text-zinc-400 font-mono">• Server-Authorized Session</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-blue-400" />
            User Management & Permissions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-normal">
            Manage multi-tenant user accounts, assign role permissions, suspend access, and review real system analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="text-xs h-9 border-zinc-800 hover:border-[#0e6de4] text-zinc-100 hover:text-blue-400 bg-zinc-950 shadow-xs font-semibold">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
              Preview User Dashboard
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomizeColumnsOpen(!isCustomizeColumnsOpen)}
            className="text-xs h-9 border-zinc-800 hover:border-[#0e6de4] text-zinc-100 hover:text-blue-400 bg-zinc-950 shadow-xs font-semibold"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
            Customize Columns
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs h-9 bg-[#0e6de4] hover:bg-[#0c5bc0] text-white font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create User Account
          </Button>
        </div>
      </div>

      {/* Action Toast Banners */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-800 bg-emerald-950 text-xs font-medium text-emerald-200 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-300 hover:text-emerald-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl border border-rose-800 bg-rose-950 text-xs font-medium text-rose-200 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-300 hover:text-rose-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Column Customizer Panel */}
      {isCustomizeColumnsOpen && (
        <Card className="p-4 bg-zinc-950 border border-zinc-800 shadow-lg rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2 font-mono">
              <SlidersHorizontal className="h-4 w-4 text-blue-400" />
              Table Column Customization
            </h4>
            <button onClick={() => setIsCustomizeColumnsOpen(false)} className="text-zinc-400 hover:text-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-[#0e6de4] cursor-pointer select-none transition-colors"
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleColumn(col.key)}
                  className="rounded border-zinc-700 bg-zinc-950 text-blue-400 focus:ring-[#0e6de4] h-3.5 w-3.5"
                />
                <span className={col.visible ? 'text-zinc-100 font-semibold' : 'text-zinc-400'}>
                  {col.label}
                </span>
              </label>
            ))}
          </div>
        </Card>
      )}

      {/* Search & Multi-Filter Control Bar */}
      <Card className="p-4 bg-zinc-950 border border-zinc-800 shadow-sm rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search Name, Email, User ID, Company..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-[#9CA3AF] focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none transition-colors font-medium"
            />
          </div>

          {/* Role Filter */}
          <div className="sm:col-span-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none font-medium"
            >
              <option value="all">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>
          </div>

          {/* Account Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Verification Filter */}
          <div className="sm:col-span-2">
            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none font-medium"
            >
              <option value="all">All Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="sm:col-span-2">
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none font-medium"
            >
              <option value="all">All Plans</option>
              <option value="Free">Free</option>
              <option value="Starter">Starter</option>
              <option value="Growth">Growth</option>
              <option value="Scale">Scale</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Bulk Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Total Users:</span>
            <span className="font-bold text-blue-400 font-mono">{totalUsers}</span>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold h-6 px-2"
              >
                Reset Filters ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Bulk Selection Actions */}
          {selectedEmails.length > 0 && (
            <div className="flex items-center gap-2 bg-[#0e6de4]/10 border border-[#0e6de4]/30 px-3 py-1 rounded-lg">
              <span className="text-blue-400 font-bold font-mono text-[11px]">
                {selectedEmails.length} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setBulkActionType('suspend');
                  setIsBulkModalOpen(true);
                }}
                className="h-6 text-[10px] px-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Suspend Selected
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => {
                  setBulkActionType('activate');
                  setIsBulkModalOpen(true);
                }}
                className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Activate Selected
              </Button>
            </div>
          )}

          {/* Sort Control */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-zinc-400 text-[11px]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-100 font-medium"
            >
              <option value="createdAt">Created Date</option>
              <option value="lastLoginAt">Last Login</option>
              <option value="name">Name</option>
              <option value="credits">Available Credits</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 rounded bg-zinc-900 text-zinc-100 hover:bg-zinc-800 text-[11px] font-mono font-bold uppercase border border-zinc-800"
              title="Toggle sort direction"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </Card>

      {/* Users Data Table */}
      <Card className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111827] border-b border-[#1F2937] text-white font-mono uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedEmails.length === users.length}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-600 bg-[#1F2937] text-blue-400 focus:ring-[#0e6de4] h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                {isColumnVisible('user') && <th className="px-5 py-3.5 text-white font-bold">User</th>}
                {isColumnVisible('role') && <th className="px-4 py-3.5 text-white font-bold">Assigned Role</th>}
                {isColumnVisible('status') && <th className="px-4 py-3.5 text-white font-bold">Account Status</th>}
                {isColumnVisible('verification') && <th className="px-4 py-3.5 text-white font-bold">Verification</th>}
                {isColumnVisible('plan') && <th className="px-4 py-3.5 text-white font-bold">Plan</th>}
                {isColumnVisible('credits') && <th className="px-4 py-3.5 text-white font-bold">Credits</th>}
                {isColumnVisible('campaigns') && <th className="px-4 py-3.5 text-white font-bold">Campaigns</th>}
                {isColumnVisible('createdAt') && <th className="px-4 py-3.5 text-white font-bold">Created At</th>}
                {isColumnVisible('lastLogin') && <th className="px-4 py-3.5 text-white font-bold">Last Login</th>}
                {isColumnVisible('actions') && <th className="px-5 py-3.5 text-right text-white font-bold">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800 bg-zinc-950">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={11} className="px-5 py-4">
                      <div className="h-6 bg-zinc-900 rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-zinc-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-zinc-400" />
                    <p className="font-bold text-zinc-100">No user accounts found.</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Try refining your search query or filters.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf =
                    user.email.toLowerCase().trim() === currentUserEmail.toLowerCase().trim();
                  const isPrimarySuperAdmin =
                    user.email.toLowerCase().trim() === 'mithusquare@gmail.com';
                  const isSelected = selectedEmails.includes(user.email);
                  const isMenuOpen = activeMenuUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-[#0e6de4]/[0.04] transition-colors ${
                        user.isSuspended ? 'bg-rose-950/50' : ''
                      } ${isSelected ? 'bg-[#0e6de4]/[0.08]' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          disabled={isSelf || isPrimarySuperAdmin}
                          checked={isSelected}
                          onChange={() => toggleSelectUser(user.email)}
                          className="rounded border-zinc-700 bg-zinc-950 text-blue-400 focus:ring-[#0e6de4] h-3.5 w-3.5 cursor-pointer disabled:opacity-30"
                        />
                      </td>

                      {/* User Column (Real User Profile Image with Neutral Fallback) */}
                      {isColumnVisible('user') && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {user.avatarUrl && !failedAvatars[user.id] ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.name}
                                onError={() => handleAvatarError(user.id)}
                                className="h-9 w-9 rounded-full object-cover border border-zinc-800 shrink-0 shadow-xs"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-[#0e6de4] flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 select-none">
                                {user.email.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-zinc-100 truncate text-xs">{user.name}</p>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#0e6de4]/10 text-blue-400 border border-[#0e6de4]/30 font-bold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate font-medium">{user.email}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-zinc-400 font-mono">ID: {user.id}</span>
                                {user.company && (
                                  <span className="text-[9px] text-zinc-300 bg-zinc-900 border border-zinc-800 px-1.5 rounded font-medium">
                                    {user.company}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Role Badges */}
                      {isColumnVisible('role') && (
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              user.role === 'SUPER_ADMIN'
                                ? 'bg-[#0e6de4]/10 text-blue-400 border-[#0e6de4]/30'
                                : user.role === 'ADMIN'
                                ? 'bg-zinc-900 text-zinc-100 border-zinc-800'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                            }`}
                          >
                            <Shield className="h-3 w-3" />
                            {user.role}
                          </span>
                        </td>
                      )}

                      {/* Account Status */}
                      {isColumnVisible('status') && (
                        <td className="px-4 py-4">
                          {user.isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-900">
                              <Ban className="h-3 w-3" />
                              SUSPENDED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-900">
                              <CheckCircle2 className="h-3 w-3" />
                              ACTIVE
                            </span>
                          )}
                        </td>
                      )}

                      {/* Email Verification */}
                      {isColumnVisible('verification') && (
                        <td className="px-4 py-4">
                          {user.isEmailVerified ? (
                            <span className="text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5" />
                              Verified
                            </span>
                          ) : (
                            <span className="text-amber-300 font-semibold text-[11px] flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              Unverified
                            </span>
                          )}
                        </td>
                      )}

                      {/* Plan Badges */}
                      {isColumnVisible('plan') && (
                        <td className="px-4 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                              user.plan.toLowerCase().includes('enterprise') || user.plan.toLowerCase().includes('admin')
                                ? 'bg-[#0e6de4]/10 text-blue-400 border-[#0e6de4]/30 font-semibold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 font-medium'
                            }`}
                          >
                            {user.plan}
                          </span>
                        </td>
                      )}

                      {/* Credits */}
                      {isColumnVisible('credits') && (
                        <td className="px-4 py-4 font-mono text-[11px]">
                          <p className="text-blue-400 font-bold">{user.availableCredits.toLocaleString()}</p>
                          <p className="text-[10px] text-zinc-400">Avail. Credits</p>
                        </td>
                      )}

                      {/* Campaigns Count */}
                      {isColumnVisible('campaigns') && (
                        <td className="px-4 py-4 font-mono text-[11px] text-center">
                          <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-100 font-bold border border-zinc-800">
                            {user.campaignsCount}
                          </span>
                        </td>
                      )}

                      {/* Created At */}
                      {isColumnVisible('createdAt') && (
                        <td className="px-4 py-4 text-zinc-400 font-mono text-[11px]">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      )}

                      {/* Last Login */}
                      {isColumnVisible('lastLogin') && (
                        <td className="px-4 py-4 text-zinc-400 font-mono text-[11px]">
                          {user.lastLoginAt ? (
                            new Date(user.lastLoginAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ) : (
                            <span className="text-zinc-400">Never</span>
                          )}
                        </td>
                      )}

                      {/* Actions Column (Eye, Role, Reset, 3-dot menu) */}
                      {isColumnVisible('actions') && (
                        <td className="px-5 py-4 text-right overflow-visible">
                          <div className="flex items-center justify-end gap-1.5 user-action-menu-container relative">
                            {/* View Details Drawer Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUserForDetails(user)}
                              className="h-7 w-7 p-0 text-blue-400 hover:bg-[#0e6de4]/10 border-zinc-800 bg-zinc-950 shadow-xs"
                              title="View Full Profile Details"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-400" />
                            </Button>

                            {/* Role Selector Dropdown */}
                            {!isPrimarySuperAdmin && !isSelf ? (
                              <select
                                value={user.role}
                                onChange={(e) =>
                                  setRoleModalData({
                                    user,
                                    targetRole: e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'USER',
                                  })
                                }
                                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-100 font-medium focus:border-[#0e6de4] focus:outline-none"
                              >
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                                {currentUserRole === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                              </select>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-mono px-2 py-1 bg-zinc-900 rounded border border-zinc-800">
                                Protected
                              </span>
                            )}

                            {/* Reset Password Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setResetPasswordModalUser(user)}
                              className="h-7 px-2 text-[11px] border-zinc-800 hover:border-[#0e6de4] text-blue-400 bg-zinc-950 font-medium"
                              title="Reset Password"
                            >
                              <KeyRound className="h-3 w-3 mr-1 text-blue-400" />
                              Reset
                            </Button>

                            {/* 3-DOT MORE ACTIONS MENU */}
                            <div className="relative inline-block text-left">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuUserId(isMenuOpen ? null : user.id);
                                }}
                                className={`h-7 w-7 p-0 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 transition-colors ${
                                  isMenuOpen ? 'border-[#0e6de4] bg-[#0e6de4]/5' : ''
                                }`}
                                title="More User Actions"
                              >
                                <MoreVertical className="h-3.5 w-3.5 text-zinc-300" />
                              </Button>

                              {isMenuOpen && (
                                <div className="absolute right-0 top-8 z-50 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl text-left font-sans text-xs space-y-0.5">
                                  <button
                                    onClick={() => {
                                      setSelectedUserForDetails(user);
                                      setActiveMenuUserId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-zinc-900 text-zinc-100 font-medium rounded-lg transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-blue-400" />
                                    View Details
                                  </button>

                                  <button
                                    onClick={() => {
                                      setResetPasswordModalUser(user);
                                      setActiveMenuUserId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-zinc-900 text-zinc-100 font-medium rounded-lg transition-colors"
                                  >
                                    <KeyRound className="h-3.5 w-3.5 text-blue-400" />
                                    Reset Password
                                  </button>

                                  {!isPrimarySuperAdmin && !isSelf ? (
                                    <button
                                      onClick={() => {
                                        setSuspendModalData({
                                          user,
                                          targetSuspended: !user.isSuspended,
                                        });
                                        setActiveMenuUserId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-zinc-900 text-zinc-100 font-medium rounded-lg transition-colors"
                                    >
                                      {user.isSuspended ? (
                                        <>
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                          Activate Account
                                        </>
                                      ) : (
                                        <>
                                          <Ban className="h-3.5 w-3.5 text-amber-400" />
                                          Suspend Account
                                        </>
                                      )}
                                    </button>
                                  ) : null}

                                  <div className="border-t border-zinc-800 my-1" />

                                  {!isPrimarySuperAdmin && !isSelf ? (
                                    <button
                                      onClick={() => {
                                        setDeleteModalUser(user);
                                        setDeleteConfirmEmailInput('');
                                        setActiveMenuUserId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-rose-950 text-rose-400 font-semibold rounded-lg transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                                      Delete User
                                    </button>
                                  ) : (
                                    <div className="px-2.5 py-1 text-[10px] text-zinc-400 font-mono">
                                      Account Protection Active
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-zinc-950 border-t border-zinc-800 text-xs">
          <div className="text-zinc-400 font-mono text-[11px]">
            Showing <span className="font-bold text-zinc-100">{users.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-bold text-zinc-100">{Math.min(page * limit, totalUsers)}</span> of{' '}
            <span className="font-bold text-blue-400">{totalUsers}</span> users
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-100 font-medium focus:border-[#0e6de4]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <div className="flex items-center gap-1 ml-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-7 w-7 p-0 border-zinc-800 text-zinc-100"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 font-mono text-[11px] text-zinc-100 font-semibold">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="h-7 w-7 p-0 border-zinc-800 text-zinc-100"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* CREATE USER ACCOUNT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 space-y-4 border-zinc-800 bg-zinc-950 shadow-2xl rounded-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-400" />
                Provision New User Account
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Full Name</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Alex Morgan"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder-[#9CA3AF] focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="user@enterprise.com"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder-[#9CA3AF] focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Company (Optional)</label>
                  <input
                    type="text"
                    value={createForm.company}
                    onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                    placeholder="Acme Inc"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder-[#9CA3AF] focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Assigned Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none font-medium"
                  >
                    <option value="USER">USER (Standard Operator)</option>
                    <option value="ADMIN">ADMIN (Campaign & Team Manager)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  value={createForm.avatarUrl}
                  onChange={(e) => setCreateForm({ ...createForm, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder-[#9CA3AF] focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Initial Password * (Min 12 characters)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="At least 12 characters"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder-[#9CA3AF] focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Subscription Plan</label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none font-medium"
                  >
                    <option value="Free">Free</option>
                    <option value="Starter">Starter</option>
                    <option value="Growth">Growth</option>
                    <option value="Scale">Scale</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Initial Paid Credits</label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.initialCredits}
                    onChange={(e) => setCreateForm({ ...createForm, initialCredits: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create-verify"
                  checked={createForm.isEmailVerified}
                  onChange={(e) => setCreateForm({ ...createForm, isEmailVerified: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-950 text-blue-400 focus:ring-[#0e6de4] h-4 w-4"
                />
                <label htmlFor="create-verify" className="text-zinc-300 font-medium cursor-pointer select-none">
                  Mark email as verified upon creation
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)} className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#0e6de4] hover:bg-[#0c5bc0] text-white font-semibold">
                  Create Account
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* USER DETAILS SLIDE-OVER DRAWER */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                {selectedUserForDetails.avatarUrl && !failedAvatars[selectedUserForDetails.id] ? (
                  <img
                    src={selectedUserForDetails.avatarUrl}
                    alt={selectedUserForDetails.name}
                    onError={() => handleAvatarError(selectedUserForDetails.id)}
                    className="h-10 w-10 rounded-full object-cover border border-zinc-800 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[#0e6de4] flex items-center justify-center text-sm font-bold text-white shadow-xs shrink-0 select-none">
                    {selectedUserForDetails.email.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-zinc-100">{selectedUserForDetails.name}</h3>
                  <p className="text-xs text-zinc-400">{selectedUserForDetails.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Account Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono flex items-center gap-2">
                <Users className="h-4 w-4" /> Account Information
              </h4>
              <Card className="p-4 bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-400">User ID:</span>
                    <p className="font-mono text-zinc-100 font-bold">{selectedUserForDetails.id}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Assigned Role:</span>
                    <p className="font-mono text-blue-400 font-bold">{selectedUserForDetails.role}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Account Status:</span>
                    <p className={selectedUserForDetails.isSuspended ? 'text-rose-400 font-bold' : 'text-emerald-300 font-bold'}>
                      {selectedUserForDetails.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Email Verification:</span>
                    <p className={selectedUserForDetails.isEmailVerified ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                      {selectedUserForDetails.isEmailVerified ? 'Verified' : 'Unverified'}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Created At:</span>
                    <p className="text-zinc-300 font-medium">{new Date(selectedUserForDetails.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Last Login:</span>
                    <p className="text-zinc-300 font-medium">
                      {selectedUserForDetails.lastLoginAt
                        ? new Date(selectedUserForDetails.lastLoginAt).toLocaleString()
                        : 'Never logged in'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-zinc-800 pt-4 space-y-3">
                  <p className="font-bold text-zinc-100">Add Credits</p>
                  <div className="flex flex-wrap gap-2">
                    {[10, 20, 100, 500, 1000].map((amount) => <button key={amount} type="button" onClick={() => setCreditGrantAmount(String(amount))} className="rounded-lg border border-blue-900 bg-zinc-950 px-2.5 py-1 text-[11px] font-bold text-blue-400 hover:bg-blue-950">+{amount}</button>)}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input type="number" min="1" step="1" value={creditGrantAmount} onChange={(event) => setCreditGrantAmount(event.target.value)} placeholder="Custom amount" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2" />
                    <input value={creditGrantReason} onChange={(event) => setCreditGrantReason(event.target.value)} maxLength={500} placeholder="Optional reason" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2" />
                  </div>
                  <p className="text-[11px] text-zinc-400">Current balance: {selectedUserForDetails.availableCredits.toLocaleString()} credits</p>
                  <Button type="button" disabled={isGrantingCredits || !creditGrantAmount} onClick={grantCredits} className="bg-[#0e6de4] text-white hover:bg-[#0b5ac0] disabled:opacity-50">{isGrantingCredits ? 'Granting…' : 'Confirm Add Credits'}</Button>
                </div>
              </Card>
            </div>

            {/* Section 2: Billing & Credits */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Billing & Credit Wallet
              </h4>
              <Card className="p-4 bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-zinc-400">Current Plan:</span>
                    <p className="font-mono text-zinc-100 font-bold text-sm">{selectedUserForDetails.plan}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Total Available Credits:</span>
                    <p className="font-mono text-blue-400 font-bold text-sm">
                      {selectedUserForDetails.availableCredits.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Free Monthly Grant:</span>
                    <p className="font-mono text-zinc-300 font-medium">{selectedUserForDetails.freeMonthlyCredits.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Purchased Credits:</span>
                    <p className="font-mono text-zinc-300 font-medium">{selectedUserForDetails.purchasedCredits.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Bonus Credits:</span>
                    <p className="font-mono text-zinc-300 font-medium">{selectedUserForDetails.bonusCredits.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Used Credits:</span>
                    <p className="font-mono text-zinc-300 font-medium">{selectedUserForDetails.usedCredits.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Section 3: Campaign Activity */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Activity & Campaign Metrics
              </h4>
              <Card className="p-4 bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase">Total Campaigns</span>
                    <p className="text-base font-bold text-zinc-100 font-mono">{selectedUserForDetails.campaignsCount}</p>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase">Total Prospects</span>
                    <p className="text-base font-bold text-zinc-300 font-mono">{selectedUserForDetails.prospectsCount}</p>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase">Successful Submissions</span>
                    <p className="text-base font-bold text-emerald-300 font-mono">
                      {selectedUserForDetails.successfulSubmissions}
                    </p>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase">Failed Submissions</span>
                    <p className="text-base font-bold text-rose-300 font-mono">{selectedUserForDetails.failedSubmissions}</p>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase">No-Form Results</span>
                    <p className="text-base font-bold text-amber-300 font-mono">{selectedUserForDetails.noFormResults}</p>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase">Replies</span>
                    <p className="text-base font-bold text-blue-400 font-mono">{selectedUserForDetails.repliesCount}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedUserForDetails(null)} className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                Close Panel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ROLE CHANGE MODAL */}
      {roleModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 space-y-4 border-zinc-800 bg-zinc-950 shadow-2xl rounded-2xl text-zinc-100">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              Confirm Role Modification
            </h3>
            <p className="text-xs text-zinc-300">
              Are you sure you want to change the role of user{' '}
              <strong className="text-zinc-100 font-mono">{roleModalData.user.email}</strong> from{' '}
              <span className="text-zinc-400 font-bold">{roleModalData.user.role}</span> to{' '}
              <span className="text-blue-400 font-bold">{roleModalData.targetRole}</span>?
            </p>
            <div className="p-3 bg-[#0e6de4]/5 border border-[#0e6de4]/20 rounded-lg text-[11px] text-blue-400 font-medium">
              This will update server-side authorization policies and invalidate cached permission tokens.
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button variant="secondary" size="sm" onClick={() => setRoleModalData(null)} className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={executeRoleChange} className="bg-[#0e6de4] hover:bg-[#0c5bc0] text-white font-semibold">
                Confirm Role Change
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* CONFIRM SUSPEND / ACTIVATE MODAL */}
      {suspendModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 space-y-4 border-zinc-800 bg-zinc-950 shadow-2xl rounded-2xl text-zinc-100">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              {suspendModalData.targetSuspended ? 'Confirm Account Suspension' : 'Confirm Account Activation'}
            </h3>
            <p className="text-xs text-zinc-300">
              {suspendModalData.targetSuspended
                ? `Are you sure you want to suspend account ${suspendModalData.user.email}?`
                : `Are you sure you want to reactivate access for ${suspendModalData.user.email}?`}
            </p>

            {suspendModalData.targetSuspended && (
              <div className="p-3 bg-rose-950 border border-rose-900 rounded-lg text-[11px] text-rose-300 space-y-1">
                <p className="font-bold">Suspension Impact:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>User will immediately lose access to protected features.</li>
                  <li>All active sessions and tokens will be revoked.</li>
                  <li>Historical campaign, lead, and CRM data will remain preserved.</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button variant="secondary" size="sm" onClick={() => setSuspendModalData(null)} className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button
                variant={suspendModalData.targetSuspended ? 'destructive' : 'success'}
                size="sm"
                onClick={executeSuspendToggle}
                className={suspendModalData.targetSuspended ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'}
              >
                {suspendModalData.targetSuspended ? 'Suspend Account' : 'Reactivate Account'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetPasswordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 space-y-4 border-zinc-800 bg-zinc-950 shadow-2xl rounded-2xl text-zinc-100">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-400" />
              Reset Account Password
            </h3>
            <p className="text-xs text-zinc-300">
              Initiating password reset for <strong className="text-zinc-100 font-mono">{resetPasswordModalUser.email}</strong>.
            </p>

            <form onSubmit={executePasswordReset} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Set New Temporary Password (Optional)</label>
                <input
                  type="password"
                  minLength={12}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Leave empty to generate secure reset procedure"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder-[#9CA3AF] focus:border-[#0e6de4] focus:ring-1 focus:ring-[#0e6de4] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setResetPasswordModalUser(null)} className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#0e6de4] hover:bg-[#0c5bc0] text-white font-bold">
                  Reset Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 space-y-4 border-rose-800 bg-zinc-950 shadow-2xl rounded-2xl text-zinc-100">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-400" />
              Confirm Permanent Account Deletion
            </h3>
            <p className="text-xs text-zinc-300">
              This action <strong className="text-rose-400 font-bold">cannot be undone</strong>. To confirm permanent deletion of{' '}
              <strong className="text-zinc-100 font-mono">{deleteModalUser.email}</strong>, type the target user's email address below:
            </p>

            <div className="space-y-1.5 text-xs">
              <input
                type="text"
                value={deleteConfirmEmailInput}
                onChange={(e) => setDeleteConfirmEmailInput(e.target.value)}
                placeholder={deleteModalUser.email}
                className="w-full rounded-xl border border-rose-800 bg-zinc-950 px-3 py-2 text-zinc-100 focus:border-rose-600 focus:outline-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDeleteModalUser(null);
                  setDeleteConfirmEmailInput('');
                }}
                className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteConfirmEmailInput.trim().toLowerCase() !== deleteModalUser.email.toLowerCase()}
                onClick={executeDeleteUser}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-40"
              >
                Delete Account Permanently
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* BULK ACTION CONFIRMATION MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6 space-y-4 border-zinc-800 bg-zinc-950 shadow-2xl rounded-2xl text-zinc-100">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Confirm Bulk {bulkActionType === 'suspend' ? 'Suspension' : 'Activation'}
            </h3>
            <p className="text-xs text-zinc-300">
              Are you sure you want to <strong className="text-zinc-100 uppercase">{bulkActionType}</strong> {selectedEmails.length}{' '}
              selected user accounts?
            </p>

            <div className="max-h-32 overflow-y-auto p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-1">
              {selectedEmails.map((email) => (
                <div key={email}>• {email}</div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button variant="secondary" size="sm" onClick={() => setIsBulkModalOpen(false)} className="bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button
                variant={bulkActionType === 'suspend' ? 'destructive' : 'success'}
                size="sm"
                onClick={executeBulkAction}
                className={bulkActionType === 'suspend' ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'}
              >
                Confirm Bulk {bulkActionType === 'suspend' ? 'Suspend' : 'Activate'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
