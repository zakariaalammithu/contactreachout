import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, Sparkles } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export const metadata: Metadata = {
  title: 'AI Outreach & Personalization | ContactReachout',
  description:
    'Generate personalized outreach messages for contact form campaigns using AI. Tailor messages to prospect industry and company context.',
  alternates: { canonical: 'https://contactreachout.com/ai-outreach' },
  openGraph: {
    title: 'AI Outreach & Personalization | ContactReachout',
    description:
      'Generate personalized outreach messages for contact form campaigns using AI. Tailor messages to prospect industry and company context.',
    url: 'https://contactreachout.com/ai-outreach',
    siteName: 'ContactReachout',
  },
};

export default function AiOutreachPage() {
  return (
    <div className="min-h-screen bg-[#f4f7ff] text-slate-950 flex flex-col justify-between">
      <LandingHeader />
      <main className="py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-[#0e6de4]">
              <Sparkles className="h-3.5 w-3.5" /> AI Personalization
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              AI-Powered Outreach Messages That Convert
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Personalize every contact form submission with AI context. Higher relevance means higher response rates from decision makers.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Bot className="h-8 w-8 text-[#0e6de4]" />
              <h3 className="mt-6 text-xl font-black text-slate-900">Contextual Draft Generation</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Leverage company data, industry context, and lead attributes to produce authentic outreach copy.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-[#0e6de4]" />
              <h3 className="mt-6 text-xl font-black text-slate-900">Human Approval Controls</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Review and tweak AI-generated templates before campaign submission to maintain brand accuracy.</p>
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
