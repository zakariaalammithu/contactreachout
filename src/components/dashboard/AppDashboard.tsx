'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Globe,
  Clock,
  Cpu,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  UploadCloud,
  Sparkles,
  Zap,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Building2,
  FileCheck,
  Layers,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Camera,
  Check,
  Workflow,
  Sparkle,
  CreditCard,
  FileEdit,
  PlusCircle,
  Send,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockMetrics, mockCampaigns } from '@/lib/store/mock-data';
import { HeyreachWorkflowBuilder } from '@/components/dashboard/HeyreachWorkflowBuilder';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';
import { CampaignAnalyticsOverview } from '@/components/dashboard/CampaignAnalyticsOverview';
import { readCampaignDrafts } from '@/lib/services/campaign-draft-storage';

export default function AppDashboard() {
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [storedCampaigns, setStoredCampaigns] = useState<any[]>([]);
  const [campaignsLoaded, setCampaignsLoaded] = useState(false);
  const [campaignsError, setCampaignsError] = useState('');
  const [sessionUser, setSessionUser] = useState<{ name: string; email: string } | null>(null);
  const [availableCredits, setAvailableCredits] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadCampaigns = () => {
      try {
        setStoredCampaigns(readCampaignDrafts(localStorage));
        setCampaignsError('');
      } catch {
        setStoredCampaigns([]);
        setCampaignsError('Saved campaign data could not be read from this browser.');
      } finally {
        setCampaignsLoaded(true);
      }
    };
    loadCampaigns();
    window.addEventListener('campaigns_updated', loadCampaigns);
    window.addEventListener('storage', loadCampaigns);

    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.authenticated && data?.user) {
          const uName = data.user.name || data.user.email.split('@')[0];
          setSessionUser({ name: uName, email: data.user.email });
          setAvailableCredits(CreditWalletService.getWallet(data.user.email).totalCreditsAvailable);
        } else if (isMounted) {
          setAvailableCredits(CreditWalletService.getWallet().totalCreditsAvailable);
        }
      })
      .catch(() => {
        if (isMounted) setAvailableCredits(CreditWalletService.getWallet().totalCreditsAvailable);
      });

    return () => { isMounted = false; window.removeEventListener('campaigns_updated', loadCampaigns); window.removeEventListener('storage', loadCampaigns); };
  }, []);

  const dashboardSummary = useMemo(() => ({
    active: storedCampaigns.filter((campaign) => campaign.status === 'running' || campaign.status === 'active').length,
    drafts: storedCampaigns.filter((campaign) => campaign.status === 'draft').length,
    submissions: storedCampaigns.reduce((total, campaign) => total + Number(campaign.sentCount || campaign.successfulCount || 0), 0),
  }), [storedCampaigns]);

  const handleToggleCampaign = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: c.status === 'running' ? ('paused' as any) : ('running' as any),
          };
        }
        return c;
      })
    );
  };


  const targetCompanies = [
    {
      id: 'tc-01',
      name: 'Acme Cloud Dynamics',
      website: 'https://acmeclouddynamics.com',
      contactUrl: '/contact',
      industry: 'Cloud SaaS',
      confidence: 0.96,
      status: 'SUBMITTED',
      proof: 'Verification text: "Thank you for reaching out, Sarah!"',
      time: '2 mins ago',
    },
    {
      id: 'tc-02',
      name: 'Nexus AI Logistics',
      website: 'https://nexuslogistics.io',
      contactUrl: '/support/contact-us',
      industry: 'AI Logistics',
      confidence: 0.94,
      status: 'SUBMITTED',
      proof: 'Verification text: "Message received. Our team will get back to you."',
      time: '5 mins ago',
    },
    {
      id: 'tc-03',
      name: 'Vanguard Cyber Security',
      website: 'https://vanguardsec.com',
      contactUrl: '/contact-sales',
      industry: 'Cybersecurity',
      confidence: 0.89,
      status: 'REVIEW_REQUIRED',
      proof: 'Google reCAPTCHA v2 marker identified. Zero-bypass halted for operator review.',
      time: '12 mins ago',
    },
    {
      id: 'tc-04',
      name: 'CloudScale Global Ltd',
      website: 'https://cloudscaleuk.co.uk',
      contactUrl: '/get-in-touch',
      industry: 'DevOps Tools',
      confidence: 0.98,
      status: 'SUBMITTED',
      proof: 'Verification text: "Your message has been sent successfully."',
      time: '18 mins ago',
    },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black text-blue-400">Dashboard</p><h1 className="mt-1 text-3xl font-black text-zinc-300">Welcome back{sessionUser?.name ? `, ${sessionUser.name}` : ''}</h1><p className="mt-2 text-sm text-zinc-400">Manage bulk contact-form campaigns and AI personalization from one workspace.</p></div><Link href="/campaigns/new" prefetch={true} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e6de4] px-5 py-3 text-sm font-black text-white shadow-md transition-colors hover:bg-[#0758bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e6de4] focus-visible:ring-offset-2"><PlusCircle className="h-4 w-4" />New Campaign</Link></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
          { label: 'Available Credits', value: availableCredits.toLocaleString(), icon: CreditCard },
          { label: 'Active Campaigns', value: dashboardSummary.active.toLocaleString(), icon: Activity },
          { label: 'Draft Campaigns', value: dashboardSummary.drafts.toLocaleString(), icon: FileEdit },
          { label: 'Total Submissions', value: dashboardSummary.submissions.toLocaleString(), icon: Send },
        ].map(({ label, value, icon: Icon }) => <Card key={label} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-zinc-400">{label}</p><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0e6de4]/10 text-blue-400"><Icon className="h-5 w-5" /></span></div><p className="mt-5 text-3xl font-black text-zinc-300">{value}</p></Card>)}</div>
        <CampaignAnalyticsOverview campaigns={storedCampaigns} loading={!campaignsLoaded} error={campaignsError} />
        <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <Card className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-black text-zinc-300">Recent Campaigns</h2><p className="mt-1 text-xs text-zinc-400">Your most recently updated campaigns.</p></div><Link href="/campaigns" className="text-xs font-black text-blue-400 hover:text-blue-400">View all</Link></div><div className="mt-5 space-y-2">{storedCampaigns.length ? storedCampaigns.slice().sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))).slice(0,4).map((campaign) => <Link key={campaign.id} href={`/campaigns/new?edit=${campaign.id}`} className="flex items-center justify-between rounded-2xl border border-zinc-800 p-4 transition-colors hover:border-[#0e6de4]/50 hover:bg-[#0e6de4]/5"><div><p className="text-sm font-black text-zinc-300">{campaign.name || 'Untitled campaign'}</p><p className="mt-1 text-xs text-zinc-400">{campaign.prospectsList?.length || 0} prospects</p></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${campaign.status === 'draft' ? 'bg-amber-950 text-amber-300' : 'bg-[#0e6de4]/10 text-blue-400'}`}>{campaign.status || 'draft'}</span></Link>) : <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-800/35 p-8 text-center text-sm text-zinc-400">No saved campaigns yet.</div>}</div></Card>
          <div className="space-y-5">
            <Card className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
              <h2 className="font-black text-zinc-300">Quick Actions</h2>
              <div className="mt-4 grid gap-2">
                {[
                  { href: '/campaigns/new', label: 'Create New Campaign', icon: PlusCircle },
                  { href: '/import', label: 'Import Leads', icon: UploadCloud },
                  { href: '/pricing', label: 'Buy Credits', icon: CreditCard },
                ].map(({ href, label, icon: Icon }) => (
                  <Link key={label} href={href} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-black text-zinc-300 transition-colors hover:border-[#0e6de4]/50 hover:bg-[#0e6de4]/5 hover:text-blue-400">
                    <Icon className="h-4 w-4 text-blue-400" />
                    {label}
                  </Link>
                ))}
              </div>
            </Card>

            {/* Compact Refer & Earn Widget */}
            <Card className="rounded-3xl border border-[#0e6de4]/20 bg-gradient-to-br from-[#0e6de4]/10 to-zinc-950 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0e6de4] text-white">
                    <Gift className="h-4 w-4" />
                  </span>
                  <h2 className="font-black text-zinc-300 text-sm">Refer & Earn</h2>
                </div>
                <span className="text-[10px] font-black uppercase text-blue-400 bg-[#0e6de4]/15 px-2 py-0.5 rounded-full">Bonus Credits</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Give a new user 50 bonus credits and earn 100 bonus credits when they verify their account.
              </p>
              <Link href="/referral" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors">
                Refer a Friend
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>

            <Card className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-zinc-300">Recent Activity</h2>
                <Link href="/results" className="text-xs font-black text-blue-400 hover:text-blue-400">Results</Link>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">Review submission outcomes, blocked forms and completed campaign activity.</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
