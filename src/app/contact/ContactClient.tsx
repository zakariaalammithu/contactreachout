'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  Headphones,
  Loader2,
  Mail,
  MapPin,
  Send,
  Wrench,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface HelpOption {
  icon: typeof CircleHelp;
  title: string;
  description: string;
  defaultSubject: string;
}

const helpOptions: HelpOption[] = [
  {
    icon: CircleHelp,
    title: 'General Questions',
    description: 'Learn more about ContactReachout features, how outreach works, and platform capabilities.',
    defaultSubject: 'General Question',
  },
  {
    icon: Wrench,
    title: 'Technical Support',
    description: 'Get technical help with campaign setup, lead imports, contact form detection, AI personalization, or submission results.',
    defaultSubject: 'Technical Support',
  },
  {
    icon: CreditCard,
    title: 'Account & Billing',
    description: 'Questions regarding your credits, subscription, invoice history, payment methods, or account settings.',
    defaultSubject: 'Account & Billing',
  },
  {
    icon: Building2,
    title: 'Business & Demo',
    description: 'Interested in custom volume outreach, agency workflows, or a guided platform demonstration? Reach out to us.',
    defaultSubject: 'Business / Demo Inquiry',
  },
];

export function ContactClient() {
  const [topic, setTopic] = useState<'contact' | 'demo'>('contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    website: '',
    subject: 'Contact Form Inquiry',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState('');

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('topic') === 'demo') {
      setTopic('demo');
      setFormData((prev) => ({ ...prev, subject: 'Business / Demo Inquiry' }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSelectTopicCard = (option: HelpOption) => {
    setFormData((prev) => ({ ...prev, subject: `Inquiry: ${option.title}` }));
    setSelectedTopicTitle(option.title);
    
    // Smooth scroll to form
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Full Name must be at least 2 characters.';
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid work email address.';
    }

    if (formData.website.trim()) {
      const web = formData.website.trim();
      const hasProtocol = /^https?:\/\//i.test(web);
      const urlToTest = hasProtocol ? web : `https://${web}`;
      try {
        const parsedUrl = new URL(urlToTest);
        if (!parsedUrl.hostname || !parsedUrl.hostname.includes('.')) {
          newErrors.website = 'Please enter a valid website URL (e.g. https://example.com)';
        }
      } catch {
        newErrors.website = 'Please enter a valid website URL (e.g. https://example.com)';
      }
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    setServerError('');
    setSuccessMessage('');

    if (!validate()) {
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          name: formData.name.trim(),
          email: formData.email.trim(),
          company: formData.company.trim(),
          website: formData.website.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({ error: 'Failed to process server response.' }));

      if (response.ok && payload.success) {
        setSuccessMessage(payload.message || "Message sent successfully. We'll get back to you as soon as possible.");
        setFormData({
          name: '',
          email: '',
          company: '',
          website: '',
          subject: '',
          message: '',
        });
        setErrors({});
      } else {
        setServerError(payload.error || 'Your message could not be sent right now. Please try again or email us directly.');
      }
    } catch {
      setServerError('A network error occurred while submitting your message. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const resetFormState = () => {
    setSuccessMessage('');
    setServerError('');
    setErrors({});
  };

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="px-4 py-12 text-center sm:px-6 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-blue-900 bg-blue-950 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-blue-400">
            ContactReachout Support
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl">
            Let’s Talk About Your Outreach
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Have a question, need help getting started, or want to learn how ContactReachout can fit into your workflow? Our team is here to help.
          </p>
        </div>
      </section>

      {/* Main Grid: Contact Info Card + Contact Form */}
      <section className="px-4 pb-12 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.8fr_1.2fr]">
          {/* Contact Information Panel */}
          <aside className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-white shadow-xl sm:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                Contact Information
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">
                Start the conversation
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                For product questions, account assistance, campaign issues, or general support, reach out to our team through this form or directly via email.
              </p>

              <div className="mt-8 space-y-4">
                <a
                  href="mailto:hello@contactreachout.com"
                  className="contact-soft-box flex items-center gap-4 rounded-2xl bg-white/10 p-4.5 ring-1 ring-white/15 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <div className="rounded-xl bg-white/15 p-2.5 text-white">
                    <Mail className="h-5 w-5 shrink-0" />
                  </div>
                  <span className="text-sm font-black text-white underline underline-offset-4">
                    hello@contactreachout.com
                  </span>
                </a>

                <div className="contact-soft-box flex items-center gap-4 rounded-2xl bg-white/10 p-4.5 ring-1 ring-white/15">
                  <div className="rounded-xl bg-white/15 p-2.5 text-white">
                    <MapPin className="h-5 w-5 shrink-0" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    Austin, TX 73301, USA
                  </span>
                </div>
              </div>
            </div>

            <div className="contact-soft-box mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-white">
              <p className="font-bold text-white">Need immediate documentation?</p>
              <p className="mt-1">
                Check out our{' '}
                <Link href="/help" className="font-bold text-white underline hover:text-zinc-300">
                  Help & Support Center
                </Link>{' '}
                for instant step-by-step guides and FAQs.
              </p>
            </div>
          </aside>

          {/* Contact Form Card */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 shadow-sm sm:p-10">
            {successMessage ? (
              <div className="my-auto flex flex-col items-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900 text-emerald-400">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="mt-6 text-2xl font-black text-zinc-100">Message Received!</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-400">
                  {successMessage}
                </p>
                <button
                  onClick={resetFormState}
                  type="button"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0e6de4] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0758bd] focus:outline-none focus:ring-2 focus:ring-[#0e6de4] focus:ring-offset-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Send Another Message
                </button>
              </div>
            ) : (
              <form ref={formRef} action="/api/contact" method="post" onSubmit={handleSubmit} noValidate className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-100">Send us a message</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Fill out the required fields below and our support team will respond promptly.
                  </p>
                </div>

                {serverError && (
                  <div className="flex items-start gap-3 rounded-2xl bg-rose-950 p-4 text-sm font-medium text-rose-300 border border-rose-900" role="alert">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                    <div>
                      <p className="font-bold text-rose-200">Submission Error</p>
                      <p className="mt-0.5 text-rose-300">{serverError}</p>
                    </div>
                  </div>
                )}

                {selectedTopicTitle && (
                  <div className="flex items-center justify-between rounded-xl bg-blue-950 px-4 py-2.5 text-xs font-semibold text-blue-400 border border-blue-900">
                    <span>Topic selected: <strong>{selectedTopicTitle}</strong></span>
                    <button
                      type="button"
                      onClick={() => setSelectedTopicTitle('')}
                      className="text-zinc-400 hover:text-zinc-300 text-xs font-normal underline ml-2"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-zinc-200">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Jane Doe"
                      className={`mt-2 contact-field w-full rounded-xl border px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-400/30 ${
                        errors.name ? 'border-rose-400 bg-rose-950/30 focus:border-rose-500' : 'border-zinc-800 focus:border-zinc-400'
                      }`}
                    />
                    {errors.name && <p className="mt-1 text-xs font-semibold text-rose-400">{errors.name}</p>}
                  </div>

                  {/* Work Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-zinc-200">
                      Work Email <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="jane@company.com"
                      className={`mt-2 contact-field w-full rounded-xl border px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-400/30 ${
                        errors.email ? 'border-rose-400 bg-rose-950/30 focus:border-rose-500' : 'border-zinc-800 focus:border-zinc-400'
                      }`}
                    />
                    {errors.email && <p className="mt-1 text-xs font-semibold text-rose-400">{errors.email}</p>}
                  </div>

                  {/* Company */}
                  <div>
                    <label htmlFor="company" className="block text-sm font-bold text-zinc-200">
                      Company <span className="text-xs font-normal text-zinc-400">(Optional)</span>
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Acme Corp"
                      className="mt-2 contact-field w-full rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/30"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label htmlFor="website" className="block text-sm font-bold text-zinc-200">
                      Website <span className="text-xs font-normal text-zinc-400">(Optional)</span>
                    </label>
                    <input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://company.com"
                      className={`mt-2 contact-field w-full rounded-xl border px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-400/30 ${
                        errors.website ? 'border-rose-400 bg-rose-950/30 focus:border-rose-500' : 'border-zinc-800 focus:border-zinc-400'
                      }`}
                    />
                    {errors.website && <p className="mt-1 text-xs font-semibold text-rose-400">{errors.website}</p>}
                  </div>
                </div>

                {/* Message Body */}
                <div>
                  <label htmlFor="message" className="block text-sm font-bold text-zinc-200">
                    Message <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Provide details about your question, account, or outreach campaign..."
                    className={`mt-2 contact-field w-full rounded-2xl border px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-400/30 ${
                      errors.message ? 'border-rose-400 bg-rose-950/30 focus:border-rose-500' : 'border-zinc-800 focus:border-zinc-400'
                    }`}
                  />
                  {errors.message && <p className="mt-1 text-xs font-semibold text-rose-400">{errors.message}</p>}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e6de4] px-6 py-4 text-base font-bold text-white transition hover:bg-[#0758bd] focus:outline-none focus:ring-2 focus:ring-[#0e6de4] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 shadow-md shadow-blue-500/10"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      {topic === 'demo' ? 'Request Demo' : 'Send Message'}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Support Topics Section */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-blue-900 bg-zinc-950 p-7 shadow-sm sm:p-10">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-widest text-blue-400">
              Support Topics
            </p>
            <h2 className="mt-2 text-3xl font-black text-zinc-100">
              How Can We Help?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">
              Click any topic card below to quickly populate your message subject and reach our specialized support team.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {helpOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.title}
                  type="button"
                  onClick={() => handleSelectTopicCard(option)}
                  className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-left transition hover:border-blue-800 hover:bg-blue-950/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0e6de4]"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 text-blue-400 transition group-hover:bg-[#0e6de4] group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-zinc-100 group-hover:text-blue-400">
                      {option.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {option.description}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center text-xs font-bold text-blue-400 group-hover:underline">
                    Select Topic &rarr;
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="px-4 pb-16 pt-4 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-zinc-800 bg-zinc-900 p-9 text-center text-white shadow-xl sm:p-12">
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Ready to Reach More Prospects?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-zinc-400">
            Start building smarter website contact-form outreach campaigns with ContactReachout today.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0e6de4] px-7 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-[#0758bd] focus:outline-none focus:ring-2 focus:ring-white"
            >
              Start Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
