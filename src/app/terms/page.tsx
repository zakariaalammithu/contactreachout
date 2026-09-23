'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Scale,
  Mail,
  ChevronDown,
  ListFilter,
  ExternalLink,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

interface TermSection {
  id: string;
  num: number;
  title: string;
  shortTitle: string;
}

const SECTIONS: TermSection[] = [
  { id: 'section-1', num: 1, title: '1. Acceptance of Terms', shortTitle: '1. Acceptance of Terms' },
  { id: 'section-2', num: 2, title: '2. Description of ContactReachout', shortTitle: '2. Description of Platform' },
  { id: 'section-3', num: 3, title: '3. Eligibility and Account Registration', shortTitle: '3. Account & Eligibility' },
  { id: 'section-4', num: 4, title: '4. Acceptable and Lawful Use', shortTitle: '4. Acceptable & Lawful Use' },
  { id: 'section-5', num: 5, title: '5. Prohibited Activities', shortTitle: '5. Prohibited Activities' },
  { id: 'section-6', num: 6, title: '6. Campaign Safeguards', shortTitle: '6. Campaign Safeguards' },
  { id: 'section-7', num: 7, title: '7. Contact-Form Outreach Responsibility', shortTitle: '7. Outreach Responsibility' },
  { id: 'section-8', num: 8, title: '8. AI Personalization', shortTitle: '8. AI Personalization' },
  { id: 'section-9', num: 9, title: '9. Credits and Usage', shortTitle: '9. Credits & Usage' },
  { id: 'section-10', num: 10, title: '10. Pricing and Payments', shortTitle: '10. Pricing & Payments' },
  { id: 'section-11', num: 11, title: '11. Refunds and Cancellations', shortTitle: '11. Refunds & Cancellations' },
  { id: 'section-12', num: 12, title: '12. Third-Party Services', shortTitle: '12. Third-Party Services' },
  { id: 'section-13', num: 13, title: '13. Service Availability', shortTitle: '13. Service Availability' },
  { id: 'section-14', num: 14, title: '14. User Content and Data', shortTitle: '14. User Content & Data' },
  { id: 'section-15', num: 15, title: '15. Privacy', shortTitle: '15. Privacy Policy' },
  { id: 'section-16', num: 16, title: '16. Intellectual Property', shortTitle: '16. Intellectual Property' },
  { id: 'section-17', num: 17, title: '17. Account Suspension and Termination', shortTitle: '17. Suspension & Termination' },
  { id: 'section-18', num: 18, title: '18. Security', shortTitle: '18. Security' },
  { id: 'section-19', num: 19, title: '19. Disclaimer', shortTitle: '19. Disclaimer' },
  { id: 'section-20', num: 20, title: '20. Limitation of Liability', shortTitle: '20. Limitation of Liability' },
  { id: 'section-21', num: 21, title: '21. Changes to These Terms', shortTitle: '21. Changes to Terms' },
  { id: 'section-22', num: 22, title: '22. Governing Law / Dispute Resolution', shortTitle: '22. Governing Law' },
  { id: 'section-23', num: 23, title: '23. Contact Information', shortTitle: '23. Contact Us' },
];

export default function TermsPage() {
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
              <span>Terms & Conditions</span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#111827] sm:text-5xl">
              Terms & Conditions
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 font-medium max-w-3xl leading-relaxed">
              These Terms govern your use of <strong className="font-extrabold text-[#111827]">ContactReachout</strong> and its website contact-form outreach platform.
            </p>
            <p className="mt-3 text-xs font-mono font-bold text-slate-500">
              Last Updated: September 23, 2026
            </p>
          </div>

          {/* Main Grid: On This Page Sidebar + Terms Content */}
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
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">1. Acceptance of Terms</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    By accessing, registering for, or using the <strong>ContactReachout</strong> platform, website, software, or services, you agree to be bound by these Terms & Conditions (&quot;Terms&quot;). If you do not agree to all of these Terms, you must not access or use ContactReachout.
                  </p>
                  <p>
                    These Terms apply to all visitors, registered account holders, team members, and entities who access or use the service. If you are accepting these Terms on behalf of a business or legal entity, you represent and warrant that you have the legal authority to bind that entity to these Terms.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="section-2" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 02
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">2. Description of ContactReachout</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    ContactReachout is a software platform designed to manage and execute bulk website contact-form outreach workflows. The platform provides software tools for:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>Website contact-form outreach workflow management</li>
                    <li>Lead list uploading, column mapping, and prospect management</li>
                    <li>Campaign creation, editing, draft saving, and dispatch controls</li>
                    <li>Automatic website contact-page and contact-form discovery</li>
                    <li>Message template generation and AI-assisted personalization</li>
                    <li>Campaign progress monitoring, outcome tracking, and status reporting</li>
                    <li>Credit-based usage allocation and account management</li>
                    <li>Related administrative and workflow automation features</li>
                  </ul>
                  <p>
                    ContactReachout provides software tools to facilitate outreach workflows. ContactReachout does not own third-party target websites or guarantee specific external responses.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section id="section-3" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 03
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">3. Eligibility and Account Registration</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>To register for and use an account on ContactReachout, you agree that:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>You must provide accurate, current, and complete registration information.</li>
                    <li>You are responsible for maintaining the confidentiality and security of your account login credentials.</li>
                    <li>You must promptly update your account details if your contact information or billing details change.</li>
                    <li>You are solely responsible for all actions, campaign dispatches, and activity performed through your account credentials.</li>
                    <li>You must immediately notify ContactReachout support if you suspect any unauthorized access or breach of account security.</li>
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section id="section-4" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 04
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">4. Acceptable and Lawful Use</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    You agree to use ContactReachout strictly in compliance with all applicable local, national, and international laws, regulations, and industry standards. Responsible outreach requirements include:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li><strong>Lawful Targeting:</strong> Ensuring your prospect targeting adheres to relevant commercial communications laws.</li>
                    <li><strong>Accurate Sender Information:</strong> Providing truthful, non-deceptive identity details, sender name, and email address in your outreach messages.</li>
                    <li><strong>Appropriate Outreach Content:</strong> Ensuring message text is relevant, professional, and compliant.</li>
                    <li><strong>Respecting Consent & Opt-Outs:</strong> Promptly honoring all recipient requests to unsubscribe or opt out of further communications.</li>
                    <li><strong>Compliance:</strong> Adhering to applicable data protection and electronic communications regulations in your operating jurisdictions.</li>
                  </ul>
                  <p className="text-slate-500 italic text-xs">
                    Note: ContactReachout provides software tooling and does not provide legal counsel. Users are responsible for evaluating legal requirements applicable to their specific commercial activities.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="section-5" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Section 05
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">5. Prohibited Activities</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>You may not engage in any of the following prohibited activities while using ContactReachout:</p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-800 font-semibold">
                      <li>Engaging in unlawful, fraudulent, deceptive, or misleading commercial activities.</li>
                      <li>Using false sender identities, fake company names, or misleading header information.</li>
                      <li>Sending abusive, threatening, defamatory, obscene, or harassing outreach messages.</li>
                      <li>Distributing unlawful bulk messaging, spam, or prohibited commercial solicitations.</li>
                      <li>Attempting to bypass, disable, or tamper with platform security controls or access rules.</li>
                      <li>Attempting to bypass CAPTCHA, bot-protection systems, or external security challenges.</li>
                      <li>Scraping or harvesting data from the platform in violation of applicable law or third-party terms.</li>
                      <li>Interfering with platform infrastructure, network operations, or service performance.</li>
                      <li>Attempting unauthorized access to other user accounts, databases, or system components.</li>
                      <li>Uploading viruses, malware, trojans, ransomware, or malicious script code.</li>
                      <li>Using the service to harass, threaten, stalk, or abuse any recipient or business.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section id="section-6" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 06
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">6. Campaign Safeguards</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    To maintain system integrity and respects third-party website protections, ContactReachout records diagnostic submission outcomes, including:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs font-bold">
                    <span className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">✓ Submitted</span>
                    <span className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">✕ Failed</span>
                    <span className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">∅ Unavailable</span>
                    <span className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">🚫 Blocked</span>
                    <span className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">🤖 CAPTCHA / Security Challenge</span>
                    <span className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">🔍 Review Required</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs">
                    &quot;Users must not attempt to bypass CAPTCHA, bot-protection, security challenges, or other safeguards.&quot;
                  </div>

                  <p>
                    ContactReachout reserves the right to automatically pause, restrict, review, or halt active campaigns if unexpected safeguard triggers or elevated error rates are detected.
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section id="section-7" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 07
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">7. Contact-Form Outreach Responsibility</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>As an outreach sender, you retain full responsibility for:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>Selecting appropriate target websites and business recipients.</li>
                    <li>Verifying imported lead list data and email/website fields.</li>
                    <li>Reviewing and approving all message text prior to launching a campaign.</li>
                    <li>Ensuring your outreach messages comply with recipient website policies.</li>
                    <li>Respecting site-specific instructions or restrictions presented on target forms.</li>
                  </ul>
                  <p>
                    ContactReachout provides software execution tooling and does not guarantee that every external website will accept or respond to contact form submissions.
                  </p>
                </div>
              </section>

              {/* Section 8 */}
              <section id="section-8" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 08
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">8. AI Personalization</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>Where AI personalization features are enabled in your plan:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>All AI-generated messages must be reviewed and verified by you before initiating dispatch.</li>
                    <li>Users remain solely responsible for the final message content sent to recipients.</li>
                    <li>AI outputs may occasionally contain inaccuracies or require manual adjustments.</li>
                    <li>ContactReachout does not guarantee that AI-generated content is suitable or accurate for every prospective scenario.</li>
                  </ul>
                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 text-xs font-bold text-[#0e6de4]">
                    Product Rules: Free account tier users cannot access AI Personalization. Paid plan AI Personalization does not consume additional outreach credits.
                  </div>
                </div>
              </section>

              {/* Section 9 */}
              <section id="section-9" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 09
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">9. Credits and Usage</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>Platform credit allocation and usage rules are governed as follows:</p>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs font-semibold text-slate-800">
                    <p>• Free accounts receive <strong>100 free credits</strong> upon initial account registration.</p>
                    <p>• A successful website contact-form submission consumes <strong>1 credit</strong>.</p>
                    <p>• AI Personalization uses <strong>0 credits</strong> on eligible paid plans.</p>
                    <p>• Failed submissions do not consume a credit when the failure occurs prior to a successful submission.</p>
                    <p>• Non-success outcomes (no-contact-form found, CAPTCHA challenge, blocked, review-required) do not consume a credit under platform credit rules.</p>
                    <p>• Purchased credits are added to account balances after verified payment processing.</p>
                    <p>• All credit transactions and balances are tracked by server-side system accounting.</p>
                  </div>
                </div>
              </section>

              {/* Section 10 */}
              <section id="section-10" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 10
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">10. Pricing and Payments</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    Current subscription rates and package pricing are displayed on the official <Link href="/pricing" className="text-[#0e6de4] underline font-bold">Pricing</Link> page.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>Paid plans are billed on a monthly or annual recurring basis according to your selected plan.</li>
                    <li>Annual plans may display a calculated monthly equivalent price while checkout charges the annual total.</li>
                    <li>Payments are securely processed through configured payment processors (e.g., Stripe).</li>
                    <li>Users should review all applicable pricing details prior to completing purchases.</li>
                  </ul>
                </div>
              </section>

              {/* Section 11 */}
              <section id="section-11" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 11
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">11. Refunds and Cancellations</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    Subscription cancellations and refund requests are handled in accordance with the applicable billing policy presented at purchase or published separately by ContactReachout.
                  </p>
                  <p>
                    You may cancel your recurring subscription at any time through your dashboard billing controls or by contacting support at <a href="mailto:hello@contactreachout.com" className="text-[#0e6de4] underline font-bold">hello@contactreachout.com</a>. Upon cancellation, your subscription remains active until the end of your current billing period.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section id="section-12" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 12
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">12. Third-Party Services</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    ContactReachout integrates with third-party infrastructure and service providers to deliver functionality, including:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>Payment processing services (e.g., Stripe)</li>
                    <li>Transactional email dispatch infrastructure (e.g., Resend)</li>
                    <li>AI model providers (e.g., OpenAI, Anthropic)</li>
                    <li>Cloud hosting, database, and infrastructure providers</li>
                    <li>External target websites and web servers</li>
                  </ul>
                  <p>
                    ContactReachout is not responsible for third-party service outages, external website network changes, or third-party infrastructure policies outside our control.
                  </p>
                </div>
              </section>

              {/* Section 13 */}
              <section id="section-13" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 13
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">13. Service Availability</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    While ContactReachout strives to deliver reliable platform availability, service access may occasionally be interrupted due to scheduled maintenance, infrastructure upgrades, emergency security responses, network outages, or third-party availability issues.
                  </p>
                  <p>
                    ContactReachout does not guarantee uninterrupted 100% continuous service uptime.
                  </p>
                </div>
              </section>

              {/* Section 14 */}
              <section id="section-14" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 14
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">14. User Content and Data</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    You retain ownership and responsibility for all lead lists, contact records, campaign templates, message text, and information uploaded or submitted to ContactReachout.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>You warrant that you have all necessary authority and rights to use uploaded lead data.</li>
                    <li>You must not upload unlawful, stolen, or unauthorized personal data.</li>
                    <li>You are responsible for reviewing imported prospect information before starting campaign dispatches.</li>
                  </ul>
                </div>
              </section>

              {/* Section 15 */}
              <section id="section-15" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 15
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">15. Privacy</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    Your privacy is important to us. Personal information, account data, and system analytics collected by ContactReachout are handled in accordance with our official <Link href="/privacy" className="text-[#0e6de4] underline font-bold">Privacy Policy</Link>.
                  </p>
                </div>
              </section>

              {/* Section 16 */}
              <section id="section-16" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 16
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">16. Intellectual Property</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    The ContactReachout platform, software code, user interfaces, branding, logos, graphics, and documentation are owned by or licensed to ContactReachout and are protected by applicable copyright, trademark, and intellectual property laws.
                  </p>
                  <p>
                    Subject to compliance with these Terms, users receive a limited, non-exclusive, non-transferable right to access and use the platform during their active subscription term.
                  </p>
                </div>
              </section>

              {/* Section 17 */}
              <section id="section-17" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 17
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">17. Account Suspension and Termination</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    ContactReachout reserves the right to restrict, suspend, or terminate access to the service without prior notice if we determine that:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>You have violated any provision of these Terms.</li>
                    <li>Your account is involved in unlawful, abusive, or spam activity.</li>
                    <li>Security concerns, credential compromises, or automated attacks are detected.</li>
                    <li>Attempts are made to bypass platform safeguards or security challenges.</li>
                    <li>Subscription fees or payment obligations remain unpaid.</li>
                  </ul>
                  <p>
                    Users may close their account at any time by contacting support or using available account management controls.
                  </p>
                </div>
              </section>

              {/* Section 18 */}
              <section id="section-18" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 18
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">18. Security</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>Account security is a shared responsibility:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                    <li>You must maintain strong account passwords and protect login credentials.</li>
                    <li>You must not share account credentials or unauthorized third-party access.</li>
                    <li>You must report suspected unauthorized access or breaches immediately.</li>
                    <li>You must not attempt to compromise, probe, scan, or reverse engineer platform security.</li>
                  </ul>
                </div>
              </section>

              {/* Section 19 */}
              <section id="section-19" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 19
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">19. Disclaimer</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    THE CONTACTREACHOUT PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CONTACTREACHOUT DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  </p>
                  <p>
                    CONTACTREACHOUT DOES NOT GUARANTEE THAT OUTREACH MESSAGES WILL BE ACCEPTED OR RESPONDED TO BY EXTERNAL WEBSITES.
                  </p>
                </div>
              </section>

              {/* Section 20 */}
              <section id="section-20" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 20
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">20. Limitation of Liability</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, CONTACTREACHOUT SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
                  </p>
                  <p className="text-slate-500 italic text-xs">
                    [Legal Review Placeholder: Total aggregate liability under these Terms shall be limited to amounts paid by the user to ContactReachout in the twelve (12) months preceding the event, subject to applicable governing law.]
                  </p>
                </div>
              </section>

              {/* Section 21 */}
              <section id="section-21" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 21
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">21. Changes to These Terms</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    ContactReachout reserves the right to modify or update these Terms at any time. When material changes occur, the &quot;Last Updated&quot; date at the top of this document will be updated accordingly. Continued use of the service after published updates constitutes acceptance of the revised Terms.
                  </p>
                </div>
              </section>

              {/* Section 22 */}
              <section id="section-22" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-3 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 22
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">22. Governing Law / Dispute Resolution</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
                  </p>
                  <p className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-700">
                    [Governing Jurisdiction Placeholder — Subject to final legal and corporate counsel determination.]
                  </p>
                </div>
              </section>

              {/* Section 23 */}
              <section id="section-23" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4 scroll-mt-24">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0e6de4] border border-blue-100">
                  Section 23
                </span>
                <h2 className="text-xl font-black text-[#111827] sm:text-2xl">23. Contact Information</h2>
                <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed space-y-3">
                  <p>
                    If you have questions, concerns, or inquiries regarding these Terms & Conditions, please contact the ContactReachout support team:
                  </p>
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2">
                    <p className="font-extrabold text-[#111827]">ContactReachout Support</p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#0e6de4]" />
                      Email: <a href="mailto:hello@contactreachout.com" className="text-[#0e6de4] font-bold underline">hello@contactreachout.com</a>
                    </p>
                    <p className="text-xs text-slate-500 pt-1">
                      Direct Support Channel: <Link href="/contact" className="text-[#0e6de4] font-bold underline">Contact Support Page</Link>
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
