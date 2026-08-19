'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  UploadCloud,
  Layers,
  Search,
  Check,
  Star,
  Users,
  TrendingUp,
  Cpu,
  Globe,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  ShieldAlert,
  FileSpreadsheet,
  ChevronDown,
  Building2,
  Lock,
  ArrowUpRight,
  Camera,
  Activity,
  Award,
  BarChart3,
  CheckCheck,
  CreditCard,
  MessageSquare,
  Clock,
  Send,
  UserCheck,
  MoreVertical,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HeyreachWorkflowBuilder } from '@/components/dashboard/HeyreachWorkflowBuilder';
import { AimfoxConversionSection } from '@/components/dashboard/AimfoxConversionSection';
import { LandingHeader } from '@/components/layout/LandingHeader';

export default function HeyreachHomePage() {
  const [monthlyLeads, setMonthlyLeads] = useState(15000);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const calculatedYield = Math.round(monthlyLeads * 0.954);
  const timeSavedHours = Math.round((monthlyLeads * 3.5) / 60);

  const inboxLeads = [
    {
      name: 'Acme Cloud Dynamics',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      initials: 'AC',
      status: 'Delivered',
      time: '1h',
      snippet: 'Message delivered to /contact-us. Visual proof captured.',
    },
    {
      name: 'Nexus AI Logistics',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      initials: 'NA',
      status: 'Delivered',
      time: '1h',
      snippet: 'Inquiry submitted to decision maker with 98% field match.',
    },
    {
      name: 'Vanguard Cyber Security',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      initials: 'VC',
      status: 'In Review',
      time: '30m',
      snippet: 'reCAPTCHA detected. Zero-bypass halted for operator review.',
    },
    {
      name: 'CloudScale Global Ltd',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      initials: 'CS',
      status: 'Delivered',
      time: '2h',
      snippet: 'Partnership inquiry sent successfully via /get-in-touch.',
    },
    {
      name: 'PulseMetrics Analytics',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      initials: 'PM',
      status: 'Delivered',
      time: '45m',
      snippet: 'Contact form mapped with all 12 lead attributes.',
    },
  ];

  const senderAvatars = [
    { name: 'Worker 1', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { name: 'Worker 2', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { name: 'Worker 3', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { name: 'Worker 4', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
    { name: 'Worker 5', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
    { name: 'Worker 6', img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  ];

  const faqs = [
    {
      q: 'How do I send free bulk messages to website contact pages?',
      a: 'Simply upload your target company websites via CSV/Excel in /import (or click 1-Click Sample Data). The engine automatically discovers each website’s contact page (/contact, /get-in-touch), maps form fields (Name, Email, Message, Phone), and submits your personalized message with 100% free delivery directly into their primary inbox.',
    },
    {
      q: 'How does the 12-field scrambled column auto-detection work?',
      a: 'Our heuristic ingestion engine scans every header in your uploaded CSV or XLSX file. Even if your columns are completely reversed or in random order (e.g. Country first, Website in the middle, First Name at the end), the system automatically maps each column to its correct lead field.',
    },
    {
      q: 'What is the Zero-Bypass Anti-Bot Safety Guard?',
      a: 'We strictly enforce CAN-SPAM, GDPR, and anti-abuse policies. If a target website displays Google reCAPTCHA, Cloudflare Turnstile, or any challenge marker, the automated worker halts immediately and routes the lead to a human operator review queue instead of trying to bypass it.',
    },
    {
      q: 'Does it capture visual screenshot proof of each contact form submission?',
      a: 'Yes. Every single form fill automatically captures high-resolution pre-fill and post-submission confirmation screenshots, which are logged and exportable to Google Sheets.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070913] text-white font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* 1. Floating Sticky Header */}
      <LandingHeader />

      {/* 2. Heyreach Hero Section (Exact 2-Column Split Matching Screenshot Tailored for Bulk Contact Page Outreach) */}
      <section className="relative pt-12 sm:pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle Ambient Cosmic Glow & Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d0f_1px,transparent_1px),linear-gradient(to_bottom,#1f293d0f_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-purple-600/15 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Tailored for Website Contact Form Bulk Outreach */}
          <div className="lg:col-span-6 space-y-7 text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.45rem] font-black tracking-tight text-white leading-[1.12]">
              10x your website contact outreach.{' '}
              <span className="block mt-1 text-slate-100">
                Unlimited websites, 100% free delivery
              </span>
            </h1>

            {/* High-Contrast Badge Highlight Paragraph */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              For{' '}
              <span className="inline-block rounded-md bg-[#1E293B] border border-blue-500/40 text-blue-400 px-2 py-0.5 font-semibold text-sm">
                agencies
              </span>
              ,{' '}
              <span className="inline-block rounded-md bg-[#2D1B1E] border border-orange-500/40 text-orange-400 px-2 py-0.5 font-semibold text-sm">
                sales teams
              </span>
              , and{' '}
              <span className="inline-block rounded-md bg-[#132A24] border border-emerald-500/40 text-emerald-400 px-2 py-0.5 font-semibold text-sm">
                GTM experts
              </span>{' '}
              who want to send bulk messages directly to website contact forms for free, reach 10,000+ target companies daily, and book more B2B meetings.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link href="/campaigns/new">
                <button className="rounded-full bg-gradient-to-r from-[#6366F1] via-[#7C3AED] to-[#8B5CF6] px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/30 hover:shadow-purple-600/40 hover:scale-[1.02] transition-all">
                  Start sending for free
                </button>
              </Link>
              <Link href="/import">
                <button className="rounded-full border border-slate-700 bg-slate-800/80 px-7 py-3.5 text-sm font-bold text-white hover:bg-slate-700 transition-all flex items-center gap-1.5">
                  <UploadCloud className="h-4 w-4 text-purple-400" />
                  <span>Import Lead Spreadsheet</span>
                </button>
              </Link>
            </div>

            {/* Micro Trust Note */}
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium font-sans">
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-purple-400" />
                <span>100% Free & No card required</span>
              </div>
              <span>•</span>
              <span className="text-emerald-400">✓ 100% Zero-Bypass Compliant</span>
            </div>
          </div>

          {/* Right Column: Floating Unified Inbox, Sender Cluster & Flowchart Nodes Tailored for Website Form Engine */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[480px]">
            {/* Background Node Flowchart Canvas (Tailored for Website Contact Engine) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[90%] sm:w-[420px] rounded-3xl border border-slate-800/90 bg-[#0C0E1E]/95 p-5 shadow-2xl space-y-4 text-xs font-sans pointer-events-none opacity-90 scale-95 sm:scale-100">
              {/* Node 1: Fast Contact Page Discovery */}
              <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#12162B] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-indigo-400" /> Scan target website
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <div className="h-5 w-5 rounded-lg bg-indigo-600/40 text-indigo-400 flex items-center justify-center text-[10px]">
                    🔍
                  </div>
                  <span>Discover /contact & /get-in-touch page</span>
                </div>
              </div>

              {/* Branch Condition Split */}
              <div className="flex justify-between items-center px-4 text-[10px] font-mono">
                <span className="text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded-md">
                  ✕ No form detected
                </span>
                <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                  ✓ Form detected (98%)
                </span>
              </div>

              {/* Node 2: Send Free Bulk Message */}
              <div className="p-3.5 rounded-2xl border border-slate-800 bg-[#12162B] ml-8 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-purple-400" /> Auto-fill 12 fields
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <div className="h-5 w-5 rounded-lg bg-purple-600/40 text-purple-400 flex items-center justify-center text-[10px]">
                    💬
                  </div>
                  <span>Submit bulk message & capture screenshot proof</span>
                </div>
              </div>

              {/* Branch Condition Split 2 */}
              <div className="flex justify-between items-center px-4 text-[10px] font-mono ml-8">
                <span className="text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-md">
                  ⚠️ CAPTCHA $\rightarrow$ Human Review
                </span>
                <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                  ✓ Message Delivered
                </span>
              </div>
            </div>

            {/* Floating Top-Right Pill: Website Form Senders */}
            <div className="absolute -top-3 right-4 z-30 rounded-2xl border border-slate-800 bg-[#0F1328]/95 px-4 py-2 shadow-2xl backdrop-blur-xl space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 font-sans">
                Website form senders
              </span>
              <div className="flex items-center -space-x-2">
                {senderAvatars.map((s, i) => (
                  <img
                    key={i}
                    src={s.img}
                    alt={s.name}
                    className="h-7 w-7 rounded-full ring-2 ring-[#0F1328] object-cover"
                  />
                ))}
                <div className="h-7 w-7 rounded-full bg-slate-900 ring-2 ring-emerald-500/60 text-[10px] font-bold text-emerald-400 flex items-center justify-center font-mono">
                  +54
                </div>
              </div>
            </div>

            {/* Floating Foreground Card: Live Verified Submissions Stream */}
            <div className="relative z-20 w-[92%] sm:w-[360px] -left-2 sm:-left-8 rounded-2xl border border-slate-800/90 bg-[#0D1022]/95 p-4 shadow-2xl backdrop-blur-2xl space-y-3">
              {/* Filter Tabs */}
              <div className="flex items-center justify-between text-xs font-semibold border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold cursor-pointer">All</span>
                  <span className="text-emerald-400 flex items-center gap-1 cursor-pointer">
                    Delivered <span className="h-4 w-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">7</span>
                  </span>
                  <span className="text-slate-400 cursor-pointer">Review Req.</span>
                </div>
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search websites..."
                  readOnly
                  className="w-full rounded-xl border border-slate-800 bg-[#14182D] py-1.5 pl-8 pr-3 text-xs text-slate-300 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Leads List */}
              <div className="space-y-1 pt-1">
                {inboxLeads.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#141931] transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        {item.initials}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs truncate">{item.name}</span>
                          <span className={`rounded px-1 py-0.2 text-[9px] font-bold flex items-center gap-0.5 ${
                            item.status === 'Delivered'
                              ? 'bg-emerald-950/80 border border-emerald-600/40 text-emerald-400'
                              : 'bg-orange-950/80 border border-orange-600/40 text-orange-400'
                          }`}>
                            {item.status === 'Delivered' ? '✓ Delivered' : '⚠️ Review'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                          {item.snippet}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Social Proof Logo Bar */}
      <section className="border-y border-slate-800/80 bg-[#090C1A] py-8 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Trusted by 1,000+ Fast-Growing Agencies & Sales Leaders Worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all text-xs font-extrabold text-slate-400 font-mono">
            <span>STRIPE VENTURES</span>
            <span>DEEL GLOBAL</span>
            <span>RAMP SCALE</span>
            <span>CLICKUP SALES</span>
            <span>VERCEL PARTNERS</span>
            <span>MANYREACH GTM</span>
            <span>WEBFLOW LABS</span>
          </div>
        </div>
      </section>

      {/* 4. Interactive Heyreach Visual Box Workflow Builder */}
      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider bg-purple-950/60 px-3.5 py-1 rounded-full border border-purple-800/60">
            CONTACT FORM AUTOMATION WORKFLOW
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How our engine sends bulk messages to website contact pages.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Every website form is discovered, mapped, and submitted deterministically with visual proof capture. Click any node below to inspect live logic.
          </p>
        </div>

        {/* Workflow Component */}
        <HeyreachWorkflowBuilder />
      </section>

      {/* Aimfox-Style "Made to convert not just connect" Section */}
      <AimfoxConversionSection />

      {/* 5. 5-Stage Outreach Conversion Funnel Bar */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-slate-800 bg-[#0D1022] p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <h3 className="font-extrabold text-white text-base uppercase tracking-wider">
                  Live Contact Page Outreach & Deliverability Funnel
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">Real-time aggregate delivery yield across active target websites</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3.5 py-1.5 rounded-full border border-emerald-800/60 self-start sm:self-auto">
              97.8% Deliverability Yield
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5 pt-2">
            {[
              { step: '1. Ingested Leads', count: '18,450', percent: '100%', color: 'border-slate-800 bg-[#12162B]' },
              { step: '2. Contact Pages', count: '16,974', percent: '92.0%', color: 'border-indigo-900/60 bg-indigo-950/40' },
              { step: '3. Forms Detected', count: '15,682', percent: '85.0%', color: 'border-purple-900/60 bg-purple-950/40' },
              { step: '4. Mapped & Ready', count: '14,890', percent: '80.7%', color: 'border-cyan-900/60 bg-cyan-950/40' },
              { step: '5. Verified Proofs', count: '14,210', percent: '95.4%', color: 'border-emerald-900/60 bg-emerald-950/40' },
            ].map((f) => (
              <div key={f.step} className={`p-4 rounded-2xl border ${f.color} flex flex-col justify-between space-y-2 shadow-xs`}>
                <span className="text-[10px] font-mono font-bold text-slate-400">{f.step}</span>
                <div className="text-2xl font-extrabold text-white">{f.count}</div>
                <div className="flex items-center justify-between text-[11px] font-mono pt-1.5 border-t border-slate-800">
                  <span className="text-slate-500 font-semibold">Yield</span>
                  <span className="font-bold text-emerald-400">{f.percent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Bento Grid Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider bg-purple-950/60 px-3.5 py-1 rounded-full border border-purple-800/60">
            ENTERPRISE CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything you need to send bulk messages to website contact forms for free.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Reach target business owners directly through their website inquiry channels without spam folder bounces.
          </p>
        </div>

        {/* Bento Grid (4 Pillars) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: 12-Field Scrambled Column Auto-Mapper */}
          <div className="p-8 rounded-3xl border border-slate-800 bg-[#0E1226] space-y-4 md:col-span-2 lg:col-span-2 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                12-Field Auto-Detection
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white">
              12-Field Scrambled Column Auto-Mapper
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upload spreadsheets in <strong>any random, reversed, or custom column order</strong>. Our heuristic engine auto-detects <code>First Name</code>, <code>Last Name</code>, <code>Title</code>, <code>Company Name</code>, <code>Email</code>, <code>Industry</code>, <code>Person Linkedin Url</code>, <code>Website</code>, <code>Company Linkedin Url</code>, <code>City</code>, <code>State</code>, and <code>Country</code> without manual configuration.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-[#141933] border border-slate-800 text-slate-300">✓ Excel / CSV Drag & Drop</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#141933] border border-slate-800 text-slate-300">✓ Formula Injection Defense</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#141933] border border-slate-800 text-slate-300">✓ URL Auto-Normalization</span>
            </div>
          </div>

          {/* Card 2: Zero-Bypass Compliance Shield */}
          <div className="p-8 rounded-3xl border border-slate-800 bg-[#0E1226] space-y-4 shadow-xl">
            <div className="p-3 rounded-2xl bg-amber-950/80 text-amber-400 border border-amber-800/60 w-fit">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white">
              100% Zero-Bypass Anti-Bot Shield
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Never risk client domain reputations or legal violations. If reCAPTCHA or Cloudflare is detected, the job immediately halts and routes to a human review queue.
            </p>
            <span className="inline-block text-[11px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800">
              ✓ CAN-SPAM & GDPR Compliant
            </span>
          </div>

          {/* Card 3: Multi-Sender Distributed Workers */}
          <div className="p-8 rounded-3xl border border-slate-800 bg-[#0E1226] space-y-4 shadow-xl">
            <div className="p-3 rounded-2xl bg-purple-950/80 text-purple-400 border border-purple-800/60 w-fit">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Multi-Sender Queue & Concurrency
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Distribute outreach across background workers with BullMQ queues, configurable delay cooldowns, and automatic retry protection.
            </p>
            <span className="inline-block text-[11px] font-mono font-bold text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-800">
              ✓ 1-10 Worker Threads
            </span>
          </div>

          {/* Card 4: Immutable Visual Proof Delivery */}
          <div className="p-8 rounded-3xl border border-slate-800 bg-[#0E1226] space-y-4 md:col-span-2 lg:col-span-2 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <Camera className="h-6 w-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                Pre/Post Visual Screenshots
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Visual Screenshot Proof & Audit Trail
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every single contact form submission is backed by high-resolution pre-fill and post-submission screenshot proof, giving your agency concrete verification to share with clients.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-[#141933] border border-slate-800 text-slate-300">✓ SHA-256 Hash Verification</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#141933] border border-slate-800 text-slate-300">✓ Google Sheets Live Sync</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#141933] border border-slate-800 text-slate-300">✓ Webhook Dispatch</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FreeOutreach vs Legacy Tools Comparison */}
      <section id="comparison" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider bg-blue-950/60 px-3.5 py-1 rounded-full border border-blue-800/60">
            THE FREEOUTREACH ADVANTAGE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Why website contact form outreach delivers higher response rates.
          </h2>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-[#0E1122] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12162B] border-b border-slate-800 text-slate-300 font-mono uppercase text-[11px]">
                <tr>
                  <th className="p-4">Outreach Feature</th>
                  <th className="p-4 bg-blue-950/40 text-blue-300 font-extrabold">FreeOutreach (Contact Form Engine)</th>
                  <th className="p-4 text-slate-400">Cold Email & Legacy Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {[
                  {
                    feat: 'Inbox Placement & Deliverability',
                    hey: '✓ 100% Primary Inbox (Routes to owner / sales inbox)',
                    leg: '✗ High spam folder bounce rate & domain burn',
                  },
                  {
                    feat: 'Sending Cost',
                    hey: '✓ 100% Free delivery (No paid inbox warmups needed)',
                    leg: '✗ Hundreds of dollars for Google/Outlook seats',
                  },
                  {
                    feat: 'Scrambled Column Auto-Detection',
                    hey: '✓ Instant 12-field heuristic auto-map',
                    leg: '✗ Requires rigid CSV formatting',
                  },
                  {
                    feat: 'Visual Screenshot Proof Capture',
                    hey: '✓ Full pre/post submission screenshots',
                    leg: '✗ Blind pixel tracking only',
                  },
                  {
                    feat: 'Anti-Bot & CAPTCHA Safety Policy',
                    hey: '✓ 100% Zero-Bypass Enforced (Zero legal risk)',
                    leg: '✗ Blindly breaks or gets IP banned',
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#12162B]/50 transition-colors">
                    <td className="p-4 font-bold text-white">{row.feat}</td>
                    <td className="p-4 bg-blue-950/20 text-blue-300 font-bold font-mono">{row.hey}</td>
                    <td className="p-4 text-slate-400 font-mono">{row.leg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 8. Interactive ROI Calculator */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl border border-blue-900/60 bg-gradient-to-br from-[#0E1124] via-[#13102C] to-[#0A0D1E] p-8 sm:p-12 space-y-8 shadow-2xl">
          <div className="text-center space-y-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Calculate Your Free Website Outreach Capacity
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              See how many target business websites your team can reach each month on autopilot for free with FreeOutreach.
            </p>
          </div>

          <div className="space-y-4 max-w-xl mx-auto">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300 font-mono">
              <span>Target Website Volume:</span>
              <span className="text-base text-blue-400 font-extrabold">{monthlyLeads.toLocaleString()} Websites/Mo</span>
            </div>
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={monthlyLeads}
              onChange={(e) => setMonthlyLeads(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-center">
            <div className="p-4 rounded-2xl bg-[#12162D] border border-slate-800 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 font-mono uppercase">Free Messages Delivered</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">{calculatedYield.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">95.4% average deliverability</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#12162D] border border-slate-800 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 font-mono uppercase">Time Saved / Month</p>
              <p className="text-2xl font-extrabold text-blue-400 mt-1">{timeSavedHours} Hours</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Automated visual form fills</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#12162D] border border-slate-800 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 font-mono uppercase">Domain Reputation Risk</p>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1">0% (Zero)</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Zero-Bypass safe</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ Accordion */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
            Frequently Asked Questions
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">Everything you need to know about automated website contact form outreach.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-[#0E1122] overflow-hidden shadow-xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-5 text-left text-xs sm:text-sm font-bold text-white flex items-center justify-between hover:bg-[#12162B] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180 text-blue-400' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 10. High-Converting Bottom CTA Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] p-10 sm:p-14 text-center text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Ready to send bulk contact form messages for free?
            </h2>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed font-light">
              Join 1,000+ top lead generation agencies and sales teams using ContactReachout. Launch your first automated website outreach campaign in under 2 minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
              <Link href="/campaigns/new">
                <Button variant="secondary" size="lg" className="bg-white text-slate-950 font-extrabold px-8 text-sm shadow-xl hover:bg-slate-100">
                  <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
                  Start Sending Messages Free
                </Button>
              </Link>
              <Link href="/import">
                <button className="rounded-full border border-white/40 bg-white/10 hover:bg-white/20 text-white px-6 py-3 text-sm font-bold backdrop-blur-md transition-all">
                  Import Sample Dataset
                </button>
              </Link>
            </div>
            <div className="pt-2 text-xs text-blue-200 font-mono">
              ✓ 100% Free delivery • Zero-Bypass protection • 2 minute setup
            </div>
          </div>
        </div>
      </section>

      {/* 11. Modern Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060814] py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs text-slate-400">
          <div className="space-y-3 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-500">⚡</span>
              <span className="text-sm font-bold text-white">ContactReachout</span>
            </div>
            <p className="text-[11px] text-slate-500">
              The #1 automated website contact form outreach engine for B2B lead generation. contactreachout.com
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white uppercase font-mono text-[10px]">Product</p>
            <ul className="space-y-1.5">
              <li><a href="#workflow" className="hover:text-blue-400">Contact Workflow</a></li>
              <li><Link href="/import" className="hover:text-blue-400">12-Field Auto-Mapper</Link></li>
              <li><Link href="/campaigns" className="hover:text-blue-400">Campaigns</Link></li>
              <li><Link href="/campaigns/new" className="hover:text-blue-400">Create Campaign</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white uppercase font-mono text-[10px]">Governance</p>
            <ul className="space-y-1.5">
              <li><Link href="/admin" className="hover:text-blue-400">Super Admin Console</Link></li>
              <li><Link href="/admin/system/health" className="hover:text-blue-400">System Health</Link></li>
              <li><Link href="/admin/integrations/email" className="hover:text-blue-400">Resend Email</Link></li>
              <li><Link href="/admin/security" className="hover:text-blue-400">Secret Vault</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white uppercase font-mono text-[10px]">Compliance</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              100% CAN-SPAM, GDPR, and anti-abuse zero-bypass compliant.
            </p>
            <p className="text-[10px] text-slate-400 font-mono">© 2026 ContactReachout (contactreachout.com). All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
