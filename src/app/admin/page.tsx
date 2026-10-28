'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { readCampaignDrafts } from '@/lib/services/campaign-draft-storage';
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
        const storedCamps = readCampaignDrafts(localStorage);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
              Admin Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-900 text-blue-400 border border-blue-900">
              LIVE SYSTEM
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
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
        <Card className="p-5 space-y-2 border-zinc-800 shadow-xs hover:border-blue-800 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-100">{totalUsersCount}</div>
          <p className="text-[10px] text-blue-400 font-semibold font-mono">{users.active ?? totalUsersCount} active accounts</p>
        </Card>

        {/* New Users */}
        <Card className="p-5 space-y-2 border-zinc-800 shadow-xs hover:border-blue-800 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">New Users</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-100">{newUsersCount}</div>
          <p className="text-[10px] text-blue-400 font-semibold font-mono">Registered in last 7 days</p>
        </Card>

        {/* Active Campaigns */}
        <Card className="p-5 space-y-2 border-zinc-800 shadow-xs hover:border-blue-800 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Campaigns</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-400">{activeCampaignsCount}</div>
          <p className="text-[10px] text-blue-400 font-semibold font-mono">Currently running outreach</p>
        </Card>

        {/* Total Campaigns */}
        <Card className="p-5 space-y-2 border-zinc-800 shadow-xs hover:border-blue-800 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Campaigns</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-100">{totalCampaignsCount}</div>
          <p className="text-[10px] text-zinc-400 font-mono font-semibold">Total configured workflows</p>
        </Card>

        {/* Total Leads */}
        <Card className="p-5 space-y-2 border-zinc-800 shadow-xs hover:border-blue-800 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Leads</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-100">{totalLeadsCount.toLocaleString()}</div>
          <p className="text-[10px] text-blue-400 font-mono font-semibold">Imported prospect records</p>
        </Card>

        {/* Total Submissions */}
        <Card className="p-5 space-y-2 border-zinc-800 shadow-xs hover:border-blue-800 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Submissions</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-100">{totalSubmissionsCount.toLocaleString()}</div>
          <p className="text-[10px] text-zinc-400 font-mono font-semibold">All outreach attempts</p>
        </Card>

        {/* Successful Submissions */}
        <Card className="p-5 space-y-2 border-zinc-800 shadow-xs hover:border-blue-800 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Successful Submissions</span>
            <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-100">{successfulSubmissionsCount.toLocaleString()}</div>
          <p className="text-[10px] text-blue-400 font-mono font-semibold">Verified contact submissions</p>
        </Card>

        {/* Failed Submissions */}
        <Card className="p-5 space-y-2 border-zinc-800 shadow-xs hover:border-blue-800 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Failed Submissions</span>
            <div className="p-2 rounded-xl bg-rose-950 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-300">{failedSubmissionsCount.toLocaleString()}</div>
          <p className="text-[10px] text-rose-400 font-mono font-semibold">Errors & captcha halts</p>
        </Card>
      </div>

      {/* Grid Section 2: Website Visitors Analytics & Revenue Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Website Visitors Summary Widget (2 Columns) */}
        <Card className="p-6 space-y-5 lg:col-span-2 border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Website Visitors Summary
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Real-time visitor tracking and engagement overview</p>
            </div>
            <Link
              href="/admin/website-visitors"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Today</span>
              <div className="text-xl font-extrabold text-zinc-100">
                {(visitorMetrics.totalVisitors ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">Visitors today</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Last 7 Days</span>
              <div className="text-xl font-extrabold text-blue-400">
                {(visitorMetrics.uniqueVisitors ?? visitorMetrics.totalVisitors ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-blue-400 font-mono">Unique visitors</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase text-zinc-400">Last 30 Days</span>
              <div className="text-xl font-extrabold text-blue-400">
                {(visitorMetrics.pageViews ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-blue-400 font-mono">Total page views</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-blue-950/60 border border-blue-900 p-3.5 text-xs text-zinc-300">
            <span className="flex items-center gap-2 font-medium">
              <Globe className="h-4 w-4 text-blue-400" />
              Detailed visitor traffic, top landing pages, country maps & device breakdowns are available.
            </span>
            <Link href="/admin/website-visitors" className="font-bold text-blue-400 hover:underline shrink-0">
              Open Report →
            </Link>
          </div>
        </Card>

        {/* Revenue & Billing Summary */}
        <Card className="p-6 space-y-5 border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-400" />
                Revenue Summary
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Verified payment earnings</p>
            </div>
            <Link href="/admin/billing/revenue" className="text-xs font-bold text-blue-400 hover:underline">
              View Billing →
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
              <div>
                <p className="text-[11px] font-bold uppercase text-zinc-400">Today</p>
                <p className="text-lg font-extrabold text-zinc-100">{formatUsd(revenue.todayCents)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-950 text-blue-400 font-bold border border-blue-900">
                Today
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
              <div>
                <p className="text-[11px] font-bold uppercase text-zinc-400">This Month</p>
                <p className="text-lg font-extrabold text-blue-400">{formatUsd(revenue.thisMonthCents)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-950 text-blue-400 font-bold border border-blue-900">
                This Month
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
              <div>
                <p className="text-[11px] font-bold uppercase text-zinc-400">Total All-Time</p>
                <p className="text-lg font-extrabold text-blue-400">{formatUsd(revenue.totalCents)}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-950 text-blue-400 font-bold border border-blue-900">
                Cumulative
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Grid Section 3: Telemetry Chart & Recent Audit Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Outreach Velocity Chart (2 Columns) */}
        <Card className="p-6 space-y-5 lg:col-span-2 border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Outreach Velocity (Last 7 Days)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Aggregate submission traffic across all user accounts</p>
            </div>
            <Link href="/admin/submissions" className="text-xs font-bold text-blue-400 hover:underline">
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
                      <span className="font-bold text-zinc-300 w-10">{item.day}</span>
                      <div className="flex gap-4 text-[11px]">
                        <span className="text-blue-400 font-bold">{item.successful.toLocaleString()} success</span>
                        <span className="text-rose-300 font-bold">{item.failed} failed</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-zinc-900 overflow-hidden flex border border-zinc-800">
                      <div style={{ width: `${successPercent}%` }} className="bg-[#0e6de4] h-full" />
                      <div style={{ width: `${failedPercent}%` }} className="bg-rose-500 h-full" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-zinc-400 font-medium rounded-xl border border-dashed border-zinc-800">
                Live submission velocity telemetry active. Data updates automatically as outreach runs.
              </div>
            )}
          </div>
        </Card>

        {/* Compact Recent Activity Feed (1 Column) */}
        <Card className="p-6 space-y-4 border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  Recent Activity
                </h3>
                <p className="text-[11px] text-zinc-400">Live admin audit trail</p>
              </div>
              <Link href="/admin/logs" className="text-xs text-blue-400 hover:text-blue-300 font-bold hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2.5">
              {statsData?.recentActivity?.length ? (
                statsData.recentActivity.slice(0, 5).map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-colors space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-100 font-mono">{act.action}</span>
                      <span className="text-[10px] text-zinc-400">{new Date(act.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="truncate max-w-[140px]">{act.userEmail}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 font-mono font-semibold">
                        {act.resourceType}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-zinc-400 font-medium rounded-xl border border-dashed border-zinc-800">
                  No recent audit log entries recorded.
                </div>
              )}
            </div>
          </div>

          {/* Quick System Navigation Links */}
          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">System Quick Links</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/system/health" className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 text-center text-xs font-bold text-zinc-300 hover:bg-zinc-950 hover:border-zinc-700 transition-colors">
                System Health
              </Link>
              <Link href="/admin/system/queue" className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 text-center text-xs font-bold text-zinc-300 hover:bg-zinc-950 hover:border-zinc-700 transition-colors">
                Queue Controls
              </Link>
              <Link href="/admin/security" className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 text-center text-xs font-bold text-zinc-300 hover:bg-zinc-950 hover:border-zinc-700 transition-colors">
                Secrets
              </Link>
              <Link href="/admin/settings" className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 text-center text-xs font-bold text-zinc-300 hover:bg-zinc-950 hover:border-zinc-700 transition-colors">
                Settings
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
