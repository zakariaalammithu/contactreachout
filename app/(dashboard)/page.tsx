'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockMetrics, mockCampaigns } from '@/lib/store/mock-data';
import { HeyreachWorkflowBuilder } from '@/components/dashboard/HeyreachWorkflowBuilder';

export default function HomePage() {
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);

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
    <div className="space-y-10 max-w-7xl mx-auto pb-16 aimfox-light-backdrop">
      {/* 1. Heyreach & Aimfox Hero Section (Matching attached screenshot) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-8 sm:p-12 text-center relative overflow-hidden shadow-sm">
        {/* Ambient Iridescent Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gradient-to-r from-[#FF5722]/10 via-[#8B5CF6]/15 to-[#06B6D4]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-5">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50/90 px-4 py-1 text-xs font-bold text-purple-700 shadow-xs">
            <span>Lead-gen agencies, sales teams & GTM experts</span>
          </div>

          {/* Aimfox Dual Gradient Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            <span className="text-aimfox-coral">Super</span>
            <span className="text-aimfox-purple">charge</span> your B2B outreach pipeline. At scale.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Reach thousands of target companies per day with an end-to-end autonomous engine that discovers contact forms, maps fields deterministically, and captures visual proof.
          </p>

          {/* Black Pill CTA & Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/campaigns/new">
              <Button variant="primary" size="lg" className="text-sm font-bold px-8 shadow-lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Start your outreach
              </Button>
            </Link>
            <Link href="/import">
              <Button variant="secondary" size="lg" className="text-sm font-bold px-6">
                <UploadCloud className="h-4 w-4 mr-2 text-indigo-600" />
                Import Leads (Sample Data)
              </Button>
            </Link>
          </div>

          {/* Trust Checkmarks */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs font-semibold text-slate-600 font-sans">
            <span className="badge-aimfox-pill flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-indigo-600 stroke-[3]" />
              100% Zero-Bypass Policy
            </span>
            <span className="badge-aimfox-pill flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-indigo-600 stroke-[3]" />
              Visual Proof Capture
            </span>
            <span className="badge-aimfox-pill flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-indigo-600 stroke-[3]" />
              2 Minute Setup
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Heyreach Box Workflow Builder */}
      <HeyreachWorkflowBuilder />

      {/* 3. Pipeline Conversion Funnel Bar */}
      <Card className="glass-panel p-6 space-y-4 border-indigo-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
              Outreach Pipeline Funnel & Conversion Rates
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            97.8% Deliverability Yield
          </span>
        </div>

        {/* Funnel Steps */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 pt-1">
          {[
            { step: '1. Ingested Leads', count: '18,450', percent: '100%', color: 'border-slate-200 bg-slate-50' },
            { step: '2. Contact Pages', count: '16,974', percent: '92.0%', color: 'border-indigo-100 bg-indigo-50/50' },
            { step: '3. Forms Detected', count: '15,682', percent: '85.0%', color: 'border-purple-100 bg-purple-50/50' },
            { step: '4. Mapped & Ready', count: '14,890', percent: '80.7%', color: 'border-cyan-100 bg-cyan-50/50' },
            { step: '5. Verified Proofs', count: '14,210', percent: '95.4%', color: 'border-emerald-200 bg-emerald-50' },
          ].map((f) => (
            <div key={f.step} className={`p-3.5 rounded-2xl border ${f.color} flex flex-col justify-between space-y-1 shadow-xs`}>
              <span className="text-[10px] font-mono font-bold text-slate-500">{f.step}</span>
              <div className="text-xl font-extrabold text-slate-900">{f.count}</div>
              <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 font-semibold">Yield</span>
                <span className="font-bold text-emerald-700">{f.percent}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. 4 Performance Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="glass-panel-interactive p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Websites</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{mockMetrics.totalWebsites.toLocaleString()}</div>
          <p className="text-[10px] text-indigo-600 font-mono font-semibold">100% verified domains</p>
        </Card>

        <Card className="glass-panel-interactive p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Successful Outreach</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{mockMetrics.successful.toLocaleString()}</div>
          <p className="text-[10px] text-emerald-700 font-mono font-semibold">+14% vs last week</p>
        </Card>

        <Card className="glass-panel-interactive p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Review Required</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-orange-700">{mockMetrics.reviewRequired}</div>
          <p className="text-[10px] text-orange-600 font-mono font-semibold">CAPTCHA / Ambiguous forms</p>
        </Card>

        <Card className="glass-panel-interactive p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Workers</span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-cyan-700">{mockMetrics.processing} threads</div>
          <p className="text-[10px] text-slate-500 font-mono font-semibold">{mockMetrics.pending} in queue</p>
        </Card>
      </div>

      {/* 5. Grid: Active Campaigns & Live Verified Targets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Company Campaigns (2 Columns) */}
        <Card className="glass-panel p-6 space-y-5 lg:col-span-2 border-slate-200/90">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-purple-600" />
                Active Company Campaigns
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Live queue dispatchers with 1-click execution controls</p>
            </div>
            <Link href="/campaigns" className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {campaigns.map((camp) => {
              const percent = Math.round((camp.processedLeads / camp.totalLeads) * 100);
              const isRunning = camp.status === 'running';

              return (
                <div
                  key={camp.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{camp.name}</span>
                        {isRunning && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">Template: {camp.messageTemplateName}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={camp.status === 'running' ? 'running' : 'paused'} size="sm">
                        {camp.status.toUpperCase()}
                      </Badge>
                      <Button
                        variant={isRunning ? 'destructive' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleCampaign(camp.id)}
                        className="text-[11px] h-7 px-3 font-bold"
                      >
                        {isRunning ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1 fill-current" />}
                        {isRunning ? 'Pause' : 'Resume'}
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-500">
                      <span>{camp.processedLeads} / {camp.totalLeads} processed</span>
                      <span className="font-bold text-slate-900">{percent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-gradient-to-r from-[#FF5722] via-[#8B5CF6] to-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Micro stats */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-600 border-t border-slate-100">
                    <span className="text-emerald-700 font-bold">{camp.successfulCount} Successful</span>
                    <span className="text-orange-700 font-bold">{camp.reviewRequiredCount} In Review</span>
                    <span className="text-rose-700 font-bold">{camp.failedCount} Failed</span>
                    <span>Rate: {camp.rateLimitPerMinute}/min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Live Target Verification Stream */}
        <Card className="glass-panel p-6 space-y-4 border-slate-200/90">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-600" />
                Live Verification Stream
              </h3>
              <p className="text-[11px] text-slate-500">Pre/post submission visual checks</p>
            </div>
            <Link href="/results" className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">
              Review All
            </Link>
          </div>

          <div className="space-y-3">
            {targetCompanies.map((tc) => (
              <div
                key={tc.id}
                className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{tc.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{tc.website}</p>
                  </div>
                  <Badge variant={tc.status === 'SUBMITTED' ? 'submitted' : 'review_required'} size="sm">
                    {tc.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="font-mono text-emerald-700 font-bold">{Math.round(tc.confidence * 100)}% Match</span>
                  <button
                    onClick={() => setSelectedProof(tc)}
                    className="text-[10px] font-mono text-purple-700 hover:text-purple-900 flex items-center gap-1 font-bold"
                  >
                    <Camera className="h-3 w-3" />
                    <span>View Proof</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Visual Proof Lightbox Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-lg p-6 space-y-4 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="h-4 w-4 text-purple-600" />
                Proof of Delivery: {selectedProof.name}
              </h3>
              <button onClick={() => setSelectedProof(null)} className="text-slate-400 hover:text-slate-900 font-bold">
                ✕
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-700 space-y-2 p-4 text-center">
              <Camera className="h-8 w-8 text-indigo-600" />
              <p className="text-xs font-mono text-slate-900 font-bold">{selectedProof.proof}</p>
              <p className="text-[11px] text-slate-500 font-mono">{selectedProof.website}{selectedProof.contactUrl}</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedProof(null)}>
                Close Proof
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
