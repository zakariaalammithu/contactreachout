import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, Gauge, Search, Sparkles } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export const metadata: Metadata = {
  title: 'Website Contact Form Automation | ContactReachout',
  description:
    'Automate website contact form submissions with intelligent discovery, custom field mapping, and AI personalization.',
  alternates: { canonical: 'https://contactreachout.com/website-contact-form-automation' },
  openGraph: {
    title: 'Website Contact Form Automation | ContactReachout',
    description:
      'Automate website contact form submissions with intelligent discovery, custom field mapping, and AI personalization.',
    url: 'https://contactreachout.com/website-contact-form-automation',
    siteName: 'ContactReachout',
  },
};

export default function WebsiteContactFormAutomationPage() {
  return (
    <div className="min-h-screen bg-[#f4f7ff] text-slate-950 flex flex-col justify-between">
      <LandingHeader />
      <main className="py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-[#0e6de4]">
              Automated Prospecting
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Website Contact Form Automation
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Find clients through website contact forms automatically. Import lead lists, map fields, and execute high-converting outreach at scale.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Search className="h-8 w-8 text-[#0e6de4]" />
              <h3 className="mt-6 text-xl font-black text-slate-900">Form & Endpoint Scanner</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Scans domain URLs to find contact pages, inquiry forms, and iframe embedded forms automatically.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Bot className="h-8 w-8 text-[#0e6de4]" />
              <h3 className="mt-6 text-xl font-black text-slate-900">AI Personalization</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Generates relevant messages tailored to prospect industry and value proposition.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Gauge className="h-8 w-8 text-[#0e6de4]" />
              <h3 className="mt-6 text-xl font-black text-slate-900">Pacing & Concurrency Controls</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Set sending speed and concurrency to ensure smooth and accountable campaign execution.</p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0e6de4] px-8 py-4 text-base font-black text-white shadow-lg hover:bg-[#0758bd]"
            >
              Start Your First Campaign <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
