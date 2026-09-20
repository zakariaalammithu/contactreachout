'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserPlus, RefreshCw, ArrowLeft, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function UserGrowthPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserGrowth = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/analytics/platform?range=last-30-days');
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserGrowth();
  }, []);

  const users = data?.users || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/users" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">User Growth Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5">Registration velocity, active accounts, email verification & conversion</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchUserGrowth} className="text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Users</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{users.total ?? 0}</div>
          <p className="text-[11px] text-slate-500">All registered user accounts</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>New Users (30 Days)</span>
            <UserPlus className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{users.new ?? 0}</div>
          <p className="text-[11px] text-emerald-600 font-medium">New signups this period</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Active Accounts</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700">{users.active ?? 0}</div>
          <p className="text-[11px] text-slate-500">Non-suspended active accounts</p>
        </Card>

        <Card className="p-5 space-y-2 border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Email Verified</span>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700">{users.verified ?? 0}</div>
          <p className="text-[11px] text-slate-500">Verified email addresses</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4 border-slate-200">
        <h3 className="text-base font-bold text-slate-900">User Growth & Conversion Summary</h3>
        <p className="text-xs text-slate-500">Real-time statistics sourced from server session and database stores.</p>

        <div className="grid gap-4 md:grid-cols-2 pt-2">
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <h4 className="text-xs font-bold uppercase text-slate-500">Verification Rate</h4>
            <div className="text-xl font-extrabold text-slate-900">
              {users.total > 0 ? Math.round((users.verified / users.total) * 100) : 0}%
            </div>
            <p className="text-xs text-slate-500">Percentage of registered users with confirmed email addresses.</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <h4 className="text-xs font-bold uppercase text-slate-500">Paid Conversion</h4>
            <div className="text-xl font-extrabold text-emerald-600">
              {users.total > 0 ? Math.round(((users.paid || 0) / users.total) * 100) : 0}%
            </div>
            <p className="text-xs text-slate-500">Users who have purchased credit packages or paid subscriptions.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
