import Link from 'next/link';
import { ArrowRight, Award, BadgeCheck, Bot, CheckCircle2, FileSpreadsheet, FileText, Gauge, Globe2, MessageSquareText, Search, Send, ShieldCheck, Sparkles, Star, UploadCloud } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';
import { HomeProductSections } from '@/components/landing/HomeProductSections';

const platformFeatures = [
  { icon: UploadCloud, title: 'Lead list upload', description: 'Import CSV or Excel files, name each list, and map lead fields before a campaign begins.' },
  { icon: Search, title: 'Contact page discovery', description: 'Find the most relevant contact page for each company and stop safely when a target cannot be verified.' },
  { icon: Bot, title: 'AI personalization', description: 'Generate relevant outreach drafts from the company, contact, industry, and campaign guidance you provide.' },
  { icon: ShieldCheck, title: 'Submission safeguards', description: 'Dry-run controls, CAPTCHA detection, pacing, and review states keep every campaign accountable.' },
  { icon: Gauge, title: 'Campaign control', description: 'Create, pause, review, and track campaigns without losing the lead list or message configuration.' },
  { icon: FileText, title: 'Results and proof', description: 'Review outcomes, logs, and verifiable evidence from one organized reporting workspace.' },
];

const trustedCompanyMarks = [
  { name: 'B2B SaaS', mark: 'BS', color: 'from-blue-500 to-cyan-400' },
  { name: 'Agencies', mark: 'AG', color: 'from-violet-500 to-fuchsia-400' },
  { name: 'Sales Teams', mark: 'ST', color: 'from-amber-400 to-orange-500' },
  { name: 'GTM Teams', mark: 'GT', color: 'from-emerald-400 to-teal-500' },
  { name: 'Professional Services', mark: 'PS', color: 'from-rose-400 to-pink-500' },
  { name: 'Data Providers', mark: 'DP', color: 'from-sky-400 to-indigo-500' },
  { name: 'IT Services', mark: 'IT', color: 'from-purple-400 to-violet-600' },
  { name: 'Real Estate', mark: 'RE', color: 'from-lime-400 to-emerald-500' },
  { name: 'Recruiting', mark: 'HR', color: 'from-orange-400 to-rose-500' },
  { name: 'Manufacturing', mark: 'MF', color: 'from-cyan-400 to-blue-600' },
  { name: 'Logistics', mark: 'LG', color: 'from-fuchsia-400 to-purple-600' },
  { name: 'Local Companies', mark: 'LC', color: 'from-teal-400 to-cyan-500' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f4f7ff] text-slate-950">
      <LandingHeader />
      <main className="home-saas-main">
        <section className="relative overflow-hidden bg-[#fafafc] px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-16">
          {/* Dot Grid Pattern Background matching Instantly.ai style */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e2e2ea_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-75" />

          <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 lg:min-h-[590px] lg:grid-cols-[0.88fr_1.12fr] xl:gap-16">
            {/* 1. LEFT COLUMN: Text, Badges, CTAs */}
            <div className="flex min-w-0 max-w-[610px] flex-col justify-center">
              {/* Top Badge */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200/90 bg-indigo-50/50 px-4 py-1.5 text-xs font-bold text-indigo-600 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>AI-Powered Contact Form Outreach at Scale</span>
              </div>

              {/* Headline */}
              <h1 className="mt-6 text-[40px] font-black leading-[1.07] tracking-[-0.04em] text-[#0f172a] sm:text-[50px] lg:text-[40px] xl:text-[48px]">
                Bulk Contact Forms, <br />
                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 bg-clip-text text-transparent">Smarter Outreach with AI</span>
              </h1>

              {/* Description */}
              <p className="mt-6 max-w-[560px] text-base font-medium leading-7 text-[#64748b] sm:text-lg">
                Automate contact form submissions and personalize every message with AI to reach more prospects at scale.
              </p>

              {/* Feature Chips */}
              <div className="mt-6 flex flex-wrap gap-2.5">
                {[
                  'Find Contact Forms',
                  'AI Personalization',
                  'Track Results',
                ].map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/70 bg-indigo-50/60 px-3.5 py-1.5 text-xs font-bold text-indigo-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    {chip}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-7 py-4 text-base font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-[#4338ca]"
                >
                  Start Your Campaign Free <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/contact?topic=demo"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-4 text-base font-extrabold text-slate-800 shadow-2xs transition hover:bg-slate-50"
                >
                  Book a Demo
                </Link>
              </div>

              {/* Micro-copy under CTA */}
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#64748b]">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>No credit card required</span>
              </div>
            </div>

            {/* Product visual: lead inbox connected to the campaign workflow */}
            <div className="relative grid min-w-0 items-center gap-4 md:grid-cols-[0.82fr_1.18fr] lg:gap-3 xl:gap-5">
            {/* Lead and contact-form status */}
            <div className="relative z-10 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_55px_rgba(79,70,229,0.10)] md:-mr-8 lg:-mr-5 xl:-mr-9">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-3 text-[10px] font-bold text-slate-400">
                <span className="border-b-2 border-slate-950 pb-3 font-black text-slate-950">All</span>
                <span>Campaigns</span><span>Unprocessed</span><span>Completed</span>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-[#fafafd] px-3.5 py-2 text-xs text-slate-400"><div className="flex items-center gap-2"><Search className="h-3.5 w-3.5" /><span>Search leads...</span></div><span className="h-3 w-3 rounded-sm border border-slate-300" /></div>
              <div className="mt-3 space-y-2">
                {[
                  { image: '/client-reviews/bruce-dinger.jpg', name: 'Bruce Dinger', company: 'SmartTech Solutions', domain: 'smarttech.example', status: 'Contact Form Found', statusClass: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                  { image: '/client-reviews/kotaiba-alhaj.jpg', name: 'Kotaiba Alhaj', company: 'Bright Marketing', domain: 'brightmarketing.example', status: 'Processed', statusClass: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                  { image: '/client-reviews/michael-jessimy.jpg', name: 'Michael Jessimy', company: 'Innovate Studio', domain: 'innovate.example', status: 'AI Draft Ready', statusClass: 'bg-violet-50 text-violet-600 border-violet-100' },
                  { image: '/client-reviews/misti-morgenstern.jpg', name: 'Misti Morgenstern', company: 'Growth Labs', domain: 'growthlabs.example', status: 'Processed', statusClass: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                  { image: '/client-reviews/paola-marinone.jpg', name: 'Paola Marinone', company: 'DigitalBridge Co.', domain: 'digitalbridge.example', status: 'In Progress', statusClass: 'bg-amber-50 text-amber-700 border-amber-100' },
                ].map((row) => (
                  <div key={row.company} className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#fafafd] p-2.5">
                    <div className="flex min-w-0 items-center gap-2.5"><span className="h-3.5 w-3.5 rounded border border-slate-300" /><img src={row.image} alt={`${row.name} profile`} className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200" /><div className="min-w-0"><p className="truncate text-[11px] font-extrabold text-slate-950">{row.company}</p><p className="truncate text-[9px] font-semibold text-slate-400">{row.domain}</p></div></div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-bold ${row.statusClass}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ContactReachout workflow canvas */}
            <div className="relative rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_20px_65px_rgba(79,70,229,0.12)] sm:p-5">
              {/* Top Avatars Stack */}
              <div className="flex items-center justify-end -space-x-2 pb-3">
                <img src="/client-reviews/austin-smith.png" alt="Austin Smith profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
                <img src="/client-reviews/emily-davidson.png" alt="Emily Davidson profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
                <img src="/client-reviews/michael-kokernak.jpg" alt="Michael Kokernak profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
                <img src="/client-reviews/bill-bradford.jpg" alt="Dr. Bill Bradford profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
                <img src="/client-reviews/felix-dragoi.jpg" alt="Felix Dragoi profile" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600 ring-2 ring-white">+32</span>
              </div>

              {/* Connected Workflow Tree Nodes */}
              <div className="space-y-2 relative">
                {/* Node 1: Upload Leads */}
                <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#0f172a]">Upload Leads</p>
                        <p className="text-[10px] font-bold text-slate-400">website-list.xlsx</p>
                      </div>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-white text-[10px] font-black">
                      ✓
                    </div>
                  </div>
                </div>

                {/* Connector Line 1 */}
                <div className="flex justify-center -my-1">
                  <div className="h-4 w-0.5 bg-indigo-300 relative">
                    <span className="absolute bottom-0 -left-1 text-[8px] text-indigo-600 font-black">↓</span>
                  </div>
                </div>

                {/* Node 2: Find Contact Forms */}
                <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                        <Search className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#0f172a]">Find Contact Forms</p>
                        <p className="text-[10px] font-bold text-blue-600">Scanning websites...</p>
                      </div>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-white text-[10px] font-black">
                      ✓
                    </div>
                  </div>
                </div>

                {/* Connector Line 2 */}
                <div className="flex justify-center -my-1">
                  <div className="h-4 w-0.5 bg-indigo-300 relative">
                    <span className="absolute bottom-0 -left-1 text-[8px] text-indigo-600 font-black">↓</span>
                  </div>
                </div>

                {/* Node 3: AI Personalization (Featured Card) */}
                <div className="rounded-2xl border border-indigo-300 bg-white p-3.5 shadow-md shadow-indigo-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <p className="text-xs font-black text-[#0f172a]">AI Personalization</p>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-white text-[10px] font-black">
                      ✓
                    </div>
                  </div>

                  {/* Message Snippet Box */}
                  <div className="mt-3 rounded-xl bg-[#fafafd] border border-slate-100 p-3 text-[11px] leading-relaxed text-[#64748b] font-medium">
                    <p>Hi <span className="font-bold text-[#0f172a]">{`{first_name}`}</span>,</p>
                    <p className="mt-1">I was impressed by <span className="font-bold text-[#0f172a]">{`{company}`}</span>'s work in <span className="font-bold text-[#0f172a]">{`{industry}`}</span>. I'd love to share some ideas that might help you grow faster.</p>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-black text-indigo-600">
                    <Sparkles className="h-3 w-3" />
                    <span>AI Generated</span>
                  </div>
                </div>

                {/* Connector Line 3 */}
                <div className="flex justify-center -my-1">
                  <div className="h-4 w-0.5 bg-indigo-300 relative">
                    <span className="absolute bottom-0 -left-1 text-[8px] text-indigo-600 font-black">↓</span>
                  </div>
                </div>

                {/* Node 4: Submit Outreach */}
                <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                        <Send className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#0f172a]">Submit Outreach</p>
                        <p className="text-[10px] font-bold text-blue-600">Submitting forms...</p>
                      </div>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-white text-[10px] font-black">
                      ✓
                    </div>
                  </div>
                </div>

                {/* Connector Line 4 */}
                <div className="flex justify-center -my-1">
                  <div className="h-4 w-0.5 bg-indigo-300 relative">
                    <span className="absolute bottom-0 -left-1 text-[8px] text-indigo-600 font-black">↓</span>
                  </div>
                </div>

                {/* Node 5: Track Results */}
                <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                        <Gauge className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#0f172a]">Track Results</p>
                        <p className="text-[10px] font-extrabold text-[#64748b]">128 submitted • 32 in review</p>
                      </div>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-white text-[10px] font-black">
                      ✓
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-[11px] font-bold text-slate-600"><span>Lead list to verified outcome</span><span className="text-indigo-600">One controlled workflow</span></div>
            </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-y border-blue-100 bg-[#f6f9ff] px-4 py-16 text-slate-950 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="inline-flex items-center justify-center gap-2.5 text-xl font-black sm:text-2xl"><Award className="h-6 w-6 text-blue-600" />Trusted by 2,000+ companies</h2>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-bold text-slate-600">
                <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />Bulk contact-form outreach</span>
                <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" />AI-personalized campaigns</span>
                <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-blue-300" />Controlled submission workflow</span>
              </div>
            </div>
            <div className="trusted-logo-marquee mt-11" aria-label="Teams served by ContactReachout">
              <div className="trusted-logo-track">
                {[...trustedCompanyMarks, ...trustedCompanyMarks].map(({ name, mark, color }, index) => (
                  <div key={`${name}-${index}`} className="trusted-logo-item" aria-hidden={index >= trustedCompanyMarks.length}>
                    <span className={`trusted-logo-mark bg-gradient-to-br ${color}`}>{mark}</span>
                    <span className="whitespace-nowrap text-sm font-black tracking-tight text-slate-700 sm:text-base">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-violet-600">Two services. One campaign.</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Scale the work, keep the message relevant.</h2><p className="mt-5 text-lg leading-8 text-slate-600">ContactReachout combines bulk contact-form submission with AI-assisted personalization without removing human review and campaign safeguards.</p></div><div className="mt-12 grid gap-6 lg:grid-cols-2"><article className="rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 sm:p-10"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white"><Send className="h-7 w-7" /></div><p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-blue-600">Main service 01</p><h3 className="mt-2 text-3xl font-black">Bulk Contact Form Submission</h3><p className="mt-4 leading-7 text-slate-600">Turn named lead lists into structured campaigns that discover contact pages, map messages, respect safeguards, and record every result.</p></article><article className="rounded-[2rem] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-8 sm:p-10"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white"><Sparkles className="h-7 w-7" /></div><p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-violet-600">Main service 02</p><h3 className="mt-2 text-3xl font-black">AI Personalization</h3><p className="mt-4 leading-7 text-slate-600">Use verified lead context and your campaign guidance to create concise, relevant drafts for review—without inventing company facts.</p></article></div></div></section>

        <section id="control-tower" className="bg-[#ebe7ff] px-4 py-24 sm:px-6"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]"><div><p className="text-sm font-black text-violet-700">Your Contact Form Submission Tower</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">See every campaign move from upload to result.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Keep lead lists, AI drafts, processing status, reviews, and reporting connected in one operational view.</p><div className="mt-7 space-y-3">{['Select a named lead list', 'Guide the AI personalization', 'Control processing and safety', 'Review outcomes and proof'].map((item) => <div key={item} className="flex items-center gap-3 font-bold text-slate-700"><CheckCircle2 className="h-5 w-5 text-violet-600" />{item}</div>)}</div></div><div className="rounded-[2rem] border border-white/80 bg-white p-4 shadow-2xl shadow-violet-300/30 sm:p-6"><div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold">{['Lead List', 'AI Draft', 'Review', 'Process', 'Results'].map((item, index) => <div key={item} className="flex items-center gap-3"><span className={`rounded-xl px-3 py-2 ${index === 1 ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>{item}</span>{index < 4 && <ArrowRight className="h-4 w-4 text-slate-300" />}</div>)}</div><div className="mt-4 grid gap-4 sm:grid-cols-[0.8fr_1.2fr]"><div className="rounded-2xl border border-slate-100 p-4"><p className="text-xs font-black">Campaign progress</p><div className="mt-5 flex items-center justify-center"><div className="flex h-28 w-28 items-center justify-center rounded-full border-[12px] border-violet-100 border-t-violet-600"><span className="text-2xl font-black">68%</span></div></div><div className="mt-5 grid grid-cols-2 gap-2 text-center text-[10px] font-bold"><span className="rounded-lg bg-blue-50 p-2 text-blue-700">1,936 found</span><span className="rounded-lg bg-amber-50 p-2 text-amber-700">42 review</span></div></div><div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5"><div className="flex items-center gap-2 text-xs font-black text-violet-700"><MessageSquareText className="h-4 w-4" />AI personalization preview</div><div className="mt-4 rounded-xl bg-white p-4 text-xs leading-6 text-slate-600 shadow-sm"><p className="font-black text-slate-900">Partnership inquiry for Northstar Labs</p><p className="mt-3">Hello Northstar Labs team,</p><p className="mt-2">I came across your work in cloud infrastructure and wanted to reach out about a relevant B2B collaboration.</p><p className="mt-2">Would you be open to a brief conversation?</p></div><div className="mt-3 flex gap-2"><span className="rounded-lg bg-white px-3 py-2 text-[10px] font-black text-violet-700">Review draft</span><span className="rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-black text-white">Use in campaign</span></div></div></div></div></div></section>

        <HomeProductSections />

        <section id="features" className="border-y border-violet-100 bg-white px-4 py-24 sm:px-6"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-sm font-black text-violet-600">Platform Features</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Everything you need, built in.</h2><p className="mt-5 text-lg leading-8 text-slate-600">A complete contact-form outreach platform—from upload and personalization to controlled processing and reporting.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{platformFeatures.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-3xl border border-slate-200 bg-[#fafaff] p-7 transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100"><Icon className="h-8 w-8 text-violet-600" /><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-600">{description}</p></article>)}</div></div></section>

        <section className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-8 text-white shadow-2xl shadow-blue-200 sm:p-14"><div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black"><Globe2 className="h-4 w-4" />Start free — no credit card required.</div><h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">Ready to automate your contact form outreach?</h2><p className="mt-4 max-w-2xl text-lg leading-8 text-blue-100">Create your account, upload a lead list, personalize your campaign, and keep the entire contact-form submission workflow visible.</p></div><Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-blue-700 shadow-xl">Create free account <ArrowRight className="h-4 w-4" /></Link></div></div></section>
      </main>
      <LandingFooter />
    </div>
  );
}
