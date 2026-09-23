'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CircleHelp,
  CreditCard,
  FileSearch,
  Gift,
  LifeBuoy,
  ListChecks,
  Megaphone,
  Search,
  UserCircle,
  Wrench,
  X,
  ChevronDown,
  Mail,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

const CATEGORIES = [
  { id: 'getting-started', icon: CircleHelp, title: 'Getting Started', text: 'Create an account, access your dashboard, and prepare your first campaign.' },
  { id: 'campaigns', icon: Megaphone, title: 'Campaigns', text: 'Create, edit, save drafts, start campaigns, and monitor progress.' },
  { id: 'lead-lists', icon: ListChecks, title: 'Lead Lists', text: 'Import, organize, and select prospect or company lead lists.' },
  { id: 'ai-personalization', icon: Bot, title: 'AI Personalization', text: 'Generate relevant messages and review or edit them before submission.' },
  { id: 'contact-forms', icon: FileSearch, title: 'Contact Form Submission', text: 'Understand form discovery and website-based submission outcomes.' },
  { id: 'credits-billing', icon: CreditCard, title: 'Credits & Billing', text: 'Review your balance, usage history, and available credit options.' },
  { id: 'account-profile', icon: UserCircle, title: 'Account & Profile', text: 'Manage your personal profile and account information.' },
  { id: 'referrals', icon: Gift, title: 'Referrals', text: 'Find your unique referral code and review referral rewards.' },
];

const STEPS = [
  { step: '01', title: 'Create Your Account', text: 'Sign up for your ContactReachout account and access your control dashboard.' },
  { step: '02', title: 'Add Your Leads', text: 'Import your prospect or company list via CSV or XLSX file upload.' },
  { step: '03', title: 'Create a Campaign', text: 'Select your target lead list and configure your outreach campaign settings.' },
  { step: '04', title: 'Find Contact Forms', text: 'Identify relevant website contact forms for target prospects automatically.' },
  { step: '05', title: 'Personalize With AI', text: 'Generate messages from available prospect data or use custom templates.' },
  { step: '06', title: 'Review & Submit', text: 'Review and approve all message text before starting submission workflow.' },
  { step: '07', title: 'Track Results', text: 'Monitor campaign dispatch progress, submission outcomes, and usage history.' },
];

const FAQS = [
  {
    id: 'faq-1',
    category: 'getting-started',
    question: 'What is ContactReachout?',
    answer: 'ContactReachout is an enterprise platform for organizing bulk website contact-form outreach, AI-assisted personalization, lead lists, campaigns, and submission results in one workspace.',
  },
  {
    id: 'faq-2',
    category: 'contact-forms',
    question: 'How does website contact-form outreach work?',
    answer: 'A campaign processes target lead data to discover available website contact forms, prepare approved messages, and record each diagnostic submission outcome.',
  },
  {
    id: 'faq-3',
    category: 'ai-personalization',
    question: 'How does AI personalization work?',
    answer: 'Available prospect and company context is processed to draft relevant outreach text. All generated messages can be reviewed and edited prior to starting submissions.',
  },
  {
    id: 'faq-4',
    category: 'ai-personalization',
    question: 'Can I edit AI-generated messages before submitting them?',
    answer: 'Yes. You can review and modify any generated text in the campaign editor before initiating campaign dispatches.',
  },
  {
    id: 'faq-5',
    category: 'campaigns',
    question: 'Can I save a campaign as a draft?',
    answer: 'Yes. Click Save Draft in the campaign editor to save your work at any time without initiating dispatches.',
  },
  {
    id: 'faq-6',
    category: 'lead-lists',
    question: 'How do I import leads?',
    answer: 'Click Import Leads File in the dashboard header or Lead Lists section, map your spreadsheet columns, and confirm the import.',
  },
  {
    id: 'faq-7',
    category: 'credits-billing',
    question: 'How are credits used?',
    answer: 'Free accounts receive 100 credits upon signup. 1 credit is consumed per successful eligible contact-form submission. Failed, blocked, or unavailable outcomes charge 0 credits. Paid plans include AI personalization (0 credits); free tier users cannot access AI personalization.',
  },
  {
    id: 'faq-8',
    category: 'credits-billing',
    question: 'Where can I purchase additional credits?',
    answer: 'Open Usage & Credits from your dashboard sidebar or visit the Pricing page to select a plan or top up your credit balance.',
  },
  {
    id: 'faq-9',
    category: 'campaigns',
    question: 'Can I pause or manage a campaign?',
    answer: 'Yes. Available actions (Pause, Resume, Edit) appear on the Campaigns page depending on the campaign’s current status.',
  },
  {
    id: 'faq-10',
    category: 'contact-forms',
    question: 'Where can I see my submission results?',
    answer: 'Open Submissions or Usage & History from your dashboard to view detailed pre/post submission logs and status breakdowns.',
  },
  {
    id: 'faq-11',
    category: 'account-profile',
    question: 'How do I update my profile?',
    answer: 'Open Profile from the account user menu in your dashboard sidebar to update your contact details or password.',
  },
  {
    id: 'faq-12',
    category: 'getting-started',
    question: 'How do I contact support?',
    answer: 'Click Contact Support below or email hello@contactreachout.com for direct assistance from the ContactReachout team.',
  },
];

const TROUBLESHOOTING_ISSUES = [
  {
    id: 'tr-1',
    category: 'campaigns',
    title: 'Campaign Not Starting',
    problem: 'Campaign status remains pending or draft.',
    explanation: 'Check campaign status, selected lead list count, available credit balance, and required campaign fields.',
    nextStep: 'Ensure your lead list is active, credits are available, and required sender details are completed.',
  },
  {
    id: 'tr-2',
    category: 'lead-lists',
    title: 'Lead List Import Issues',
    problem: 'File import fails or columns do not map.',
    explanation: 'Check the file format (.csv or .xlsx), required email/website columns, and header column mapping.',
    nextStep: 'Verify spreadsheet column headers and re-upload via the Import Leads dialog.',
  },
  {
    id: 'tr-3',
    category: 'ai-personalization',
    title: 'AI Personalization Issues',
    problem: 'Generated text appears incomplete or unavailable.',
    explanation: 'Check the selected lead list information, your prompt instructions, and whether your account plan includes AI features.',
    nextStep: 'Ensure your subscription plan supports AI personalization and review custom prompt instructions.',
  },
  {
    id: 'tr-4',
    category: 'contact-forms',
    title: 'Submission Issues',
    problem: 'Some target websites show non-success outcomes.',
    explanation: 'External websites may lack reachable forms, block automated dispatches, or require security verification.',
    nextStep: 'Security challenges or CAPTCHAs require review or prevent automated delivery under platform safeguards.',
  },
  {
    id: 'tr-5',
    category: 'credits-billing',
    title: 'Credit & Balance Issues',
    problem: 'Insufficient credits or payment processing delay.',
    explanation: 'Outreach campaigns require an available credit balance for successful submissions.',
    nextStep: 'Check your balance in Usage & Credits or upgrade your plan on the Pricing page.',
  },
  {
    id: 'tr-6',
    category: 'account-profile',
    title: 'Login & Account Access',
    problem: 'Unable to log into your account.',
    explanation: 'Incorrect credentials, expired sessions, or administrative restriction.',
    nextStep: 'Use the standard login page or email hello@contactreachout.com for account access recovery.',
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIds, setOpenFaqIds] = useState<Record<string, boolean>>({ 'faq-1': true });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaqIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQS.filter((f) => {
      const matchesCat = !selectedCategory || f.category === selectedCategory;
      if (!q) return matchesCat;
      return matchesCat && (f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    });
  }, [searchQuery, selectedCategory]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((c) => c.title.toLowerCase().includes(q) || c.text.toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredSteps = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return STEPS;
    return STEPS.filter((s) => s.title.toLowerCase().includes(q) || s.text.toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return TROUBLESHOOTING_ISSUES.filter((i) => {
      const matchesCat = !selectedCategory || i.category === selectedCategory;
      if (!q) return matchesCat;
      return matchesCat && (i.title.toLowerCase().includes(q) || i.explanation.toLowerCase().includes(q) || i.problem.toLowerCase().includes(q));
    });
  }, [searchQuery, selectedCategory]);

  const hasSearch = searchQuery.trim().length > 0;
  const totalResults = filteredFaqs.length + filteredCategories.length + filteredSteps.length + filteredIssues.length;

  const handleCategoryClick = (catId: string) => {
    if (selectedCategory === catId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catId);
      const faqEl = document.getElementById('faqs-section');
      if (faqEl) {
        faqEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-[#111827] font-sans selection:bg-blue-500/20 selection:text-blue-950">
      <LandingHeader />

      <main className="space-y-12 pb-16">
        {/* 1. Hero Section & Prominent Search */}
        <section className="px-4 pt-12 pb-6 text-center sm:px-6 lg:pt-16">
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex rounded-2xl bg-blue-100/80 p-3.5 text-[#0e6de4] shadow-2xs">
              <LifeBuoy className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-[#111827] sm:text-5xl">
              How Can We Help?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#4b5563] sm:text-base font-medium">
              Find answers, learn how <strong className="font-black text-[#111827]">ContactReachout</strong> works, and get help with your account, campaigns, AI personalization, contact-form submissions, credits, and billing.
            </p>

            {/* Visually Prominent Search Field */}
            <div className="mx-auto mt-8 max-w-2xl">
              <div className="relative flex items-center rounded-2xl border border-slate-300 bg-white shadow-md transition-all focus-within:border-[#0e6de4] focus-within:ring-2 focus-within:ring-blue-100">
                <Search className="absolute left-4 h-5 w-5 text-[#0e6de4]" />
                <input
                  type="text"
                  aria-label="Search Help & Support"
                  placeholder="Search guides, FAQs, campaigns, credits, billing, or troubleshooting..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl bg-transparent py-4 pl-12 pr-10 text-sm font-semibold text-[#111827] placeholder-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 cursor-pointer transition"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {(hasSearch || selectedCategory) && (
                <div className="mt-3 flex items-center justify-between px-2 text-xs font-semibold text-[#4b5563]">
                  <span>
                    {hasSearch ? `Found ${totalResults} help topics for "${searchQuery}"` : `Active Category Filter`}
                  </span>
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-[#0e6de4] hover:underline font-bold cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Search Empty State */}
        {hasSearch && totalResults === 0 && (
          <section className="px-4 sm:px-6">
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
              <AlertCircle className="mx-auto h-10 w-10 text-[#0e6de4]" />
              <h3 className="mt-3 text-lg font-black text-[#111827]">No Results Found</h3>
              <p className="mt-1 text-xs text-[#4b5563]">
                No articles or FAQ questions match &quot;<span className="font-bold text-[#111827]">{searchQuery}</span>&quot;.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Clear Search
                </button>
                <Link
                  href="/contact"
                  className="rounded-xl bg-[#0e6de4] px-4 py-2 text-xs font-bold text-white hover:bg-[#0758bd] cursor-pointer"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 3. Help Categories */}
        {filteredCategories.length > 0 && (
          <section className="px-4 sm:px-6">
            <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-wider text-[#0e6de4] font-mono">Browse Help</p>
                <h2 className="mt-1.5 text-2xl font-black text-[#111827] sm:text-3xl">Help Categories</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {filteredCategories.map(({ id, icon: Icon, title, text }) => {
                  const isSelected = selectedCategory === id;
                  return (
                    <div
                      key={id}
                      onClick={() => handleCategoryClick(id)}
                      className={`flex flex-col justify-between rounded-2xl border p-6 transition cursor-pointer ${
                        isSelected
                          ? 'border-[#0e6de4] bg-blue-50/70 shadow-sm ring-2 ring-blue-200'
                          : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          isSelected ? 'bg-[#0e6de4] text-white' : 'bg-blue-50 text-[#0e6de4]'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <h3 className="mt-4 text-base font-extrabold text-[#111827]">{title}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-[#4b5563] font-medium">{text}</p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0e6de4]">
                        <span>View Topics</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 4. Getting Started Guide (Horizontal Flow on Desktop) */}
        {filteredSteps.length > 0 && (
          <section className="px-4 sm:px-6">
            <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-wider text-[#0e6de4] font-mono">Quick Start</p>
                <h2 className="mt-1.5 text-2xl font-black text-[#111827] sm:text-3xl">Getting Started Guide</h2>
              </div>

              <div id="getting-started" className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                {filteredSteps.map(({ step, title, text }) => (
                  <div key={title} className="flex flex-col justify-between rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
                    <div>
                      <span className="text-xs font-black text-[#0e6de4] font-mono">{step}</span>
                      <h3 className="mt-2 text-xs font-extrabold text-[#111827] leading-snug">{title}</h3>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[#4b5563] font-medium">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. FAQ Section (Polished Accordion) */}
        {filteredFaqs.length > 0 && (
          <section className="px-4 sm:px-6">
            <div id="faqs-section" className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-wider text-[#0e6de4] font-mono">Common Questions</p>
                <h2 className="mt-1.5 text-2xl font-black text-[#111827] sm:text-3xl">Frequently Asked Questions</h2>
              </div>

              <div className="mx-auto max-w-4xl space-y-3">
                {filteredFaqs.map((faq) => {
                  const isOpen = hasSearch ? true : Boolean(openFaqIds[faq.id]);
                  return (
                    <div
                      key={faq.id}
                      className={`rounded-2xl border transition-all ${
                        isOpen
                          ? 'border-blue-300 bg-white shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(faq.id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left font-black text-[#111827] focus:outline-none"
                      >
                        <span className="text-sm sm:text-base">{faq.question}</span>
                        <span className={`h-6 w-6 rounded-full bg-blue-50 text-[#0e6de4] flex items-center justify-center shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 bg-[#0e6de4] text-white' : ''
                        }`}>
                          <ChevronDown className="h-4 w-4" />
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 pt-0 text-xs sm:text-sm leading-relaxed text-[#4b5563] font-medium border-t border-slate-100 mt-1 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* 6. Troubleshooting Center */}
        {filteredIssues.length > 0 && (
          <section className="px-4 sm:px-6">
            <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-wider text-[#0e6de4] font-mono">Troubleshooting</p>
                <h2 className="mt-1.5 text-2xl font-black text-[#111827] sm:text-3xl">Common Issues & Resolution</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredIssues.map(({ id, title, problem, explanation, nextStep }) => (
                  <div key={id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-[#0e6de4] shrink-0" />
                        <h3 className="font-extrabold text-[#111827] text-sm">{title}</h3>
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-800">{problem}</p>
                      <p className="mt-1 text-xs text-[#4b5563] font-medium leading-relaxed">{explanation}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/70 text-[11px] font-semibold text-[#0e6de4]">
                      <strong>Next step:</strong> {nextStep}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 8. Small Contact Support Panel */}
        <section className="px-4 sm:px-6">
          <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-[#0e6de4] font-mono">Support Panel</span>
              <h3 className="text-lg font-black text-[#111827]">Need Direct Technical Assistance?</h3>
              <p className="text-xs text-[#4b5563] font-medium max-w-2xl leading-relaxed">
                Typical support topics: account access, campaigns, lead list imports, credits, billing, AI personalization, and submission outcome inquiries.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shrink-0 w-full md:w-auto">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider font-mono">Support Email</p>
              <a href="mailto:hello@contactreachout.com" className="text-sm font-extrabold text-[#0e6de4] underline hover:text-[#0758bd] block mt-0.5">
                hello@contactreachout.com
              </a>
            </div>
          </div>
        </section>

        {/* 7. Quick Help CTA ("Still Need Help?") */}
        <section className="px-4 sm:px-6">
          <div className="mx-auto max-w-7xl rounded-[2rem] bg-[#0e6de4] p-8 text-center text-white sm:p-12 shadow-md">
            <h2 className="text-2xl font-black sm:text-3xl">Still Need Help?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Can&apos;t find what you&apos;re looking for? Our support team can help with your account, campaigns, billing, and platform questions.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-black text-[#0e6de4] hover:bg-blue-50 transition shadow-xs"
              >
                <Mail className="h-4 w-4" /> Contact Support
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-xs font-black text-white hover:bg-white/20 transition"
              >
                <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
