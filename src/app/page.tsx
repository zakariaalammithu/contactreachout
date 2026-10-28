import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Bot, CheckCircle2, FileSpreadsheet, FileText, Gauge, Globe2, MessageSquareText, Search, Send, ShieldCheck, Sparkles, Star, UploadCloud } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';
import { HomeProductSections } from '@/components/landing/HomeProductSections';
import { HomeDashboardPreview } from '@/components/landing/HomeDashboardPreview';

export const metadata: Metadata = {
  title: 'ContactReachout | Find Clients Through Website Contact Forms',
  description:
    'Automate B2B outreach and find clients through website contact forms. Discover contact forms, personalize messages with AI, and track campaign results.',
  alternates: { canonical: 'https://contactreachout.com/' },
  openGraph: {
    title: 'ContactReachout | Find Clients Through Website Contact Forms',
    description:
      'Automate B2B outreach and find clients through website contact forms. Discover contact forms, personalize messages with AI, and track campaign results.',
    url: 'https://contactreachout.com',
    siteName: 'ContactReachout',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://contactreachout.com/#organization',
      name: 'ContactReachout',
      url: 'https://contactreachout.com',
      logo: 'https://contactreachout.com/brand/logo-icon-square.png',
      sameAs: [
        'http://www.linkedin.com/company/ContactReachout',
        'https://web.facebook.com/ContactReachout',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://contactreachout.com/#website',
      url: 'https://contactreachout.com',
      name: 'ContactReachout',
      publisher: { '@id': 'https://contactreachout.com/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'ContactReachout',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web-based',
      offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
      },
    },
  ],
};

const platformFeatures = [
  { icon: UploadCloud, title: 'Lead list upload', description: 'Import CSV or Excel files, name each list, and map lead fields before a campaign begins.' },
  { icon: Search, title: 'Contact page discovery', description: 'Find the most relevant contact page for each company and stop safely when a target cannot be verified.' },
  { icon: Bot, title: 'AI personalization', description: 'Generate relevant outreach drafts from the company, contact, industry, and campaign guidance you provide.' },
  { icon: ShieldCheck, title: 'Submission safeguards', description: 'Dry-run controls, CAPTCHA detection, pacing, and review states keep every campaign accountable.' },
  { icon: Gauge, title: 'Campaign control', description: 'Create, pause, review, and track campaigns without losing the lead list or message configuration.' },
  { icon: FileText, title: 'Results and proof', description: 'Review outcomes, logs, and verifiable evidence from one organized reporting workspace.' },
];

const trustedCompanyMarks = [
  { name: 'HubSpot', image: '/trusted-logos/hubspot.png' }, { name: 'Clay', image: '/trusted-logos/clay.png' }, { name: 'Instantly', image: '/trusted-logos/instantly-ai.png' },
  { name: 'Pavilion', image: '/trusted-logos/pavilion.jpg' }, { name: 'Flip Electronics', image: '/trusted-logos/flip-electronics.jpg' }, { name: 'McKinsey', image: '/trusted-logos/mckinsey.jpg' },
  { name: 'Indoorcare', image: '/trusted-logos/indoorcare.jpg' }, { name: 'Sandler Training', image: '/trusted-logos/sandler-training.jpg' }, { name: 'XBag', image: '/trusted-logos/xbag.jpg' },
  { name: 'Spacebar Studios', image: '/trusted-logos/spacebar-studios.jpg' }, { name: 'LinkedIn', image: '/trusted-logos/linkedin.jpg' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />
      <main className="home-saas-main">
        <section className="relative overflow-hidden bg-zinc-950 px-4 py-8 sm:px-6 sm:py-10 lg:py-12">

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] xl:gap-14">
            {/* 1. LEFT COLUMN: Text, Badges, CTAs */}
            <div className="flex min-w-0 max-w-[610px] flex-col justify-center">
              {/* Top Badge */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-900/90 bg-blue-950/70 px-4 py-1.5 text-xs font-bold text-blue-400 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>AI-Powered Contact Form Outreach at Scale</span>
              </div>

              {/* Headline */}
              <h1 className="mt-6 text-[40px] font-black leading-[1.07] tracking-[-0.04em] text-zinc-100 sm:text-[50px] lg:text-[40px] xl:text-[48px]">
                Find Clients Through <br />
                <span className="whitespace-nowrap text-blue-400">Website Contact Forms</span>
              </h1>

              {/* Description */}
              <p className="mt-6 max-w-[560px] text-base font-medium leading-7 text-zinc-400 sm:text-lg">
                Automate contact form outreach and personalize every message with AI to reach more B2B prospects at scale. Bulk contact forms, smarter outreach with AI.
              </p>

              {/* Feature Chips */}
              <div className="mt-6 flex flex-wrap gap-2.5">
                {[
                  'Find Contact Forms',
                  'AI Personalization',
                  'Track Results',
                ].map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-blue-900 bg-blue-950/80 px-3.5 py-1.5 text-xs font-bold text-blue-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                    {chip}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e6de4] px-7 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#0758bd]"
                >
                  Start Your First Campaign <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/contact?topic=demo"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-7 py-4 text-base font-extrabold text-zinc-200 shadow-2xs transition hover:bg-zinc-900"
                >
                  Book a Demo
                </Link>
              </div>

              {/* Micro-copy under CTA */}
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-zinc-400" />
                <span>No credit card required</span>
              </div>
            </div>

            {/* Right-Side Compact Product Visual (Footprint matching core product UI) */}
            <div className="relative grid min-w-0 items-center gap-3 md:grid-cols-[0.88fr_1.12fr] lg:gap-3.5">
              {/* Left sub-card: Lead List */}
              <div className="relative z-10 min-w-0 rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5 shadow-[0_12px_40px_rgba(14,109,228,0.07)] md:-mr-4 lg:-mr-3">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-2.5 text-[10px] font-bold text-zinc-400">
                  <span className="border-b-2 border-zinc-700 pb-2.5 font-black text-white">All</span>
                  <span>Campaigns</span>
                  <span>Unprocessed</span>
                  <span>Completed</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Search leads...</span>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-xs border border-zinc-700" />
                </div>
                <div className="mt-2.5 space-y-2">
                  {[
                    { image: '/client-reviews/bruce-dinger.jpg', name: 'Bruce Dinger', company: 'SmartTech Solutions', domain: 'smarttech.example', status: 'Contact Form Found', statusClass: 'bg-blue-950 text-blue-400 border-blue-900' },
                    { image: '/client-reviews/kotaiba-alhaj.jpg', name: 'Kotaiba Alhaj', company: 'Bright Marketing', domain: 'brightmarketing.example', status: 'Processed', statusClass: 'bg-emerald-950 text-emerald-400 border-emerald-900' },
                    { image: '/client-reviews/michael-jessimy.jpg', name: 'Michael Jessimy', company: 'Innovate Studio', domain: 'innovate.example', status: 'AI Draft Ready', statusClass: 'bg-blue-950 text-blue-400 border-blue-900' },
                    { image: '/client-reviews/misti-morgenstern.jpg', name: 'Misti Morgenstern', company: 'Growth Labs', domain: 'growthlabs.example', status: 'Processed', statusClass: 'bg-emerald-950 text-emerald-400 border-emerald-900' },
                    { image: '/client-reviews/paola-marinone.jpg', name: 'Paola Marinone', company: 'DigitalBridge Co.', domain: 'digitalbridge.example', status: 'In Progress', statusClass: 'bg-amber-950 text-amber-300 border-amber-900' },
                  ].map((row) => (
                    <div key={row.company} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-3 w-3 rounded border border-zinc-700 shrink-0" />
                        <img src={row.image} alt={`${row.name} profile`} className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-zinc-800" />
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-extrabold text-white">{row.company}</p>
                          <p className="truncate text-[8px] font-semibold text-zinc-400">{row.domain}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-bold ${row.statusClass}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right sub-card: Campaign Workflow Sequence */}
              <div className="hero-glow-card relative min-w-0 rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3.5 shadow-[0_14px_45px_rgba(14,109,228,0.08)]">
                {/* Top Avatars Stack representing contact list */}
                <div className="flex items-center justify-end -space-x-2 pb-2">
                  <img src="/client-reviews/austin-smith.png" alt="Austin Smith profile" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                  <img src="/client-reviews/emily-davidson.png" alt="Emily Davidson profile" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                  <img src="/client-reviews/michael-kokernak.jpg" alt="Michael Kokernak profile" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                  <img src="/client-reviews/bill-bradford.jpg" alt="Dr. Bill Bradford profile" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                  <img src="/client-reviews/felix-dragoi.jpg" alt="Felix Dragoi profile" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-black text-zinc-400 ring-2 ring-white">+32</span>
                </div>

                <div className="space-y-1.5 relative">
                  {/* Node 1: Upload Leads */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0e6de4] text-white shadow-xs">
                          <UploadCloud className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-100">Upload Leads</p>
                          <p className="text-[10px] font-bold text-zinc-400">website-list.xlsx</p>
                        </div>
                      </div>
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 font-black">
                        ✓
                      </div>
                    </div>
                  </div>

                  {/* Connector Line 1 */}
                  <div className="flex justify-center -my-1">
                    <div className="h-3 w-0.5 bg-blue-800 relative">
                      <span className="absolute bottom-0 -left-1 text-[7px] text-blue-400 font-black">↓</span>
                    </div>
                  </div>

                  {/* Node 2: Find Contact Forms */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0e6de4] text-white shadow-xs">
                          <Search className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-100">Find Contact Forms</p>
                          <p className="text-[10px] font-bold text-blue-400">Scanning websites...</p>
                        </div>
                      </div>
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 font-black">
                        ✓
                      </div>
                    </div>
                  </div>

                  {/* Connector Line 2 */}
                  <div className="flex justify-center -my-1">
                    <div className="h-3 w-0.5 bg-blue-800 relative">
                      <span className="absolute bottom-0 -left-1 text-[7px] text-blue-400 font-black">↓</span>
                    </div>
                  </div>

                  {/* Node 3: AI Personalization */}
                  <div className="rounded-xl border border-blue-900 bg-zinc-950 p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0e6de4] text-white shadow-xs">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-black text-zinc-100">AI Personalization</p>
                      </div>
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 font-black">
                        ✓
                      </div>
                    </div>
                    <div className="mt-2 rounded-lg bg-zinc-950 border border-zinc-800 p-2 text-[10px] leading-relaxed text-zinc-400 font-medium">
                      <p>Hi <span className="font-bold text-zinc-100">{`{first_name}`}</span>,</p>
                      <p className="mt-0.5">I was impressed by <span className="font-bold text-zinc-100">{`{company}`}</span>'s work in <span className="font-bold text-zinc-100">{`{industry}`}</span>. I'd love to share some ideas that might help you grow faster.</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-[9px] font-black text-blue-400">
                      <Sparkles className="h-3 w-3" />
                      <span>AI Generated</span>
                    </div>
                  </div>

                  {/* Connector Line 3 */}
                  <div className="flex justify-center -my-1">
                    <div className="h-3 w-0.5 bg-blue-800 relative">
                      <span className="absolute bottom-0 -left-1 text-[7px] text-blue-400 font-black">↓</span>
                    </div>
                  </div>

                  {/* Node 4: Submit Outreach */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0e6de4] text-white shadow-xs">
                          <Send className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-100">Submit Outreach</p>
                          <p className="text-[10px] font-bold text-blue-400">Submitting forms...</p>
                        </div>
                      </div>
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 font-black">
                        ✓
                      </div>
                    </div>
                  </div>

                  {/* Connector Line 4 */}
                  <div className="flex justify-center -my-1">
                    <div className="h-3 w-0.5 bg-blue-800 relative">
                      <span className="absolute bottom-0 -left-1 text-[7px] text-blue-400 font-black">↓</span>
                    </div>
                  </div>

                  {/* Node 5: Track Results */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0e6de4] text-white shadow-xs">
                          <Gauge className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-zinc-100">Track Results</p>
                          <p className="text-[10px] font-extrabold text-zinc-400">128 submitted • 32 in review</p>
                        </div>
                      </div>
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 font-black">
                        ✓
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-y border-blue-900 bg-zinc-950 px-4 py-16 text-white sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-xl font-black sm:text-2xl">Trusted for High-Deliverability Contact Form Outreach</h2>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-bold text-zinc-400">
                <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-blue-400" />Bulk contact-form outreach</span>
                <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-400" />AI-personalized campaigns</span>
                <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-blue-400" />Controlled submission workflow</span>
              </div>
            </div>
            <div className="trusted-logo-marquee mt-11" aria-label="Teams served by ContactReachout">
              <div className="trusted-logo-track">
                {[...trustedCompanyMarks, ...trustedCompanyMarks].map(({ name, image }, index) => (
                  <div key={`${name}-${index}`} className="trusted-logo-item" aria-hidden={index >= trustedCompanyMarks.length}>
                    <span className="trusted-logo-mark"><img src={image} alt="" /></span>
                    <span className="whitespace-nowrap text-sm font-black tracking-tight text-zinc-300 sm:text-base">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-blue-400">Two services. One campaign.</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Scale the work, keep the message relevant.</h2><p className="mt-5 text-lg leading-8 text-zinc-400">ContactReachout combines bulk contact-form submission with AI-assisted personalization without removing human review and campaign safeguards.</p></div><div className="mt-12 grid gap-6 lg:grid-cols-2"><article className="rounded-[2rem] border border-blue-900 bg-gradient-to-br from-blue-950 to-zinc-900 p-8 sm:p-10"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0e6de4] text-white"><Send className="h-7 w-7" /></div><p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-blue-400">Main service 01</p><h3 className="mt-2 text-3xl font-black">Bulk Contact Form Submission</h3><p className="mt-4 leading-7 text-zinc-400">Turn named lead lists into structured campaigns that discover contact pages, map messages, respect safeguards, and record every result.</p></article><article className="rounded-[2rem] border border-blue-900 bg-gradient-to-br from-blue-950/50 to-zinc-900 p-8 sm:p-10"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0e6de4] text-white"><Sparkles className="h-7 w-7" /></div><p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-blue-400">Main service 02</p><h3 className="mt-2 text-3xl font-black">AI Personalization</h3><p className="mt-4 leading-7 text-zinc-400">Use verified lead context and your campaign guidance to create concise, relevant drafts for review—without inventing company facts.</p></article></div></div></section>

        <section id="control-tower" className="bg-black px-4 py-24 sm:px-6"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]"><div><p className="text-sm font-black text-blue-400">Your Contact Form Submission Tower</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">See every campaign move from upload to result.</h2><p className="mt-5 text-lg leading-8 text-zinc-400">Keep lead lists, AI drafts, processing status, reviews, and reporting connected in one operational view.</p><div className="mt-7 space-y-3">{['Select a named lead list', 'Guide the AI personalization', 'Control processing and safety', 'Review outcomes and proof'].map((item) => <div key={item} className="flex items-center gap-3 font-bold text-zinc-300"><CheckCircle2 className="h-5 w-5 text-blue-400" />{item}</div>)}</div></div><div className="rounded-[2rem] border border-zinc-800/80 bg-zinc-950 p-4 shadow-2xl shadow-blue-800/40 sm:p-6"><div className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-900 p-3 text-xs font-bold">{['Lead List', 'AI Draft', 'Review', 'Process', 'Results'].map((item, index) => <div key={item} className="flex items-center gap-3"><span className={`rounded-xl px-3 py-2 ${index === 1 ? 'bg-[#0e6de4] text-white' : 'bg-zinc-950 text-zinc-400 shadow-xs'}`}>{item}</span>{index < 4 && <ArrowRight className="h-4 w-4 text-zinc-400" />}</div>)}</div><div className="mt-4 grid gap-4 sm:grid-cols-[0.8fr_1.2fr]"><div className="rounded-2xl border border-zinc-800 p-4"><p className="text-xs font-black">Campaign progress</p><div className="mt-5 flex items-center justify-center"><div className="flex h-28 w-28 items-center justify-center rounded-full border-[12px] border-blue-900 border-t-[#0e6de4]"><span className="text-2xl font-black">68%</span></div></div><div className="mt-5 grid grid-cols-2 gap-2 text-center text-[10px] font-bold"><span className="rounded-lg bg-blue-950 p-2 text-blue-400">1,936 found</span><span className="rounded-lg bg-amber-950 p-2 text-amber-300">42 review</span></div></div><div className="rounded-2xl border border-blue-900 bg-blue-950/50 p-5"><div className="flex items-center gap-2 text-xs font-black text-blue-400"><MessageSquareText className="h-4 w-4" />AI personalization preview</div><div className="mt-4 rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-400 shadow-xs"><p className="font-black text-zinc-100">Partnership inquiry for Northstar Labs</p><p className="mt-3">Hello Northstar Labs team,</p><p className="mt-2">I came across your work in cloud infrastructure and wanted to reach out about a relevant B2B collaboration.</p><p className="mt-2">Would you be open to a brief conversation?</p></div><div className="mt-3 flex gap-2"><span className="rounded-lg bg-zinc-950 px-3 py-2 text-[10px] font-black text-blue-400 shadow-2xs">Review draft</span><span className="rounded-lg bg-[#0e6de4] px-3 py-2 text-[10px] font-black text-white">Use in campaign</span></div></div></div></div></div></section>

        <HomeProductSections />

        <section id="features" className="features-section border-y border-blue-900 !bg-zinc-950 px-4 py-24 sm:px-6"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-sm font-black text-blue-400">Platform Features</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Everything you need, built in.</h2><p className="mt-5 text-lg leading-8 text-zinc-400">A complete contact-form outreach platform—from upload and personalization to controlled processing and reporting.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{platformFeatures.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 transition hover:-translate-y-1 hover:border-blue-900 hover:shadow-xl hover:shadow-blue-900/50"><Icon className="h-8 w-8 text-blue-400" /><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-zinc-400">{description}</p></article>)}</div></div></section>

        <HomeDashboardPreview />
        <section className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-900 p-8 text-white shadow-2xl shadow-black/50 sm:p-14"><div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"><div><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black"><Globe2 className="h-4 w-4" />Start free — no credit card required.</div><h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">Ready to automate your contact form outreach?</h2><p className="mt-4 max-w-2xl text-lg leading-8 text-white">Create your account, upload a lead list, personalize your campaign, and keep the entire contact-form submission workflow visible.</p></div><Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0e6de4] px-7 py-4 text-sm font-black text-white shadow-xl hover:bg-[#0758bd]">Create free account <ArrowRight className="h-4 w-4" /></Link></div></div></section>
      </main>
      <LandingFooter />
    </div>

  );
}
