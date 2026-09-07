'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, CircleHelp, CreditCard, Headphones, Mail, MapPin, Send, Wrench } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';

const helpOptions = [
  [CircleHelp, 'General Questions', 'Learn more about ContactReachout and how the platform works.'],
  [Wrench, 'Technical Support', 'Get help with campaigns, lead lists, contact forms, AI personalization, or submissions.'],
  [CreditCard, 'Account & Billing', 'Questions about credits, billing, account settings, or your plan.'],
  [Building2, 'Business & Demo', 'Interested in ContactReachout for your team or agency? Get in touch with us.'],
] as const;

export default function ContactPage() {
  const [topic, setTopic] = useState<'contact' | 'demo'>('contact');
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('topic') === 'demo') setTopic('demo'); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSending(true); setStatus(''); setSuccess(false);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, name: form.get('name'), email: form.get('email'), company: form.get('company'), website: form.get('website'), subject: form.get('subject'), message: form.get('message') }) });
    const payload = await response.json();
    setStatus(response.ok ? payload.message : payload.error || 'Unable to send your message.'); setSuccess(response.ok);
    if (response.ok) formElement.reset(); setSending(false);
  };

  return <div className="min-h-screen bg-[#f4f8fd] text-slate-950"><LandingHeader /><main>
    <section className="px-4 py-12 text-center sm:px-6 lg:py-20"><div className="mx-auto max-w-3xl"><span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-[#0e6de4]">CONTACTREACHOUT SUPPORT</span><h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Let’s Talk About Your Outreach</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">Have a question, need help getting started, or want to learn how ContactReachout can fit into your workflow? Our team is here to help.</p></div></section>
    <section className="px-4 pb-8 sm:px-6"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.75fr_1.25fr]"><aside className="rounded-[2rem] bg-[#0e6de4] p-8 text-white shadow-xl shadow-blue-200/60"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-100">Contact information</p><h2 className="mt-4 text-3xl font-black">Start the conversation</h2><p className="mt-4 text-sm leading-7 text-blue-100">For product questions, account assistance, campaign issues, or general support, contact our team through this form.</p><div className="mt-9 space-y-4"><Info icon={Mail} title="Email" text="hello@contactreachout.com"/><Info icon={MapPin} title="Location" text="Austin, TX 73301, USA"/><Info icon={Headphones} title="Support" text="Campaign, account, billing and product assistance"/></div></aside><form onSubmit={submit} className="rounded-[2rem] border border-blue-100 bg-white p-7 shadow-sm sm:p-10"><div className="grid gap-5 sm:grid-cols-2"><Field name="name" label="Full Name" required/><Field name="email" label="Work Email" type="email" required/><Field name="company" label="Company"/><Field name="website" label="Website" type="url"/><div className="sm:col-span-2"><Field name="subject" label="Subject" required/></div></div><label className="mt-5 block text-sm font-bold text-slate-700">Message<textarea name="message" required minLength={10} rows={6} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0e6de4]" placeholder="Tell us how we can help…"/></label><button disabled={sending} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e6de4] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#0758bd] disabled:opacity-60"><Send className="h-4 w-4"/>{sending?'Sending…':topic==='demo'?'Request Demo':'Send Message'}</button>{status&&<p className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm font-bold ${success?'bg-emerald-50 text-emerald-800':'bg-rose-50 text-rose-700'}`}><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>{status}</p>}</form></div></section>
    <section className="px-4 py-8 sm:px-6"><div className="mx-auto max-w-7xl rounded-[2rem] border border-blue-100 bg-white p-7 shadow-sm sm:p-10"><div className="text-center"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0e6de4]">Support topics</p><h2 className="mt-3 text-3xl font-black">How Can We Help?</h2></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{helpOptions.map(([Icon,title,text])=><article key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-200 hover:shadow-lg"><Icon className="h-6 w-6 text-[#0e6de4]"/><h3 className="mt-5 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>
    <section className="px-4 pb-16 pt-8 sm:px-6"><div className="mx-auto max-w-7xl rounded-[2rem] bg-[#0e6de4] p-9 text-center text-white sm:p-12"><h2 className="text-3xl font-black">Ready to Reach More Prospects?</h2><p className="mx-auto mt-3 max-w-xl text-blue-100">Start building smarter website contact-form outreach campaigns with ContactReachout.</p><Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-[#0e6de4]">Start Free <ArrowRight className="h-4 w-4"/></Link></div></section>
  </main><LandingFooter /></div>;
}

function Field({name,label,type='text',required=false}:{name:string;label:string;type?:string;required?:boolean}){return <label className="block text-sm font-bold text-slate-700">{label}<input name={name} type={type} required={required} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#0e6de4]"/></label>}
function Info({icon:Icon,title,text}:{icon:any;title:string;text:string}){return <div className="flex gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15"><Icon className="h-5 w-5 shrink-0"/><div><p className="text-xs font-black text-blue-100">{title}</p><p className="mt-1 text-sm font-bold">{text}</p></div></div>}
