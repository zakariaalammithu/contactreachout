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
  title: 'Contact Form Outreach | Find Clients Through Website Contact Forms',
  description:
    'Find clients through website contact forms with ContactReachout. Discover contact forms, personalize outreach with AI, and track campaign submission results.',
  alternates: { canonical: 'https://contactreachout.com/contact-form-outreach' },
  openGraph: {
    title: 'Contact Form Outreach | Find Clients Through Website Contact Forms',
    description:
      'Find clients through website contact forms with ContactReachout. Discover contact forms, personalize outreach with AI, and track campaign submission results.',
    url: 'https://contactreachout.com/contact-form-outreach',
    siteName: 'ContactReachout',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Form Outreach | Find Clients Through Website Contact Forms',
    description:
      'Find clients through website contact forms with ContactReachout. Discover contact forms, personalize outreach with AI, and track campaign submission results.',
  },
};

const outreachFaqs = [
  {
    question: 'What is contact form outreach?',
    answer:
      'Contact form outreach is a B2B communication strategy where personalized messages are sent to potential client companies directly through the contact forms on their websites.',
  },
  {
    question: 'How does ContactReachout find website contact forms?',
    answer:
      'ContactReachout scans target website URLs, main navigation, footers, and subpages to detect valid contact pages, forms, and submission endpoints.',
  },
  {
    question: 'Can I personalize contact-form messages?',
    answer:
      'Yes. You can use lead fields (such as company name, contact name, and industry) alongside AI-assisted personalization to generate relevant drafts for each prospect.',
  },
  {
    question: 'What happens when a website has no contact form?',
    answer:
      'When a target website has no usable contact page or form, ContactReachout records the outcome as NO_FORM so you have complete visibility without wasting campaign resources.',
  },
  {
    question: 'Can I track the result of each submission?',
    answer:
      'Yes. Every processed lead includes verifiable details such as timestamp, HTTP response status, confirmation message, or failure diagnostic.',
  },
  {
    question: 'What happens when a website cannot be reached?',
    answer:
      'If a website is offline, times out, or encounters a network error, the system flags the outcome as FAILED or unreachable and logs diagnostic details.',
  },
  {
    question: 'Can I manage multiple outreach campaigns?',
    answer:
      'Yes. You can create, pause, and track multiple named campaigns with distinct prospect lists, message configurations, and pacing rules.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: outreachFaqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export default function ContactFormOutreachPage() {
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
              <Globe2 className="h-3.5 w-3.5 text-[#0e6de4]" />
              <span>High-Deliverability Channel</span>
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-[-0.03em] text-[#0f172a] sm:text-5xl lg:text-6xl">
              Find Clients Through <br className="hidden sm:inline" />
              <span className="text-[#0e6de4]">Website Contact Forms</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-base font-medium leading-relaxed text-[#64748b] sm:text-lg">
              Find relevant businesses, discover their website contact forms, and send personalized outreach messages at scale. ContactReachout helps you manage prospecting, AI personalization, contact-form submissions, and campaign results from one workspace.
            </p>
          </section>

          {/* Section 2: 3 Feature Cards (Refined Titles & Descriptions) */}
          <section className="grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0e6de4]">
                <Globe2 className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-slate-900">Reach Prospects Beyond Email</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Reach businesses through their website contact forms as an additional outreach channel beyond traditional cold email.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0e6de4]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-slate-900">AI-Powered Personalization</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Create relevant messages using prospect and company information. AI-assisted personalization helps tailor each outreach message to the context of the business and campaign.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0e6de4]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-slate-900">Verifiable Submission Reporting</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Track submission timestamps, HTTP responses, confirmation signals, and campaign outcomes for processed prospects.
              </p>
            </div>
          </section>

          {/* Section 3: How Contact Form Outreach Works (5 Steps) */}
          <section className="rounded-3xl border border-blue-100 bg-white p-8 sm:p-12 shadow-sm space-y-10">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0e6de4] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Campaign Workflow
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                How Contact Form Outreach Works
              </h2>
              <p className="mt-3 text-base text-slate-600 font-medium">
                Turn a targeted prospect list into personalized website contact-form outreach with a simple campaign workflow.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-5">
              {[
                { step: '01', icon: UploadCloud, title: 'Import Prospects', text: 'Upload your lead list and map company, website, contact, and custom fields.' },
                { step: '02', icon: Search, title: 'Discover Forms', text: 'ContactReachout analyzes target websites and identifies relevant contact forms when available.' },
                { step: '03', icon: Sparkles, title: 'Personalize Message', text: 'Create personalized outreach messages using campaign data and AI-assisted personalization.' },
                { step: '04', icon: Zap, title: 'Submit & Verify', text: 'Process contact-form submissions and capture available verification signals and submission results.' },
                { step: '05', icon: BarChart3, title: 'Track Outcomes', text: 'Review delivered, failed, unreachable, no-form, and review-required outcomes from your campaign.' },
              ].map(({ step, icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-slate-100 bg-[#fafafd] p-5 flex flex-col justify-between">
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

          {/* Section 4: Why Use Website Contact Forms for B2B Outreach? */}
          <section className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0e6de4] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Outreach Strategy
              </span>
              <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
                Why Use Website Contact Forms for B2B Outreach?
              </h2>
              <p className="text-base leading-relaxed text-slate-600 font-medium">
                Website contact form outreach offers a distinct channel for connecting with prospective client companies directly on their official web properties.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  'Complement traditional email with an active, web-native inquiry channel.',
                  'Inquiries arrive directly in customer service or business owner inboxes.',
                  'Domain and company context enable relevant, tailor-made message copy.',
                  'Centralized reporting records submission timestamps, HTTP status codes, and proof.',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#0e6de4] shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold text-slate-700">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 p-8 shadow-xs space-y-4">
              <h3 className="text-xl font-black text-slate-900">Explore Related Solutions</h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Discover how ContactReachout integrates lead lists, AI customization, and automated discovery to streamline outbound client acquisition.
              </p>
              <div className="pt-2 flex flex-col gap-3">
                <Link href="/features" className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 hover:border-blue-300 hover:text-[#0e6de4] transition-colors">
                  <span>Explore Platform Features</span>
                  <ArrowRight className="h-4 w-4 text-[#0e6de4]" />
                </Link>
                <Link href="/how-it-works" className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 hover:border-blue-300 hover:text-[#0e6de4] transition-colors">
                  <span>See How It Works</span>
                  <ArrowRight className="h-4 w-4 text-[#0e6de4]" />
                </Link>
                <Link href="/b2b-lead-generation" className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 hover:border-blue-300 hover:text-[#0e6de4] transition-colors">
                  <span>B2B Lead Generation</span>
                  <ArrowRight className="h-4 w-4 text-[#0e6de4]" />
                </Link>
                <Link href="/ai-personalization" className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 hover:border-blue-300 hover:text-[#0e6de4] transition-colors">
                  <span>AI Personalization Engine</span>
                  <ArrowRight className="h-4 w-4 text-[#0e6de4]" />
                </Link>
              </div>
            </div>
          </section>

          {/* Section 5: From Prospect List to Personalized Outreach */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm space-y-6">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
                From Prospect List to Personalized Outreach
              </h2>
              <p className="mt-2 text-base text-slate-600 font-medium">
                ContactReachout connects every phase of the contact-form submission workflow into one organized view.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
              <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-6">
                <p className="text-xs font-mono font-bold text-[#0e6de4]">01. PREPARATION</p>
                <h3 className="mt-2 font-black text-slate-900 text-lg">Targeted Prospect List</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">Import named CSV or Excel files containing company domains, names, and contact context.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-6">
                <p className="text-xs font-mono font-bold text-[#0e6de4]">02. MAPPING</p>
                <h3 className="mt-2 font-black text-slate-900 text-lg">Lead Field Mapping</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">Map lead variables so message templates automatically populate accurate prospect details.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-6">
                <p className="text-xs font-mono font-bold text-[#0e6de4]">03. CREATIVE</p>
                <h3 className="mt-2 font-black text-slate-900 text-lg">Campaign Messaging</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">Draft concise value propositions and leverage AI guidance to tailor outreach copy.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-6">
                <p className="text-xs font-mono font-bold text-[#0e6de4]">04. PERSONALIZATION</p>
                <h3 className="mt-2 font-black text-slate-900 text-lg">Contextual Personalization</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">Generate personalized drafts tailored to prospect industry and value proposition.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-6">
                <p className="text-xs font-mono font-bold text-[#0e6de4]">05. EXECUTION</p>
                <h3 className="mt-2 font-black text-slate-900 text-lg">Form Processing</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">Automate website contact form discovery and process submissions under controlled pacing.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-[#fafafd] p-6">
                <p className="text-xs font-mono font-bold text-[#0e6de4]">06. PROOF</p>
                <h3 className="mt-2 font-black text-slate-900 text-lg">Outcome Verification</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">Review detailed reports showing successful deliveries, errors, and uncontactable sites.</p>
              </div>
            </div>
          </section>

          {/* Section 6: Who Can Use Contact Form Outreach? (Use Cases) */}
          <section className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0e6de4] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Target Audiences
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                Who Can Use Contact Form Outreach?
              </h2>
              <p className="mt-2 text-base text-slate-600 font-medium">
                Tailored for B2B growth teams looking for an additional, accountable outbound outreach channel.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Users, title: 'B2B Sales Teams', text: 'Initiate outbound conversations with key company contacts through direct website inquiry pages.' },
                { icon: Building2, title: 'Lead Generation Agencies', text: 'Offer client accounts an additional high-deliverability channel alongside cold email services.' },
                { icon: Briefcase, title: 'Marketing Agencies', text: 'Present services, audit proposals, and specialized offerings to target business websites.' },
                { icon: Laptop, title: 'SaaS Companies', text: 'Connect with potential software buyers, integration partners, and enterprise accounts.' },
                { icon: Zap, title: 'Business Development', text: 'Expand strategic outbound partnership opportunities with structured contact form submission.' },
                { icon: Layers3, title: 'Freelancers & Consultants', text: 'Find new client projects by reaching businesses that actively monitor website inquiry channels.' },
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
                Questions About Contact Form Outreach
              </h2>
              <p className="mt-2 text-base text-slate-600 font-medium">
                Clear answers about how ContactReachout handles discovery, AI personalization, and submission verification.
              </p>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-[#fafafd] px-6">
              {outreachFaqs.map((faq, index) => (
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
