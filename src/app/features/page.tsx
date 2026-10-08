import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  CircleHelp,
  FileSpreadsheet,
  FileText,
  Gauge,
  Globe2,
  Laptop,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  Zap,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export const metadata: Metadata = {
  title: 'Features | ContactReachout — Website Contact Form Outreach',
  description:
    'Explore ContactReachout features for lead imports, contact form discovery, AI personalization, campaign controls, submission verification, and outreach analytics.',
  alternates: { canonical: 'https://contactreachout.com/features' },
  openGraph: {
    title: 'Features | ContactReachout — Website Contact Form Outreach',
    description:
      'Explore ContactReachout features for lead imports, contact form discovery, AI personalization, campaign controls, submission verification, and outreach analytics.',
    url: 'https://contactreachout.com/features',
    siteName: 'ContactReachout',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features | ContactReachout — Website Contact Form Outreach',
    description:
      'Explore ContactReachout features for lead imports, contact form discovery, AI personalization, campaign controls, submission verification, and outreach analytics.',
  },
};

const featuresFaqs = [
  {
    question: 'What does ContactReachout do?',
    answer:
      'ContactReachout is a B2B contact form outreach workspace that automates lead list import, website contact form discovery, AI message personalization, form submission processing, and outcome verification.',
  },
  {
    question: 'How does contact form discovery work?',
    answer:
      'ContactReachout scans prospect website URLs, navigation links, footers, and subpages to detect valid contact forms and submission endpoints automatically.',
  },
  {
    question: 'Can I upload my own lead list?',
    answer:
      'Yes. You can upload CSV or Excel files containing company names, websites, contact names, and custom variables, and map the fields directly to your campaign.',
  },
  {
    question: 'How does AI personalization work?',
    answer:
      'The AI personalization engine uses your lead data and campaign instructions to generate relevant, contextual message drafts tailored to each prospect without inventing false facts.',
  },
  {
    question: 'Can I control campaign pacing?',
    answer:
      'Yes. You can configure processing speeds, concurrency limits, and pause or resume campaigns at any time to keep your outreach controlled and accountable.',
  },
  {
    question: 'Can I track submission results?',
    answer:
      'Yes. ContactReachout records submission timestamps, HTTP status responses, confirmation notices, and categorized outcomes (such as DELIVERED, NO_FORM, or FAILED) for complete visibility.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: featuresFaqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

const coreFeatures = [
  {
    icon: UploadCloud,
    title: 'Lead List Upload & Field Mapping',
    description:
      'Import CSV or Excel lead files with flexible column mapping for company names, contact names, websites, and custom fields.',
  },
  {
    icon: Search,
    title: 'Intelligent Contact Form Discovery',
    description:
      'Automatically scan website navigation, footers, and subpages to detect valid contact forms and submission endpoints.',
  },
  {
    icon: Bot,
    title: 'AI Personalization Engine',
    description:
      'Generate tailored, relevant message copy based on lead data and campaign context without inventing false facts.',
  },
  {
    icon: ShieldCheck,
    title: 'Accountable Submission Safeguards',
    description:
      'Built-in dry-run testing, pacing controls, CAPTCHA detection, and manual review triggers to protect campaign reputation.',
  },
  {
    icon: Gauge,
    title: 'Campaign Pacing & Control',
    description:
      'Start, pause, and manage campaigns effortlessly while controlling sending speed and concurrency limits.',
  },
  {
    icon: FileText,
    title: 'Verifiable Proof & Analytics',
    description:
      'Track exact submission timestamps, HTTP responses, confirmation messages, and delivery outcomes in one unified dashboard.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#f4f7ff] text-slate-950 flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingHeader />
      <main className="py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-20">
          {/* Section 1: Hero */}
          <section className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-blue-50/80 px-4 py-1.5 text-xs font-bold text-[#0e6de4] shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#0e6de4]" />
              <span>Platform Features</span>
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-[-0.03em] text-[#0f172a] sm:text-5xl lg:text-6xl">
              Everything You Need to Find <br className="hidden sm:inline" />
              <span className="text-[#0e6de4]">Clients Through Website Contact Forms</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-base font-medium leading-relaxed text-[#64748b] sm:text-lg">
              ContactReachout provides a complete suite of tools to automate B2B contact form outreach from lead import to delivery verification.
            </p>
          </section>

          {/* Section 2: 6 Core Feature Cards */}
          <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0e6de4]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-black text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            ))}
          </section>

          {/* Section 3: How ContactReachout Works (5 Steps) */}
          <section className="rounded-3xl border border-blue-100 bg-white p-8 sm:p-12 shadow-sm space-y-10">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0e6de4] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Step-By-Step
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                How ContactReachout Works
              </h2>
              <p className="mt-3 text-base text-slate-600 font-medium">
                Move from a targeted prospect list to personalized website contact-form outreach through one controlled workflow.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-5">
              {[
                {
                  step: '01',
                  icon: UploadCloud,
                  title: 'Import Your Leads',
                  text: 'Upload CSV or Excel files and map company, contact, website, and custom fields.',
                },
                {
                  step: '02',
                  icon: Search,
                  title: 'Discover Contact Forms',
                  text: 'Analyze prospect websites and identify relevant contact forms when available.',
                },
                {
                  step: '03',
                  icon: Sparkles,
                  title: 'Personalize Outreach',
                  text: 'Create relevant messages using prospect and company context with AI-assisted personalization.',
                },
                {
                  step: '04',
                  icon: Zap,
                  title: 'Process & Verify',
                  text: 'Process eligible contact forms and capture available submission and verification signals.',
                },
                {
                  step: '05',
                  icon: BarChart3,
                  title: 'Track Results',
                  text: 'Monitor processing status, submission outcomes, and campaign performance from one workspace.',
                },
              ].map(({ step, icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-100 bg-[#fafafd] p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0e6de4]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-black text-blue-400">{step}</span>
                    </div>
                    <h3 className="mt-4 font-black text-slate-900 text-base">{title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Built for Accountable Outreach (6 Points) */}
          <section className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0e6de4] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Safeguards & Visibility
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                Built for Accountable Outreach
              </h2>
              <p className="mt-2 text-base text-slate-600 font-medium">
                ContactReachout gives you the controls and visibility needed to manage website contact-form outreach responsibly.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Controlled Campaign Pacing',
                  text: 'Set hourly and daily concurrency limits to pace form submission processing.',
                },
                {
                  title: 'Duplicate Protection',
                  text: 'Automatically detect and skip duplicate domain submissions across active campaigns.',
                },
                {
                  title: 'Submission Tracking',
                  text: 'Record HTTP status codes, submission timestamps, and server confirmation logs.',
                },
                {
                  title: 'Review Required Handling',
                  text: 'Flag complex form structures and CAPTCHAs for manual review without failing the batch.',
                },
                {
                  title: 'Detailed Campaign Reporting',
                  text: 'View categorized results for delivered, unreachable, no-form, and failed leads.',
                },
                {
                  title: 'Credit-Based Usage Tracking',
                  text: 'Deduct campaign credits transparently for processed outreach targets.',
                },
              ].map(({ title, text }) => (
                <div key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#0e6de4] shrink-0" />
                    <h3 className="font-black text-slate-900 text-base">{title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium pl-7">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: From Lead List to Campaign Results (Visual Workflow) */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm space-y-8">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0e6de4] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                End-To-End Architecture
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                From Lead List to Campaign Results
              </h2>
              <p className="mt-2 text-base text-slate-600 font-medium">
                Keep every stage of your outreach workflow connected in one workspace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 pt-2">
              {[
                { stage: '01', title: 'Lead List' },
                { stage: '02', title: 'Field Mapping' },
                { stage: '03', title: 'Form Discovery' },
                { stage: '04', title: 'AI Copywriting' },
                { stage: '05', title: 'Form Processing' },
                { stage: '06', title: 'Verification' },
                { stage: '07', title: 'Analytics' },
              ].map(({ stage, title }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-[#fafafd] p-4 text-center space-y-1 hover:border-blue-300 transition-colors"
                >
                  <span className="text-[10px] font-mono font-bold text-[#0e6de4] block">{stage}</span>
                  <p className="text-xs font-extrabold text-slate-900">{title}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs font-semibold text-slate-600">
                Want to learn more about how contact form outreach works?
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-bold">
                <Link
                  href="/contact-form-outreach"
                  className="inline-flex items-center gap-1.5 text-[#0e6de4] hover:underline"
                >
                  Contact Form Outreach Strategy <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center gap-1.5 text-[#0e6de4] hover:underline"
                >
                  How It Works <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* Section 6: Who Is ContactReachout For? (Compact Audience Cards) */}
          <section className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0e6de4] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Use Cases
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                Who Is ContactReachout For?
              </h2>
              <p className="mt-2 text-base text-slate-600 font-medium">
                Built for teams that want an additional, accountable channel for B2B outreach.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: 'B2B Sales Teams',
                  text: 'Initiate outbound conversations with key company contacts through direct website inquiry pages.',
                },
                {
                  icon: Building2,
                  title: 'Lead Generation Agencies',
                  text: 'Offer client accounts an additional high-deliverability channel alongside cold email services.',
                },
                {
                  icon: Briefcase,
                  title: 'Marketing Agencies',
                  text: 'Present specialized services and audit proposals directly to target business websites.',
                },
                {
                  icon: Laptop,
                  title: 'SaaS Companies',
                  text: 'Connect with prospective buyers, integration partners, and enterprise targets.',
                },
                {
                  icon: Zap,
                  title: 'Business Development Teams',
                  text: 'Expand strategic outbound partnership opportunities with structured submissions.',
                },
                {
                  icon: Layers3,
                  title: 'Freelancers & Consultants',
                  text: 'Acquire client projects by reaching businesses actively monitoring website contact pages.',
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0e6de4]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-black text-slate-900 text-lg">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: FAQ Section */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm space-y-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0e6de4]">
                <CircleHelp className="h-4 w-4 text-[#0e6de4]" />
                <span>Frequently Asked Questions</span>
              </div>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                Questions About ContactReachout Features
              </h2>
              <p className="mt-2 text-base text-slate-600 font-medium">
                Learn more about how ContactReachout handles lead imports, form discovery, AI personalization, and reporting.
              </p>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fafafd] px-6">
              {featuresFaqs.map((faq, index) => (
                <details key={faq.question} className="group py-2" open={index === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-black text-slate-900">
                    <span>{faq.question}</span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-blue-200 bg-white text-sm text-[#0e6de4] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 pr-6 text-sm leading-relaxed text-slate-600 font-medium">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Section 8: Final CTA */}
          <section className="rounded-3xl bg-[#0e6de4] p-10 text-white text-center sm:p-14 shadow-xl shadow-blue-500/15">
            <h2 className="text-3xl font-black sm:text-4xl">Ready to Start Your First Campaign?</h2>
            <p className="mt-4 text-base sm:text-lg text-blue-100 max-w-2xl mx-auto font-medium">
              Find clients through website contact forms with automated discovery, AI personalization, and verifiable delivery reporting.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-black text-[#0e6de4] shadow-lg hover:bg-blue-50 transition-colors"
              >
                Start Your First Campaign <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-4 text-sm font-black text-white hover:bg-white/20 transition-colors"
              >
                View Credit Pricing
              </Link>
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
