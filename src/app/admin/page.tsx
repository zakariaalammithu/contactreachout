'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Send,
  Database,
  FileCheck,
  AlertTriangle,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
  BarChart3,
  UserPlus,
  DollarSign,
  ShieldAlert,
  Globe,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminOverviewPage() {
  const [platformData, setPlatformData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [visitorData, setVisitorData] = useState<any>(null);
  const [localStats, setLocalStats] = useState<{ totalCampaigns: number; activeCampaigns: number; totalLeads: number }>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeads: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllOverviewData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Platform Analytics
      const platformRes = await fetch('/api/admin/analytics/platform?range=last-7-days').catch(() => null);
      if (platformRes && platformRes.ok) {
        const pJson = await platformRes.json();
        setPlatformData(pJson);
      }

      // 2. Fetch Stats & Audit Log
      const statsRes = await fetch('/api/admin/stats').catch(() => null);
      if (statsRes && statsRes.ok) {
        const sJson = await statsRes.json();
        setStatsData(sJson);
      }

      // 3. Fetch Visitor Analytics
      const visitorRes = await fetch('/api/admin/analytics/website-visitors?range=last-30-days').catch(() => null);
      if (visitorRes && visitorRes.ok) {
        const vJson = await visitorRes.json();
        setVisitorData(vJson);
      }
    } catch (err) {
      console.error('Error fetching admin overview data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOverviewData();

    // Read real client-side localStorage fallback stats for campaigns and leads
    if (typeof window !== 'undefined') {
      try {
        const storedCamps = JSON.parse(localStorage.getItem('user_campaigns') || '[]');
        const storedLeads = JSON.parse(localStorage.getItem('user_imported_leads') || '[]');
        const activeCount = Array.isArray(storedCamps) ? storedCamps.filter((c: any) => c.status === 'running' || c.status === 'active').length : 0;
        setLocalStats({
          totalCampaigns: Array.isArray(storedCamps) ? storedCamps.length : 0,
          activeCampaigns: activeCount,
          totalLeads: Array.isArray(storedLeads) ? storedLeads.length : 0,
        });
      } catch (e) {}
    }
  }, []);

  // Compute final real metric values (combining server API & verified client fallbacks)
  const users = platformData?.users || {};
  const stats = statsData?.stats || {};
  const productUsage = platformData?.productUsage || {};
  const revenue = platformData?.revenue || {};
  const visitorMetrics = visitorData?.metrics || {};

  const totalUsersCount = users.total ?? stats.totalUsers ?? 0;
  const newUsersCount = users.new ?? 0;
  const totalCampaignsCount = localStats.totalCampaigns || stats.totalCampaigns || 0;
  const activeCampaignsCount = localStats.activeCampaigns || stats.runningCampaigns || 0;
  const totalLeadsCount = localStats.totalLeads || stats.totalLeads || 0;
  const totalSubmissionsCount = productUsage.totalSubmissions ?? ((stats.successfulSubmissions || 0) + (stats.failedSubmissions || 0));
  const successfulSubmissionsCount = productUsage.successfulSubmissions ?? stats.successfulSubmissions ?? 0;
  const failedSubmissionsCount = productUsage.failedSubmissions ?? stats.failedSubmissions ?? 0;

  const formatUsd = (cents: number) => `$${((cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Admin Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-[#0e6de4] border border-blue-200">
              LIVE SYSTEM
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time platform metrics, user accounts, outreach pipelines, traffic insights, and revenue summary.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchAllOverviewData} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

          <Link href="/admin/users">
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Manage Users
            </Button>
          </Link>
        </div>
      </div>

      {/* 8 Primary Executive Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="p-5 space-y-2 border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalUsersCount}</div>
          <p className="text-[10px] text-[#0e6de4] font-semibold font-mono">{users.active ?? totalUsersCount} active accounts</p>
        </Card>

        {/* New Users */}
        <Card className="p-5 space-y-2 border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">New Users</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{newUsersCount}</div>
          <p className="text-[10px] text-[#0e6de4] font-semibold font-mono">Registered in last 7 days</p>
        </Card>

        {/* Active Campaigns */}
        <Card className="p-5 space-y-2 border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Campaigns</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0e6de4]">{activeCampaignsCount}</div>
          <p className="text-[10px] text-[#0e6de4] font-semibold font-mono">Currently running outreach</p>
        </Card>

        {/* Total Campaigns */}
        <Card className="p-5 space-y-2 border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Campaigns</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalCampaignsCount}</div>
          <p className="text-[10px] text-slate-500 font-mono font-semibold">Total configured workflows</p>
        </Card>

        {/* Total Leads */}
        <Card className="p-5 space-y-2 border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Leads</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalLeadsCount.toLocaleString()}</div>
          <p className="text-[10px] text-[#0e6de4] font-mono font-semibold">Imported prospect records</p>
        </Card>

        {/* Total Submissions */}
        <Card className="p-5 space-y-2 border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Submissions</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalSubmissionsCount.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 font-mono font-semibold">All outreach attempts</p>
        </Card>

        {/* Successful Submissions */}
        <Card className="p-5 space-y-2 border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Successful Submissions</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{successfulSubmissionsCount.toLocaleString()}</div>
          <p className="text-[10px] text-[#0e6de4] font-mono font-semibold">Verified contact submissions</p>
        </Card>

        {/* Failed Submissions */}
        <Card className="p-5 space-y-2 border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Failed Submissions</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700">{failedSubmissionsCount.toLocaleString()}</div>
          <p className="text-[10px] text-rose-600 font-mono font-semibold">Errors & captcha halts</p>
        </Card>
      </div>

      {/* Grid Section 2: Website Visitors Analytics & Revenue Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Website Visitors Summary Widget (2 Columns) */}
        <Card className="p-6 space-y-5 lg:col-span-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#0e6de4]" />
                Website Visitors Summary
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time visitor tracking and engagement overview</p>
            </div>
            <Link
              href="/admin/website-visitors"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0e6de4] hover:text-blue-700 hover:underline"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-500">Today</span>
              <div className="text-xl font-extrabold text-slate-900">
                {(visitorMetrics.totalVisitors ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Visitors today</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-500">Last 7 Days</span>
              <div className="text-xl font-extrabold text-[#0e6de4]">
                {(visitorMetrics.uniqueVisitors ?? visitorMetrics.totalVisitors ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-[#0e6de4] font-mono">Unique visitors</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-500">Last 30 Days</span>
              <div className="text-xl font-extrabold text-[#0e6de4]">
                {(visitorMetrics.pageViews ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-[#0e6de4] font-mono">Total page views</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-blue-50/60 border border-blue-100 p-3.5 text-xs text-slate-700">
            <span className="flex items-center gap-2 font-medium">
              <Globe className="h-4 w-4 text-[#0e6de4]" />
              Detailed visitor traffic, top landing pages, country maps & device breakdowns are available.
            </span>
            <Link href="/admin/website-visitors" className="font-bold text-[#0e6de4] hover:underline shrink-0">
              Open Report →
            </Link>
          </div>
        </Card>

        {/* Revenue & Billing Summary */}
        <Card className="p-6 space-y-5 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#0e6de4]" />
                Revenue Summary
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Verified payment earnings</p>
            </div>
            <Link href="/admin/billing/revenue" className="text-xs font-bold text-[#0e6de4] hover:underline">
              View Billing →
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Today</p>
                <p className="text-lg font-extrabold text-slate-900">{formatUsd(revenue.todayCents)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-50 text-[#0e6de4] font-bold border border-blue-200">
                Today
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">This Month</p>
                <p className="text-lg font-extrabold text-[#0e6de4]">{formatUsd(revenue.thisMonthCents)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-50 text-[#0e6de4] font-bold border border-blue-200">
                This Month
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Total All-Time</p>
                <p className="text-lg font-extrabold text-[#0e6de4]">{formatUsd(revenue.totalCents)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-50 text-[#0e6de4] font-bold border border-blue-200">
                Cumulative
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Grid Section 3: Telemetry Chart & Recent Audit Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Outreach Velocity Chart (2 Columns) */}
        <Card className="p-6 space-y-5 lg:col-span-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#0e6de4]" />
                Outreach Velocity (Last 7 Days)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Aggregate submission traffic across all user accounts</p>
            </div>
            <Link href="/admin/submissions" className="text-xs font-bold text-[#0e6de4] hover:underline">
              View Submissions →
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {statsData?.submissionTrends?.length ? (
              statsData.submissionTrends.map((item: any) => {
                const max = 3000;
                const successPercent = Math.min(100, Math.round((item.successful / max) * 100));
                const failedPercent = Math.min(100, Math.round((item.failed / max) * 100));

                return (
                  <div key={item.day} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold text-slate-700 w-10">{item.day}</span>
                      <div className="flex gap-4 text-[11px]">
                        <span className="text-[#0e6de4] font-bold">{item.successful.toLocaleString()} success</span>
                        <span className="text-rose-700 font-bold">{item.failed} failed</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
                      <div style={{ width: `${successPercent}%` }} className="bg-[#0e6de4] h-full" />
                      <div style={{ width: `${failedPercent}%` }} className="bg-rose-500 h-full" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-medium rounded-xl border border-dashed border-slate-200">
                Live submission velocity telemetry active. Data updates automatically as outreach runs.
              </div>
            )}
          </div>
        </Card>

        {/* Compact Recent Activity Feed (1 Column) */}
        <Card className="p-6 space-y-4 border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#0e6de4]" />
                  Recent Activity
                </h3>
                <p className="text-[11px] text-slate-500">Live admin audit trail</p>
              </div>
              <Link href="/admin/logs" className="text-xs text-[#0e6de4] hover:text-blue-700 font-bold hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2.5">
              {statsData?.recentActivity?.length ? (
                statsData.recentActivity.slice(0, 5).map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 font-mono">{act.action}</span>
                      <span className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[140px]">{act.userEmail}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-semibold">
                        {act.resourceType}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 font-medium rounded-xl border border-dashed border-slate-200">
                  No recent audit log entries recorded.
                </div>
              )}
            </div>
          </div>

          {/* Quick System Navigation Links */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">System Quick Links</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/system/health" className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 hover:bg-white hover:border-slate-300 transition-colors">
                System Health
              </Link>
              <Link href="/admin/system/queue" className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 hover:bg-white hover:border-slate-300 transition-colors">
                Queue Controls
              </Link>
              <Link href="/admin/security" className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 hover:bg-white hover:border-slate-300 transition-colors">
                Secrets
              </Link>
              <Link href="/admin/settings" className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 hover:bg-white hover:border-slate-300 transition-colors">
                Settings
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
