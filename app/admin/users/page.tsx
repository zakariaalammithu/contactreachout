'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  KeyRound,
  Ban,
  CheckCircle2,
  RefreshCw,
  MoreVertical,
  Mail,
  UserCheck,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [newPassword, setNewPassword] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.users) setUsers(json.users);
    } catch {
      // Offline fallback
      setUsers([
        {
          id: 'usr-superadmin-001',
          email: 'mithusquare@gmail.com',
          role: 'SUPER_ADMIN',
          isSuspended: false,
          forcePasswordReset: false,
          createdAt: '2026-08-01T00:00:00Z',
        },
        {
          id: 'usr-op-002',
          email: 'operator@bulkreach.io',
          role: 'ADMIN',
          isSuspended: false,
          forcePasswordReset: false,
          createdAt: '2026-08-05T12:00:00Z',
        },
        {
          id: 'usr-user-003',
          email: 'client-demo@enterprise.com',
          role: 'USER',
          isSuspended: false,
          forcePasswordReset: false,
          createdAt: '2026-08-10T14:30:00Z',
        },
      ]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, role: newRole, password: newPassword }),
      });
      const json = await res.json();

      if (json.success) {
        setIsCreateModalOpen(false);
        setNewEmail('');
        setNewPassword('');
        setActionSuccess(`User ${newEmail} created successfully.`);
        fetchUsers();
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        alert(json.error || 'Failed to create user.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateUser = async (email: string, updates: Record<string, any>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...updates }),
      });
      const json = await res.json();

      if (json.success) {
        setActionSuccess(`User ${email} updated successfully.`);
        fetchUsers();
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        alert(json.error || 'Failed to update user.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            User Management & Permissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage multi-tenant accounts, assign role permissions, suspend access, and trigger secure password resets.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create User Account
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {actionSuccess}
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="glass-panel p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none w-full sm:w-auto"
        >
          <option value="all">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
      </Card>

      {/* Users Data Table */}
      <Card className="glass-panel overflow-hidden border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090D16] border-b border-white/[0.08] text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-indigo-500/20">
                        {user.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{user.email}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                        user.role === 'SUPER_ADMIN'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : user.role === 'ADMIN'
                          ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      {user.role}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {user.isSuspended ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        SUSPENDED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Role Changer Dropdown */}
                      {user.email !== 'mithusquare@gmail.com' && (
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUser(user.email, { role: e.target.value })}
                          className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-300"
                        >
                          <option value="USER">Set as USER</option>
                          <option value="ADMIN">Set as ADMIN</option>
                          <option value="SUPER_ADMIN">Set as SUPER_ADMIN</option>
                        </select>
                      )}

                      {/* Reset Password */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Trigger password reset for ${user.email}?`)) {
                            handleUpdateUser(user.email, { resetPassword: true });
                          }
                        }}
                        className="text-[11px] h-7 px-2"
                      >
                        <KeyRound className="h-3 w-3 mr-1 text-amber-400" />
                        Reset
                      </Button>

                      {/* Suspend / Reactivate */}
                      {user.email !== 'mithusquare@gmail.com' && (
                        <Button
                          variant={user.isSuspended ? 'success' : 'destructive'}
                          size="sm"
                          onClick={() => handleUpdateUser(user.email, { isSuspended: !user.isSuspended })}
                          className="text-[11px] h-7 px-2"
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          {user.isSuspended ? 'Reactivate' : 'Suspend'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-md p-6 space-y-4 border-slate-700 bg-slate-950">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              Provision New User Account
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@enterprise.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="USER">USER (Standard Operator)</option>
                  <option value="ADMIN">ADMIN (Campaign & Team Manager)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Root Privileges)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Initial Password (Optional)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty for auto-generated password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Create Account
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
