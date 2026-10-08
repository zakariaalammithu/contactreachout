import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, Gauge, Globe2, Sparkles, UploadCloud } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

export const metadata: Metadata = {
  title: 'How It Works | Find Clients Through Website Contact Forms',
  description:
    'Learn how ContactReachout automates contact form discovery, AI personalization, and submission tracking for B2B client acquisition.',
  alternates: { canonical: 'https://contactreachout.com/how-it-works' },
  openGraph: {
    title: 'How It Works | ContactReachout',
    description:
      'Learn how ContactReachout automates contact form discovery, AI personalization, and submission tracking for B2B client acquisition.',
    url: 'https://contactreachout.com/how-it-works',
    siteName: 'ContactReachout',
  },
};

const steps = [
  {
    step: '01',
    icon: UploadCloud,
    title: 'Upload Lead List',
    description: 'Import your target company leads in CSV or Excel format. Map company names, domains, and contact fields in seconds.',
  },
  {
    step: '02',
    icon: Globe2,
    title: 'Automated Contact Form Discovery',
    description: 'Our engine scans target websites to locate official contact pages, inquiry forms, and submission requirements.',
  },
  {
    step: '03',
    icon: Sparkles,
    title: 'AI Personalization & Review',
    description: 'Craft tailored outreach messages for each prospect using lead context. Preview and refine messages before processing.',
  },
  {
    step: '04',
    icon: Gauge,
    title: 'Controlled Submission & Proof',
    description: 'Outreach is sent according to your specified pacing rules. Track successful deliveries, HTTP confirmation, and reply rates.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#f4f7ff] text-slate-950 flex flex-col justify-between">
      <LandingHeader />
      <main className="py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-[#0e6de4]">
              Step-by-step workflow
            </span>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              How ContactReachout Automates Contact Form Outreach
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              A transparent, 4-step process designed to find clients through website contact forms efficiently and reliably.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ step, icon: Icon, title, description }) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm relative">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0e6de4] text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-black text-blue-400">{step}</span>
                </div>
                <h3 className="mt-6 text-xl font-black text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-20 rounded-3xl border border-blue-100 bg-white p-8 sm:p-12 shadow-md">
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">Why Website Contact Form Outreach Works</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="flex gap-4">
                <CheckCircle2 className="h-6 w-6 text-[#0e6de4] shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">Direct Inbox Delivery</h3>
                  <p className="mt-1 text-sm text-slate-600">Website contact form submissions land directly in the business owner or sales team inbox without getting flagged by spam filters.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="h-6 w-6 text-[#0e6de4] shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">High Open & Response Rates</h3>
                  <p className="mt-1 text-sm text-slate-600">Companies prioritize website inquiries because contact form submissions represent active business opportunities.</p>
                </div>
              </div>
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
