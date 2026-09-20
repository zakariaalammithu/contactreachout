// @ts-nocheck
'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Bot, CheckCircle2, Edit2, FileSpreadsheet, Loader2, Save, ShieldCheck, Sparkles, Users, Upload, UploadCloud, UserPlus, List, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CampaignSequenceStep, Lead, LeadList } from '@/types';
import { downloadSampleCsv } from '@/lib/services/sample-templates';
import { parseSpreadsheetPreview } from '@/lib/services/import-service';
import { MatchDataModal } from '@/components/leads/MatchDataModal';
import { CampaignMessageEditor } from './CampaignMessageEditor';

type EditorTab = 'setup' | 'prospects' | 'message' | 'settings';
type MessageSequence = { id: string; name: string; condition: string; subject: string; body: string; date: string; delayAmount: number; delayUnit: 'days' | 'weeks'; replyInThread?: boolean };

interface StoredCampaign {
  id: string; name: string; tag: string; status: 'draft' | 'running' | 'paused';
  createdAt: string; updatedAt: string; selectedListId: string; selectedListIds?: string[]; prospectsList: Lead[];
  sequences: CampaignSequenceStep[]; isDryRun: boolean; rateLimitPerMinute: number;
  maxConcurrency: number; sentCount: number; failedCount: number; noFormCount: number; captchaCount: number;
  submissionDelaySeconds?: number; dailySubmissionLimit?: number; preventDuplicateSubmissions?: boolean;
  retryFailedSubmissions?: number; failureThreshold?: number; humanReviewUncertainForms?: boolean; stopOnSecurityChallenge?: boolean;
  aiPersonalizationEnabled?: boolean; aiInstructions?: string;
  aiPreview?: { subject: string; body: string; provider: string; isAiGenerated: boolean; companyName: string };
  aiPersonalizedMessages?: Record<string, string>;
}

const defaultSequence = (): CampaignSequenceStep => ({
  id: `step-${Date.now()}`, sequenceNumber: 1, stepType: 'initial_email',
  subject: '', body: '',
  delayDays: 0, condition: 'always',
});

const DEFAULT_FOLLOWUP_DELAYS = [3, 5, 7, 10, 14];

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
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [sequence, setSequence] = useState<CampaignSequenceStep>(defaultSequence);
  const [messageSequences, setMessageSequences] = useState<MessageSequence[]>([{ id: 'sequence-1', name: 'Initial Email', condition: 'prospects that did NOT reply', subject: '', body: '', date: new Date().toISOString().slice(0, 10), delayAmount: 0, delayUnit: 'days', replyInThread: true }]);
  const [selectedSequenceId, setSelectedSequenceId] = useState('sequence-1');
  const [isDryRun, setIsDryRun] = useState(true);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(10);
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [submissionDelaySeconds, setSubmissionDelaySeconds] = useState(5);
  const [dailySubmissionLimit, setDailySubmissionLimit] = useState(100);
  const [preventDuplicateSubmissions, setPreventDuplicateSubmissions] = useState(true);
  const [retryFailedSubmissions, setRetryFailedSubmissions] = useState(1);
  const [failureThreshold, setFailureThreshold] = useState(5);
  const [humanReviewUncertainForms, setHumanReviewUncertainForms] = useState(true);
  const [stopOnSecurityChallenge, setStopOnSecurityChallenge] = useState(true);
  const [aiPersonalizationEnabled, setAiPersonalizationEnabled] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('Write a short, professional outreach message for this business. Mention something relevant about the target website and keep the message natural and concise.');
  const [aiPreview, setAiPreview] = useState<StoredCampaign['aiPreview']>();
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [manualWebsites, setManualWebsites] = useState('');
  const [manualListName, setManualListName] = useState('');
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualBulkWebsites, setManualBulkWebsites] = useState('');
  const [listsModalOpen, setListsModalOpen] = useState(false);
  const [listsModalSelection, setListsModalSelection] = useState<string[]>([]);
  const [accountEmail, setAccountEmail] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [uploadData, setUploadData] = useState<{ fileName: string; headers: string[]; sampleRows: any[]; allRawRows: any[] }>({ fileName: '', headers: [], sampleRows: [], allRawRows: [] });

  // Upload Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalError, setUploadModalError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [prospectSearchQuery, setProspectSearchQuery] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [editingName, setEditingName] = useState('');

  const saveInlineRename = () => {
    const trimmed = editingName.trim();
    if (trimmed) {
      setCampaignName(trimmed);
      if (editId) {
        try {
          const stored = localStorage.getItem('user_campaigns');
          if (stored) {
            const parsed = JSON.parse(stored);
            const updated = parsed.map((c: any) => c.id === editId ? { ...c, name: trimmed, updatedAt: new Date().toISOString() } : c);
            localStorage.setItem('user_campaigns', JSON.stringify(updated));
          }
        } catch (e) {}
      }
    }
    setIsRenaming(false);
  };

  const addDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };
  const threadSubject = (subject: string) => {
    const cleanSubject = subject.trim();
    if (!cleanSubject) return '';
    const sansRe = cleanSubject.replace(/^(?:re:\s*)+/i, '').trim();
    return sansRe ? `Re: ${sansRe}` : '';
  };

  const addFollowUp = () => {
    const followUps = messageSequences.slice(1);
    if (followUps.length >= 5) {
      setError('Maximum of 5 Follow-ups allowed per campaign.');
      return;
    }
    const followUpIndex = messageSequences.length; // 1 for Follow-up 1, 2 for Follow-up 2, etc.
    const defaultDelay = DEFAULT_FOLLOWUP_DELAYS[followUpIndex - 1] ?? 4;
    const previous = messageSequences[messageSequences.length - 1];
    const previousSubject = previous?.subject || '';
    const defaultSubject = threadSubject(previousSubject);
    const previousDate = previous?.date || new Date().toISOString().slice(0, 10);
    const id = `followup-${Date.now()}`;

    const newStep: MessageSequence = {
      id,
      name: `Follow-up ${followUpIndex}`,
      condition: 'prospects that did NOT reply',
      subject: defaultSubject,
      body: '',
      date: addDays(previousDate, defaultDelay),
      delayAmount: defaultDelay,
      delayUnit: 'days',
      replyInThread: true,
    };

    setMessageSequences((items) => [...items, newStep]);
    setSelectedSequenceId(id);
    setError('');
  };

  const deleteSequence = (id: string) => {
    if (messageSequences.length <= 1) return;
    const target = messageSequences.find((item) => item.id === id);
    if (!target) return;

    const filtered = messageSequences.filter((item) => item.id !== id);
    const renumbered = filtered.map((item, index) => {
      if (index === 0) {
        return { ...item, name: 'Initial Email', delayAmount: 0 };
      }
      return { ...item, name: `Follow-up ${index}` };
    });

    setMessageSequences(renumbered);
    if (selectedSequenceId === id) {
      const deletedIndex = messageSequences.findIndex((item) => item.id === id);
      const nextSelected = renumbered[Math.min(deletedIndex, renumbered.length - 1)];
      if (nextSelected) {
        setSelectedSequenceId(nextSelected.id);
      }
    }
  };
  const addManualProspect = () => {
    const websites = manualWebsites.split(/\r?\n/).map((site) => site.trim()).filter(Boolean);
    if (!websites.length || !manualListName.trim()) { setError('Add at least one Website and a Lead List Name.'); return; }
    const listId = `list-${Date.now()}`; const listName = manualListName.trim();
    const newList = { id: listId, name: listName, ownerEmail: accountEmail, fileName: 'Manual websites', totalLeads: websites.length, columns: ['website'], createdAt: new Date().toISOString() } as LeadList;
    const newLeads = websites.map((website, index) => ({ id: `manual-${Date.now()}-${index}`, firstName: '', companyName: '', website, domain: website.replace(/^https?:\/\//i, '').replace(/\/.*$/, ''), listId, listName, ownerEmail: accountEmail, status: 'UNCONTACTED', createdAt: new Date().toISOString() } as Lead));
    const storedLists = JSON.parse(localStorage.getItem('user_lead_lists') || '[]'); const storedLeads = JSON.parse(localStorage.getItem('user_imported_leads') || '[]');
    localStorage.setItem('user_lead_lists', JSON.stringify([newList, ...storedLists])); localStorage.setItem('user_imported_leads', JSON.stringify([...newLeads, ...storedLeads]));
    setLeadLists((items) => [newList, ...items]); setLeads((items) => [...newLeads, ...items]); setSelectedListId(listId); setSelectedListIds((prev) => Array.from(new Set([...prev, listId]))); setManualWebsites(''); setManualListName(''); setError(`${newLeads.length} website(s) added successfully.`);
  };

  const processSelectedFile = async (file: File) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const isSupported = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    if (!isSupported) {
      setUploadModalError('Please upload a CSV or XLSX file.');
      return;
    }
    setUploadModalError('');
    setIsParsingFile(true);
    try {
      const buffer = await file.arrayBuffer();
      const analysis: any = parseSpreadsheetPreview(buffer, file.name);
      if (!analysis || (!analysis.detectedHeaders?.length && !analysis.headers?.length && !analysis.rows?.length && !analysis.sampleRows?.length)) {
        throw new Error('Spreadsheet appears to be empty or unreadable.');
      }
      setUploadData({
        fileName: file.name,
        headers: analysis.detectedHeaders || analysis.headers || [],
        sampleRows: analysis.sampleRows || analysis.rows || [],
        allRawRows: analysis.rawRows || analysis.rows || [],
      });
      setUploadModalOpen(false);
      setShowMatchModal(true);
    } catch (err: any) {
      setUploadModalError(err.message || 'Could not read this CSV/XLSX file.');
    } finally {
      setIsParsingFile(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  useEffect(() => {
    try {
      const activeAccount = (localStorage.getItem('active_account_email') || '').toLowerCase();
      const storedLists: LeadList[] = JSON.parse(localStorage.getItem('user_lead_lists') || '[]');
      const ownedLists = storedLists.map((list) => list.ownerEmail ? list : { ...list, ownerEmail: activeAccount });
      if (activeAccount && ownedLists.some((list, index) => list.ownerEmail !== storedLists[index].ownerEmail)) localStorage.setItem('user_lead_lists', JSON.stringify(ownedLists));
      const storedLeads = JSON.parse(localStorage.getItem('user_imported_leads') || '[]');
      setAccountEmail(activeAccount);
      setLeadLists(Array.isArray(ownedLists) ? ownedLists : []);
      setLeads(Array.isArray(storedLeads) ? storedLeads : []);
      if (editId) {
        const campaigns: StoredCampaign[] = JSON.parse(localStorage.getItem('user_campaigns') || '[]');
        const campaign = campaigns.find((item) => item.id === editId);
        if (campaign) {
          setCampaignName(campaign.name || ''); setTag(campaign.tag || 'CUSTOM'); setStatus(campaign.status || 'draft');
          const savedListIds = campaign.selectedListIds?.length ? campaign.selectedListIds : campaign.selectedListId ? [campaign.selectedListId] : [];
          setSelectedListId(campaign.selectedListId || savedListIds[0] || ''); setSelectedListIds(savedListIds); setSequence(campaign.sequences?.[0] || defaultSequence());
          setIsDryRun(campaign.isDryRun ?? true); setRateLimitPerMinute(campaign.rateLimitPerMinute || 10);
          setMaxConcurrency(campaign.maxConcurrency || 5); setCreatedAt(campaign.createdAt);
          if (campaign.sequences?.length) {
            const loaded = campaign.sequences.map((item: any, index: number) => ({ id: item.id || `sequence-${index + 1}`, name: index === 0 ? 'Initial Email' : `Follow-up ${index}`, condition: item.condition || 'prospects that did NOT reply', subject: item.subject || '', body: item.body || '', date: item.date || new Date().toISOString().slice(0, 10), delayAmount: item.delayDays ?? (index > 0 ? (DEFAULT_FOLLOWUP_DELAYS[index - 1] || 4) : 0), delayUnit: item.delayUnit || 'days', replyInThread: item.replyInThread !== undefined ? Boolean(item.replyInThread) : true }));
            setMessageSequences(loaded); setSelectedSequenceId(loaded[0].id);
          }
          setSubmissionDelaySeconds(campaign.submissionDelaySeconds ?? 5); setDailySubmissionLimit(campaign.dailySubmissionLimit ?? 100);
          setPreventDuplicateSubmissions(campaign.preventDuplicateSubmissions ?? true); setRetryFailedSubmissions(campaign.retryFailedSubmissions ?? 1);
          setFailureThreshold(campaign.failureThreshold ?? 5); setHumanReviewUncertainForms(campaign.humanReviewUncertainForms ?? true); setStopOnSecurityChallenge(campaign.stopOnSecurityChallenge ?? true);
          setAiPersonalizationEnabled(campaign.aiPersonalizationEnabled ?? false);
          setAiInstructions(campaign.aiInstructions || 'Write a short, professional outreach message for this business. Mention something relevant about the target website and keep the message natural and concise.');
          setAiPreview(campaign.aiPreview);

          if (Array.isArray(campaign.prospectsList) && campaign.prospectsList.length > 0) {
            setLeads((existingLeads) => {
              const existingIds = new Set(existingLeads.map((l) => l.id || l.website));
              const missing = campaign.prospectsList.filter((l: any) => l && (l.id || l.website) && !existingIds.has(l.id || l.website));
              return missing.length > 0 ? [...existingLeads, ...missing] : existingLeads;
            });
          }
        } else setError('The requested campaign could not be found. You can save this setup as a new campaign.');
      } else {
        setSelectedListId(''); setSelectedListIds([]);
      }
    } catch { setError('Campaign data could not be loaded from this browser.'); }
  }, [editId]);

  useEffect(() => {
    const selectedIndex = messageSequences.findIndex((item) => item.id === selectedSequenceId);
    const selected = messageSequences[selectedIndex];
    if (selected) {
      setSequence((current) => ({
        ...current,
        id: selected.id,
        stepType: selectedIndex === 0 ? 'initial_email' : 'followup',
        subject: selected.subject,
        body: selected.body,
        delayDays: selected.delayUnit === 'weeks' ? selected.delayAmount * 7 : selected.delayAmount,
        delayUnit: selected.delayUnit,
        condition: selected.condition,
        date: selected.date,
        replyInThread: selected.replyInThread ?? true,
      }));
    }
  }, [selectedSequenceId, messageSequences]);
  useEffect(() => {
    if (sequence.id !== selectedSequenceId) return;
    setMessageSequences((items) => items.map((item) => item.id === selectedSequenceId && (item.subject !== sequence.subject || item.body !== sequence.body || item.replyInThread !== sequence.replyInThread) ? { ...item, subject: sequence.subject, body: sequence.body, replyInThread: sequence.replyInThread } : item));
  }, [sequence.subject, sequence.body, sequence.replyInThread, sequence.id, selectedSequenceId]);

  const updateSelectedTiming = (amount: number, unit: 'days' | 'weeks') => {
    setMessageSequences((items) => items.map((item, index) => {
      if (item.id !== selectedSequenceId || index === 0) return item;
      const previousDate = items[index - 1]?.date || new Date().toISOString().slice(0, 10);
      return { ...item, delayAmount: amount, delayUnit: unit, date: addDays(previousDate, unit === 'weeks' ? amount * 7 : amount) };
    }));
  };
  const updateSelectedDate = (date: string) => setMessageSequences((items) => items.map((item) => item.id === selectedSequenceId ? { ...item, date } : item));
  const selectedMessageSequenceIndex = Math.max(0, messageSequences.findIndex((item) => item.id === selectedSequenceId));
  const selectedMessageSequence = messageSequences[selectedMessageSequenceIndex];
  const previousMessageSequence = selectedMessageSequenceIndex > 0 ? messageSequences[selectedMessageSequenceIndex - 1] : null;

  const updateSelectedReplyInThread = (enabled: boolean) => {
    setMessageSequences((items) =>
      items.map((item, idx) => {
        if (item.id !== selectedSequenceId) return item;
        const prevSubject = items[idx - 1]?.subject || '';
        let newSubject = item.subject;
        if (enabled && prevSubject) {
          const cleanPrev = prevSubject.replace(/^(?:re:\s*)+/i, '').trim();
          if (cleanPrev && (!newSubject || !newSubject.toLowerCase().startsWith('re:'))) {
            newSubject = `Re: ${cleanPrev}`;
          }
        }
        return { ...item, replyInThread: enabled, subject: newSubject };
      })
    );
    setSequence((curr) => {
      const prevSubject = previousMessageSequence?.subject || '';
      let newSubject = curr.subject;
      if (enabled && prevSubject) {
        const cleanPrev = prevSubject.replace(/^(?:re:\s*)+/i, '').trim();
        if (cleanPrev && (!newSubject || !newSubject.toLowerCase().startsWith('re:'))) {
          newSubject = `Re: ${cleanPrev}`;
        }
      }
      return { ...curr, replyInThread: enabled, subject: newSubject };
    });
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('campaign_name_updated', { detail: campaignName || 'New campaign' }));
  }, [campaignName]);

  const selectedLeads = useMemo(() => {
    const selectedListIdSet = new Set(selectedListIds);
    const selectedNames = new Set(leadLists.filter((list) => selectedListIdSet.has(list.id)).map((list) => list.name));

    const rawSelected = leads.filter((lead) => {
      if (accountEmail && lead.ownerEmail && lead.ownerEmail.toLowerCase() !== accountEmail.toLowerCase()) {
        return false;
      }
      return (
        (lead.listId && selectedListIdSet.has(lead.listId)) ||
        (lead.listName && selectedNames.has(lead.listName))
      );
    });

    const seen = new Set<string>();
    const unique: Lead[] = [];
    for (const lead of rawSelected) {
      const rawKey = lead.website || lead.domain || lead.id || '';
      const normKey = rawKey.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const key = normKey || lead.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(lead);
      } else if (!key) {
        unique.push(lead);
      }
    }
    return unique;
  }, [leadLists, leads, selectedListIds, accountEmail]);

  const filteredProspects = useMemo(() => {
    if (!prospectSearchQuery.trim()) return selectedLeads;
    const q = prospectSearchQuery.toLowerCase().trim();
    return selectedLeads.filter(
      (lead) =>
        (lead.website && lead.website.toLowerCase().includes(q)) ||
        (lead.domain && lead.domain.toLowerCase().includes(q)) ||
        (lead.companyName && lead.companyName.toLowerCase().includes(q)) ||
        (lead.firstName && lead.firstName.toLowerCase().includes(q)) ||
        (lead.lastName && lead.lastName.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q))
    );
  }, [selectedLeads, prospectSearchQuery]);

  const ownedLeadLists = accountEmail ? leadLists.filter((list) => list.ownerEmail === accountEmail) : leadLists;

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

  const saveCampaign = (launch = false, advance = false) => {
    const cleanName = campaignName.trim();
    if (activeTab === 'setup' && cleanName.length < 3) { setError('Enter a campaign name with at least 3 characters.'); return; }
    if ((activeTab === 'prospects' || launch) && (!selectedListIds.length || selectedLeads.length === 0)) { setError('Select at least one lead list containing prospects.'); setActiveTab('prospects'); return; }
    if (launch && selectedLeads.some((lead) => !lead.website || lead.website.length < 4)) { setError('Please map a Website column and ensure every selected lead has a valid website before starting.'); setActiveTab('prospects'); return; }
    if ((activeTab === 'message' || launch) && !sequence.body.trim()) { setError('Add a campaign message before saving.'); setActiveTab('message'); return; }
    const campaigns: StoredCampaign[] = JSON.parse(localStorage.getItem('user_campaigns') || '[]');
    const existing = editId ? campaigns.find((item) => item.id === editId) : undefined;
    const now = new Date().toISOString();
    const campaign: StoredCampaign = {
      ...(existing || {} as StoredCampaign),
      id: existing?.id || `campaign-${Date.now()}`, name: cleanName, tag: tag.trim() || 'CUSTOM',
      status: launch ? 'running' : 'draft', createdAt: createdAt || existing?.createdAt || now, updatedAt: now,
      selectedListId: selectedListId || selectedListIds[0] || '', selectedListIds, prospectsList: selectedLeads, sequences: messageSequences.map((item, index) => ({ ...sequence, id: item.id, sequenceNumber: index + 1, stepType: index === 0 ? 'initial_email' : 'followup', name: index === 0 ? 'Initial Email' : `Follow-up ${index}`, subject: item.subject, body: item.body, delayDays: item.delayUnit === 'weeks' ? item.delayAmount * 7 : item.delayAmount, delayUnit: item.delayUnit, condition: item.condition, date: item.date, replyInThread: item.replyInThread ?? true })), isDryRun,
      rateLimitPerMinute, maxConcurrency, sentCount: existing?.sentCount || 0, failedCount: existing?.failedCount || 0,
      submissionDelaySeconds, dailySubmissionLimit, preventDuplicateSubmissions, retryFailedSubmissions, failureThreshold,
      humanReviewUncertainForms, stopOnSecurityChallenge,
      noFormCount: existing?.noFormCount || 0, captchaCount: existing?.captchaCount || 0,
      aiPersonalizationEnabled, aiInstructions: aiInstructions.trim(), aiPreview,
    };
    const updated = existing ? campaigns.map((item) => item.id === existing.id ? campaign : item) : [campaign, ...campaigns];
    localStorage.setItem('user_campaigns', JSON.stringify(updated));
    setError('');
    if (advance) {
      const nextTab: EditorTab = activeTab === 'setup' ? 'prospects' : activeTab === 'prospects' ? 'message' : 'settings';
      setActiveTab(nextTab);
    } else if (launch || !advance) router.push('/campaigns');
  };

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: 'setup', label: 'Campaign setup' }, { id: 'prospects', label: `Prospects (${selectedLeads.length})` },
    { id: 'message', label: 'Message' }, { id: 'settings', label: 'Safety & pacing' },
  ];

  return (<>
    <MatchDataModal isOpen={showMatchModal} onClose={() => setShowMatchModal(false)} fileName={uploadData.fileName} headers={uploadData.headers} sampleRows={uploadData.sampleRows} allRawRows={uploadData.allRawRows} onImportSuccess={(importedLeads, listInfo) => { const newList = { ...listInfo, ownerEmail: accountEmail, totalLeads: importedLeads.length, columns: Object.keys(importedLeads[0] || {}), createdAt: listInfo.uploadedAt || new Date().toISOString() }; const taggedLeads = importedLeads.map((lead) => ({ ...lead, listId: newList.id, listName: newList.name, ownerEmail: accountEmail })); const storedLists = JSON.parse(localStorage.getItem('user_lead_lists') || '[]'); localStorage.setItem('user_lead_lists', JSON.stringify([newList, ...storedLists.filter((l: any) => l.id !== newList.id)])); const storedLeads = JSON.parse(localStorage.getItem('user_imported_leads') || '[]'); localStorage.setItem('user_imported_leads', JSON.stringify([...taggedLeads, ...storedLeads])); setLeadLists((items) => [newList, ...items.filter((l) => l.id !== newList.id)]); setLeads((items) => [...taggedLeads, ...items]); setSelectedListId(newList.id); setSelectedListIds((prev) => Array.from(new Set([...prev, newList.id]))); setShowMatchModal(false); setError(`${importedLeads.length} leads imported successfully.`); }} />

    {/* UPLOAD CSV / XLSX MODAL */}
    {uploadModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">Upload CSV file to import from</h2>
            <button
              type="button"
              onClick={() => { setUploadModalOpen(false); setUploadModalError(''); }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {uploadModalError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{uploadModalError}</span>
              </div>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processSelectedFile(file);
              }}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                isDragging
                  ? 'border-[#0e6de4] bg-blue-50/80 scale-[1.01]'
                  : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              {isParsingFile ? (
                <div className="flex flex-col items-center py-4">
                  <Loader2 className="h-10 w-10 animate-spin text-[#0e6de4]" />
                  <p className="mt-3 text-sm font-bold text-slate-800">Reading spreadsheet file...</p>
                  <p className="mt-1 text-xs text-slate-500">Detecting columns and sample rows</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-[#0e6de4]">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Drop file to upload or{' '}
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="font-bold text-[#0e6de4] underline underline-offset-2 hover:text-blue-700 cursor-pointer"
                    >
                      select file from computer
                    </button>
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Supported: .CSV, .XLSX
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={() => { setUploadModalOpen(false); setUploadModalError(''); }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {manualModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold">Enter Websites Manually</h2><p className="mt-1 text-sm text-slate-500">Paste one website URL per line.</p><textarea rows={8} value={manualBulkWebsites} onChange={(event) => setManualBulkWebsites(event.target.value)} placeholder={'acme.com\nhttps://example.com'} className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm" /><input value={manualListName} onChange={(event) => setManualListName(event.target.value)} placeholder="Lead List Name" className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm" /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setManualModalOpen(false)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button><Button type="button" onClick={() => { setManualWebsites(manualBulkWebsites); addManualProspect(); setManualModalOpen(false); }} className="px-4 py-2">Add Websites</Button></div></div></div>}
    {listsModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Choose Lead Lists</h2><p className="mt-1 text-sm text-slate-500">Select one or more lists to add to this campaign.</p></div><List className="h-5 w-5 text-[#0e6de4]" /></div><div className="mt-5 space-y-3">{ownedLeadLists.length ? ownedLeadLists.map((list) => { const count = leads.filter((lead) => lead.listId === list.id || lead.listName === list.name).length; const checked = listsModalSelection.includes(list.id); return <label key={list.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${checked ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}><span className="flex items-center gap-3"><FileSpreadsheet className="h-5 w-5 text-blue-600" /><span><span className="block text-sm font-bold text-slate-900">{list.name}</span><span className="block text-xs text-slate-500">{count} leads</span></span></span><input type="checkbox" checked={checked} onChange={() => setListsModalSelection((current) => current.includes(list.id) ? current.filter((id) => id !== list.id) : [...current, list.id])} className="h-5 w-5" /></label>; }) : <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">No lead lists are available yet.</div>}</div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setListsModalOpen(false)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><Button type="button" onClick={() => { setSelectedListIds(listsModalSelection); setSelectedListId(listsModalSelection[0] || ''); setListsModalOpen(false); setError(listsModalSelection.length ? '' : 'Select at least one lead list.'); }} className="px-5 py-2.5">Add to Campaign</Button></div></div></div>}
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Edit campaign</h1>
              {isRenaming ? (
                <div className="flex items-center gap-1.5 ml-1 sm:ml-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveInlineRename();
                      if (e.key === 'Escape') setIsRenaming(false);
                    }}
                    className="rounded-lg border border-[#0e6de4] px-3 py-1 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={saveInlineRename}
                    className="rounded-lg bg-[#0e6de4] px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-1 sm:ml-2">
                  <span className="text-sm font-medium text-slate-400">•</span>
                  <span className="text-sm font-semibold text-slate-600">
                    Campaign Name:{' '}
                    <span className="font-bold text-slate-900">{campaignName || 'New Campaign'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setEditingName(campaignName); setIsRenaming(true); }}
                    className="p-1 text-slate-400 hover:text-[#0e6de4] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Rename Campaign"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-500">Configure your outreach workflow: prospects, messages, and safety settings.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={() => saveCampaign(false)} className="min-w-[148px] whitespace-nowrap px-6 py-3">
            <Save className="mr-2 h-4 w-4" />Save Draft
          </Button>
          <Button onClick={() => activeTab === 'settings' ? saveCampaign(true) : saveCampaign(false, true)} className="min-w-[164px] whitespace-nowrap px-6 py-3">
            <CheckCircle2 className="mr-2 h-4 w-4" />{activeTab === 'settings' ? 'Save & Start' : 'Save & Next'}
          </Button>
        </div>
      </div>
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">{error}</div>}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{tab.label}</button>)}</div>
      {activeTab === 'message' && (
        <div className="float-left mr-6 flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 lg:w-60">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sequence Flow</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0e6de4] border border-blue-200/60">
              {messageSequences.length - 1}/5 Follow-ups
            </span>
          </div>
          <div className="space-y-2">
            {messageSequences.map((item, index) => {
              const isSelected = selectedSequenceId === item.id;
              const isInitial = index === 0;
              const previousItem = index > 0 ? messageSequences[index - 1] : null;

              let subjectDisplay = item.subject || 'No subject set';
              if (!isInitial && item.replyInThread && previousItem?.subject) {
                const cleanPrev = previousItem.subject.replace(/^(?:re:\s*)+/i, '').trim();
                subjectDisplay = cleanPrev ? `Re: ${cleanPrev}` : 'Re: (previous subject)';
              }

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedSequenceId(item.id)}
                  className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0e6de4] bg-white shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-[#0e6de4]' : 'text-slate-900'}`}>
                      {isInitial ? 'Initial Email' : `Follow-up ${index}`}
                    </span>
                    {!isInitial && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSequence(item.id);
                        }}
                        className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Follow-up"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-500">
                    {subjectDisplay}
                  </p>
                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                    {isInitial ? (
                      <span className="text-[10px] font-medium text-slate-400">Day 0</span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-[#0e6de4]">
                        Send after {item.delayAmount} {item.delayUnit}
                      </span>
                    )}
                    {!isInitial && item.replyInThread && (
                      <span className="text-[10px] font-semibold text-slate-400">Threaded</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {messageSequences.length <= 5 ? (
            <button
              type="button"
              onClick={addFollowUp}
              className="mt-1 w-full rounded-xl border border-dashed border-[#0e6de4]/50 bg-white px-3 py-2 text-center text-xs font-bold text-[#0e6de4] hover:bg-blue-50 hover:border-[#0e6de4] transition-all cursor-pointer"
            >
              + Add Follow-up
            </button>
          ) : (
            <div className="mt-1 rounded-xl bg-slate-100 p-2 text-center text-[11px] font-bold text-slate-500">
              Max 5 Follow-ups reached
            </div>
          )}
        </div>
      )}
      {activeTab === 'prospects' && (
        <div className="space-y-4">
          <div><h2 className="text-xl font-bold text-slate-900">Add Prospects</h2><p className="text-sm text-slate-500">Choose how you want to add prospects to this campaign.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => { setUploadModalError(''); setUploadModalOpen(true); }}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs transition hover:border-blue-300 cursor-pointer"
            >
              <Upload className="mx-auto mb-3 h-7 w-7 rounded-lg bg-blue-50 p-1.5 text-[#0e6de4]" />
              <p className="font-bold">Upload CSV/XLSX</p>
            </button>
            <button type="button" onClick={() => setManualModalOpen(true)} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:border-blue-300"><UserPlus className="mx-auto mb-3 h-7 w-7 rounded-lg bg-blue-50 p-1.5 text-[#0e6de4]" /><p className="font-bold">Enter Manually</p></button>
            <button type="button" onClick={() => { setListsModalSelection(selectedListIds); setListsModalOpen(true); }} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm hover:border-blue-300"><List className="mx-auto mb-3 h-7 w-7 rounded-lg bg-blue-50 p-1.5 text-[#0e6de4]" /><p className="font-bold">From Lists</p></button>
          </div>
        </div>
      )}
      {activeTab === 'prospects' && <><button type="button" onClick={() => downloadSampleCsv('b2b-saas')} className="text-sm font-semibold text-[#0e6de4] hover:underline">Need a sample? Download Example CSV</button><input ref={uploadInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" aria-label="Upload CSV or XLSX" onChange={(event) => { const file = event.target.files?.[0]; if (file) processSelectedFile(file); }} /></>}
      <section id="campaign-lead-lists" className={`${activeTab === 'message' ? 'lg:ml-64' : ''} rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8`}>
        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Campaign details</h2>
              <p className="text-sm text-slate-500">Manage internal campaign configuration and tags.</p>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              Tag
              <input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                placeholder="CUSTOM"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </label>
          </div>
        )}
        {activeTab === 'prospects' && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Users className="mt-1 h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Campaign prospects</h2>
                  <p className="text-sm text-slate-500">{selectedListIds.length} list{selectedListIds.length === 1 ? '' : 's'} selected · {selectedLeads.length} total prospects</p>
                </div>
              </div>
              {selectedLeads.length > 0 && (
                <input
                  type="text"
                  placeholder="Search prospects..."
                  value={prospectSearchQuery}
                  onChange={(e) => setProspectSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 w-full sm:w-56"
                />
              )}
            </div>
            {selectedListIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedListIds.map((id) => {
                  const list = leadLists.find((item) => item.id === id);
                  return list ? (
                    <span key={id} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {list.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            {selectedLeads.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-100/80 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3 w-12">#</th>
                      <th className="px-4 py-3">Website / Domain</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Contact Person</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {filteredProspects.map((lead, idx) => (
                      <tr key={lead.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900 truncate max-w-[200px]">{lead.website || lead.domain || '—'}</td>
                        <td className="px-4 py-2.5 truncate max-w-[160px]">{lead.companyName || '—'}</td>
                        <td className="px-4 py-2.5 truncate max-w-[150px]">{[lead.firstName, lead.lastName].filter(Boolean).join(' ') || '—'}</td>
                        <td className="px-4 py-2.5 text-blue-600 truncate max-w-[180px]">{lead.email || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            {lead.status || 'UNCONTACTED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProspects.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 font-medium">
                    No prospects matching "{prospectSearchQuery}"
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500 font-medium">
                No prospects added to this campaign yet. Upload a CSV/XLSX, enter websites manually, or select from an existing Lead List above.
              </div>
            )}
          </div>
        )}
        {activeTab === 'message' && selectedMessageSequence && (
          <CampaignMessageEditor
            sequence={sequence}
            onSequenceChange={setSequence}
            sequenceDate={selectedMessageSequence.date}
            sequenceIndex={selectedMessageSequenceIndex}
            sequenceName={selectedMessageSequence.name}
            previousSubject={previousMessageSequence?.subject || ''}
            onTimingChange={updateSelectedTiming}
            onSequenceDateChange={updateSelectedDate}
            onReplyInThreadChange={updateSelectedReplyInThread}
            selectedLeads={selectedLeads}
            aiPersonalizationEnabled={aiPersonalizationEnabled}
            onAiPersonalizationEnabledChange={setAiPersonalizationEnabled}
            aiInstructions={aiInstructions}
            onAiInstructionsChange={setAiInstructions}
            aiPreview={aiPreview}
            isGeneratingPreview={isGeneratingPreview}
            onGeneratePreview={generateAiPreview}
            editId={editId}
          />
        )}
        {activeTab === 'settings' && <div className="space-y-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-6 w-6 text-emerald-600" /><div><h2 className="text-lg font-bold text-slate-900">Safety and pacing</h2><p className="text-sm text-slate-500">Control submission speed, concurrency, retries, and safety behavior.</p></div></div><label className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div><p className="font-bold text-emerald-950">Dry-run protection</p><p className="text-sm text-emerald-700">Inspect and record the workflow without live submission.</p></div><input type="checkbox" checked={isDryRun} onChange={(event) => setIsDryRun(event.target.checked)} className="h-5 w-5" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Rate limit per minute<input type="number" min={1} max={120} value={rateLimitPerMinute} onChange={(event) => setRateLimitPerMinute(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="text-sm font-semibold text-slate-700">Maximum concurrency<input type="number" min={1} max={20} value={maxConcurrency} onChange={(event) => setMaxConcurrency(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="text-sm font-semibold text-slate-700">Delay between submissions (seconds)<input type="number" min={0} max={3600} value={submissionDelaySeconds} onChange={(event) => setSubmissionDelaySeconds(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="text-sm font-semibold text-slate-700">Daily submission limit<input type="number" min={1} value={dailySubmissionLimit} onChange={(event) => setDailySubmissionLimit(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label></div><div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-900">Advanced safety settings</h3><div className="mt-4 space-y-4"><label className="flex items-center justify-between gap-4"><span><span className="block font-semibold text-slate-800">Prevent duplicate submissions</span><span className="text-xs text-slate-500">Skip contacts already submitted in this campaign.</span></span><input type="checkbox" checked={preventDuplicateSubmissions} onChange={(event) => setPreventDuplicateSubmissions(event.target.checked)} className="h-5 w-5" /></label><label className="text-sm font-semibold text-slate-700">Retry failed submissions<select value={retryFailedSubmissions} onChange={(event) => setRetryFailedSubmissions(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"><option value={0}>No retry</option><option value={1}>1 retry</option><option value={2}>2 retries</option><option value={3}>3 retries</option></select></label><label className="text-sm font-semibold text-slate-700">Pause after consecutive failures<input type="number" min={1} max={50} value={failureThreshold} onChange={(event) => setFailureThreshold(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label><label className="flex items-center justify-between gap-4"><span><span className="block font-semibold text-slate-800">Send uncertain forms to review</span><span className="text-xs text-slate-500">Route uncertain mappings to manual review.</span></span><input type="checkbox" checked={humanReviewUncertainForms} onChange={(event) => setHumanReviewUncertainForms(event.target.checked)} className="h-5 w-5" /></label><label className="flex items-center justify-between gap-4"><span><span className="block font-semibold text-slate-800">Stop on security challenge</span><span className="text-xs text-slate-500">Stop on CAPTCHA, Cloudflare, or similar challenges.</span></span><input type="checkbox" checked={stopOnSecurityChallenge} onChange={(event) => setStopOnSecurityChallenge(event.target.checked)} className="h-5 w-5" /></label></div></div></div>}
      </section>
    </div>
  </>);
}
