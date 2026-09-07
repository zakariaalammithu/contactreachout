'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bot, CheckCircle2, FileSpreadsheet, Loader2, Save, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CampaignSequenceStep, Lead, LeadList } from '@/types';

type EditorTab = 'setup' | 'prospects' | 'message' | 'settings';

interface StoredCampaign {
  id: string; name: string; tag: string; status: 'draft' | 'running' | 'paused';
  createdAt: string; updatedAt: string; selectedListId: string; prospectsList: Lead[];
  sequences: CampaignSequenceStep[]; isDryRun: boolean; rateLimitPerMinute: number;
  maxConcurrency: number; sentCount: number; failedCount: number; noFormCount: number; captchaCount: number;
  aiPersonalizationEnabled?: boolean; aiInstructions?: string;
  aiPreview?: { subject: string; body: string; provider: string; isAiGenerated: boolean; companyName: string };
  aiPersonalizedMessages?: Record<string, string>;
}

const defaultSequence = (): CampaignSequenceStep => ({
  id: `step-${Date.now()}`, sequenceNumber: 1, stepType: 'initial_email',
  subject: 'Partnership inquiry for {{companyName}}',
  body: 'Hi {{firstName}},\n\nI am reaching out from {{senderCompany}} regarding a potential partnership with {{companyName}}.\n\nBest,\n{{senderName}}',
  delayDays: 0, condition: 'always',
});

export default function CampaignEditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') || searchParams.get('edit');
  const [activeTab, setActiveTab] = useState<EditorTab>('setup');
  const [campaignName, setCampaignName] = useState(searchParams.get('name') || '');
  const [tag, setTag] = useState('CUSTOM');
  const [status, setStatus] = useState<'draft' | 'running' | 'paused'>('draft');
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [sequence, setSequence] = useState<CampaignSequenceStep>(defaultSequence);
  const [isDryRun, setIsDryRun] = useState(true);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(10);
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [aiPersonalizationEnabled, setAiPersonalizationEnabled] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('Write a short, professional outreach message for this business. Mention something relevant about the target website and keep the message natural and concise.');
  const [aiPreview, setAiPreview] = useState<StoredCampaign['aiPreview']>();
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedLists = JSON.parse(localStorage.getItem('user_lead_lists') || '[]');
      const storedLeads = JSON.parse(localStorage.getItem('user_imported_leads') || '[]');
      setLeadLists(Array.isArray(storedLists) ? storedLists : []);
      setLeads(Array.isArray(storedLeads) ? storedLeads : []);
      if (editId) {
        const campaigns: StoredCampaign[] = JSON.parse(localStorage.getItem('user_campaigns') || '[]');
        const campaign = campaigns.find((item) => item.id === editId);
        if (campaign) {
          setCampaignName(campaign.name || ''); setTag(campaign.tag || 'CUSTOM'); setStatus(campaign.status || 'draft');
          setSelectedListId(campaign.selectedListId || ''); setSequence(campaign.sequences?.[0] || defaultSequence());
          setIsDryRun(campaign.isDryRun ?? true); setRateLimitPerMinute(campaign.rateLimitPerMinute || 10);
          setMaxConcurrency(campaign.maxConcurrency || 5); setCreatedAt(campaign.createdAt);
          setAiPersonalizationEnabled(campaign.aiPersonalizationEnabled ?? false);
          setAiInstructions(campaign.aiInstructions || 'Write a short, professional outreach message for this business. Mention something relevant about the target website and keep the message natural and concise.');
          setAiPreview(campaign.aiPreview);
        } else setError('The requested campaign could not be found. You can save this setup as a new campaign.');
      }
    } catch { setError('Campaign data could not be loaded from this browser.'); }
  }, [editId]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('campaign_name_updated', { detail: campaignName || 'New campaign' }));
  }, [campaignName]);

  const selectedLeads = useMemo(() => {
    const selectedList = leadLists.find((list) => list.id === selectedListId);
    return leads.filter((lead) => lead.listId === selectedListId || (!!selectedList && lead.listName === selectedList.name));
  }, [leadLists, leads, selectedListId]);

  const generateAiPreview = async () => {
    const lead = selectedLeads[0];
    if (!lead) { setError('Select a lead list before generating an AI preview.'); setActiveTab('prospects'); return; }
    if (!aiInstructions.trim()) { setError('Add AI personalization instructions first.'); return; }
    setError(''); setIsGeneratingPreview(true);
    try {
      const response = await fetch('/api/ai/personalize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: lead.companyName, websiteUrl: lead.website, industry: lead.industry,
          location: [lead.city, lead.state, lead.country].filter(Boolean).join(', '),
          contactPersonName: lead.firstName, campaignInstructions: aiInstructions, maxWords: 120,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI preview could not be generated.');
      setAiPreview({ subject: data.subject, body: data.body, provider: data.provider, isAiGenerated: data.isAiGenerated, companyName: lead.companyName });
    } catch (previewError: any) { setError(previewError.message || 'AI preview could not be generated.'); }
    finally { setIsGeneratingPreview(false); }
  };

  const saveCampaign = (launch = false) => {
    const cleanName = campaignName.trim();
    if (cleanName.length < 3) { setError('Enter a campaign name with at least 3 characters.'); setActiveTab('setup'); return; }
    if (!selectedListId || selectedLeads.length === 0) { setError('Select a lead list containing at least one prospect.'); setActiveTab('prospects'); return; }
    if (!sequence.body.trim()) { setError('Add a campaign message before saving.'); setActiveTab('message'); return; }
    const campaigns: StoredCampaign[] = JSON.parse(localStorage.getItem('user_campaigns') || '[]');
    const existing = editId ? campaigns.find((item) => item.id === editId) : undefined;
    const now = new Date().toISOString();
    const campaign: StoredCampaign = {
      ...(existing || {} as StoredCampaign),
      id: existing?.id || `campaign-${Date.now()}`, name: cleanName, tag: tag.trim() || 'CUSTOM',
      status: launch ? 'running' : 'draft', createdAt: createdAt || existing?.createdAt || now, updatedAt: now,
      selectedListId, prospectsList: selectedLeads, sequences: [{ ...sequence, sequenceNumber: 1 }], isDryRun,
      rateLimitPerMinute, maxConcurrency, sentCount: existing?.sentCount || 0, failedCount: existing?.failedCount || 0,
      noFormCount: existing?.noFormCount || 0, captchaCount: existing?.captchaCount || 0,
      aiPersonalizationEnabled, aiInstructions: aiInstructions.trim(), aiPreview,
    };
    const updated = existing ? campaigns.map((item) => item.id === existing.id ? campaign : item) : [campaign, ...campaigns];
    localStorage.setItem('user_campaigns', JSON.stringify(updated));
    setError(''); router.push('/campaigns');
  };

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: 'setup', label: 'Campaign setup' }, { id: 'prospects', label: `Prospects (${selectedLeads.length})` },
    { id: 'message', label: 'Message' }, { id: 'settings', label: 'Safety & pacing' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><Link href="/campaigns" className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /></Link><div><h1 className="text-2xl font-bold text-slate-900">{editId ? 'Edit campaign' : 'Create campaign'}</h1><p className="text-sm text-slate-500">Configure the existing outreach workflow and save it to your campaign list.</p></div></div>
        <div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" onClick={() => saveCampaign(false)} className="min-w-[132px] whitespace-nowrap px-5"><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button onClick={() => saveCampaign(true)} className="min-w-[148px] whitespace-nowrap px-5"><CheckCircle2 className="mr-2 h-4 w-4" />Save & Start</Button></div>
      </div>
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">{error}</div>}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{tab.label}</button>)}</div>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {activeTab === 'setup' && <div className="space-y-5"><div><h2 className="text-lg font-bold text-slate-900">Campaign details</h2><p className="text-sm text-slate-500">Give this outreach workflow a clear name and internal tag.</p></div><label className="block text-sm font-semibold text-slate-700">Campaign name<input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="e.g. Austin SaaS partnerships" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" /></label><label className="block text-sm font-semibold text-slate-700">Tag<input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="CUSTOM" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" /></label></div>}
        {activeTab === 'prospects' && <div className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><Users className="mt-1 h-6 w-6 text-blue-600" /><div><h2 className="text-lg font-bold text-slate-900">Choose a contact list</h2><p className="text-sm text-slate-500">Selecting a list immediately adds its available leads to this campaign.</p></div></div><Link href="/import" className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-[#0e6de4]">Upload New Lead List</Link></div>{leadLists.length ? <div className="grid gap-3">{leadLists.map((list) => { const actualCount = leads.filter((lead) => lead.listId === list.id || lead.listName === list.name).length; return <label key={list.id} className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 ${selectedListId === list.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><div className="flex items-center gap-3"><FileSpreadsheet className="h-5 w-5 text-blue-600" /><div><p className="font-bold text-slate-900">{list.name}</p><p className="text-xs text-slate-500">{list.fileName} · {actualCount} available leads</p></div></div><input type="radio" name="lead-list" checked={selectedListId === list.id} onChange={() => setSelectedListId(list.id)} /></label>; })}</div> : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><p className="font-semibold text-slate-800">No imported lead lists yet.</p><Link href="/import" className="mt-3 inline-block text-sm font-bold text-blue-600">Import a lead list</Link></div>}</div>}
        {activeTab === 'message' && <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Message and personalization</h2><p className="text-sm text-slate-500">Keep a standard fallback and optionally personalize individual prospects.</p></div><Link href={editId ? `/ai-personalization?campaign=${editId}` : '/ai-personalization'} className="text-sm font-black text-[#0e6de4]">Open full AI Personalization →</Link></div><div className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center gap-3"><Save className="h-5 w-5 text-slate-600" /><div><h3 className="font-bold text-slate-900">Standard Message</h3><p className="text-xs text-slate-500">Used by the existing processing workflow and as the campaign fallback.</p></div></div><label className="mt-4 block text-sm font-semibold text-slate-700">Subject<input value={sequence.subject} onChange={(event) => setSequence({ ...sequence, subject: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" /></label><label className="mt-4 block text-sm font-semibold text-slate-700">Message<textarea rows={8} value={sequence.body} onChange={(event) => setSequence({ ...sequence, body: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500" /></label></div><div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><Bot className="mt-0.5 h-6 w-6 text-indigo-600" /><div><h3 className="font-bold text-indigo-950">AI Personalization</h3><p className="text-sm text-indigo-700">Uses the configured AI provider and public lead details. If no provider key is configured, the existing deterministic fallback generates the preview.</p></div></div><input type="checkbox" aria-label="Enable AI Personalization" checked={aiPersonalizationEnabled} onChange={(event) => setAiPersonalizationEnabled(event.target.checked)} className="mt-1 h-5 w-5" /></div>{aiPersonalizationEnabled && <div className="mt-5 space-y-4"><label className="block text-sm font-semibold text-indigo-950">AI instructions<textarea rows={5} value={aiInstructions} onChange={(event) => setAiInstructions(event.target.value)} className="mt-2 w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 outline-none focus:border-indigo-500" /></label><Button type="button" variant="outline" onClick={generateAiPreview} disabled={isGeneratingPreview}>{isGeneratingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate preview for first prospect</Button>{aiPreview && <div className="rounded-xl border border-indigo-200 bg-white p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-900">Preview for {aiPreview.companyName}</p><span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-700">{aiPreview.isAiGenerated ? aiPreview.provider : 'Offline fallback'}</span></div><p className="text-sm font-semibold text-slate-800">{aiPreview.subject}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{aiPreview.body}</p></div>}<p className="text-xs text-indigo-700">Approved per-prospect messages are stored on each lead and remain available to the existing template workflow through personalized fields.</p></div>}</div></div>}
        {activeTab === 'settings' && <div className="space-y-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-6 w-6 text-emerald-600" /><div><h2 className="text-lg font-bold text-slate-900">Safety and pacing</h2><p className="text-sm text-slate-500">These values use the existing campaign processing fields.</p></div></div><label className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div><p className="font-bold text-emerald-950">Dry-run protection</p><p className="text-sm text-emerald-700">Inspect and record the workflow without live submission.</p></div><input type="checkbox" checked={isDryRun} onChange={(event) => setIsDryRun(event.target.checked)} className="h-5 w-5" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Rate limit per minute<input type="number" min={1} max={120} value={rateLimitPerMinute} onChange={(event) => setRateLimitPerMinute(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="text-sm font-semibold text-slate-700">Maximum concurrency<input type="number" min={1} max={20} value={maxConcurrency} onChange={(event) => setMaxConcurrency(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label></div></div>}
      </section>
    </div>
  );
}
