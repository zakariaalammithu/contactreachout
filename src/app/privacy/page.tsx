'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Eye,
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  ChevronDown,
  ListFilter,
  ExternalLink,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

interface PrivacySection {
  id: string;
  num: number;
  title: string;
  shortTitle: string;
}

const SECTIONS: PrivacySection[] = [
  { id: 'section-1', num: 1, title: '1. Overview', shortTitle: '1. Overview' },
  { id: 'section-2', num: 2, title: '2. Information We Collect', shortTitle: '2. Information We Collect' },
  { id: 'section-3', num: 3, title: '3. How We Use Information', shortTitle: '3. How We Use Information' },
  { id: 'section-4', num: 4, title: '4. ContactReachout Website Analytics', shortTitle: '4. Website Analytics' },
  { id: 'section-5', num: 5, title: '5. How We Use Campaign and Lead Data', shortTitle: '5. Campaign & Lead Data' },
  { id: 'section-6', num: 6, title: '6. AI Personalization', shortTitle: '6. AI Personalization' },
  { id: 'section-7', num: 7, title: '7. Cookies and Similar Technologies', shortTitle: '7. Cookies & Session' },
  { id: 'section-8', num: 8, title: '8. Data Sharing and Third-Party Services', shortTitle: '8. Third-Party Services' },
  { id: 'section-9', num: 9, title: '9. Data Security', shortTitle: '9. Data Security' },
  { id: 'section-10', num: 10, title: '10. Data Retention', shortTitle: '10. Data Retention' },
  { id: 'section-11', num: 11, title: '11. Data Deletion and Account Closure', shortTitle: '11. Data Deletion' },
  { id: 'section-12', num: 12, title: '12. User Rights and Controls', shortTitle: '12. User Rights & Controls' },
  { id: 'section-13', num: 13, title: '13. Account Security', shortTitle: '13. Account Security' },
  { id: 'section-14', num: 14, title: '14. Third-Party Websites', shortTitle: '14. External Websites' },
  { id: 'section-15', num: 15, title: '15. Changes to This Privacy Policy', shortTitle: '15. Policy Changes' },
  { id: 'section-16', num: 16, title: '16. Contact Us', shortTitle: '16. Contact Us' },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState<string>('section-1');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(s.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f8fd] text-[#111827] font-sans selection:bg-blue-500/20 selection:text-blue-950">
      <LandingHeader />

      <main className="px-4 py-8 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header Banner */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0e6de4] uppercase tracking-wider font-mono">
              <Link href="/help" className="hover:underline">
                Support
              </Link>
              <span>/</span>
              <span>Privacy Policy</span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 font-medium max-w-3xl leading-relaxed">
              How <strong className="font-extrabold text-[#111827]">ContactReachout</strong> collects, uses, protects, and manages information when you use our platform and website.
            </p>
            <p className="mt-3 text-xs font-mono font-bold text-slate-500">
              Last Updated: September 23, 2026
            </p>
          </div>

          {/* Main Grid: Sidebar Navigation + Content */}
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Mobile "On This Page" Collapsible Nav */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 font-extrabold text-[#111827] text-sm shadow-2xs"
              >
                <span className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-[#0e6de4]" />
                  On this page ({SECTIONS.length} sections)
                </span>
                <ChevronDown className={`h-4 w-4 text-[#0e6de4] transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} />
              </button>

              {mobileNavOpen && (
                <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-md space-y-1 max-h-80 overflow-y-auto">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => scrollToSection(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition ${
                        activeSection === s.id
                          ? 'bg-[#0e6de4] text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {s.shortTitle}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Sticky "On This Page" Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                  On This Page
                </h3>
                <nav className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => scrollToSection(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 block truncate ${
                        activeSection === s.id
                          ? 'bg-[#0e6de4] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={s.title}
                    >
                      {s.shortTitle}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content Column */}
            <div className="space-y-6">
              {/* Section 1 */}
              <section id="section-1" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 01
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">1. Overview</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    This Privacy Policy describes how <strong>ContactReachout</strong> collects, uses, handles, and safeguards information when you visit our website, register for an account, or use our software platform.
                  </p>
                  <p>
                    ContactReachout is an enterprise platform designed for organizing bulk website contact-form outreach workflows, lead list management, AI-assisted personalization, and campaign analytics. We respect your privacy and process data responsibly to deliver our services.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="section-2" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 02
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">2. Information We Collect</h2>

                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-4">
                  {/* Category A */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h3 className="font-extrabold text-[#111827] text-sm">A. Account Information</h3>
                    <p>When you register or manage an account on ContactReachout, we process information necessary to create and manage your account, including:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li>Full name and email address</li>
                      <li>Account authentication credentials (hashed password or OAuth tokens)</li>
                      <li>User role (e.g., Super Admin, Admin, or User)</li>
                      <li>Profile details and preferred preferences when provided</li>
                    </ul>
                  </div>

                  {/* Category B */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h3 className="font-extrabold text-[#111827] text-sm">B. Campaign and Lead Information</h3>
                    <p>To provide requested campaign execution features, the platform processes data provided by users during their outreach workflows, including:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li>Uploaded lead lists, domain fields, and company names</li>
                      <li>Target contact page URLs and contact-form fields</li>
                      <li>Campaign configuration parameters and custom message text</li>
                      <li>Generated draft content and submission processing logs</li>
                    </ul>
                    <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 font-bold text-xs text-[#0e6de4]">
                      &quot;Users are responsible for ensuring that they have the appropriate rights or lawful basis to provide and use information they upload to ContactReachout.&quot;
                    </div>
                  </div>

                  {/* Category C */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h3 className="font-extrabold text-[#111827] text-sm">C. Usage and Technical Information</h3>
                    <p>When you browse or interact with the platform, technical usage telemetry may be processed to measure reliability and performance, including:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li>Pages viewed and navigation paths</li>
                      <li>Approximate visit duration and engagement duration</li>
                      <li>Traffic source and referring domain</li>
                      <li>Device category (Desktop, Mobile, Tablet) and browser type (Chrome, Safari, Edge, Firefox)</li>
                      <li>Country location when reliably provided by cloud environment headers</li>
                      <li>Keyed visitor and session identifier hashes</li>
                    </ul>
                    <p className="text-slate-500 italic text-xs">Note: Technical telemetry does not track precise physical GPS coordinates.</p>
                  </div>

                  {/* Category D */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h3 className="font-extrabold text-[#111827] text-sm">D. Payment Information</h3>
                    <p>
                      Payment transactions are securely processed by our configured payment provider (e.g., Stripe). Payment card details are processed directly by our payment provider and are not stored as raw credit card numbers in ContactReachout&apos;s application database.
                    </p>
                  </div>

                  {/* Category E */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <h3 className="font-extrabold text-[#111827] text-sm">E. Communications</h3>
                    <p>
                      We process email addresses and message records for account notifications, transactional dispatches, security alerts, and support communications.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section id="section-3" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 03
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">3. How We Use Information</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>ContactReachout processes collected information solely for operational and service delivery purposes, including:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>Creating, provisioning, and maintaining your account</li>
                    <li>Authenticating user logins and securing platform sessions</li>
                    <li>Executing user-configured campaigns and contact-form discovery</li>
                    <li>Processing uploaded lead lists and mapping contact fields</li>
                    <li>Generating and personalizing approved outreach messages</li>
                    <li>Tracking campaign outcomes and presenting performance reports</li>
                    <li>Managing user credit balances, usage tracking, and billing</li>
                    <li>Providing customer support and technical assistance</li>
                    <li>Monitoring platform reliability, error rates, and infrastructure performance</li>
                    <li>Detecting and preventing abuse, rate-limit violations, and security threats</li>
                    <li>Maintaining immutable administrative operational audit logs</li>
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section id="section-4" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 04
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">4. ContactReachout Website Analytics</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    ContactReachout uses first-party website analytics to measure website engagement, page view counts, visit duration, traffic sources, device categories, and general country location. Visitor and session identifiers are recorded as keyed hashes rather than raw personal identifiers.
                  </p>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-800">
                    Analytics are not intentionally configured to collect passwords, authentication secrets, raw payment-card numbers, private lead records, or campaign message content.
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="section-5" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 05
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">5. How We Use Campaign and Lead Data</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    Users retain full control over the lead lists and campaigns they create within ContactReachout. Information is processed strictly to execute requested platform functionality: storing lists, preparing campaigns, identifying contact forms, processing submissions, and displaying analytics.
                  </p>
                  <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 font-extrabold text-xs text-[#0e6de4]">
                    &quot;ContactReachout does not take ownership of user-provided lead data merely because it is processed by the platform.&quot;
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section id="section-6" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 06
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">6. AI Personalization</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>Where AI personalization features are enabled on your plan:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>Campaign context and lead variables may be submitted to configured third-party AI providers (e.g., OpenAI or Anthropic) for message drafting.</li>
                    <li>Generated output requires manual review and approval by the user prior to dispatch.</li>
                    <li>Users remain responsible for final outreach content sent to recipients.</li>
                    <li>ContactReachout does not train proprietary AI foundation models on your uploaded private lead lists.</li>
                  </ul>
                </div>
              </section>

              {/* Section 7 */}
              <section id="section-7" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 07
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">7. Cookies and Similar Technologies</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    ContactReachout uses essential session cookies (<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">app_session</code>) to maintain secure user login sessions, verify authorization, and prevent CSRF attacks.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>Essential authentication cookies are HTTP-only, secure, and configured with strict path limits.</li>
                    <li>The platform does not deploy intrusive third-party cross-site advertising tracking cookies.</li>
                  </ul>
                </div>
              </section>

              {/* Section 8 */}
              <section id="section-8" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 08
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">8. Data Sharing and Third-Party Services</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    ContactReachout does not sell, rent, or trade your personal information or lead lists to third parties. Information is shared only with configured service providers necessary to operate the platform, including:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li><strong>Payment Processors:</strong> Stripe for subscription checkout and payment verification.</li>
                    <li><strong>Email Delivery Infrastructure:</strong> Resend for system notifications and transactional emails.</li>
                    <li><strong>AI Model Providers:</strong> OpenAI or Anthropic for optional AI message personalization.</li>
                    <li><strong>Cloud Infrastructure & Database:</strong> Supabase / PostgreSQL for secure server-side storage.</li>
                  </ul>
                </div>
              </section>

              {/* Section 9 */}
              <section id="section-9" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 09
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">9. Data Security</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    ContactReachout employs technical and organizational security controls designed to safeguard platform information, including:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>AES-256-GCM authenticated encryption for sensitive system integration credentials.</li>
                    <li>Server-side environment configuration preventing raw secret exposure in client bundles.</li>
                    <li>Server-side authorization guards (RBAC) restricting admin routes.</li>
                    <li>Secure HTTPS/TLS encryption for all data in transit.</li>
                  </ul>
                  <p className="text-slate-500 italic text-xs">
                    While we implement robust security safeguards, no internet transmission or electronic storage method can guarantee 100% absolute security.
                  </p>
                </div>
              </section>

              {/* Section 10 */}
              <section id="section-10" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 10
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">10. Data Retention</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    We retain information for as long as reasonably necessary to provide the service, maintain account and transaction records, comply with applicable legal obligations, resolve disputes, enforce agreements, and maintain platform security, subject to applicable law.
                  </p>
                </div>
              </section>

              {/* Section 11 */}
              <section id="section-11" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 11
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">11. Data Deletion and Account Closure</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    Users can manage or delete their uploaded lead lists and campaign records directly from their dashboard workspace. To request full account closure or data deletion, contact support at <a href="mailto:hello@contactreachout.com" className="text-[#0e6de4] font-bold underline">hello@contactreachout.com</a>.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section id="section-12" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 12
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">12. User Rights and Controls</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    Depending on your jurisdiction, you may have rights regarding your personal information, such as accessing account details, updating profile information, requesting corrections, or requesting account deletion. You may exercise available controls through your dashboard profile settings or by reaching out to support.
                  </p>
                </div>
              </section>

              {/* Section 13 */}
              <section id="section-13" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 13
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">13. Account Security</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    Users are responsible for safeguarding login credentials and preventing unauthorized access to their accounts. ContactReachout reserves the right to revoke active sessions or restrict access if suspicious security events or credential compromises are detected.
                  </p>
                </div>
              </section>

              {/* Section 14 */}
              <section id="section-14" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 14
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">14. Third-Party Websites</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    Because ContactReachout performs website contact-form outreach, the platform interacts with third-party external websites. ContactReachout does not control third-party website privacy practices, and users should review applicable terms and privacy policies of external target sites.
                  </p>
                </div>
              </section>

              {/* Section 15 */}
              <section id="section-15" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 15
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">15. Changes to This Privacy Policy</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    We may update this Privacy Policy from time to time. When material updates are made, the &quot;Last Updated&quot; date at the top of this page will be revised. Continued use of the platform after published revisions indicates acceptance of the updated policy.
                  </p>
                </div>
              </section>

              {/* Section 16 */}
              <section id="section-16" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 16
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">16. Contact Us</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    If you have questions or inquiries regarding this Privacy Policy or data processing practices, please contact us:
                  </p>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2">
                    <p className="font-extrabold text-[#111827]">ContactReachout Support</p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#0e6de4]" />
                      Email: <a href="mailto:hello@contactreachout.com" className="text-[#0e6de4] font-bold underline">hello@contactreachout.com</a>
                    </p>
                    <p className="text-xs text-slate-500 pt-1">
                      Direct Support Page: <Link href="/contact" className="text-[#0e6de4] font-bold underline">Contact Support Page</Link>
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
