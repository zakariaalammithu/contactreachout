import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export const metadata: Metadata = {
  title: 'About ContactReachout | Accountable Contact Form Outreach',
  description:
    'ContactReachout is the platform designed to help businesses find clients through website contact forms with AI personalization and verifiable delivery proof.',
  alternates: { canonical: 'https://contactreachout.com/about' },
  openGraph: {
    title: 'About ContactReachout',
    description:
      'ContactReachout is the platform designed to help businesses find clients through website contact forms with AI personalization and verifiable delivery proof.',
    url: 'https://contactreachout.com/about',
    siteName: 'ContactReachout',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f4f7ff] text-slate-950 flex flex-col justify-between">
      <LandingHeader />
      <main className="py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-[#0e6de4]">
              About ContactReachout
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Find Clients Through Website Contact Forms
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              We built ContactReachout to give sales teams and agency founders a reliable, accountable channel for B2B outreach beyond traditional cold email.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Globe2 className="h-8 w-8 text-[#0e6de4]" />
              <h3 className="mt-6 text-xl font-black text-slate-900">High Deliverability</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Reaching businesses through their contact forms eliminates spam folder risk and ensures your message is seen.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <Sparkles className="h-8 w-8 text-[#0e6de4]" />
              <h3 className="mt-6 text-xl font-black text-slate-900">AI Personalization</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">AI-tailored messages show prospect awareness and build genuine engagement from the very first touchpoint.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <ShieldCheck className="h-8 w-8 text-[#0e6de4]" />
              <h3 className="mt-6 text-xl font-black text-slate-900">Accountability & Proof</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Every campaign provides full transparency with submission timestamps, response logs, and outcome verification.</p>
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
