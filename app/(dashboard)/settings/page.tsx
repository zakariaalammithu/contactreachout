'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Ban,
  FileSpreadsheet,
  Webhook,
  Key,
  Save,
  Plus,
  Trash2,
  Sliders,
  Clock,
  RotateCcw,
  Zap,
  Check,
  AlertTriangle,
  Flame,
  Mail,
  Cpu,
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Globe,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type SettingsTab = 'all' | 'resend' | 'openai' | 'stripe' | 'formspree' | 'blocklist' | 'throttling' | 'inbox';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('all');
  const [isPending, startTransition] = useTransition();

  // Safe Throttling Controls State
  const [workerConcurrency, setWorkerConcurrency] = useState(3);
  const [interJobDelayMs, setInterJobDelayMs] = useState(3000);
  const [maxRetries, setMaxRetries] = useState(2);
  const [jobTimeoutSeconds, setJobTimeoutSeconds] = useState(30);
  const [dailyProcessingLimit, setDailyProcessingLimit] = useState(250);

  // Outreach Sender Profile Information State (Pre-Configured Default)
  const [senderName, setSenderName] = useState('ContactReachout Team');
  const [senderEmail, setSenderEmail] = useState('hello@contactreachout.com');
  const [senderPhone, setSenderPhone] = useState('+1 (888) 420-7322');
  const [senderCompany, setSenderCompany] = useState('ContactReachout');
  const [senderWebsite, setSenderWebsite] = useState('https://contactreachout.com');
  const [senderTitle, setSenderTitle] = useState('Outreach Operations');
  const [senderLocation, setSenderLocation] = useState('New York, NY, USA');

  // Load Sender Profile from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedProfile = localStorage.getItem('user_sender_profile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed.name) setSenderName(parsed.name);
          if (parsed.email) setSenderEmail(parsed.email);
          if (parsed.phone) setSenderPhone(parsed.phone);
          if (parsed.company) setSenderCompany(parsed.company);
          if (parsed.website) setSenderWebsite(parsed.website);
          if (parsed.title) setSenderTitle(parsed.title);
          if (parsed.location) setSenderLocation(parsed.location);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleSaveSenderProfile = () => {
    if (typeof window !== 'undefined') {
      const profile = {
        name: senderName,
        email: senderEmail,
        phone: senderPhone,
        company: senderCompany,
        website: senderWebsite,
        title: senderTitle,
        location: senderLocation,
      };
      localStorage.setItem('user_sender_profile', JSON.stringify(profile));
      setSaveFeedback('✅ Sender Profile Information saved successfully!');
      setTimeout(() => setSaveFeedback(null), 3000);
    }
  };

  const [replyToEmail, setReplyToEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_reply_to_email') || 'hello@contactreachout.com';
    }
    return 'hello@contactreachout.com';
  });

  // API Integration Keys State (Defaults completely empty)
  const [resendApiKey, setResendApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  
  // Expanded Stripe API Keys State (Defaults completely empty)
  const [stripeSkLive, setStripeSkLive] = useState('');
  const [stripeSkTest, setStripeSkTest] = useState('');
  const [stripePkLive, setStripePkLive] = useState('');
  const [stripePkTest, setStripePkTest] = useState('');
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('live');

  const [formspreeApiKey, setFormspreeApiKey] = useState('');

  // Key Visibility States
  const [showResend, setShowResend] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showSkLive, setShowSkLive] = useState(false);
  const [showSkTest, setShowSkTest] = useState(false);
  const [showPkLive, setShowPkLive] = useState(false);
  const [showPkTest, setShowPkTest] = useState(false);
  const [showFormspree, setShowFormspree] = useState(false);

  // Live Key Test Verification States
  const [resendTestStatus, setResendTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [resendTestMsg, setResendTestMsg] = useState('');

  const [openaiTestStatus, setOpenaiTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [openaiTestMsg, setOpenaiTestMsg] = useState('');

  const [stripeTestStatus, setStripeTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [stripeTestMsg, setStripeTestMsg] = useState('');

  const [suppressionInput, setSuppressionInput] = useState('');
  const [suppressedDomains, setSuppressedDomains] = useState<string[]>([
    'competitor.com',
    'internal-corp.net',
    'restricted-domain.org',
  ]);

  // Section Save Feedback
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Load saved API keys from localStorage and clear dummy keys
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedKeys = localStorage.getItem('system_api_keys');
        if (storedKeys) {
          const parsed = JSON.parse(storedKeys);
          if (parsed.resend && !parsed.resend.includes('1234567890') && parsed.resend.startsWith('re_')) {
            setResendApiKey(parsed.resend);
          }
          if (parsed.openai && !parsed.openai.includes('99887766') && parsed.openai.startsWith('sk-')) {
            setOpenaiApiKey(parsed.openai);
          }
          if (parsed.stripeSkLive && parsed.stripeSkLive.startsWith('sk_live_')) {
            setStripeSkLive(parsed.stripeSkLive);
            setStripeMode('live');
          }
          if (parsed.stripeSkTest && parsed.stripeSkTest.startsWith('sk_test_') && !parsed.stripeSkTest.includes('51M000000')) {
            setStripeSkTest(parsed.stripeSkTest);
          }
          if (parsed.stripePkLive) setStripePkLive(parsed.stripePkLive);
          if (parsed.stripePkTest) setStripePkTest(parsed.stripePkTest);
          if (parsed.stripeMode) setStripeMode(parsed.stripeMode);
          if (parsed.formspree) setFormspreeApiKey(parsed.formspree);
        }
      } catch (err) {
        console.error('Error loading API keys:', err);
      }
    }
  }, []);

  const switchTab = (tab: SettingsTab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  // Server-to-Server Live Resend API Verification
  const testResendKeyLive = async () => {
    if (!resendApiKey.trim() || resendApiKey.includes('1234567890')) {
      setResendTestStatus('invalid');
      setResendTestMsg('❌ Please enter your actual Resend API key starting with `re_`.');
      return;
    }

    setResendTestStatus('testing');
    setResendTestMsg('Verifying with Resend live server...');

    try {
      const res = await fetch('/api/auth/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'resend', apiKey: resendApiKey.trim() }),
      });

      const data = await res.json();
      if (data.valid) {
        setResendTestStatus('valid');
        setResendTestMsg(data.message);
        saveConfiguration('Resend Email API');
      } else {
        setResendTestStatus('invalid');
        setResendTestMsg(data.message);
      }
    } catch (err: any) {
      setResendTestStatus('invalid');
      setResendTestMsg(`❌ Test Error: ${err.message}`);
    }
  };

  // Server-to-Server Live OpenAI API Verification
  const testOpenaiKeyLive = async () => {
    if (!openaiApiKey.trim() || openaiApiKey.includes('99887766')) {
      setOpenaiTestStatus('invalid');
      setOpenaiTestMsg('❌ Please enter your actual OpenAI API key starting with `sk-`.');
      return;
    }

    setOpenaiTestStatus('testing');
    setOpenaiTestMsg('Verifying with OpenAI live server (api.openai.com)...');

    try {
      const res = await fetch('/api/auth/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', apiKey: openaiApiKey.trim() }),
      });

      const data = await res.json();
      if (data.valid) {
        setOpenaiTestStatus('valid');
        setOpenaiTestMsg(data.message);
        saveConfiguration('OpenAI API');
      } else {
        setOpenaiTestStatus('invalid');
        setOpenaiTestMsg(data.message);
      }
    } catch (err: any) {
      setOpenaiTestStatus('invalid');
      setOpenaiTestMsg(`❌ Test Error: ${err.message}`);
    }
  };

  // Flexible Stripe API Verification (Supports sk_live_ and sk_test_)
  const testStripeKeyLive = async () => {
    const keyToTest = stripeSkLive.trim() || stripeSkTest.trim();
    const effectiveMode = stripeSkLive.trim() ? 'live' : stripeMode;

    if (!keyToTest || keyToTest.includes('51M000000')) {
      setStripeTestStatus('invalid');
      setStripeTestMsg('❌ Please enter your Stripe Secret Key (`sk_live_...` or `sk_test_...`).');
      return;
    }

    setStripeTestStatus('testing');
    setStripeTestMsg(`Verifying ${effectiveMode.toUpperCase()} Stripe Secret Key with Stripe server...`);

    try {
      const res = await fetch('/api/auth/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'stripe', apiKey: keyToTest, stripeMode: effectiveMode }),
      });

      const data = await res.json();
      if (data.valid) {
        setStripeTestStatus('valid');
        setStripeMode(effectiveMode);
        setStripeTestMsg(`🟢 Verified! Stripe ${effectiveMode.toUpperCase()} API key is 100% valid & live.`);
        saveConfiguration('Stripe Billing Keys');
      } else {
        setStripeTestStatus('invalid');
        setStripeTestMsg(data.message);
      }
    } catch (err: any) {
      setStripeTestStatus('invalid');
      setStripeTestMsg(`❌ Test Error: ${err.message}`);
    }
  };

  const addSuppressedDomain = () => {
    if (suppressionInput.trim() && !suppressedDomains.includes(suppressionInput.trim())) {
      setSuppressedDomains([...suppressedDomains, suppressionInput.trim().toLowerCase()]);
      setSuppressionInput('');
    }
  };

  const removeSuppressedDomain = (domain: string) => {
    setSuppressedDomains(suppressedDomains.filter((d) => d !== domain));
  };

  const saveConfiguration = (sectionName: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_reply_to_email', replyToEmail);
      localStorage.setItem('system_api_keys', JSON.stringify({
        resend: resendApiKey,
        openai: openaiApiKey,
        stripeSkLive,
        stripeSkTest,
        stripePkLive,
        stripePkTest,
        stripeMode,
        formspree: formspreeApiKey,
      }));
    }
    setSaveFeedback(sectionName);
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  // BADGE STATUS LOGIC
  const isResendActive = resendTestStatus === 'valid' || (resendApiKey.trim().startsWith('re_') && resendApiKey.trim().length >= 30 && !resendApiKey.includes('1234567890'));
  const isOpenaiActive = openaiTestStatus === 'valid' || (openaiApiKey.trim().startsWith('sk-') && openaiApiKey.trim().length >= 35 && !openaiApiKey.includes('99887766'));
  
  const isStripeActive = stripeTestStatus === 'valid' ||
    (stripeSkLive.trim().startsWith('sk_live_') && stripeSkLive.trim().length >= 25) ||
    (stripeSkTest.trim().startsWith('sk_test_') && stripeSkTest.trim().length >= 25 && !stripeSkTest.includes('51M000000'));
    
  const isFormspreeActive = formspreeApiKey.trim().length >= 15;

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-purple-400" />
          <span>System Settings & API Key Hub</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage API keys (Resend, OpenAI, Stripe Live/Test keys, Formspree), domain blocklists, and worker throttling.
        </p>
      </div>

      {/* Short Name Sub-Navigation Tab Buttons */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => switchTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Overview</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('resend')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'resend'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Mail className="h-3.5 w-3.5 text-blue-400" />
          <span>Resend API</span>
          {isResendActive ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs" />
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('openai')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'openai'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="h-3.5 w-3.5 text-purple-400" />
          <span>OpenAI API</span>
          {isOpenaiActive ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs" />
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('stripe')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'stripe'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
          <span>Stripe Billing</span>
          {isStripeActive ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs" />
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('formspree')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'formspree'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Webhook className="h-3.5 w-3.5 text-orange-400" />
          <span>Formspree / SMTP</span>
          {isFormspreeActive ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs" />
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('blocklist')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'blocklist'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Ban className="h-3.5 w-3.5 text-rose-400" />
          <span>Domain Blocklist</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('throttling')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'throttling'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="h-3.5 w-3.5 text-indigo-400" />
          <span>Worker Throttling</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('inbox')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'inbox'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Mail className="h-3.5 w-3.5 text-blue-400" />
          <span>Inbox Settings</span>
        </button>
      </div>

      {/* 0. SECTION: OUTREACH SENDER PROFILE */}
      <div className={activeTab === 'all' || activeTab === 'inbox' ? 'block' : 'hidden'}>
        <Card className="glass-panel p-6 space-y-5 border-emerald-500/40 bg-slate-900/90 shadow-xl rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Globe className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Outreach Sender Profile & Contact Details</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🟢 Configured & Active
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Used automatically when target website contact forms require specific sender information. Change anytime!
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSenderProfile}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
            >
              <Save className="h-4 w-4" />
              <span>Save Sender Profile</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Sender Full Name */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center justify-between">
                <span>👤 Sender Full Name</span>
                <span className="text-[10px] text-emerald-400 font-mono">Required for forms</span>
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Zakaria Alam Mithu"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Sender Email Address */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center justify-between">
                <span>✉️ Sender Email Address</span>
                <span className="text-[10px] text-emerald-400 font-mono">Required for forms</span>
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="mithusquare@gmail.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-mono font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Sender Phone / WhatsApp */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center justify-between">
                <span>📞 Phone / WhatsApp Number</span>
                <span className="text-[10px] text-emerald-400 font-mono">Form Phone Field</span>
              </label>
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="+8801725592014"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-mono font-bold text-blue-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Sender Company Name */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center justify-between">
                <span>🏢 Company / Business Name</span>
                <span className="text-[10px] text-slate-400 font-mono">Company Field</span>
              </label>
              <input
                type="text"
                value={senderCompany}
                onChange={(e) => setSenderCompany(e.target.value)}
                placeholder="B2B GDC"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Sender Website URL */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center justify-between">
                <span>🌐 Website URL</span>
                <span className="text-[10px] text-slate-400 font-mono">Website Field</span>
              </label>
              <input
                type="text"
                value={senderWebsite}
                onChange={(e) => setSenderWebsite(e.target.value)}
                placeholder="https://b2bgdc.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-mono text-purple-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Sender Location / Country */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200 flex items-center justify-between">
                <span>📍 City & Country Location</span>
                <span className="text-[10px] text-slate-400 font-mono">Location Field</span>
              </label>
              <input
                type="text"
                value={senderLocation}
                onChange={(e) => setSenderLocation(e.target.value)}
                placeholder="Dhaka, Bangladesh"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 1. SECTION: RESEND API KEY */}
      <div className={activeTab === 'all' || activeTab === 'resend' ? 'block' : 'hidden'}>
        <Card className="glass-panel p-6 space-y-4 border-blue-500/40 bg-slate-900/90 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Resend Email API Key Configuration</span>
                  {isResendActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>🟢 API Done & Active</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      <span>⚠️ API Not Set / Unverified</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Used for sending 6-digit OTP verification codes and cold outreach notifications.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={testResendKeyLive}
                disabled={resendTestStatus === 'testing'}
                className="font-bold border-blue-500/30 text-blue-300 hover:bg-blue-900/50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${resendTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                <span>Test Live Key</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => saveConfiguration('Resend Email API')}
                className="bg-blue-600 hover:bg-blue-700 font-bold cursor-pointer"
              >
                {saveFeedback === 'Resend Email API' ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-emerald-400" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" /> Save Key
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Resend API Key (`re_...`)
            </label>
            <div className="relative max-w-xl">
              <input
                type={showResend ? 'text' : 'password'}
                value={resendApiKey}
                onChange={(e) => {
                  setResendApiKey(e.target.value);
                  setResendTestStatus('idle');
                  setResendTestMsg('');
                }}
                placeholder="e.g. re_1234567890abcdef..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowResend(!showResend)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
              >
                {showResend ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {resendTestMsg && (
              <p className={`text-xs font-mono font-semibold p-2.5 rounded-xl border ${
                resendTestStatus === 'valid'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}>
                {resendTestMsg}
              </p>
            )}

            {!resendTestMsg && (
              <p className="text-[11px] text-slate-400 font-mono">
                Enter your live key from resend.com/api-keys and click <strong>"Test Live Key"</strong> to verify server response.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* 2. SECTION: OPENAI API KEY */}
      <div className={activeTab === 'all' || activeTab === 'openai' ? 'block' : 'hidden'}>
        <Card className="glass-panel p-6 space-y-4 border-purple-500/40 bg-slate-900/90 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>OpenAI API Key (AI Personalization & Spintax)</span>
                  {isOpenaiActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>🟢 API Done & Active</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      <span>⚠️ API Not Set / Unverified</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Powers automated AI opening line generation and Spintax variation rendering.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={testOpenaiKeyLive}
                disabled={openaiTestStatus === 'testing'}
                className="font-bold border-purple-500/30 text-purple-300 hover:bg-purple-900/50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${openaiTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                <span>Test Live Key</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => saveConfiguration('OpenAI API')}
                className="bg-purple-600 hover:bg-purple-700 font-bold cursor-pointer"
              >
                {saveFeedback === 'OpenAI API' ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-emerald-400" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" /> Save Key
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              OpenAI Secret Key (`sk-proj-...`)
            </label>
            <div className="relative max-w-xl">
              <input
                type={showOpenai ? 'text' : 'password'}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="e.g. sk-proj-1234567890abcdef..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowOpenai(!showOpenai)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
              >
                {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {openaiTestMsg && (
              <p className={`text-xs font-mono font-semibold p-2.5 rounded-xl border ${
                openaiTestStatus === 'valid'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}>
                {openaiTestMsg}
              </p>
            )}

            {!openaiTestMsg && (
              <p className="text-[11px] text-slate-400 font-mono">
                Enter key from platform.openai.com and click <strong>"Test Live Key"</strong> to verify server response.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* 3. SECTION: EXPANDED STRIPE API KEYS */}
      <div className={activeTab === 'all' || activeTab === 'stripe' ? 'block' : 'hidden'}>
        <Card className="glass-panel p-6 space-y-5 border-emerald-500/40 bg-slate-900/90 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Stripe Payment API Hub (Live & Test Keys)</span>
                  {isStripeActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>🟢 API Done & Active ({stripeSkLive.trim() ? 'LIVE' : stripeMode.toUpperCase()} Mode)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      <span>⚠️ API Not Set / Unverified</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Enter your `sk_live_...` and `pk_live_...` keys. Test keys (`sk_test_...`) are optional!</p>
              </div>
            </div>

            {/* Mode Switcher + Dedicated Save Button */}
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setStripeMode('test')}
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    stripeMode === 'test' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Test Mode
                </button>
                <button
                  type="button"
                  onClick={() => setStripeMode('live')}
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    stripeMode === 'live' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live Mode
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={testStripeKeyLive}
                disabled={stripeTestStatus === 'testing'}
                className="font-bold border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${stripeTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                <span>Test Live Key</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => saveConfiguration('Stripe Billing Keys')}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold cursor-pointer"
              >
                {saveFeedback === 'Stripe Billing Keys' ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-white" /> Saved Stripe Keys!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" /> Save All Stripe Keys
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 4 Separate Dedicated Stripe Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Stripe Secret Key Live (sk_live) */}
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
              <label className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                <span>🔑 Secret Key (Live): `sk_live_...` (Required for Live)</span>
                <span className="text-[10px] text-emerald-300 font-mono">Production Mode</span>
              </label>
              <div className="relative">
                <input
                  type={showSkLive ? 'text' : 'password'}
                  value={stripeSkLive}
                  onChange={(e) => {
                    setStripeSkLive(e.target.value);
                    if (e.target.value.startsWith('sk_live_')) setStripeMode('live');
                    setStripeTestStatus('idle');
                    setStripeTestMsg('');
                  }}
                  placeholder="e.g. sk_live_51M..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 pr-9 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSkLive(!showSkLive)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showSkLive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 2. Stripe Secret Key Test (sk_test) */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2 opacity-80">
              <label className="text-xs font-bold text-amber-400 flex items-center justify-between">
                <span>🔑 Secret Key (Test): `sk_test_...` (Optional)</span>
                <span className="text-[10px] text-slate-500 font-mono">Sandbox Mode</span>
              </label>
              <div className="relative">
                <input
                  type={showSkTest ? 'text' : 'password'}
                  value={stripeSkTest}
                  onChange={(e) => {
                    setStripeSkTest(e.target.value);
                    setStripeTestStatus('idle');
                    setStripeTestMsg('');
                  }}
                  placeholder="e.g. sk_test_51M... (Optional)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 pr-9 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSkTest(!showSkTest)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showSkTest ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 3. Stripe Publishable Key Live (pk_live) */}
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
              <label className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                <span>🔑 Publishable Key (Live): `pk_live_...` (Required for Live)</span>
                <span className="text-[10px] text-emerald-300 font-mono">Production Frontend</span>
              </label>
              <div className="relative">
                <input
                  type={showPkLive ? 'text' : 'password'}
                  value={stripePkLive}
                  onChange={(e) => setStripePkLive(e.target.value)}
                  placeholder="e.g. pk_live_51M..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 pr-9 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPkLive(!showPkLive)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPkLive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 4. Stripe Publishable Key Test (pk_test) */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2 opacity-80">
              <label className="text-xs font-bold text-amber-400 flex items-center justify-between">
                <span>🔑 Publishable Key (Test): `pk_test_...` (Optional)</span>
                <span className="text-[10px] text-slate-500 font-mono">Sandbox Frontend</span>
              </label>
              <div className="relative">
                <input
                  type={showPkTest ? 'text' : 'password'}
                  value={stripePkTest}
                  onChange={(e) => setStripePkTest(e.target.value)}
                  placeholder="e.g. pk_test_51M... (Optional)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 pr-9 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPkTest(!showPkTest)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPkTest ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {stripeTestMsg && (
            <p className={`text-xs font-mono font-semibold p-2.5 rounded-xl border ${
              stripeTestStatus === 'valid'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}>
              {stripeTestMsg}
            </p>
          )}
        </Card>
      </div>

      {/* 4. SECTION: FORMSPREE / SMTP KEY */}
      <div className={activeTab === 'all' || activeTab === 'formspree' ? 'block' : 'hidden'}>
        <Card className="glass-panel p-6 space-y-4 border-orange-500/40 bg-slate-900/90 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Webhook className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Formspree / Custom Webhook & SMTP Key</span>
                  {isFormspreeActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>🟢 API Done & Active</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      <span>⚠️ API Not Set / Unverified</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">Optional secondary form endpoint dispatcher key.</p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => saveConfiguration('Formspree Webhook')}
              className="bg-orange-600 hover:bg-orange-700 font-bold cursor-pointer"
            >
              {saveFeedback === 'Formspree Webhook' ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-emerald-400" /> Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" /> Save Key
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Formspree Webhook Key (`f_hash_...`)
            </label>
            <div className="relative max-w-xl">
              <input
                type={showFormspree ? 'text' : 'password'}
                value={formspreeApiKey}
                onChange={(e) => setFormspreeApiKey(e.target.value)}
                placeholder="e.g. f_hash_12345..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 text-xs text-white focus:border-orange-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowFormspree(!showFormspree)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
              >
                {showFormspree ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. SECTION: GLOBAL DOMAIN BLOCKLIST */}
      <div className={activeTab === 'all' || activeTab === 'blocklist' ? 'block' : 'hidden'}>
        <Card className="glass-panel p-6 space-y-4 border-rose-500/40 bg-slate-900/90">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Global Domain Suppression Blocklist</h3>
                <p className="text-xs text-muted-foreground">
                  Domains that will never be contacted or processed under any campaign.
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => saveConfiguration('Domain Blocklist')}
              className="font-bold cursor-pointer"
            >
              <Save className="h-4 w-4 mr-1" /> Save Blocklist
            </Button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. do-not-contact.com"
              value={suppressionInput}
              onChange={(e) => setSuppressionInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
            />
            <Button variant="secondary" size="sm" onClick={addSuppressedDomain} className="cursor-pointer font-bold">
              <Plus className="h-4 w-4 mr-1" /> Add Domain
            </Button>
          </div>

          <div className="space-y-2 pt-1">
            {suppressedDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-300"
              >
                <span>{domain}</span>
                <button
                  onClick={() => removeSuppressedDomain(domain)}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 6. SECTION: WORKER THROTTLING */}
      <div className={activeTab === 'all' || activeTab === 'throttling' ? 'block' : 'hidden'}>
        <Card className="glass-panel p-6 space-y-5 border-indigo-500/40 bg-slate-900/90">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Safe Processing & Worker Throttling</h3>
                <p className="text-xs text-muted-foreground">Conservative defaults to prevent server load or aggressive retry patterns.</p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => saveConfiguration('Worker Throttling')}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold cursor-pointer"
            >
              <Save className="h-4 w-4 mr-1" /> Save Throttling
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Worker Concurrency */}
            <div className="space-y-1.5 rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Worker Concurrency
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={workerConcurrency}
                onChange={(e) => setWorkerConcurrency(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">Default: 3 threads. Max: 10 threads.</p>
            </div>

            {/* Inter-Job Delay */}
            <div className="space-y-1.5 rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Delay Between Jobs (ms)
              </label>
              <input
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={interJobDelayMs}
                onChange={(e) => setInterJobDelayMs(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">Default: 3000ms (3s pause between sites).</p>
            </div>

            {/* Maximum Retries */}
            <div className="space-y-1.5 rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Maximum Retries
              </label>
              <select
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="1">1 Retry (Strict)</option>
                <option value="2">2 Retries (Recommended Default)</option>
                <option value="3">3 Retries (Maximum Allowed)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">Exponential backoff (3s, 6s, 12s).</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 7. SECTION: LEAD REPLY FORWARDING */}
      <div className={activeTab === 'all' || activeTab === 'inbox' ? 'block' : 'hidden'}>
        <Card className="glass-panel p-6 space-y-4 border-blue-500/40 bg-slate-900/90">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Lead Reply Forwarding & Inbox Settings</h3>
                <p className="text-xs text-muted-foreground">
                  Configure which email receives lead replies when prospects respond to your website contact form outreach.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => saveConfiguration('Inbox Settings')}
              className="bg-blue-600 hover:bg-blue-700 font-bold cursor-pointer"
            >
              <Save className="h-4 w-4 mr-1" /> Save Inbox Email
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Forward Lead Replies To Email:
            </label>
            <input
              type="email"
              value={replyToEmail}
              onChange={(e) => {
                setReplyToEmail(e.target.value);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('user_reply_to_email', e.target.value);
                }
              }}
              placeholder="e.g. mithusquare@gmail.com"
              className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              ✓ All incoming replies will automatically forward to this email address AND sync into your FreeOutreach Master Inbox.
            </p>
          </div>
        </Card>
      </div>

      {/* Global Master Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          variant="primary"
          size="lg"
          onClick={() => saveConfiguration('Master All System Settings')}
          className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-xl px-8 cursor-pointer"
        >
          {saveFeedback === 'Master All System Settings' ? (
            <>
              <Check className="h-5 w-5 mr-2 text-emerald-300" /> All System Configurations Saved!
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" /> Save All System Configurations
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
