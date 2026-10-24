'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type CampaignRecord = { id?: string; name?: string; updatedAt?: string; logs?: Array<Record<string, unknown>>; prospectsList?: unknown[]; totalLeads?: number; sentCount?: number; failedCount?: number; noFormCount?: number; captchaCount?: number; repliedCount?: number };
type OutcomeCounts = { delivered: number; failed: number; review: number; noForm: number; other: number; processed: number };

const BRAND = { green: '#1DBF73', charcoal: '#404145', lightGray: '#EFEFF0', failed: '#E5484D', review: '#F59E0B', noForm: '#7C6EE6', other: '#94A3B8' };
const tooltipStyle = { borderRadius: 14, border: '1px solid #EFEFF0', boxShadow: '0 14px 35px rgba(64, 65, 69, 0.12)', color: BRAND.charcoal, fontSize: 12 };

const dayKey = (value: unknown) => { const date = new Date(String(value || '')); return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10); };
const normalizeStatus = (log: Record<string, unknown>) => String(log.status || log.finalStatus || '').toUpperCase();
const terminalKey = (log: Record<string, unknown>, index: number) => String(log.leadId || log.id || log.domain || log.url || `log-${index}`);

function classifyStatus(status: string): keyof Omit<OutcomeCounts, 'processed'> {
  if (status === 'DELIVERED') return 'delivered';
  if (['FAILED', 'SUBMIT_FAILED', 'UNREACHABLE', 'EXECUTION_ERROR'].includes(status)) return 'failed';
  if (['REVIEW', 'REVIEW_REQUIRED', 'CAPTCHA_REVIEW', 'CAPTCHA_DETECTED', 'CAPTCHA_BLOCKED'].includes(status)) return 'review';
  if (['NO-FORM', 'NO_FORM', 'NO_CONTACT_PAGE'].includes(status)) return 'noForm';
  return 'other';
}

function campaignOutcomes(campaign: CampaignRecord): OutcomeCounts | null {
  const logs = Array.isArray(campaign.logs) ? campaign.logs : [];
  const latestByLead = new Map<string, Record<string, unknown>>();
  logs.forEach((log, index) => {
    const status = normalizeStatus(log);
    if (!status || status === 'SCHEDULED') return;
    const key = terminalKey(log, index);
    if (!latestByLead.has(key)) latestByLead.set(key, log);
  });
  if (latestByLead.size > 0) {
    const counts: OutcomeCounts = { delivered: 0, failed: 0, review: 0, noForm: 0, other: 0, processed: 0 };
    latestByLead.forEach((log) => { counts[classifyStatus(normalizeStatus(log))] += 1; counts.processed += 1; });
    return counts;
  }
  const hasCounters = ['sentCount', 'failedCount', 'noFormCount', 'captchaCount'].some((key) => typeof campaign[key as keyof CampaignRecord] === 'number');
  if (!hasCounters) return null;
  const delivered = Number(campaign.sentCount || 0); const failed = Number(campaign.failedCount || 0); const noForm = Number(campaign.noFormCount || 0); const review = Number(campaign.captchaCount || 0);
  return { delivered, failed, review, noForm, other: 0, processed: delivered + failed + review + noForm };
}

export function CampaignAnalyticsOverview({ campaigns, loading = false, error = '' }: { campaigns: CampaignRecord[]; loading?: boolean; error?: string }) {
  const analytics = useMemo(() => {
    const days = new Map<string, { date: string; delivered: number; failed: number; review: number; processed: number }>();
    const total: OutcomeCounts = { delivered: 0, failed: 0, review: 0, noForm: 0, other: 0, processed: 0 };
    let replies = 0; let repliesTracked = false;
    const comparison: Array<OutcomeCounts & { id: string; name: string; updatedAt: string }> = [];
    campaigns.forEach((campaign, campaignIndex) => {
      if (typeof campaign.repliedCount === 'number') { repliesTracked = true; replies += campaign.repliedCount; }
      const outcomes = campaignOutcomes(campaign);
      if (outcomes) {
        (Object.keys(total) as Array<keyof OutcomeCounts>).forEach((key) => { total[key] += outcomes[key]; });
        if (outcomes.processed > 0) comparison.push({ ...outcomes, id: campaign.id || `campaign-${campaignIndex}`, name: campaign.name || 'Untitled campaign', updatedAt: campaign.updatedAt || '' });
      }
      (campaign.logs || []).forEach((log) => {
        const status = normalizeStatus(log); if (!status || status === 'SCHEDULED') return;
        const date = dayKey(log.completedAt || log.startedAt || log.timestamp); if (!date) return;
        const row = days.get(date) || { date, delivered: 0, failed: 0, review: 0, processed: 0 }; row.processed += 1;
        const category = classifyStatus(status); if (category === 'delivered') row.delivered += 1; else if (category === 'failed') row.failed += 1; else if (category === 'review') row.review += 1;
        days.set(date, row);
      });
    });
    const outcomeData = [
      { name: 'Delivered', value: total.delivered, color: BRAND.green }, { name: 'Failed', value: total.failed, color: BRAND.failed },
      { name: 'Needs review', value: total.review, color: BRAND.review }, { name: 'No form', value: total.noForm, color: BRAND.noForm },
      { name: 'Other processed', value: total.other, color: BRAND.other },
    ].filter((item) => item.value > 0);
    return { series: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14), total, outcomeData, comparison: comparison.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6), replies, repliesTracked };
  }, [campaigns]);

  if (loading) return <section className="rounded-3xl border border-[#EFEFF0] bg-white p-6 shadow-sm"><div className="h-5 w-48 animate-pulse rounded bg-[#EFEFF0]" /><div className="mt-5 h-72 animate-pulse rounded-2xl bg-[#EFEFF0]/70" /></section>;
  if (error) return <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm"><h2 className="font-black text-[#404145]">Campaign analytics unavailable</h2><p className="mt-2 text-sm text-red-700">{error}</p></section>;

  return <section className="space-y-5" aria-label="Campaign analytics">
    <div className="rounded-3xl border border-[#EFEFF0] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-[#1DBF73]">Real campaign telemetry</p><h2 className="mt-1 text-lg font-black text-[#404145]">Campaign Activity</h2><p className="mt-1 text-xs text-[#6B6D72]">Latest 14 recorded activity days. Scheduled items are excluded.</p></div><p className="text-xs font-semibold text-[#6B6D72]">Replies: {analytics.repliesTracked ? analytics.replies.toLocaleString() : 'Not tracked'}</p></div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        { label: 'Processed', value: analytics.total.processed, color: BRAND.charcoal }, { label: 'Delivered', value: analytics.total.delivered, color: BRAND.green },
        { label: 'Failed', value: analytics.total.failed, color: BRAND.failed }, { label: 'Needs review', value: analytics.total.review, color: BRAND.review },
      ].map((item) => <div key={item.label} className="rounded-2xl border border-[#EFEFF0] bg-[#FAFAFA] p-4"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} /><p className="text-xs font-bold text-[#6B6D72]">{item.label}</p></div><p className="mt-2 text-2xl font-black text-[#404145]">{item.value.toLocaleString()}</p></div>)}</div>
      {analytics.series.length ? <div className="mt-5 h-72 w-full" role="img" aria-label="Daily processed, delivered, failed and review-required campaign activity"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={analytics.series} margin={{ top: 12, right: 8, left: -20, bottom: 8 }}><CartesianGrid strokeDasharray="3 4" stroke={BRAND.lightGray} vertical={false} /><XAxis dataKey="date" axisLine={false} tickLine={false} tickFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} tick={{ fontSize: 11, fill: '#6B6D72' }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B6D72' }} /><Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })} /><Legend wrapperStyle={{ fontSize: 12, color: BRAND.charcoal }} /><Bar dataKey="delivered" name="Delivered" fill={BRAND.green} radius={[5, 5, 0, 0]} /><Bar dataKey="failed" name="Failed" fill={BRAND.failed} radius={[5, 5, 0, 0]} /><Bar dataKey="review" name="Needs review" fill={BRAND.review} radius={[5, 5, 0, 0]} /><Line type="monotone" dataKey="processed" name="Processed" stroke={BRAND.charcoal} strokeWidth={2.5} dot={{ r: 3, fill: BRAND.charcoal }} /></ComposedChart></ResponsiveContainer></div> : <EmptyState title="No dated campaign activity yet" detail="The activity trend will appear when campaigns record timestamped processing telemetry." />}
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-[#EFEFF0] bg-white p-5 shadow-sm sm:p-6"><h2 className="font-black text-[#404145]">Campaign Results</h2><p className="mt-1 text-xs text-[#6B6D72]">Mutually exclusive latest outcomes per prospect where identity is available.</p>{analytics.outcomeData.length ? <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.outcomeData} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="72%" paddingAngle={3}>{analytics.outcomeData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value.toLocaleString(), 'Prospects']} /><Legend wrapperStyle={{ fontSize: 12, color: BRAND.charcoal }} /></PieChart></ResponsiveContainer></div> : <EmptyState title="No campaign outcomes yet" detail="Outcome proportions will appear after real results are recorded." />}</div>
      <div className="rounded-3xl border border-[#EFEFF0] bg-white p-5 shadow-sm sm:p-6"><h2 className="font-black text-[#404145]">Recent Campaign Performance</h2><p className="mt-1 text-xs text-[#6B6D72]">Latest campaigns with recorded outcomes; campaigns without result data are omitted.</p>{analytics.comparison.length ? <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.comparison} layout="vertical" margin={{ top: 4, right: 8, left: 18, bottom: 4 }}><CartesianGrid strokeDasharray="3 4" stroke={BRAND.lightGray} horizontal={false} /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B6D72' }} /><YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: BRAND.charcoal }} tickFormatter={(value) => String(value).length > 15 ? `${String(value).slice(0, 14)}…` : value} /><Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12, color: BRAND.charcoal }} /><Bar dataKey="delivered" stackId="outcomes" name="Delivered" fill={BRAND.green} /><Bar dataKey="failed" stackId="outcomes" name="Failed" fill={BRAND.failed} /><Bar dataKey="review" stackId="outcomes" name="Needs review" fill={BRAND.review} /><Bar dataKey="noForm" stackId="outcomes" name="No form" fill={BRAND.noForm} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No comparable campaigns yet" detail="Campaign comparison requires at least one campaign with recorded result metrics." />}</div>
    </div>
  </section>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D7D7D9] bg-[#EFEFF0]/45 px-5 text-center"><p className="text-sm font-black text-[#404145]">{title}</p><p className="mt-1 max-w-sm text-xs text-[#6B6D72]">{detail}</p></div>; }
