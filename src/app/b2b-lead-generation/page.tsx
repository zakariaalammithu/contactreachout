import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Globe2, Sparkles } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export const metadata: Metadata = {
  title: 'B2B Lead Generation Through Website Contact Forms | ContactReachout',
  description:
    'Scale B2B lead generation by reaching prospects through website contact forms. Discover forms, personalize messages, and generate qualified leads.',
  alternates: { canonical: 'https://contactreachout.com/b2b-lead-generation' },
  openGraph: {
    title: 'B2B Lead Generation Through Website Contact Forms | ContactReachout',
    description:
      'Scale B2B lead generation by reaching prospects through website contact forms. Discover forms, personalize messages, and generate qualified leads.',
    url: 'https://contactreachout.com/b2b-lead-generation',
    siteName: 'ContactReachout',
  },
};

export default function B2bLeadGenerationPage() {
  return (
    <div className="min-h-screen bg-[#f4f7ff] text-slate-950 flex flex-col justify-between">
      <LandingHeader />
      <main className="py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-[#0e6de4]">
              <Globe2 className="h-3.5 w-3.5" /> Growth Channel
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              B2B Lead Generation Through Website Contact Forms
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Find clients through website contact forms to build a predictable, high-deliverability outbound lead generation engine.
            </p>
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
