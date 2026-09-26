'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Bot, CheckCircle2, Clock, Calendar, Coins, Edit2, FileSpreadsheet, Globe, Loader2, Mail, RotateCcw, Save, ShieldCheck, Sparkles, Sliders, Users, Upload, UploadCloud, UserPlus, List, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CampaignSequenceStep, Lead, LeadList } from '@/types';
import { downloadSampleCsv } from '@/lib/services/sample-templates';
import { parseSpreadsheetPreview } from '@/lib/services/import-service';
import { CANONICAL_DEFAULT_SAFETY_CONFIG, SendingScheduleConfig } from '@/lib/services/processing-controls-service';
import { MatchDataModal } from '@/components/leads/MatchDataModal';
import { CampaignMessageEditor } from './CampaignMessageEditor';
import { ContactReplySettings } from '@/components/profile/ContactReplySettings';

type EditorTab = 'setup' | 'prospects' | 'message' | 'settings';
type MessageSequence = { id: string; name: string; condition: string; subject: string; body: string; date: string; delayAmount: number; delayUnit: 'days' | 'weeks'; replyInThread?: boolean };

interface StoredCampaign {
  id: string; name: string; tag: string; status: 'draft' | 'running' | 'paused';
  createdAt: string; updatedAt: string; selectedListId: string; selectedListIds?: string[]; prospectsList: Lead[];
  sequences: CampaignSequenceStep[]; isDryRun: boolean; rateLimitPerMinute: number;
  maxConcurrency: number; sentCount: number; failedCount: number; noFormCount: number; captchaCount: number;
  submissionDelaySeconds?: number; dailySubmissionLimit?: number; preventDuplicateSubmissions?: boolean;
  retryFailedSubmissions?: number; failureThreshold?: number; humanReviewUncertainForms?: boolean; stopOnSecurityChallenge?: boolean;
  schedule?: SendingScheduleConfig;
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
  const [messageSequences, setMessageSequences] = useState<MessageSequence[]>([{ id: 'sequence-1', name: 'Initial Message', condition: 'prospects that did NOT reply', subject: '', body: '', date: new Date().toISOString().slice(0, 10), delayAmount: 0, delayUnit: 'days', replyInThread: true }]);
  const [selectedSequenceId, setSelectedSequenceId] = useState('sequence-1');
  const [isDryRun, setIsDryRun] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.isDryRun);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.rateLimitPerMinute);
  const [maxConcurrency, setMaxConcurrency] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.maxConcurrency);
  const [submissionDelaySeconds, setSubmissionDelaySeconds] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.submissionDelaySeconds);
  const [dailySubmissionLimit, setDailySubmissionLimit] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.dailySubmissionLimit);
  const [preventDuplicateSubmissions, setPreventDuplicateSubmissions] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.preventDuplicateSubmissions);
  const [retryFailedSubmissions, setRetryFailedSubmissions] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.retryFailedSubmissions);
  const [failureThreshold, setFailureThreshold] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.pauseAfterConsecutiveFailures);
  const [humanReviewUncertainForms, setHumanReviewUncertainForms] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.humanReviewUncertainForms);
  const [stopOnSecurityChallenge, setStopOnSecurityChallenge] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.stopOnSecurityChallenge);

  // Sending Schedule States
  const [timezoneMode, setTimezoneMode] = useState<'account' | 'prospect' | 'custom'>(CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.timezoneMode);
  const [customTimezone, setCustomTimezone] = useState<string>(CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.customTimezone);
  const [sendingDays, setSendingDays] = useState({ ...CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays });
  const [sendingHours, setSendingHours] = useState<{ enabled: boolean; start: string; end: string }>({
    enabled: CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours.enabled ?? false,
    start: CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours.start || '09:00',
    end: CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours.end || '17:00',
  });
  const [randomizeSubmissionTime, setRandomizeSubmissionTime] = useState(CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.randomizeSubmissionTime);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showStartCampaignConfirmModal, setShowStartCampaignConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Credit Wallet & Shortfall States
  const [availableCredits, setAvailableCredits] = useState(100);
  const [showCreditShortfallModal, setShowCreditShortfallModal] = useState(false);
  const [creditShortfallData, setCreditShortfallData] = useState<any>(null);

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

  const safeParseJSON = <T,>(jsonString: string | null, fallback: T): T => {
    if (!jsonString || typeof jsonString !== 'string') return fallback;
    try {
      const parsed = JSON.parse(jsonString);
      return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveInlineRename = () => {
    const trimmed = editingName.trim();
    if (trimmed) {
      setCampaignName(trimmed);
      if (editId) {
        try {
          const stored = localStorage.getItem('user_campaigns');
          if (stored) {
            const parsed = safeParseJSON<any[]>(stored, []);
            const updated = parsed.map((c: any) => c && c.id === editId ? { ...c, name: trimmed, updatedAt: new Date().toISOString() } : c);
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
        return { ...item, name: 'Initial Message', delayAmount: 0 };
      }
      return { ...item, name: `Follow-up Message ${index}` };
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
  const addManualProspect = (urlsText?: string, listNameInput?: string) => {
    const textToParse = typeof urlsText === 'string' ? urlsText : manualWebsites;
    const nameToUse = typeof listNameInput === 'string' ? listNameInput : manualListName;
    const websites = textToParse.split(/\r?\n/).map((site) => site.trim()).filter(Boolean);
    if (!websites.length || !nameToUse.trim()) { setError('Add at least one Website and a Lead List Name.'); return false; }
    const listId = `list-${Date.now()}`; const listName = nameToUse.trim();
    const activeAccount = accountEmail || (localStorage.getItem('active_account_email') || '').toLowerCase();
    const newList = { id: listId, name: listName, ownerEmail: activeAccount, fileName: 'Manual websites', totalLeads: websites.length, columns: ['website'], createdAt: new Date().toISOString() } as LeadList;
    const newLeads = websites.map((website, index) => {
      const cleanUrl = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      const domain = cleanUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      return { id: `manual-${Date.now()}-${index}`, firstName: '', companyName: '', website: cleanUrl, domain, listId, listName, ownerEmail: activeAccount, status: 'UNCONTACTED', createdAt: new Date().toISOString() } as unknown as Lead;
    });
    const storedLists = safeParseJSON<any[]>(localStorage.getItem('user_lead_lists'), []);
    const storedLeads = safeParseJSON<any[]>(localStorage.getItem('user_imported_leads'), []);
    localStorage.setItem('user_lead_lists', JSON.stringify([newList, ...storedLists]));
    localStorage.setItem('user_imported_leads', JSON.stringify([...newLeads, ...storedLeads]));

    setLeadLists((items) => [newList, ...items]);
    setLeads((items) => [...newLeads, ...items]);
    setSelectedListId(listId);

    const updatedListIds = Array.from(new Set([...selectedListIds, listId]));
    setSelectedListIds(updatedListIds);

    // Automatically attach list & prospects to current active campaign and persist to localStorage
    if (editId) {
      try {
        const storedCamps = safeParseJSON<any[]>(localStorage.getItem('user_campaigns'), []);
        const campIndex = storedCamps.findIndex((c: any) => c && c.id === editId);
        if (campIndex !== -1) {
          const currentProspects = Array.isArray(storedCamps[campIndex].prospectsList) ? storedCamps[campIndex].prospectsList : [];
          const existingLeadKeys = new Set(currentProspects.map((l: any) => l.website || l.id));
          const uniqueNewLeads = newLeads.filter((l) => !existingLeadKeys.has(l.website || l.id));
          const combinedProspects = [...currentProspects, ...uniqueNewLeads];

          storedCamps[campIndex] = {
            ...storedCamps[campIndex],
            selectedListId: listId,
            selectedListIds: updatedListIds,
            prospectsList: combinedProspects,
            totalLeads: combinedProspects.length,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('user_campaigns', JSON.stringify(storedCamps));
        }
      } catch (e) {
        console.error('Error auto-attaching manual leads to campaign:', e);
      }
    }

    setManualWebsites('');
    setManualBulkWebsites('');
    setManualListName('');
    setError(`${newLeads.length} website(s) added successfully to "${listName}" and attached to this campaign.`);
    return true;
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
      const storedLists: LeadList[] = safeParseJSON<LeadList[]>(localStorage.getItem('user_lead_lists'), []);
      const ownedLists = storedLists.map((list) => list.ownerEmail ? list : { ...list, ownerEmail: activeAccount });
      if (activeAccount && ownedLists.some((list, index) => list.ownerEmail !== storedLists[index]?.ownerEmail)) localStorage.setItem('user_lead_lists', JSON.stringify(ownedLists));
      const storedLeads = safeParseJSON<any[]>(localStorage.getItem('user_imported_leads'), []);
      setAccountEmail(activeAccount);
      setLeadLists(Array.isArray(ownedLists) ? ownedLists : []);
      setLeads(Array.isArray(storedLeads) ? storedLeads : []);

      fetch('/api/credits')
        .then((res) => res.json())
        .then((data) => {
          if (data.wallet && typeof data.wallet.totalCreditsAvailable === 'number') {
            setAvailableCredits(data.wallet.totalCreditsAvailable);
          }
        })
        .catch(() => {});
      if (editId) {
        const campaigns: StoredCampaign[] = safeParseJSON<StoredCampaign[]>(localStorage.getItem('user_campaigns'), []);
        const campaign = campaigns.find((item) => item && item.id === editId);
        if (campaign) {
          const campaignOwner = (campaign as any).ownerEmail ? (campaign as any).ownerEmail.toLowerCase().trim() : '';
          const isAdmin = activeAccount === 'mithusquare@gmail.com';
          if (campaignOwner && activeAccount && campaignOwner !== activeAccount && !isAdmin) {
            setError('Access Denied: You do not have permission to view or edit this campaign. Each user can only access their own campaigns.');
            return;
          }
          setCampaignName(campaign.name || ''); setTag(campaign.tag || 'CUSTOM'); setStatus(campaign.status || 'draft');
          const savedListIds = campaign.selectedListIds?.length ? campaign.selectedListIds : campaign.selectedListId ? [campaign.selectedListId] : [];
          setSelectedListId(campaign.selectedListId || savedListIds[0] || ''); setSelectedListIds(savedListIds); setSequence(campaign.sequences?.[0] || defaultSequence());
          setIsDryRun(campaign.isDryRun ?? true); setRateLimitPerMinute(campaign.rateLimitPerMinute || 10);
          setMaxConcurrency(campaign.maxConcurrency || 5); setCreatedAt(campaign.createdAt);
          if (campaign.sequences?.length) {
            const loaded = campaign.sequences.map((item: any, index: number) => ({ id: item.id || `sequence-${index + 1}`, name: index === 0 ? 'Initial Message' : `Follow-up Message ${index}`, condition: item.condition || 'prospects that did NOT reply', subject: item.subject || '', body: item.body || '', date: item.date || new Date().toISOString().slice(0, 10), delayAmount: item.delayDays ?? (index > 0 ? (DEFAULT_FOLLOWUP_DELAYS[index - 1] || 4) : 0), delayUnit: item.delayUnit || 'days', replyInThread: item.replyInThread !== undefined ? Boolean(item.replyInThread) : true }));
            setMessageSequences(loaded); setSelectedSequenceId(loaded[0].id);
          }
          setSubmissionDelaySeconds(campaign.submissionDelaySeconds ?? CANONICAL_DEFAULT_SAFETY_CONFIG.submissionDelaySeconds); setDailySubmissionLimit(campaign.dailySubmissionLimit ?? CANONICAL_DEFAULT_SAFETY_CONFIG.dailySubmissionLimit);
          setPreventDuplicateSubmissions(campaign.preventDuplicateSubmissions ?? CANONICAL_DEFAULT_SAFETY_CONFIG.preventDuplicateSubmissions); setRetryFailedSubmissions(campaign.retryFailedSubmissions ?? CANONICAL_DEFAULT_SAFETY_CONFIG.retryFailedSubmissions);
          setFailureThreshold(campaign.failureThreshold ?? CANONICAL_DEFAULT_SAFETY_CONFIG.pauseAfterConsecutiveFailures); setHumanReviewUncertainForms(campaign.humanReviewUncertainForms ?? CANONICAL_DEFAULT_SAFETY_CONFIG.humanReviewUncertainForms); setStopOnSecurityChallenge(campaign.stopOnSecurityChallenge ?? CANONICAL_DEFAULT_SAFETY_CONFIG.stopOnSecurityChallenge);

          const sched = campaign.schedule || (campaign as any).sendingSchedule || CANONICAL_DEFAULT_SAFETY_CONFIG.schedule;
          setTimezoneMode(sched.timezoneMode || CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.timezoneMode);
          setCustomTimezone(sched.customTimezone || CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.customTimezone);
          setSendingDays({
            monday: sched.sendingDays?.monday ?? CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays.monday,
            tuesday: sched.sendingDays?.tuesday ?? CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays.tuesday,
            wednesday: sched.sendingDays?.wednesday ?? CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays.wednesday,
            thursday: sched.sendingDays?.thursday ?? CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays.thursday,
            friday: sched.sendingDays?.friday ?? CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays.friday,
            saturday: sched.sendingDays?.saturday ?? CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays.saturday,
            sunday: sched.sendingDays?.sunday ?? CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays.sunday,
          });
          setSendingHours({
            enabled: sched.sendingHours?.enabled !== undefined ? Boolean(sched.sendingHours.enabled) : false,
            start: sched.sendingHours?.start || CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours.start,
            end: sched.sendingHours?.end || CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours.end,
          });
          setRandomizeSubmissionTime(sched.randomizeSubmissionTime ?? CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.randomizeSubmissionTime);

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

  const handleSelectSequence = (targetId: string) => {
    if (targetId === selectedSequenceId) return;

    // Flush current active step into messageSequences array before switching
    setMessageSequences((prev) =>
      prev.map((item) =>
        item.id === selectedSequenceId
          ? { ...item, subject: sequence.subject, body: sequence.body, replyInThread: sequence.replyInThread ?? true }
          : item
      )
    );

    const targetItem = messageSequences.find((item) => item.id === targetId);
    const targetIndex = messageSequences.findIndex((item) => item.id === targetId);
    if (targetItem) {
      setSelectedSequenceId(targetId);
      setSequence({
        id: targetItem.id,
        sequenceNumber: targetIndex + 1,
        stepType: targetIndex === 0 ? 'initial_email' : 'followup',
        subject: targetItem.subject || '',
        body: targetItem.body || '',
        delayDays: targetItem.delayUnit === 'weeks' ? targetItem.delayAmount * 7 : targetItem.delayAmount,
        delayUnit: targetItem.delayUnit || 'days',
        condition: targetItem.condition || 'prospects that did NOT reply',
        date: targetItem.date || new Date().toISOString().slice(0, 10),
        replyInThread: targetItem.replyInThread ?? true,
      });
    }
  };

  const handleSequenceChange: React.Dispatch<React.SetStateAction<CampaignSequenceStep>> = (action) => {
    setSequence((prev) => {
      const updated = typeof action === 'function' ? action(prev) : action;
      setMessageSequences((items) =>
        items.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                subject: updated.subject,
                body: updated.body,
                replyInThread: updated.replyInThread ?? true,
                delayAmount: updated.delayUnit === 'weeks' ? updated.delayDays / 7 : updated.delayDays,
                delayUnit: updated.delayUnit || 'days',
                condition: updated.condition || item.condition,
                date: updated.date || item.date,
              }
            : item
        )
      );
      return updated;
    });
  };

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
      const owner = (lead as any).ownerEmail;
      if (accountEmail && owner && owner.toLowerCase() !== accountEmail.toLowerCase()) {
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

  const saveCampaign = async (launch = false, advance = false) => {
    if (isSaving || isStarting) return;
    if (launch) setIsStarting(true);
    else setIsSaving(true);

    try {
      const cleanName = campaignName.trim();
      if (activeTab === 'setup' && cleanName.length < 3) { setError('Enter a campaign name with at least 3 characters.'); return; }
      if ((activeTab === 'prospects' || launch) && (!selectedListIds.length || selectedLeads.length === 0)) { setError('Select at least one lead list containing prospects.'); setActiveTab('prospects'); return; }
      if (launch && selectedLeads.some((lead) => !lead.website || lead.website.length < 4)) { setError('Please map a Website column and ensure every selected lead has a valid website before starting.'); setActiveTab('prospects'); return; }
      if ((activeTab === 'message' || launch) && !sequence.body.trim()) { setError('Add a campaign message before saving.'); setActiveTab('message'); return; }

      // Validate Sending Schedule
      const hasAnyDay = Object.values(sendingDays).some(Boolean);
      if ((activeTab === 'settings' || launch) && !hasAnyDay) {
        setError('Select at least one sending day in Safety & Pacing (e.g. Monday-Friday).');
        setActiveTab('settings');
        return;
      }
      const [sH, sM] = (sendingHours.start || '09:00').split(':').map(Number);
      const [eH, eM] = (sendingHours.end || '17:00').split(':').map(Number);
      if ((activeTab === 'settings' || launch) && sendingHours.enabled && (sH * 60 + (sM || 0) >= eH * 60 + (eM || 0))) {
        setError('Sending start time must be earlier than end time (e.g. 09:00 AM to 05:00 PM).');
        setActiveTab('settings');
        return;
      }

      // Server-Side Credit & AI Entitlement Validation on Campaign Launch
      if (launch) {
        try {
          const valRes = await fetch('/api/campaigns/validate-start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId: editId || 'new',
              prospectsCount: selectedLeads.length,
              aiPersonalizationEnabled,
            }),
          });

          const valData = await valRes.json();
          if (!valRes.ok || !valData.allowed) {
            setError(valData.message || 'Not enough credits to start this campaign.');
            setCreditShortfallData(valData);
            setShowCreditShortfallModal(true);
            setIsStarting(false);
            return;
          }
        } catch (valErr: any) {
          setError(valErr.message || 'Could not validate campaign credits.');
          setIsStarting(false);
          return;
        }
      }

      const campaigns: StoredCampaign[] = safeParseJSON<StoredCampaign[]>(localStorage.getItem('user_campaigns'), []);
      const existing = editId ? campaigns.find((item) => item && item.id === editId) : undefined;
      const now = new Date().toISOString();
      const activeAccount = accountEmail || (localStorage.getItem('active_account_email') || '').toLowerCase();

      // When user launches/starts the campaign, disable dry-run unless safety setting specifically overrides
      const effectiveIsDryRun = launch ? false : isDryRun;

      const finalMessageSequences = messageSequences.map((item) =>
        item.id === selectedSequenceId
          ? { ...item, subject: sequence.subject, body: sequence.body, replyInThread: sequence.replyInThread ?? true }
          : item
      );

      const campaign: StoredCampaign & { ownerEmail?: string } = {
        ...(existing || {} as StoredCampaign),
        id: existing?.id || `campaign-${Date.now()}`,
        name: cleanName,
        tag: tag.trim() || 'CUSTOM',
        status: launch ? 'running' : 'draft',
        createdAt: createdAt || existing?.createdAt || now,
        updatedAt: now,
        ownerEmail: (existing as any)?.ownerEmail || activeAccount,
        selectedListId: selectedListId || selectedListIds[0] || '',
        selectedListIds,
        prospectsList: selectedLeads,
        sequences: finalMessageSequences.map((item, index) => ({
          id: item.id,
          sequenceNumber: index + 1,
          stepType: index === 0 ? 'initial_email' : 'followup',
          name: index === 0 ? 'Initial Message' : `Follow-up Message ${index}`,
          subject: item.subject,
          body: item.body,
          delayDays: item.delayUnit === 'weeks' ? item.delayAmount * 7 : item.delayAmount,
          delayUnit: item.delayUnit,
          condition: item.condition,
          date: item.date,
          replyInThread: item.replyInThread ?? true,
        })),
        isDryRun: effectiveIsDryRun,
        rateLimitPerMinute,
        maxConcurrency,
        sentCount: existing?.sentCount || 0,
        failedCount: existing?.failedCount || 0,
        submissionDelaySeconds,
        dailySubmissionLimit,
        preventDuplicateSubmissions,
        retryFailedSubmissions,
        failureThreshold,
        humanReviewUncertainForms,
        stopOnSecurityChallenge,
        schedule: {
          timezoneMode,
          customTimezone,
          sendingDays,
          sendingHours,
          randomizeSubmissionTime,
        },
        noFormCount: existing?.noFormCount || 0,
        captchaCount: existing?.captchaCount || 0,
        aiPersonalizationEnabled,
        aiInstructions: aiInstructions.trim(),
        aiPreview,
      };
      const updated = existing ? campaigns.map((item) => item && item.id === existing.id ? campaign : item) : [campaign, ...campaigns];
      localStorage.setItem('user_campaigns', JSON.stringify(updated));
      setError('');
      if (advance) {
        const nextTab: EditorTab = activeTab === 'setup' ? 'prospects' : activeTab === 'prospects' ? 'message' : 'settings';
        setActiveTab(nextTab);
      } else if (launch || !advance) {
        router.push('/campaigns');
      }
    } finally {
      setIsSaving(false);
      setIsStarting(false);
    }
  };

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: 'setup', label: 'Campaign setup' }, { id: 'prospects', label: `Prospects (${selectedLeads.length})` },
    { id: 'message', label: 'Message' }, { id: 'settings', label: 'Safety & pacing' },
  ];

  return (<>
    <MatchDataModal isOpen={showMatchModal} onClose={() => setShowMatchModal(false)} fileName={uploadData.fileName} headers={uploadData.headers} sampleRows={uploadData.sampleRows} allRawRows={uploadData.allRawRows} onImportSuccess={(importedLeads, listInfo) => { const newList = { ...listInfo, ownerEmail: accountEmail, totalLeads: importedLeads.length, columns: Object.keys(importedLeads[0] || {}), createdAt: listInfo.uploadedAt || new Date().toISOString() }; const taggedLeads = importedLeads.map((lead) => ({ ...lead, listId: newList.id, listName: newList.name, ownerEmail: accountEmail })); const storedLists = safeParseJSON<any[]>(localStorage.getItem('user_lead_lists'), []); localStorage.setItem('user_lead_lists', JSON.stringify([newList, ...storedLists.filter((l: any) => l && l.id !== newList.id)])); const storedLeads = safeParseJSON<any[]>(localStorage.getItem('user_imported_leads'), []); localStorage.setItem('user_imported_leads', JSON.stringify([...taggedLeads, ...storedLeads])); setLeadLists((items) => [newList, ...items.filter((l) => l.id !== newList.id)]); setLeads((items) => [...taggedLeads, ...items]); setSelectedListId(newList.id); setSelectedListIds((prev) => Array.from(new Set([...prev, newList.id]))); setShowMatchModal(false); setError(`${importedLeads.length} leads imported successfully.`); }} />

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

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={() => downloadSampleCsv('b2b-saas')}
              className="text-xs font-semibold text-[#0e6de4] hover:underline cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Download Example CSV</span>
            </button>
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

    {manualModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">Enter Websites Manually</h2>
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Website URL(s)
              </label>
              <textarea
                rows={6}
                value={manualBulkWebsites}
                onChange={(event) => setManualBulkWebsites(event.target.value)}
                placeholder={'https://example.com\nhttps://example2.com\nhttps://example3.com'}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm font-mono text-slate-900 placeholder-slate-400 outline-none focus:border-[#0e6de4] focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-1 text-xs text-slate-500">Paste one website URL per line.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Lead List Name / File Name
              </label>
              <input
                type="text"
                value={manualListName}
                onChange={(event) => setManualListName(event.target.value)}
                placeholder="e.g. My Healthcare Leads"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-[#0e6de4] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="button"
              onClick={() => {
                const success = addManualProspect(manualBulkWebsites, manualListName);
                if (success) {
                  setManualModalOpen(false);
                }
              }}
              className="px-5 py-2.5"
            >
              Save & Attach List
            </Button>
          </div>
        </div>
      </div>
    )}
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
          <Button
            variant="outline"
            disabled={isSaving || isStarting}
            onClick={() => saveCampaign(false)}
            className="min-w-[148px] whitespace-nowrap px-6 py-3 cursor-pointer"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            disabled={isSaving || isStarting}
            onClick={() => {
              if (activeTab === 'settings') {
                setShowStartCampaignConfirmModal(true);
              } else {
                saveCampaign(false, true);
              }
            }}
            className="min-w-[164px] whitespace-nowrap px-6 py-3 cursor-pointer bg-[#0e6de4] hover:bg-blue-700 font-bold"
          >
            {isStarting || isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {activeTab === 'settings'
              ? isStarting ? 'Starting Campaign...' : 'Start Campaign'
              : isSaving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">{error}</div>}
      <div className="flex overflow-x-auto scrollbar-none flex-nowrap sm:flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              React.startTransition(() => {
                setActiveTab(tab.id);
              });
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-75 active:scale-95 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Campaign Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">Set the campaign name and category tag for organizing your outreach.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. B2B SaaS Outreach Campaign"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm font-bold text-slate-900 focus:border-[#0e6de4] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Industry / Tag</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g. SaaS, Healthcare, Agencies"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm font-bold text-slate-900 focus:border-[#0e6de4] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'message' && (
        <div className="float-left mr-6 flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 lg:w-60">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Message Sequence</span>
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
                  onClick={() => handleSelectSequence(item.id)}
                  className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0e6de4] bg-white shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-[#0e6de4]' : 'text-slate-900'}`}>
                      {isInitial ? 'Initial Message' : `Follow-up ${index}`}
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
              + Add Follow-up Message
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
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Prospects</h2>
            <p className="text-sm text-slate-500">Choose how you want to add prospects to this campaign.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => { setUploadModalError(''); setUploadModalOpen(true); }}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs transition hover:border-blue-300 cursor-pointer"
            >
              <Upload className="mx-auto mb-3 h-7 w-7 rounded-lg bg-blue-50 p-1.5 text-[#0e6de4]" />
              <p className="font-bold text-slate-900">Upload CSV/XLSX</p>
            </button>
            <button
              type="button"
              onClick={() => setManualModalOpen(true)}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs transition hover:border-blue-300 cursor-pointer"
            >
              <UserPlus className="mx-auto mb-3 h-7 w-7 rounded-lg bg-blue-50 p-1.5 text-[#0e6de4]" />
              <p className="font-bold text-slate-900">Enter Manually</p>
            </button>
            <button
              type="button"
              onClick={() => { setListsModalSelection(selectedListIds); setListsModalOpen(true); }}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs transition hover:border-blue-300 cursor-pointer"
            >
              <List className="mx-auto mb-3 h-7 w-7 rounded-lg bg-blue-50 p-1.5 text-[#0e6de4]" />
              <p className="font-bold text-slate-900">From Lists</p>
            </button>
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            aria-label="Upload CSV or XLSX"
            onChange={(event) => { const file = event.target.files?.[0]; if (file) processSelectedFile(file); }}
          />
        </div>
      )}

      {/* CAMPAIGN PROSPECTS CONTAINER — ONLY RENDERED WHEN PROSPECTS ARE ADDED */}
      {activeTab === 'prospects' && (selectedLeads.length > 0 || selectedListIds.length > 0) && (
        <section id="campaign-prospects-container" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Users className="mt-1 h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Campaign prospects</h2>
                <p className="text-sm text-slate-500">
                  {selectedListIds.length} list{selectedListIds.length === 1 ? '' : 's'} selected · {selectedLeads.length} total prospects
                </p>
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
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedListIds.map((id) => {
                const list = leadLists.find((item) => item.id === id);
                const count = leads.filter((l) => l.listId === id || l.listName === list?.name).length;
                return list ? (
                  <span key={id} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-1.5 text-xs font-semibold text-slate-900">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>{list.name}</span>
                    <span className="text-[11px] font-medium text-slate-500">({count} prospects)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setListsModalSelection(selectedListIds);
                        setListsModalOpen(true);
                      }}
                      className="ml-1.5 text-[11px] font-bold text-[#0e6de4] hover:underline cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedIds = selectedListIds.filter((item) => item !== id);
                        setSelectedListIds(updatedIds);
                        if (selectedListId === id) {
                          setSelectedListId(updatedIds[0] || '');
                        }
                        if (editId) {
                          try {
                            const storedCamps = JSON.parse(localStorage.getItem('user_campaigns') || '[]');
                            const cIdx = storedCamps.findIndex((c: any) => c.id === editId);
                            if (cIdx !== -1) {
                              const remainingLeads = leads.filter((l) => l.listId !== id && l.listName !== list.name);
                              storedCamps[cIdx] = {
                                ...storedCamps[cIdx],
                                selectedListIds: updatedIds,
                                selectedListId: updatedIds[0] || '',
                                prospectsList: remainingLeads,
                                totalLeads: remainingLeads.length,
                                updatedAt: new Date().toISOString(),
                              };
                              localStorage.setItem('user_campaigns', JSON.stringify(storedCamps));
                            }
                          } catch (e) {}
                        }
                      }}
                      className="ml-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove list from campaign"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}

          {selectedLeads.length > 0 && (
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
          )}
        </section>
      )}

      {activeTab !== 'prospects' && (
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

        {activeTab === 'message' && selectedMessageSequence && (
          <CampaignMessageEditor
            sequence={sequence}
            onSequenceChange={handleSequenceChange}
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
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Header + Reset to Defaults Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Safety & Pacing</h2>
                  <p className="text-sm text-slate-500">Control submission speed, concurrency, retries, and sending schedule.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer shrink-0 self-start sm:self-center"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span>Reset to Defaults</span>
              </button>
            </div>

            {/* Recommended Safety Helper Message */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs font-medium text-blue-900 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
              <span>Recommended safe settings are applied automatically. You can customize them anytime for this specific campaign.</span>
            </div>

            {/* Dry-run Protection */}
            <label className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 cursor-pointer">
              <div>
                <p className="font-bold text-emerald-950">Dry-run protection</p>
                <p className="text-sm text-emerald-700">Inspect and record the workflow without live submission.</p>
              </div>
              <input type="checkbox" checked={isDryRun} onChange={(event) => setIsDryRun(event.target.checked)} className="h-5 w-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
            </label>

            {/* Core Pacing Grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Rate limit per minute
                <input type="number" min={1} max={120} value={rateLimitPerMinute} onChange={(event) => setRateLimitPerMinute(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Maximum concurrency
                <input type="number" min={1} max={20} value={maxConcurrency} onChange={(event) => setMaxConcurrency(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Delay between submissions (seconds)
                <input type="number" min={0} max={3600} value={submissionDelaySeconds} onChange={(event) => setSubmissionDelaySeconds(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none" />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Daily submission limit
                <input type="number" min={1} value={dailySubmissionLimit} onChange={(event) => setDailySubmissionLimit(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none" />
              </label>
            </div>

            {/* CONTACT & REPLY SETTINGS SECTION */}
            <ContactReplySettings />

            {/* SENDING SCHEDULE SECTION */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-5">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">SENDING SCHEDULE</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Control when ContactReachout is allowed to submit website contact-form messages.</p>
                </div>
              </div>

              {/* Timezone Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Timezone</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={timezoneMode}
                    onChange={(e) => setTimezoneMode(e.target.value as any)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="account">My timezone</option>
                    <option value="prospect">Prospect's timezone</option>
                    <option value="custom">Custom timezone</option>
                  </select>

                  {timezoneMode === 'custom' && (
                    <select
                      value={customTimezone}
                      onChange={(e) => setCustomTimezone(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none cursor-pointer"
                    >
                      <option value="America/New_York">America/New_York (US Eastern Time)</option>
                      <option value="America/Chicago">America/Chicago (US Central Time)</option>
                      <option value="America/Denver">America/Denver (US Mountain Time)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (US Pacific Time)</option>
                      <option value="Europe/London">Europe/London (UK / GMT/BST)</option>
                      <option value="Europe/Paris">Europe/Paris (Central European Time)</option>
                      <option value="Europe/Berlin">Europe/Berlin (Central European Time)</option>
                      <option value="Asia/Dhaka">Asia/Dhaka (Bangladesh Standard Time)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (Japan Standard Time)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (India Standard Time)</option>
                      <option value="Australia/Sydney">Australia/Sydney (Australian Eastern Time)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Sending Days */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Sending Days</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'monday', label: 'Mon' },
                    { key: 'tuesday', label: 'Tue' },
                    { key: 'wednesday', label: 'Wed' },
                    { key: 'thursday', label: 'Thu' },
                    { key: 'friday', label: 'Fri' },
                    { key: 'saturday', label: 'Sat' },
                    { key: 'sunday', label: 'Sun' },
                  ].map((day) => {
                    const isChecked = Boolean(sendingDays[day.key as keyof typeof sendingDays]);
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() =>
                          setSendingDays((prev) => ({
                            ...prev,
                            [day.key]: !isChecked,
                          }))
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#0e6de4] text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-slate-400'
                        }`}
                      >
                        {isChecked ? `✓ ${day.label}` : day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sending Hours */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Sending Hours</label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendingHours.enabled}
                      onChange={(e) => setSendingHours((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">Limit submissions to specific hours</span>
                  </label>
                </div>

                {!sendingHours.enabled ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide">Anytime (OFF)</span>
                      <span>Submissions will run <strong>immediately</strong> without hour restrictions.</span>
                    </div>
                    <span className="text-slate-400 text-[11px] hidden sm:inline">Check box to set custom hours</span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600">From</span>
                      <input
                        type="time"
                        value={sendingHours.start}
                        onChange={(e) => setSendingHours((prev) => ({ ...prev, start: e.target.value }))}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 outline-none shadow-2xs"
                      />
                      <span className="text-xs font-semibold text-slate-600">To</span>
                      <input
                        type="time"
                        value={sendingHours.end}
                        onChange={(e) => setSendingHours((prev) => ({ ...prev, end: e.target.value }))}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 outline-none shadow-2xs"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Submissions outside this window will wait for the next allowed sending hour.</p>
                  </div>
                )}
              </div>

              {/* Randomize Submission Time */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={randomizeSubmissionTime}
                  onChange={(e) => setRandomizeSubmissionTime(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-900">Randomize submission time</span>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Add natural variation within the selected sending window.</p>
                </div>
              </label>
            </div>

            {/* Advanced Safety Settings */}
            <div className="rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">ADVANCED SAFETY SETTINGS</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span>
                    <span className="block font-semibold text-slate-800 text-xs">Prevent duplicate submissions</span>
                    <span className="text-xs text-slate-500">Skip contacts already submitted in this campaign.</span>
                  </span>
                  <input type="checkbox" checked={preventDuplicateSubmissions} onChange={(event) => setPreventDuplicateSubmissions(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Retry failed submissions
                    <select value={retryFailedSubmissions} onChange={(event) => setRetryFailedSubmissions(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500">
                      <option value={0}>No retry</option>
                      <option value={1}>1 retry</option>
                      <option value={2}>2 retries</option>
                      <option value={3}>3 retries</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Pause after consecutive failures
                    <input type="number" min={1} max={50} value={failureThreshold} onChange={(event) => setFailureThreshold(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500" />
                  </label>
                </div>

                <label className="flex items-center justify-between gap-4 cursor-pointer pt-2">
                  <span>
                    <span className="block font-semibold text-slate-800 text-xs">Send uncertain forms to review</span>
                    <span className="text-xs text-slate-500">Route uncertain mappings to manual review.</span>
                  </span>
                  <input type="checkbox" checked={humanReviewUncertainForms} onChange={(event) => setHumanReviewUncertainForms(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                </label>

                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <span>
                    <span className="block font-semibold text-slate-800 text-xs">Stop on security challenge</span>
                    <span className="text-xs text-slate-500">Stop on CAPTCHA, Cloudflare, or similar challenges.</span>
                  </span>
                  <input type="checkbox" checked={stopOnSecurityChallenge} onChange={(event) => setStopOnSecurityChallenge(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                </label>
              </div>
            </div>

            {/* REAL CAMPAIGN SCHEDULE SUMMARY CARD */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-5 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">CAMPAIGN SCHEDULE SUMMARY</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Schedule</span>
                  <span className="font-bold text-slate-900">
                    {Object.entries(sendingDays).filter(([, v]) => v).map(([k]) => k.slice(0, 3).toUpperCase()).join(', ') || 'None selected'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Hours</span>
                  <span className="font-bold text-slate-900">
                    {sendingHours.enabled ? `${sendingHours.start} – ${sendingHours.end}` : 'Anytime (OFF)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Timezone</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {timezoneMode === 'account' ? 'My timezone' : timezoneMode === 'prospect' ? "Prospect's timezone" : customTimezone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Daily Limit</span>
                  <span className="font-bold text-slate-900">{dailySubmissionLimit} submissions</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">Randomization</span>
                  <span className="font-bold text-emerald-700">{randomizeSubmissionTime ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            </div>

            {/* REAL CAMPAIGN CREDIT REQUIREMENTS CARD */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-[#0e6de4]" />
                  <span>CREDIT REQUIREMENTS</span>
                </h4>
                <span className="text-xs font-mono font-bold text-slate-700">
                  Available: <strong className="text-blue-600">{availableCredits}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-400 block">Available Credits</span>
                  <span className="font-extrabold text-slate-900 text-sm">{availableCredits}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-400 block">Campaign Prospects</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedLeads.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-400 block">Max Required</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedLeads.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-400 block">Capacity Status</span>
                  {selectedLeads.length <= availableCredits ? (
                    <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-1">
                      ✓ Sufficient
                    </span>
                  ) : (
                    <span className="font-extrabold text-rose-600 text-xs flex items-center gap-1">
                      ✕ Shortage
                    </span>
                  )}
                </div>
              </div>

              {selectedLeads.length <= availableCredits ? (
                <p className="text-xs text-emerald-800 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 font-medium">
                  ✓ {selectedLeads.length} prospects can be processed with your current {availableCredits} available credits.
                </p>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                  <p className="font-bold">
                    Not enough credits. Your current plan has {availableCredits} available credits, but this campaign contains {selectedLeads.length} prospects.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <a
                      href="/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold inline-block shadow-xs"
                    >
                      Upgrade Plan
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveTab('prospects')}
                      className="rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 px-4 py-2 text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Reduce Prospects
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    )}
    </div>

    {/* RESET TO DEFAULTS CONFIRMATION MODAL */}
    {showResetConfirmModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Reset to Defaults?</h3>
              <p className="text-xs text-slate-500 font-medium">This will restore the recommended ContactReachout campaign settings.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowResetConfirmModal(false)}
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDryRun(CANONICAL_DEFAULT_SAFETY_CONFIG.isDryRun);
                setRateLimitPerMinute(CANONICAL_DEFAULT_SAFETY_CONFIG.rateLimitPerMinute);
                setMaxConcurrency(CANONICAL_DEFAULT_SAFETY_CONFIG.maxConcurrency);
                setSubmissionDelaySeconds(CANONICAL_DEFAULT_SAFETY_CONFIG.submissionDelaySeconds);
                setDailySubmissionLimit(CANONICAL_DEFAULT_SAFETY_CONFIG.dailySubmissionLimit);
                setPreventDuplicateSubmissions(CANONICAL_DEFAULT_SAFETY_CONFIG.preventDuplicateSubmissions);
                setRetryFailedSubmissions(CANONICAL_DEFAULT_SAFETY_CONFIG.retryFailedSubmissions);
                setFailureThreshold(CANONICAL_DEFAULT_SAFETY_CONFIG.pauseAfterConsecutiveFailures);
                setHumanReviewUncertainForms(CANONICAL_DEFAULT_SAFETY_CONFIG.humanReviewUncertainForms);
                setStopOnSecurityChallenge(CANONICAL_DEFAULT_SAFETY_CONFIG.stopOnSecurityChallenge);
                setTimezoneMode(CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.timezoneMode);
                setCustomTimezone(CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.customTimezone);
                setSendingDays({ ...CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingDays });
                setSendingHours({
                  enabled: CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours.enabled ?? false,
                  start: CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours.start || '09:00',
                  end: CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.sendingHours.end || '17:00',
                });
                setRandomizeSubmissionTime(CANONICAL_DEFAULT_SAFETY_CONFIG.schedule.randomizeSubmissionTime);
                setShowResetConfirmModal(false);
              }}
              className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 text-xs font-extrabold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    )}

    {/* START CAMPAIGN CONFIRMATION MODAL */}
    {showStartCampaignConfirmModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Start this campaign?</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Your campaign will begin processing eligible prospects according to your saved schedule and safety settings.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isStarting}
              onClick={() => setShowStartCampaignConfirmModal(false)}
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isStarting}
              onClick={async () => {
                setShowStartCampaignConfirmModal(false);
                await saveCampaign(true);
              }}
              className="rounded-xl bg-[#0e6de4] hover:bg-blue-700 text-white px-6 py-2.5 text-xs font-extrabold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Starting Campaign...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  <span>Start Campaign</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* CREDIT SHORTFALL & CAPACITY WARNING MODAL */}
    {showCreditShortfallModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 animate-in fade-in duration-150 font-sans">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 border border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {creditShortfallData?.reason === 'AI_NOT_AVAILABLE_ON_FREE' ? 'AI Personalization Upgrade Required' : 'Not Enough Credits'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {creditShortfallData?.message || 'Your account credit balance is insufficient to start processing this campaign.'}
              </p>
            </div>
          </div>

          {creditShortfallData && creditShortfallData.requiredCredits && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Available Credits:</span>
                <strong className="text-slate-900">{creditShortfallData.availableCredits ?? availableCredits}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Campaign Prospects:</span>
                <strong className="text-slate-900">{creditShortfallData.requiredCredits ?? selectedLeads.length}</strong>
              </div>
              {creditShortfallData.shortfall > 0 && (
                <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1.5">
                  <span>Credit Shortfall:</span>
                  <span>-{creditShortfallData.shortfall} credits</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowCreditShortfallModal(false);
                setActiveTab('prospects');
              }}
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
            >
              Reduce Prospects
            </button>
            <Link
              href="/pricing"
              target="_blank"
              onClick={() => setShowCreditShortfallModal(false)}
              className="rounded-xl bg-[#0e6de4] hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-extrabold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Upgrade Plan →
            </Link>
          </div>
        </div>
      </div>
    )}
  </>);
}
