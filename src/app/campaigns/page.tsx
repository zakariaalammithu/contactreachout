'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Settings,
  ChevronDown,
  Edit2,
  MoreVertical,
  Calendar,
  Send,
  Users,
  CheckCircle2,
  Mail,
  Link as LinkIcon,
  RotateCcw,
  ThumbsUp,
  DollarSign,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Filter,
  Flame,
  Download,
  BarChart2,
  Clock,
  AlertTriangle,
  X,
  Copy,
  Archive,
  FileText,
  Eye,
  Info,
  ExternalLink,
  Printer,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { generateNextUniqueCampaignName } from '@/lib/utils';
import { generateCampaignPDFReport } from '@/lib/services/pdf-report-service';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';
import { createUniqueCampaignId, formatStoragePressureMessage, persistCampaignDraft, readCampaignDrafts, removeCampaignDrafts, writeCampaignDrafts } from '@/lib/services/campaign-draft-storage';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';


interface CampaignItem {
  id: string;
  name: string;
  date: string;
  sendersCount: number;
  tag?: string;
  status: 'active' | 'paused' | 'draft' | 'archived';
  prospects: number;
  reached: number;
  dryRunCompleted?: number;
  failed?: number;
  noContactPage?: number;
  captchaBlocked?: number;
  reachedPercent?: number;
  opened?: number;
  clicked?: number;
  replied: number;
  repliedPercent?: number;
  interested?: number;
  opportunities?: number;
  last24h?: number;
}

const initialCampaignsList: CampaignItem[] = [];


export default function CampaignsPage() {
  const router = useRouter();

  // Instant Route Prefetching & Warmup
  useEffect(() => {
    try {
      router.prefetch('/campaigns/new');
      router.prefetch('/unibox');
      router.prefetch('/leads');
      router.prefetch('/processing');
      router.prefetch('/results');
      router.prefetch('/settings');
    } catch (e) {}
  }, [router]);

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [folderFilter, setFolderFilter] = useState('All Folders');
  const [tagFilter, setTagFilter] = useState('All Tags');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedReportCamp, setSelectedReportCamp] = useState<CampaignItem | null>(null);
  const [selectedProspectDetail, setSelectedProspectDetail] = useState<any | null>(null);
  const [openMenuCampId, setOpenMenuCampId] = useState<string | null>(null);
  const [isStatusGuideOpen, setIsStatusGuideOpen] = useState(false);

  // Create Campaign Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('New Campaign');
  const [nameError, setNameError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [navigatingRoute, setNavigatingRoute] = useState<string | null>(null);
  const [createNavigationError, setCreateNavigationError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createInFlightRef = useRef(false);
  const createNavigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const releaseCreateNavigation = (message = '') => {
    if (createNavigationTimerRef.current) {
      clearTimeout(createNavigationTimerRef.current);
      createNavigationTimerRef.current = null;
    }
    createInFlightRef.current = false;
    setIsCreating(false);
    setNavigatingRoute(null);
    setCreateNavigationError(message);
  };

  useEffect(() => () => {
    if (createNavigationTimerRef.current) clearTimeout(createNavigationTimerRef.current);
  }, []);

  // Focus and select input text when modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      const activeAccount = (localStorage.getItem('active_account_email') || '').toLowerCase();
      const deletedIds: string[] = safeParseJSON(localStorage.getItem('user_deleted_campaign_ids'), []);
      const parsed = readCampaignDrafts(localStorage);
      const userCamps = parsed.filter((c: any) => {
        if (!c || typeof c !== 'object') return false;
        if (c.id && deletedIds.includes(c.id)) return false;
        const owner = typeof c.ownerEmail === 'string' ? c.ownerEmail.toLowerCase().trim() : '';
        return !owner || owner === activeAccount;
      });
      setNewCampaignName(generateNextUniqueCampaignName(userCamps.length > 0 ? userCamps : campaigns));
      setNameError('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isCreateModalOpen, campaigns]);

  // Create Campaign submit handler (Direct creation with automatic unique default name)
  const handleCreateCampaignSubmit = (customName?: string) => {
    // State updates are asynchronous, so use a ref for the first click. This
    // prevents two immediate clicks from creating two browser-local drafts.
    if (createInFlightRef.current || isCreating || navigatingRoute === 'new') return;
    createInFlightRef.current = true;
    setIsCreating(true);
    setNavigatingRoute('new');
    setCreateNavigationError('');

    let targetUrl = '';
    try {
      const activeAccount = (localStorage.getItem('active_account_email') || '').toLowerCase();
      const parsed = readCampaignDrafts(localStorage);

      const trimmedInput = typeof customName === 'string' ? customName.trim() : newCampaignName.trim();
      const trimmedName = (trimmedInput && trimmedInput !== 'New Campaign')
        ? trimmedInput
        : generateNextUniqueCampaignName(campaigns.length > 0 ? campaigns : parsed);
      const newId = createUniqueCampaignId(parsed);

      const rawCampaign = {
        id: newId,
        name: trimmedName,
        tag: 'CUSTOM',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalLeads: 0,
        sentCount: 0,
        failedCount: 0,
        noFormCount: 0,
        captchaCount: 0,
        logs: [],
        prospectsList: [],
        sequences: [{
          id: `step-${Date.now()}`,
          sequenceNumber: 1,
          stepType: 'initial_email',
          subject: 'Partnership Inquiry',
          body: `Hello {{first_name}},\n\nReaching out to {{company_name}} regarding a potential partnership.\n\nBest regards`,
          delayDays: 0,
          condition: 'always',
        }],
        ownerEmail: activeAccount,
      };

      // Verify the exact ID can be read back before opening the editor.
      persistCampaignDraft(localStorage, rawCampaign);
      try {
        window.dispatchEvent(new Event('campaigns_updated'));
      } catch (e) {}

      setIsCreateModalOpen(false);
      targetUrl = `/campaigns/new?id=${encodeURIComponent(newId)}`;

    } catch (err: any) {
      console.error('Error saving new campaign draft:', err);
      const isQuotaError = err?.name === 'QuotaExceededError' || err?.code === 22;
      const detail = isQuotaError
        ? formatStoragePressureMessage(localStorage)
        : (err?.message || 'Could not save the campaign draft in this browser.');
      releaseCreateNavigation(detail);
      return;
    }

    try {
      try {
        router.prefetch(targetUrl);
      } catch (e) {}

      // App Router navigation has no completion promise. Keep the UI locked
      // only while the transition starts, then use one direct-navigation
      // fallback. If that cannot start, release the button with a retryable
      // error instead of leaving "Opening Editor…" indefinitely.
      router.push(targetUrl);
      createNavigationTimerRef.current = setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/campaigns/new') {
          try {
            window.location.assign(targetUrl);
          } catch {
            releaseCreateNavigation('Could not open the campaign editor. Please try again.');
          }
        }
      }, 1500);
    } catch (err) {
      console.error('Error opening campaign editor:', err);
      try {
        window.location.assign(targetUrl);
      } catch {
        releaseCreateNavigation('The draft was saved, but the editor could not be opened. Please try again.');
      }
    }
  };

  // Close three-dot menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuCampId(null);
    if (openMenuCampId) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenuCampId]);

  const [currentUser, setCurrentUser] = useState<{ email: string; role: string } | null>(null);

  // Safe JSON parsing helper to prevent SyntaxError from corrupted localStorage
  const safeParseJSON = <T,>(jsonString: string | null, fallback: T): T => {
    if (!jsonString || typeof jsonString !== 'string') return fallback;
    try {
      const parsed = JSON.parse(jsonString);
      return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  };

  // Safe Time Formatting helper (prevents RangeError: Invalid time value)
  const safeFormatTime = (val: any, fallback = 'N/A'): string => {
    if (!val) return fallback;
    if (typeof val === 'string' && (val.includes(':') || val.includes('AM') || val.includes('PM'))) return val;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch (e) {}
    return fallback;
  };

  // Safe Date Formatting helper
  const safeFormatDate = (val: any, fallback = 'Recently'): string => {
    if (!val) return fallback;
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
    return fallback;
  };

  // Safe string coercion helper
  const safeString = (val: any, fallback = 'N/A'): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      return String(val.message || val.error || val.code || val.diagnostic || JSON.stringify(val));
    }
    return fallback;
  };

  // Helper function to calculate real sender count from campaign object
  const computeCampaignSendersCount = (c: any, userEmail?: string): number => {
    if (!c || typeof c !== 'object') return 0;
    if (Array.isArray(c.senders)) return c.senders.length;
    if (Array.isArray(c.senderIds)) return c.senderIds.length;
    if (Array.isArray(c.senderEmails)) return c.senderEmails.length;
    if (Array.isArray(c.sendersList)) return c.sendersList.length;
    if (typeof c.sendersCount === 'number' && !isNaN(c.sendersCount)) return c.sendersCount;
    if ((typeof c.senderEmail === 'string' && c.senderEmail.trim()) || (typeof c.replyEmail === 'string' && c.replyEmail.trim())) return 1;
    const activeAcc = (userEmail || (typeof window !== 'undefined' ? localStorage.getItem('active_account_email') || '' : '')).trim();
    if (activeAcc || c.ownerEmail) return 1;
    return 0;
  };

  // Helper function to format sender count text according to prompt rules
  const formatSenderCount = (count: number | undefined | null): string => {
    if (count === null || count === undefined || isNaN(count)) {
      return 'Sender info unavailable';
    }
    if (count <= 0) return 'No Senders';
    if (count === 1) return '1 Sender';
    return `${count} Senders`;
  };

  const normalizeCanonicalDomain = (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    let clean = input.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//i, '');
    clean = clean.replace(/\/.*$/, '');
    clean = clean.replace(/^www[0-9]*\./i, '');
    clean = clean.replace(/^m\./i, '');
    return clean.trim();
  };

  const getCanonicalCampaignCounts = (c: any) => {
    const prospectsList: any[] = Array.isArray(c.prospectsList) ? c.prospectsList : [];
    const logs: any[] = Array.isArray(c.logs) ? c.logs : [];

    const totalProspects = prospectsList.length > 0
      ? prospectsList.length
      : typeof c.totalLeads === 'number'
      ? c.totalLeads
      : typeof c.prospects === 'number'
      ? c.prospects
      : Number(c.totalLeads) || Number(c.prospects) || 0;

    if (logs.length === 0) {
      return {
        total: totalProspects,
        sent: typeof c.sentCount === 'number' ? c.sentCount : Number(c.sentCount) || 0,
        dryRunCompleted: typeof c.dryRunCompletedCount === 'number' ? c.dryRunCompletedCount : Number(c.dryRunCompletedCount) || 0,
        failed: typeof c.failedCount === 'number' ? c.failedCount : Number(c.failedCount) || 0,
        noForm: typeof c.noFormCount === 'number' ? c.noFormCount : Number(c.noFormCount) || 0,
        captcha: typeof c.captchaCount === 'number' ? c.captchaCount : Number(c.captchaCount) || 0,
        replied: typeof c.repliedCount === 'number' ? c.repliedCount : Number(c.repliedCount) || 0,
        pending: Math.max(0, totalProspects - (c.sentCount || 0) - (c.failedCount || 0) - (c.noFormCount || 0) - (c.captchaCount || 0)),
        reachedPercent: totalProspects > 0 ? Math.round(((c.sentCount || 0) / totalProspects) * 100) : 0,
      };
    }

    const outcomeMap = new Map<string, string>();
    const reversedLogs = [...logs].reverse();
    for (const l of reversedLogs) {
      if (!l || typeof l !== 'object') continue;
      const st = String(l.status || l.finalStatus || '').toUpperCase();
      if (st === 'SCHEDULED') continue;

      const leadKey = l.leadId
        ? String(l.leadId).trim()
        : normalizeCanonicalDomain(l.domain || l.url || l.website || '');

      if (!leadKey) continue;
      outcomeMap.set(leadKey, st);
    }

    let sent = 0;
    let dryRunCompleted = 0;
    let failed = 0;
    let noForm = 0;
    let captcha = 0;

    for (const status of outcomeMap.values()) {
      if (status === 'DELIVERED') sent++;
      else if (status === 'DRY_RUN_COMPLETED') dryRunCompleted++;
      else if (status === 'NO-FORM' || status === 'NO_FORM' || status === 'NO_CONTACT_PAGE') noForm++;
      else if (status === 'REVIEW' || status === 'REVIEW_REQUIRED' || status === 'CAPTCHA_REVIEW' || status === 'CAPTCHA_DETECTED') captcha++;
      else if (status === 'FAILED' || status === 'SUBMIT_FAILED' || status === 'UNREACHABLE' || status === 'EXECUTION_ERROR') failed++;
    }

    const canonicalSent = Math.min(totalProspects > 0 ? totalProspects : sent, sent);
    const pending = Math.max(0, totalProspects - canonicalSent - dryRunCompleted - failed - noForm - captcha);
    const reachedPercent = totalProspects > 0 ? Math.round((canonicalSent / totalProspects) * 100) : 0;
    const replied = typeof c.repliedCount === 'number' ? c.repliedCount : Number(c.repliedCount) || 0;

    return {
      total: totalProspects,
      sent: canonicalSent,
      dryRunCompleted,
      failed,
      noForm,
      captcha,
      replied,
      pending,
      reachedPercent,
    };
  };

  const updateCampaignCanonicalMetrics = (camp: any) => {
    if (!camp || typeof camp !== 'object') return;
    const counts = getCanonicalCampaignCounts(camp);
    camp.sentCount = counts.sent;
    camp.dryRunCompletedCount = counts.dryRunCompleted;
    camp.failedCount = counts.failed;
    camp.noFormCount = counts.noForm;
    camp.captchaCount = counts.captcha;
    camp.repliedCount = counts.replied;
    camp.reached = counts.sent;
    camp.failed = counts.failed;
    camp.noContactPage = counts.noForm;
    camp.captchaBlocked = counts.captcha;
    camp.reachedPercent = counts.reachedPercent;
  };

  // Helper to sync state directly from storage and keep open modal live with fresh telemetry
  const syncCampaignsFromStorage = React.useCallback(() => {
    if (typeof window === 'undefined') return;

    let userEmail = (localStorage.getItem('active_account_email') || '').toLowerCase();
    let userRole = currentUser?.role || 'USER';
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userEmail === 'mithusquare@gmail.com';

    try {
      const deletedIds: string[] = safeParseJSON(localStorage.getItem('user_deleted_campaign_ids'), []);
      let mappedUserCamps: CampaignItem[] = [];

      const parsed = readCampaignDrafts(localStorage);
      if (parsed.length) {
        if (Array.isArray(parsed)) {
          mappedUserCamps = parsed
            .filter((c: any) => {
              if (!c || typeof c !== 'object') return false;
              if (c.id && deletedIds.includes(c.id)) return false;
              if (!isAdmin && userEmail) {
                const owner = typeof c.ownerEmail === 'string' ? c.ownerEmail.toLowerCase().trim() : '';
                if (owner && owner !== userEmail.toLowerCase().trim()) return false;
              }
              return true;
            })
            .map((c: any) => {
              const counts = getCanonicalCampaignCounts(c);
              const dateStr = safeFormatDate(c.createdAt, 'Recently');

              return {
                id: String(c.id || `camp-${Date.now()}`),
                name: String(c.name || 'Untitled Campaign'),
                date: dateStr,
                sendersCount: computeCampaignSendersCount(c, userEmail),
                tag: String(c.tag || 'CUSTOM'),
                status: c.status === 'running' || c.status === 'active' ? 'active' : c.status === 'paused' ? 'paused' : c.status === 'archived' ? 'archived' : 'draft',
                prospects: counts.total,
                reached: counts.sent,
                dryRunCompleted: counts.dryRunCompleted,
                failed: counts.failed,
                noContactPage: counts.noForm,
                captchaBlocked: counts.captcha,
                reachedPercent: counts.reachedPercent,
                replied: counts.replied,
              };
            });
        }
      }

      let combined: CampaignItem[] = [];
      if (isAdmin) {
        const filteredInitial = initialCampaignsList.filter((c) => c && c.id && !deletedIds.includes(c.id));
        const customIds = new Set(mappedUserCamps.map((c) => c.id));
        combined = [
          ...mappedUserCamps,
          ...filteredInitial.filter((c) => !customIds.has(c.id)),
        ];
      } else {
        combined = mappedUserCamps;
      }

      setCampaigns(combined);

      // Keep open Campaign Details modal live with fresh telemetry metrics!
      setSelectedReportCamp((prev) => {
        if (!prev) return null;
        const fresh = combined.find((c) => c.id === prev.id);
        return fresh || prev;
      });
    } catch (err) {
      console.error('Error syncing campaigns from storage:', err);
    }
  }, [currentUser]);

  // Load custom campaigns from session & localStorage with strict user isolation
  useEffect(() => {
    async function loadSessionAndCampaigns() {
      if (typeof window === 'undefined') return;

      let userEmail = (localStorage.getItem('active_account_email') || '').toLowerCase();
      let userRole = 'USER';

      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            userEmail = (data.user.email || '').toLowerCase();
            userRole = data.user.role || 'USER';
            setCurrentUser({ email: userEmail, role: userRole });
          }
        }
      } catch (e) {
        console.error('Session fetch error in campaigns:', e);
      }
    }

    loadSessionAndCampaigns();
  }, []);

  // Sync state whenever storage or custom campaign update events fire
  useEffect(() => {
    syncCampaignsFromStorage();

    const handleStorageChange = () => {
      syncCampaignsFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('campaigns_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('campaigns_updated', handleStorageChange);
    };
  }, [syncCampaignsFromStorage]);

  // Real Active Campaign Pacing Execution (Server Validated with Live UI Sync)
  const inFlightLeadKeysRef = React.useRef(new Set<string>());

  useEffect(() => {
    let isBusy = false;
    const inFlightLeadKeys = inFlightLeadKeysRef.current;

    const processActiveCampaigns = async () => {
      if (isBusy || typeof window === 'undefined') return;
      isBusy = true;

      try {
        const userCamps = readCampaignDrafts(localStorage);
        if (!Array.isArray(userCamps) || userCamps.length === 0) {
          isBusy = false;
          return;
        }

        let hasMoreWork = false;

        for (const rawCamp of userCamps) {
          if (!rawCamp || typeof rawCamp !== 'object') continue;
          if (rawCamp.status !== 'running' && rawCamp.status !== 'active') continue;

          const leads: any[] = Array.isArray(rawCamp.prospectsList) ? rawCamp.prospectsList : [];
          const logs: any[] = Array.isArray(rawCamp.logs) ? rawCamp.logs : [];
          const resolveLeadWebsite = (lead: any): string => {
            if (!lead || typeof lead !== 'object') return '';
            const candidates = [
              lead.website,
              lead.websiteUrl,
              lead.website_url,
              lead.domain,
              lead.url,
              lead.Website,
              lead.Website_URL,
              lead.custom_fields?.website,
              lead.customFields?.website,
              lead.custom_fields?.domain,
              lead.customFields?.domain,
            ];
            const direct = candidates.find((value) => typeof value === 'string' && value.trim() && value.trim() !== '-');
            if (direct) {
              const trimmed = String(direct).trim();
              return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
            }
            return '';
          };
          const terminalStatuses = new Set([
            'DELIVERED',
            'DRY_RUN_COMPLETED',
            'FAILED',
            'SUBMIT_FAILED',
            'NO-FORM',
            'NO_FORM',
            'NO_CONTACT_PAGE',
            'REVIEW',
            'REVIEW_REQUIRED',
            'CAPTCHA_REVIEW',
            'CAPTCHA_DETECTED',
            'CAPTCHA_BLOCKED',
            'EXECUTION_ERROR',
            'UNREACHABLE',
            'BLOCKED',
            'BLOCKED_NO_CREDITS',
            'BLOCKED_SUPPRESSED',
          ]);

          const processedLeadIds = new Set<string>();
          const processedLeadWebsites = new Set<string>();
          const deferredLeadIds = new Set<string>();

          logs.forEach((l: any) => {
            if (!l || typeof l !== 'object') return;
            const st = String(l.status || l.finalStatus || '').toUpperCase();
            const code = String(l.code || l.diagnostic || '').toUpperCase();

            if (st === 'SCHEDULED' || code.includes('SCHEDULED')) {
              const retryAt = new Date(l.retryAt || 0).getTime();
              if (retryAt > Date.now() && l.leadId) deferredLeadIds.add(String(l.leadId).trim());
              return;
            }

            if (terminalStatuses.has(st) || code.includes('BLOCKED')) {
              if (l.leadId) processedLeadIds.add(String(l.leadId).trim());
              if (l.id) processedLeadIds.add(String(l.id).trim());
              const web = (l.domain || l.url || l.website || '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase().trim();
              if (web && web !== 'n/a') processedLeadWebsites.add(web);
            }
          });

          const isLeadProcessed = (l: any): boolean => {
            if (!l || typeof l !== 'object') return true;
            if (l.id && processedLeadIds.has(String(l.id).trim())) return true;
            const web = normalizeCanonicalDomain(resolveLeadWebsite(l));
            if (web && processedLeadWebsites.has(web)) return true;
            return false;
          };

          const isLeadDeferred = (l: any): boolean => Boolean(l?.id && deferredLeadIds.has(String(l.id).trim()));

          const isLeadInFlight = (l: any): boolean => {
            const key = rawCamp.id + ':' + (l.id ? String(l.id).trim() : normalizeCanonicalDomain(resolveLeadWebsite(l)));
            return inFlightLeadKeys.has(key);
          };

          // Find next batch of uncontacted leads up to maxConcurrency limit
          const maxConc = Math.min(Math.max(1, Number(rawCamp.maxConcurrency) || 5), 5);
          const uncontactedLeads = leads.filter((l: any) => !isLeadProcessed(l) && !isLeadDeferred(l) && !isLeadInFlight(l)).slice(0, maxConc);

          if (uncontactedLeads.length > 0) {
            hasMoreWork = true;
            const template = {
              id: 'tpl-default',
              subjectTemplate: rawCamp.sequences?.[0]?.subject || 'Partnership Inquiry',
              bodyTemplate: rawCamp.sequences?.[0]?.body || 'Hello {{first_name}}, reaching out to {{company_name}}.',
            };

            // Process each lead and immediately update UI state as each lead completes
            const batchPromises = uncontactedLeads.map(async (nextLead: any) => {
              const leadKey = rawCamp.id + ':' + (nextLead.id ? String(nextLead.id).trim() : normalizeCanonicalDomain(resolveLeadWebsite(nextLead)));
              if (leadKey) inFlightLeadKeys.add(leadKey);

              try {
                const res = await fetch('/api/campaigns/process', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    campaignId: rawCamp.id,
                    lead: {
                      id: nextLead.id,
                      company_name: nextLead.companyName || nextLead.company_name || '',
                      website: resolveLeadWebsite(nextLead),
                      first_name: nextLead.firstName || nextLead.first_name || '',
                      email: nextLead.email || '',
                      phone: nextLead.phone || '',
                      whatsApp: nextLead.whatsApp || nextLead.whatsapp || '',
                      custom_fields: nextLead.custom_fields || nextLead.customFields || {},
                      country: nextLead.country || '',
                      city: nextLead.city || '',
                    },
                    template,
                    options: {
                      dryRun: Boolean(rawCamp.isDryRun),
                      schedule: rawCamp.schedule,
                    },
                  }),
                });

                // Immediately stream individual lead result into client state & UI
                const currentCamps = readCampaignDrafts(localStorage);
                if (currentCamps.length) {
                  const campToUpdate = currentCamps.find((c: any) => c && c.id === rawCamp.id);
                  if (campToUpdate) {
                    if (res.status === 402) {
                      campToUpdate.status = 'paused';
                      campToUpdate.logs = [
                        {
                          leadId: nextLead.id,
                          domain: resolveLeadWebsite(nextLead) || 'N/A',
                          status: 'FAILED',
                          code: 'BLOCKED_NO_CREDITS - Available credit balance is 0. Campaign paused.',
                          time: safeFormatTime(new Date()),
                          timestamp: new Date().toISOString(),
                        },
                        ...(campToUpdate.logs || []),
                      ];
                    } else if (res.ok) {
                      const data = await res.json().catch(() => ({}));
                      if (data.wallet && typeof window !== 'undefined') {
                        CreditWalletService.syncWalletToClient(data.wallet, {
                          campaignId: rawCamp.id,
                          leadId: nextLead.id,
                          companyName: nextLead.companyName || nextLead.company_name || '',
                          resultType: 'FORM_SUBMITTED',
                          cost: data.creditDeduction?.cost || 0,
                          source: data.creditDeduction?.source || 'NONE',
                        });
                      }

                      if (data.telemetry) {
                        const st = String(data.telemetry.status || '').toUpperCase();
                        if (st === 'SCHEDULED') {
                          campToUpdate.logs = [
                            data.telemetry,
                            ...(campToUpdate.logs || []).filter((log: any) => {
                              const sameLead = String(log?.leadId || '') === String(nextLead.id || '');
                              const scheduled = String(log?.status || '').toUpperCase() === 'SCHEDULED' || String(log?.code || '').toUpperCase().includes('SCHEDULED');
                              return !sameLead || !scheduled;
                            }),
                          ];
                        } else {
                          campToUpdate.logs = [data.telemetry, ...(campToUpdate.logs || [])];
                        }
                        updateCampaignCanonicalMetrics(campToUpdate);
                      }
                    } else {
                      const errorBody = await res.json().catch(() => ({}));
                      campToUpdate.logs = [{
                        leadId: nextLead.id,
                        domain: resolveLeadWebsite(nextLead) || 'N/A',
                        status: 'FAILED',
                        code: errorBody.error || `PROCESS_API_ERROR_${res.status}`,
                        time: safeFormatTime(new Date()),
                        timestamp: new Date().toISOString(),
                      }, ...(campToUpdate.logs || [])];
                      updateCampaignCanonicalMetrics(campToUpdate);
                    }

                    writeCampaignDrafts(localStorage, currentCamps);
                    window.dispatchEvent(new CustomEvent('campaigns_updated'));
                    syncCampaignsFromStorage();
                  }
                }
              } catch (err) {
                console.error(`Error processing lead ${nextLead?.id}:`, err);
              } finally {
                if (leadKey) inFlightLeadKeys.delete(leadKey);
              }
            });

            await Promise.allSettled(batchPromises);
          } else if (leads.length > 0) {
            const allDone = leads.every((l: any) => isLeadProcessed(l));
            if (allDone && (rawCamp.status === 'running' || rawCamp.status === 'active')) {
              rawCamp.status = 'paused';
              writeCampaignDrafts(localStorage, userCamps);
              window.dispatchEvent(new CustomEvent('campaigns_updated'));
              syncCampaignsFromStorage();
            }
          }
        }

        // If active campaign has more uncontacted leads, immediately trigger next batch
        if (hasMoreWork) {
          setTimeout(() => {
            void processActiveCampaigns();
          }, 50);
        }
      } catch (err) {
        console.error('Real campaign processing error:', err);
      } finally {
        isBusy = false;
      }
    };

    // Process once immediately when the campaign workspace mounts
    void processActiveCampaigns();

    const handleTriggerEvent = () => {
      void processActiveCampaigns();
    };
    window.addEventListener('trigger_campaign_process', handleTriggerEvent);

    const interval = setInterval(processActiveCampaigns, 2000);
    return () => {
      window.removeEventListener('trigger_campaign_process', handleTriggerEvent);
      clearInterval(interval);
    };
  }, [syncCampaignsFromStorage]);

  // Retrieve Campaign-Specific Prospect Audit Logs strictly from actual recorded telemetry
  const getCampaignAuditLogs = (camp: CampaignItem) => {
    if (!camp || typeof window === 'undefined') return [];
    try {
      const parsed = readCampaignDrafts(localStorage);
      if (parsed.length) {
        if (Array.isArray(parsed)) {
          const rawCamp = parsed.find((c: any) => c && c.id === camp.id);

          // Check if campaign has actual recorded telemetry logs
          if (rawCamp && Array.isArray(rawCamp.logs) && rawCamp.logs.length > 0) {
            return rawCamp.logs
              .filter((log: any) => log && typeof log === 'object')
              .map((log: any) => {
                const rawDomain = safeString(log.domain || log.website, '');
                const domain = rawDomain && rawDomain !== 'N/A' ? (rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`) : 'N/A';
                const rawUrl = safeString(log.url || log.contactUrl, '');
                const url = rawUrl && rawUrl !== 'N/A' ? rawUrl : (domain !== 'N/A' ? `${domain.replace(/\/$/, '')}/contact` : 'N/A');

                let finalStatus = safeString(log.status, 'PENDING');
                const rawCode = safeString(log.code || log.diagnostic, '');
                const rawDetails = safeString(log.details || log.diagnosticMessage || log.code, '');

                const isBrowserError =
                  rawCode.includes('browserType') ||
                  rawCode.includes('Executable') ||
                  rawCode.includes('BROWSER_LAUNCH_FAILED') ||
                  rawDetails.includes('browserType') ||
                  rawDetails.includes('Executable') ||
                  rawDetails.includes('Playwright');
                const isNavigationFailure =
                  finalStatus === 'UNREACHABLE' ||
                  /ERR_(NETWORK_ACCESS_DENIED|NAME_NOT_RESOLVED|CONNECTION|INTERNET_DISCONNECTED|TIMED_OUT)|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(rawCode) ||
                  /ERR_(NETWORK_ACCESS_DENIED|NAME_NOT_RESOLVED|CONNECTION|INTERNET_DISCONNECTED|TIMED_OUT)|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(rawDetails);

                // Preserve the historical raw log, but render a navigation
                // failure truthfully when exporting or reopening old reports.
                if (isNavigationFailure) finalStatus = 'UNREACHABLE';

                let formStatus = log.formStatus || (log.selectedForm ? 'DETECTED' : 'NOT_CHECKED');
                let rawFields = log.fieldsDetected || (log.mappedFields ? Object.keys(log.mappedFields).join(', ') : 'NOT_CHECKED');
                let fieldsDetected = (rawFields && rawFields !== 'NaN' && rawFields !== 'undefined') ? String(rawFields) : 'NOT_CHECKED';
                let submissionStatus = log.submissionStatus || finalStatus;
                let successVerification = log.successVerification || 'NOT_CHECKED';
                let code = rawCode || 'STAGE_EXECUTION';
                let details = rawDetails || 'Execution stage complete';

                if (isNavigationFailure) {
                  formStatus = 'NOT_CHECKED';
                  fieldsDetected = 'NOT_CHECKED';
                  submissionStatus = 'NOT_ATTEMPTED';
                  successVerification = 'NOT_CHECKED';
                  code = rawCode || 'UNREACHABLE';
                  details = rawDetails || 'Target website could not be reached before contact-page discovery.';
                } else if (isBrowserError) {
                  formStatus = 'NOT_CHECKED';
                  fieldsDetected = 'NOT_CHECKED';
                  submissionStatus = 'NOT_ATTEMPTED';
                  successVerification = 'NOT_CHECKED';
                  code = 'EXECUTION_ERROR';
                  details = 'EXECUTION_ERROR - Playwright browser executable missing or runtime error';
                } else if (finalStatus === 'DRY_RUN_COMPLETED') {
                  formStatus = log.formStatus || 'DETECTED';
                  submissionStatus = 'DRY_RUN';
                  successVerification = 'N/A';
                } else if (finalStatus === 'DELIVERED') {
                  successVerification = 'VERIFIED_HTTP_200';
                } else if (finalStatus === 'FAILED' || finalStatus === 'SUBMIT_FAILED') {
                  successVerification = 'FAILED';
                } else if (finalStatus === 'CAPTCHA_REVIEW' || finalStatus === 'REVIEW') {
                  successVerification = 'CAPTCHA_BLOCKED';
                } else if (finalStatus === 'NO_CONTACT_PAGE' || finalStatus === 'NO-FORM') {
                  formStatus = 'NOT_DETECTED';
                  fieldsDetected = 'N/A';
                  successVerification = 'NOT_FOUND';
                } else if (finalStatus === 'PENDING') {
                  successVerification = 'NOT_ATTEMPTED';
                }

                let websiteStatus: 'Reachable' | 'Unreachable' | 'Not Checked' = 'Not Checked';
                if (finalStatus === 'PENDING') {
                  websiteStatus = 'Not Checked';
                } else if (
                  isNavigationFailure ||
                  code.includes('UNREACHABLE') ||
                  code.includes('DNS') ||
                  details.includes('DNS') ||
                  details.includes('ECONNREFUSED') ||
                  details.includes('ENOTFOUND') ||
                  details.includes('timeout')
                ) {
                  websiteStatus = 'Unreachable';
                } else if (isBrowserError) {
                  websiteStatus = 'Not Checked';
                } else {
                  websiteStatus = 'Reachable';
                }

                const techStack = (log.techStack && log.techStack !== 'HTML Form' && log.techStack !== 'Not detected') ? log.techStack : 'NOT_DETECTED';
                const domainAge = (log.domainAge && log.domainAge !== 'Verified' && log.domainAge !== 'Verified Active Domain') ? log.domainAge : 'N/A';
                const lastUpdated = log.lastUpdated && log.lastUpdated !== 'N/A' ? log.lastUpdated : 'N/A';

                return {
                  domain,
                  url,
                  websiteStatus,
                  formStatus,
                  fieldsDetected,
                  submissionStatus,
                  successVerification,
                  finalStatus,
                  techStack,
                  domainAge,
                  lastUpdated,
                  code,
                  details,
                  time: safeFormatTime(log.time || log.timestamp),
                  startedAt: log.startedAt,
                  completedAt: log.completedAt,
                  durationMs: log.durationMs,
                  isDryRun: Boolean(log.isDryRun),
                  httpStatus: log.httpStatus,
                  renderedSubject: log.renderedSubject,
                  renderedMessage: log.renderedMessage,
                  companyName: log.companyName,
                };
              });
          }

          // Check if campaign has prospect list records that are unprocessed
          if (rawCamp && Array.isArray(rawCamp.prospectsList) && rawCamp.prospectsList.length > 0) {
            return rawCamp.prospectsList
              .filter((ld: any) => ld && typeof ld === 'object')
              .map((ld: any) => {
                const rawDomain = safeString(ld.website || ld.domain, '');
                const domain = rawDomain && rawDomain !== 'N/A' ? (rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`) : 'N/A';
                const url = safeString(ld.contactUrl, domain !== 'N/A' ? `${domain.replace(/\/$/, '')}/contact` : 'N/A');
                return {
                  domain,
                  url,
                  websiteStatus: 'Not Checked',
                  formStatus: 'NOT_DETECTED',
                  fieldsDetected: 'N/A',
                  submissionStatus: 'PENDING',
                  successVerification: 'NOT_ATTEMPTED',
                  finalStatus: safeString(ld.status, 'PENDING'),
                  techStack: 'NOT_DETECTED',
                  domainAge: 'N/A',
                  lastUpdated: 'N/A',
                  code: 'QUEUED_PACING',
                  details: 'Queued in pacing worker line awaiting worker execution',
                  time: safeFormatTime(ld.createdAt, 'Awaiting execution'),
                  isDryRun: false,
                  companyName: ld.company_name || ld.companyName,
                };
              });
          }
        }
      }
    } catch (e) {
      console.error('Error loading audit logs:', e);
    }

    return [];
  };

  // Export Dedicated Single Campaign CSV Report with Flat Horizontal Excel Columns
  const handleExportSingleCampaignCSV = (camp: CampaignItem) => {
    if (!camp || !isActionAuthorized(camp.id)) {
      alert('Unauthorized: You do not have permission to export telemetry for this campaign.');
      return;
    }

    const auditLogs = getCampaignAuditLogs(camp);
    const delivered = camp.reached || 0;
    const dryRun = camp.dryRunCompleted || 0;
    const failed = camp.failed || 0;
    const noPage = camp.noContactPage || 0;
    const captcha = camp.captchaBlocked || 0;
    const pending = Math.max(0, camp.prospects - delivered - dryRun - failed - noPage - captcha);
    const replied = camp.replied || 0;
    const yieldPct = camp.prospects > 0 ? Math.round((delivered / camp.prospects) * 100) : 0;
    const campNameSafe = String(camp.name || 'Campaign');
    const campIdSafe = String(camp.id || '');
    const campDateSafe = String(camp.date || '');
    const campStatusSafe = String(camp.status || 'DRAFT').toUpperCase();

    const tableHeaders = [
      'Campaign Name',
      'Campaign ID',
      'Created Date',
      'Status',
      'Total Prospects',
      'Form Delivered (Sent)',
      'Dry Run Completed',
      'Failed Submissions',
      'No Contact Page Found',
      'CAPTCHA / Review Required',
      'Pending',
      'Replied',
      'Success Yield %',
      'Website Domain',
      'Contact Page URL',
      'Form Status',
      'Fields Detected',
      'Submission Status',
      'Success Verification',
      'Final Status',
      'Detected Tech Stack',
      'Domain Registration / Age',
      'Last Website Edit Date',
      'Diagnostic Code',
      'Diagnostic Details',
      'Timestamp',
    ];

    const tableRows = auditLogs.length > 0
      ? auditLogs.map((log: any) => [
          `"${campNameSafe.replace(/"/g, '""')}"`,
          `"${campIdSafe}"`,
          `"${campDateSafe}"`,
          `"${campStatusSafe}"`,
          camp.prospects || 0,
          delivered,
          dryRun,
          failed,
          noPage,
          captcha,
          pending,
          replied,
          `"${yieldPct}%"`,
          `"${safeString(log.domain).replace(/"/g, '""')}"`,
          `"${safeString(log.url).replace(/"/g, '""')}"`,
          `"${safeString(log.formStatus).replace(/"/g, '""')}"`,
          `"${safeString(log.fieldsDetected).replace(/"/g, '""')}"`,
          `"${safeString(log.submissionStatus).replace(/"/g, '""')}"`,
          `"${safeString(log.successVerification).replace(/"/g, '""')}"`,
          `"${safeString(log.finalStatus).replace(/"/g, '""')}"`,
          `"${safeString(log.techStack).replace(/"/g, '""')}"`,
          `"${safeString(log.domainAge).replace(/"/g, '""')}"`,
          `"${safeString(log.lastUpdated).replace(/"/g, '""')}"`,
          `"${safeString(log.code).replace(/"/g, '""')}"`,
          `"${safeString(log.details).replace(/"/g, '""')}"`,
          `"${safeString(log.time).replace(/"/g, '""')}"`,
        ])
      : [[
          `"${campNameSafe.replace(/"/g, '""')}"`,
          `"${campIdSafe}"`,
          `"${campDateSafe}"`,
          `"${campStatusSafe}"`,
          camp.prospects || 0,
          delivered,
          dryRun,
          failed,
          noPage,
          captcha,
          pending,
          replied,
          `"${yieldPct}%"`,
          '"N/A"',
          '"N/A"',
          '"NOT_DETECTED"',
          '"N/A"',
          '"N/A"',
          '"NOT_ATTEMPTED"',
          '"N/A"',
          '"NOT_DETECTED"',
          '"N/A"',
          '"N/A"',
          '"NO_RECORDS"',
          '"No website audit records found for this campaign"',
          '"N/A"',
        ]];

    const csvContent = `${tableHeaders.join(',')}\n${tableRows.map((r: any) => r.join(',')).join('\n')}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = campNameSafe.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `${sanitizedName}_Outreach_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Single Campaign PDF Report
  const handleExportSingleCampaignPDF = (camp: CampaignItem) => {
    if (!camp || !isActionAuthorized(camp.id)) {
      alert('Unauthorized: You do not have permission to export telemetry for this campaign.');
      return;
    }
    const auditLogs = getCampaignAuditLogs(camp);
    generateCampaignPDFReport(camp, auditLogs, currentUser?.email || 'User');
  };

  // Export All Campaign Summary Reports as CSV
  const handleExportCSV = () => {
    const headers = [
      'Campaign ID',
      'Campaign Name',
      'Date',
      'Status',
      'Total Prospects',
      'Sent (Form Delivered)',
      'Dry Run Completed',
      'Failed Submissions',
      'No Contact Page Found',
      'CAPTCHA / Review Blocked',
      'Pending',
      'Success Yield %',
    ];
    const rows = campaigns.map((c) => {
      const delivered = c.reached || 0;
      const dryRun = c.dryRunCompleted || 0;
      const failed = c.failed || 0;
      const noPage = c.noContactPage || 0;
      const captcha = c.captchaBlocked || 0;
      const pending = Math.max(0, c.prospects - delivered - dryRun - failed - noPage - captcha);
      const yieldPct = c.prospects > 0 ? Math.round((delivered / c.prospects) * 100) : 0;

      return [
        c.id,
        `"${String(c.name || '').replace(/"/g, '""')}"`,
        c.date,
        c.status,
        c.prospects,
        delivered,
        failed,
        noPage,
        captcha,
        pending,
        `${yieldPct}%`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `all_campaigns_outreach_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const isActionAuthorized = (campId: string) => {
    if (!currentUser) return true;
    const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.email === 'mithusquare@gmail.com';
    if (isAdmin) return true;

    try {
      const parsed = readCampaignDrafts(localStorage);
      if (parsed.length) {
        const camp = parsed.find((c: any) => c && c.id === campId);
        if (camp && camp.ownerEmail && camp.ownerEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
          return false;
        }
      }
    } catch (e) {}

    if (initialCampaignsList.some((c) => c.id === campId)) {
      return false;
    }

    return true;
  };

  const toggleSelectAll = () => {
    const visibleIds = paginatedCampaigns.map((campaign) => campaign.id);
    const areAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    if (areAllVisibleSelected) {
      setSelectedIds((previous) => previous.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((previous) => Array.from(new Set([...previous, ...visibleIds])));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleCampaignStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActionAuthorized(id)) {
      alert('Unauthorized: You can only modify campaigns that belong to your account.');
      return;
    }
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newStatus = c.status === 'active' ? 'paused' : 'active';
          try {
            const parsed = readCampaignDrafts(localStorage);
            if (parsed.length) {
              const updated = parsed.map((item: any) =>
                item && item.id === id ? { ...item, status: newStatus === 'active' ? 'running' : 'paused' } : item
              );
              writeCampaignDrafts(localStorage, updated);
              window.dispatchEvent(new CustomEvent('campaigns_updated'));
              if (newStatus === 'active') {
                window.dispatchEvent(new CustomEvent('trigger_campaign_process'));
              }
            }
          } catch (err) {}
          return { ...c, status: newStatus };
        }
        return c;
      })
    );
  };

  // Bulk Delete Handler
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected campaign(s)?`)) {
      try {
        const idsToDelete = [...selectedIds];
        removeCampaignDrafts(localStorage, idsToDelete);
        setCampaigns((current) => current.filter((campaign) => !idsToDelete.includes(campaign.id)));
        setSelectedIds([]);
        window.dispatchEvent(new CustomEvent('campaigns_updated'));
      } catch (e) {
        console.error('Error updating localStorage after bulk delete:', e);
        alert('The campaigns could not be deleted from browser storage. Nothing was removed from the campaign list.');
      }
    }
  };

  // Single Row Delete Handler
  const handleDeleteSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActionAuthorized(id)) {
      alert('Unauthorized: You can only delete campaigns that belong to your account.');
      return;
    }
    const campToDelete = campaigns.find((c) => c.id === id);
    if (window.confirm(`Are you sure you want to delete campaign "${campToDelete?.name || id}"?`)) {
      try {
        removeCampaignDrafts(localStorage, [id]);
        setCampaigns((current) => current.filter((campaign) => campaign.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        window.dispatchEvent(new CustomEvent('campaigns_updated'));
      } catch (e) {
        console.error('Error updating localStorage after single delete:', e);
        alert('The campaign could not be deleted from browser storage. It remains in the campaign list.');
      }
    }
  };

  // Duplicate / Copy Campaign Handler
  const handleCopyCampaign = (campId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuCampId(null);
    if (!isActionAuthorized(campId)) {
      alert('Unauthorized: You can only copy campaigns that belong to your account.');
      return;
    }

    const targetCamp = campaigns.find((c) => c.id === campId);
    if (!targetCamp) return;

    const activeAccount = (localStorage.getItem('active_account_email') || '').toLowerCase();
    const newId = `camp-copy-${Date.now()}`;
    const newName = `${targetCamp.name} - Copy`;
    const todayDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newCampItem: CampaignItem = {
      ...targetCamp,
      id: newId,
      name: newName,
      date: todayDate,
      status: 'draft',
      prospects: targetCamp.prospects || 0,
      reached: 0,
      failed: 0,
      noContactPage: 0,
      captchaBlocked: 0,
      reachedPercent: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      repliedPercent: 0,
      interested: 0,
      opportunities: 0,
      last24h: 0,
    };

    try {
      const parsed = readCampaignDrafts(localStorage);
      const existingRaw = parsed.find((c: any) => c && c.id === campId);

      const rawCopy = existingRaw
        ? {
            ...existingRaw,
            id: newId,
            name: newName,
            status: 'draft',
            createdAt: new Date().toISOString(),
            sentCount: 0,
            failedCount: 0,
            noFormCount: 0,
            captchaCount: 0,
            logs: [],
            ownerEmail: activeAccount || existingRaw.ownerEmail,
          }
        : {
            id: newId,
            name: newName,
            status: 'draft',
            createdAt: new Date().toISOString(),
            totalLeads: targetCamp.prospects,
            sentCount: 0,
            failedCount: 0,
            noFormCount: 0,
            captchaCount: 0,
            logs: [],
            ownerEmail: activeAccount,
          };

      parsed.unshift(rawCopy);
      writeCampaignDrafts(localStorage, parsed);
    } catch (err) {
      console.error('Error duplicating campaign in storage:', err);
    }

    setCampaigns((prev) => [newCampItem, ...prev]);
  };

  // Archive Campaign Handler
  const handleArchiveCampaign = (campId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuCampId(null);
    if (!isActionAuthorized(campId)) {
      alert('Unauthorized: You can only archive campaigns that belong to your account.');
      return;
    }

    setCampaigns((prev) =>
      prev.map((c) => (c.id === campId ? { ...c, status: 'archived' } : c))
    );

    try {
      const parsed = readCampaignDrafts(localStorage);
      if (parsed.length) {
        const updated = parsed.map((c: any) =>
          c && c.id === campId ? { ...c, status: 'archived' } : c
        );
        writeCampaignDrafts(localStorage, updated);
      }
    } catch (err) {
      console.error('Error archiving campaign in storage:', err);
    }
  };

  // Clear All Campaigns (Fresh Start)
  const handleClearAllCampaigns = () => {
    if (window.confirm('Are you sure you want to delete ALL campaigns and start completely fresh?')) {
      const allIds = campaigns.map((c) => c.id);
      try {
        removeCampaignDrafts(localStorage, [...allIds, 'camp-new', 'camp-01', 'camp-02', 'camp-03', 'camp-04']);
        setCampaigns([]);
        setSelectedIds([]);
        window.dispatchEvent(new CustomEvent('campaigns_updated'));
      } catch (e) {
        console.error('Error clearing all campaigns:', e);
        alert('Campaigns could not be deleted from browser storage. No successful deletion was reported.');
      }
    }
  };

  // Filtered campaigns (memoized for rendering speed)
  const filtered = React.useMemo(() => {
    return campaigns.filter((c) => {
      if (!c) return false;
      const cName = String(c.name || '');
      const cTag = String(c.tag || '');

      if (campaignSearch.trim() && !cName.toLowerCase().includes(campaignSearch.trim().toLowerCase())) {
        return false;
      }

      if (tagFilter !== 'All Tags' && cTag !== tagFilter) {
        return false;
      }
      if (folderFilter !== 'All Folders') {
        const lowerFolder = folderFilter.toLowerCase();
        const lowerName = cName.toLowerCase();
        const lowerTag = cTag.toLowerCase();
        if (!lowerName.includes(lowerFolder) && !lowerTag.includes(lowerFolder)) {
          return false;
        }
      }
      if (statusFilter === 'Active') return c.status === 'active';
      if (statusFilter === 'Paused') return c.status === 'paused';
      if (statusFilter === 'Draft') return c.status === 'draft';
      if (statusFilter === 'Archived') return c.status === 'archived';
      return c.status !== 'archived';
    });
  }, [campaigns, campaignSearch, tagFilter, folderFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * pageSize;
  const paginatedCampaigns = filtered.slice(pageStart, pageStart + pageSize);
  const firstVisibleCampaign = filtered.length === 0 ? 0 : pageStart + 1;
  const lastVisibleCampaign = Math.min(pageStart + pageSize, filtered.length);

  const paginationItems = React.useMemo<(number | 'ellipsis')[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const pages = new Set([1, totalPages, activePage - 1, activePage, activePage + 1]);
    const sortedPages = Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);

    return sortedPages.flatMap((page, index) => {
      const previous = sortedPages[index - 1];
      return previous !== undefined && page - previous > 1 ? ['ellipsis', page] : [page];
    });
  }, [activePage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [campaignSearch, folderFilter, tagFilter, statusFilter, pageSize]);

  // Calculate Column Totals for Bulk Contact Outreach (memoized)
  const totals = React.useMemo(() => {
    const totalProspects = filtered.reduce((acc, c) => acc + (c.prospects || 0), 0);
    const totalDelivered = filtered.reduce((acc, c) => acc + (c.reached || 0), 0);
    const totalDryRun = filtered.reduce((acc, c) => acc + (c.dryRunCompleted || 0), 0);
    const totalFailed = filtered.reduce((acc, c) => acc + (c.failed || 0), 0);
    const totalNoForm = filtered.reduce((acc, c) => acc + (c.noContactPage || 0), 0);
    const totalCaptcha = filtered.reduce((acc, c) => acc + (c.captchaBlocked || 0), 0);
    const totalPending = filtered.reduce((acc, c) => acc + Math.max(0, c.prospects - (c.reached || 0) - (c.dryRunCompleted || 0) - (c.failed || 0) - (c.noContactPage || 0) - (c.captchaBlocked || 0)), 0);
    const totalReplied = filtered.reduce((acc, c) => acc + (c.replied || 0), 0);
    return { totalProspects, totalDelivered, totalDryRun, totalFailed, totalNoForm, totalCaptcha, totalPending, totalReplied };
  }, [filtered]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Top Filter Bar & Action Controls (Sticky Header Bar) */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-5 lg:-mx-6 -mt-4 sm:-mt-5 lg:-mt-6 px-4 sm:px-5 lg:px-6 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
        {/* Left Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="search"
              value={campaignSearch}
              onChange={(event) => setCampaignSearch(event.target.value)}
              placeholder="Search campaigns..."
              aria-label="Search campaigns by name"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-xs font-medium text-zinc-300 shadow-2xs outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-900"
            />
          </label>
          {/* All Folders */}
          <div className="relative">
            <select
              value={folderFilter}
              onChange={(e) => {
                setFolderFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-300 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All Folders">All Folders</option>
              <option value="B2B SaaS">B2B SaaS</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Agencies">Agencies</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>

          {/* All Tags */}
          <div className="relative">
            <select
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-300 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All Tags">All Tags</option>
              <option value="071928SAASC">071928SAASC</option>
              <option value="070326BRR">070326BRR</option>
              <option value="062226SAASHC">062226SAASHC</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>

          {/* All Statuses */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-300 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>

        {/* Right Action: Create New Campaign Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isCreating || navigatingRoute === 'new'}
            onClick={() => handleCreateCampaignSubmit()}
            onMouseEnter={() => {
              try {
                router.prefetch('/campaigns/new');
              } catch (e) {}
            }}
            id="create-new-campaign-btn"
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-75 text-white px-5 py-2.5 text-xs font-extrabold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            {navigatingRoute === 'new' || isCreating ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                <span>Opening Editor...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Create New Campaign</span>
              </>
            )}
          </button>
          {createNavigationError && (
            <p role="alert" className="max-w-56 text-xs font-medium text-rose-400" aria-live="polite">
              {createNavigationError}
            </p>
          )}
        </div>
      </div>

      {/* COMPACT CREATE CAMPAIGN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-base font-bold text-zinc-100">Create Campaign</h2>
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setNameError(''); }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-400 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Campaign Name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => {
                    setNewCampaignName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCampaignSubmit();
                    } else if (e.key === 'Escape') {
                      setIsCreateModalOpen(false);
                      setNameError('');
                    }
                  }}
                  placeholder="e.g. Austin SaaS Partnerships"
                  className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-100 placeholder-slate-400 outline-none focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 transition-all"
                />
                {nameError && (
                  <p className="mt-1.5 text-xs font-medium text-rose-400">{nameError}</p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 bg-zinc-900/50 px-6 py-4">
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setNameError(''); }}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-2.5 text-xs font-bold text-zinc-300 shadow-2xs hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={() => handleCreateCampaignSubmit()}
                className="rounded-xl bg-[#0e6de4] hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Next Step →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-zinc-950 text-white px-5 py-3 rounded-2xl shadow-xl border border-zinc-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-zinc-300">
              campaign{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Campaigns Table with 8 Real Bulk Contact Outreach Columns (Responsive Wrapper) */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-1">
        <div className="min-w-[900px] lg:min-w-0 space-y-3">
          {/* Frozen / Sticky Table Header Columns */}
        <div className="sticky top-0 z-20 grid grid-cols-12 items-center px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono bg-zinc-900/95 backdrop-blur-md border-y border-zinc-800/90 shadow-2xs rounded-xl">
          <div className="col-span-3 flex items-center gap-3">
            <input
              type="checkbox"
              checked={paginatedCampaigns.length > 0 && paginatedCampaigns.every((campaign) => selectedIds.includes(campaign.id))}
              onChange={toggleSelectAll}
              className="h-3.5 w-3.5 rounded border-zinc-700 text-blue-400 focus:ring-blue-500 cursor-pointer"
            />
            <span className="font-extrabold text-zinc-200">CAMPAIGNS</span>
          </div>

          <div className="col-span-1 text-center font-bold text-zinc-300">
            <span>PROSPECTS</span>
          </div>

          <div className="col-span-1 text-center font-bold text-emerald-300">
            <span>DELIVERED</span>
          </div>

          <div className="col-span-1 text-center font-bold text-blue-300">
            <span>PENDING</span>
          </div>

          <div className="col-span-1 text-center font-bold text-rose-300">
            <span>FAILED</span>
          </div>

          <div className="col-span-1 text-center font-bold text-amber-300">
            <span>NO-FORM</span>
          </div>

          <div className="col-span-1 text-center font-bold text-purple-300">
            <span>REVIEW</span>
          </div>

          <div className="col-span-1 text-center font-bold text-indigo-300">
            <span>REPLIED</span>
          </div>

          <div className="col-span-2 text-center font-bold text-zinc-400">
            <span>ACTIONS</span>
          </div>
        </div>

        {/* Campaign Rows */}
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="p-12 text-center bg-zinc-950 rounded-2xl border border-zinc-800 text-zinc-400 text-sm">
              No campaigns found. Click{' '}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="font-bold text-blue-400 underline cursor-pointer"
              >
                Create Campaign
              </button>{' '}
              to start a new campaign.
            </div>
          ) : (
            paginatedCampaigns.map((camp) => {
              const pendingCount = Math.max(0, camp.prospects - camp.reached - (camp.dryRunCompleted || 0) - (camp.failed || 0) - (camp.noContactPage || 0) - (camp.captchaBlocked || 0));
              const processedCount = Math.min(camp.prospects, camp.reached + (camp.dryRunCompleted || 0) + (camp.failed || 0) + (camp.noContactPage || 0) + (camp.captchaBlocked || 0));
              return (
                <div
                  key={camp.id}
                  onClick={() => setSelectedReportCamp(camp)}
                  className={`grid grid-cols-12 items-center px-6 py-3.5 rounded-2xl border transition-all cursor-pointer group shadow-2xs ${
                    selectedIds.includes(camp.id)
                      ? 'border-blue-400 bg-blue-950/30'
                      : 'border-zinc-800/90 bg-zinc-950 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Col 1: Checkbox + Status Indicator + Name & Tags */}
                  <div className="col-span-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(camp.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(camp.id)}
                      className="h-3.5 w-3.5 rounded border-zinc-700 text-blue-400 focus:ring-blue-500 cursor-pointer shrink-0"
                    />

                    {/* Left Status Bar / Icon */}
                    <div className="flex items-center justify-center shrink-0">
                      {camp.status === 'active' && (
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-900" title="Active Running">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[9px] font-extrabold text-emerald-300 tracking-wider font-mono uppercase">RUNNING</span>
                        </div>
                      )}
                      {camp.status === 'paused' && (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-zinc-600 flex items-center justify-center text-[9px] font-bold text-zinc-400" title="Paused">
                          ⏸
                        </div>
                      )}
                      {camp.status === 'draft' && (
                        <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                      )}
                      {camp.status === 'archived' && (
                        <span title="Archived">
                          <Archive className="h-3.5 w-3.5 text-zinc-400" />
                        </span>
                      )}
                    </div>

                    {/* Campaign Name & Subtitle Meta */}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h3
                        className="text-xs font-bold text-zinc-100 group-hover:text-blue-400 transition-colors truncate cursor-pointer hover:underline"
                        title="Click to view campaign details & telemetry report"
                      >
                        {camp.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono truncate">
                        <span>{camp.date}</span>
                        <span>•</span>
                        <span className="text-zinc-400">✈ {formatSenderCount(camp.sendersCount)}</span>
                        {camp.status === 'active' && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-300 font-bold font-mono">
                              Progress {processedCount}/{camp.prospects}
                            </span>
                          </>
                        )}
                        {camp.tag && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 font-bold">
                            {camp.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Col 2: PROSPECTS */}
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-bold text-zinc-100 font-mono">
                      {camp.prospects}
                    </span>
                  </div>

                  {/* Col 3: DELIVERED */}
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {camp.reached}{' '}
                      <span className="text-[10px] text-emerald-300 font-normal">
                        ({camp.prospects > 0 ? Math.round((camp.reached / camp.prospects) * 100) : 0}%)
                      </span>
                    </span>
                  </div>

                  {/* Col 4: PENDING */}
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-semibold text-blue-400 font-mono">
                      {pendingCount}
                    </span>
                  </div>

                  {/* Col 5: FAILED */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold font-mono ${camp.failed ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                      {camp.failed || 0}
                    </span>
                  </div>

                  {/* Col 6: NO-FORM */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold font-mono ${camp.noContactPage ? 'text-amber-400 font-bold' : 'text-zinc-400'}`}>
                      {camp.noContactPage || 0}
                    </span>
                  </div>

                  {/* Col 7: REVIEW (CAPTCHA) */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold font-mono ${camp.captchaBlocked ? 'text-purple-400 font-bold' : 'text-zinc-400'}`}>
                      {camp.captchaBlocked || 0}
                    </span>
                  </div>

                  {/* Col 8: REPLIED */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold font-mono ${camp.replied ? 'text-indigo-400 font-bold' : 'text-zinc-400'}`}>
                      {camp.replied || 0}
                    </span>
                  </div>

                  {/* Col 9: ACTIONS (Toggle Switch + Edit + Analytics + Vertical Three-Dot Action Menu) */}
                  <div className="col-span-2 flex items-center justify-center gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
                    {/* Active / Paused Toggle Switch */}
                    <button
                      onClick={(e) => toggleCampaignStatus(camp.id, e)}
                      aria-pressed={camp.status === 'active'}
                      aria-label={camp.status === 'active' ? 'Pause campaign' : 'Activate campaign'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        camp.status === 'active' ? 'bg-[#2563EB]' : 'bg-zinc-700'
                      }`}
                      title={camp.status === 'active' ? 'Click to Pause' : 'Click to Activate'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                          camp.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Edit Campaign Icon Button */}
                    <button
                      disabled={navigatingRoute === camp.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (navigatingRoute === camp.id) return;
                        setNavigatingRoute(camp.id);
                        const targetUrl = `/campaigns/new?id=${encodeURIComponent(camp.id)}`;
                        try {
                          router.prefetch(targetUrl);
                        } catch (err) {}
                        router.push(targetUrl);
                        setTimeout(() => {
                          if (typeof window !== 'undefined' && !window.location.href.includes('/campaigns/new')) {
                            window.location.assign(targetUrl);
                          }
                        }, 400);
                      }}
                      onMouseEnter={() => {
                        try {
                          router.prefetch(`/campaigns/new?id=${encodeURIComponent(camp.id)}`);
                        } catch (e) {}
                      }}
                      className="p-1 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-950 transition-colors cursor-pointer disabled:opacity-50"
                      title="Edit Campaign"
                    >
                      {navigatingRoute === camp.id ? (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-[#0e6de4] border-t-transparent animate-spin" />
                      ) : (
                        <Edit2 className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* View Telemetry & Analytics Icon Button (New Action Icon) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReportCamp(camp);
                      }}
                      className="p-1 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-blue-950 transition-colors cursor-pointer"
                      title="View Campaign Telemetry & Analytics"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Vertical Three-Dot Action Menu Trigger */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuCampId(openMenuCampId === camp.id ? null : camp.id);
                        }}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          openMenuCampId === camp.id
                            ? 'bg-zinc-900 text-zinc-200'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900'
                        }`}
                        title="Campaign Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Popover Action Menu */}
                      {openMenuCampId === camp.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-zinc-950 border border-zinc-800 shadow-xl z-50 py-1 font-sans text-xs text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleCopyCampaign(camp.id, e)}
                            className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5 text-zinc-400" />
                            Copy Campaign
                          </button>
                          <button
                            onClick={(e) => handleArchiveCampaign(camp.id, e)}
                            className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            <Archive className="h-3.5 w-3.5 text-zinc-400" />
                            Archive
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuCampId(null);
                              router.push(`/campaigns/new?id=${encodeURIComponent(camp.id)}`);
                            }}
                            className="w-full text-left px-3 py-2 text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                            Edit
                          </button>
                          <div className="my-1 border-t border-zinc-800" />
                          <button
                            onClick={(e) => {
                              setOpenMenuCampId(null);
                              handleDeleteSingle(camp.id, e);
                            }}
                            className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-zinc-400">
            <span className="font-medium">
              Showing {firstVisibleCampaign}–{lastVisibleCampaign} of {filtered.length}{campaignSearch.trim() || folderFilter !== 'All Folders' || tagFilter !== 'All Tags' || statusFilter !== 'All Statuses' ? ' matching' : ''} campaigns
            </span>
            <label className="flex items-center gap-2 font-medium">
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs font-semibold text-zinc-300 outline-none focus:border-blue-500"
                aria-label="Campaigns per page"
              >
                {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>

          <nav className="flex items-center gap-1" aria-label="Campaign pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={activePage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1.5 font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {paginationItems.map((item, index) => item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-1.5 text-zinc-400" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setCurrentPage(item)}
                aria-current={item === activePage ? 'page' : undefined}
                className={`min-w-7 rounded-lg px-2 py-1.5 font-bold transition-colors ${item === activePage ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'}`}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={activePage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1.5 font-semibold text-zinc-300 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>

        {/* 3. Bottom Summary Row (Aggregating all 8 Contact Form Outreach Metrics) */}
        <div className="grid grid-cols-12 items-center px-6 py-4 rounded-2xl border border-zinc-800 bg-zinc-950 text-xs font-bold text-zinc-300 shadow-2xs">
          <div className="col-span-3 text-zinc-400 font-sans">
            Showing {filtered.length} campaigns
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-zinc-100">
            {totals.totalProspects}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-emerald-400">
            {totals.totalDelivered}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-blue-400">
            {totals.totalPending}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-rose-400">
            {totals.totalFailed}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-amber-400">
            {totals.totalNoForm}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-purple-400">
            {totals.totalCaptcha}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-indigo-400">
            {totals.totalReplied}
          </div>

          <div className="col-span-2 text-center text-[10px] text-zinc-400 font-mono">
            Total Totals
          </div>
        </div>
      </div>
    </div>

      {/* DETAILED CAMPAIGN GRAPH & METRICS REPORT MODAL */}
      {selectedReportCamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-950 text-blue-400">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-zinc-100 flex items-center gap-2">
                    <span>{selectedReportCamp.name}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-400 font-mono font-bold">
                      {selectedReportCamp.status.toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Campaign ID: {selectedReportCamp.id} • Created: {selectedReportCamp.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/campaigns/new?id=${encodeURIComponent(selectedReportCamp.id)}`)}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Edit Campaign</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSingleCampaignCSV(selectedReportCamp)}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-800 bg-emerald-950 hover:bg-emerald-900 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors cursor-pointer"
                  title="Download CSV Report"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSingleCampaignPDF(selectedReportCamp)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#0e6de4] hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Download Executive PDF Report"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReportCamp(null)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors cursor-pointer ml-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Container (Scrollable) */}
            <div className="overflow-y-auto space-y-6 pr-1 flex-1">
              {(() => {
                const logs = getCampaignAuditLogs(selectedReportCamp);
                const prospects = selectedReportCamp.prospects || 0;
                const delivered = selectedReportCamp.reached || 0;
                const dryRunCompleted = selectedReportCamp.dryRunCompleted || 0;
                const failed = selectedReportCamp.failed || 0;
                const noForm = selectedReportCamp.noContactPage || 0;
                const reviewRequired = selectedReportCamp.captchaBlocked || 0;

                let executionError = 0;
                logs.forEach((l: any) => {
                  const code = String(l.code || l.details || '');
                  if (code.includes('EXECUTION_ERROR') || code.includes('BROWSER_LAUNCH_FAILED')) {
                    executionError += 1;
                  }
                });

                const processed = delivered + dryRunCompleted + failed + noForm + reviewRequired + executionError;
                const pending = Math.max(0, prospects - processed);
                const creditsUsed = delivered; // Exactly 1 credit per verified DELIVERED submission
                const replied = Number(selectedReportCamp.replied) || 0;
                const overallChartData = [
                  { metric: 'PROSPECTS', value: prospects, color: '#334155' },
                  { metric: 'DELIVERED', value: delivered, color: '#2563eb' },
                  { metric: 'PENDING', value: pending, color: '#94a3b8' },
                  { metric: 'FAILED', value: failed, color: '#f43f5e' },
                  { metric: 'NO-FORM', value: noForm, color: '#f59e0b' },
                  { metric: 'REVIEW', value: reviewRequired, color: '#8b5cf6' },
                  { metric: 'REPLIED', value: replied, color: '#10b981' },
                ];

                return (
                  <>
                    {/* 1. CONTACTREACHOUT 9 KPI METRICS GRID */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 font-mono">
                      <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Prospects</span>
                        <p className="text-lg font-extrabold text-zinc-100">{prospects}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Processed</span>
                        <p className="text-lg font-extrabold text-zinc-100">{processed}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-blue-900 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Delivered</span>
                        <p className="text-lg font-extrabold text-blue-400">{delivered}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Pending</span>
                        <p className="text-lg font-extrabold text-zinc-300">{pending}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Failed</span>
                        <p className="text-lg font-extrabold text-zinc-200">{failed}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">No Form</span>
                        <p className="text-lg font-extrabold text-zinc-200">{noForm}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Review Req</span>
                        <p className="text-lg font-extrabold text-zinc-200">{reviewRequired}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Exec Error</span>
                        <p className="text-lg font-extrabold text-zinc-200">{executionError}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-blue-900 bg-zinc-950 shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Credits Used</span>
                        <p className="text-lg font-extrabold text-blue-400">{creditsUsed}</p>
                      </div>
                    </div>

                    {/* 2. MAIN GRAPH: OVERALL CAMPAIGN RESULTS */}
                    <div className="p-5 rounded-3xl border border-zinc-800 bg-zinc-950 space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-zinc-800 pb-3">
                        <div>
                          <h4 className="text-sm font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-400" />
                            <span>Overall Campaign Results</span>
                          </h4>
                          <p className="text-xs text-zinc-400 font-sans mt-0.5">
                            Current totals calculated from this campaign&apos;s prospects and recorded outcomes.
                          </p>
                        </div>
                        <span className="rounded-full border border-blue-900 bg-blue-950 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-400">Live campaign totals</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Campaign result legend">
                        {overallChartData.map((item) => (
                          <div key={item.metric} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                            <div className="min-w-0"><p className="truncate text-[9px] font-black tracking-wide text-zinc-400">{item.metric}</p><p className="text-sm font-black text-zinc-100">{item.value}</p></div>
                          </div>
                        ))}
                      </div>

                      {prospects === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 text-center space-y-2">
                          <BarChart2 className="h-10 w-10 text-zinc-400" />
                          <p className="text-sm font-bold text-zinc-300">No campaign prospects yet</p>
                          <p className="text-xs text-zinc-400 max-w-sm">Add prospects to this campaign to generate an overall results breakdown.</p>
                        </div>
                      ) : (
                        <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-blue-900 bg-zinc-950 px-2 py-4 sm:h-80 sm:px-4">
                          <div className="pointer-events-none absolute inset-x-6 top-3 h-20 rounded-full bg-blue-800/20 blur-3xl" />
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={overallChartData} margin={{ top: 28, right: 10, bottom: 12, left: -18 }}>
                              <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="3 5" />
                              <XAxis dataKey="metric" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 800 }} />
                              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                              <Tooltip
                                cursor={{ fill: '#27272a', opacity: 0.28 }}
                                contentStyle={{ borderRadius: 16, border: '1px solid #27272a', boxShadow: '0 14px 34px rgba(0, 0, 0, .5)', backgroundColor: '#09090b', color: '#fafafa', fontSize: 12 }}
                                labelStyle={{ color: '#fafafa', fontWeight: 800, marginBottom: 6 }}
                                formatter={(value: number) => [value.toLocaleString(), 'Count']}
                              />
                              <Bar dataKey="value" name="Count" radius={[10, 10, 3, 3]} maxBarSize={58}>
                                {overallChartData.map((item) => <Cell key={item.metric} fill={item.color} />)}
                                <LabelList dataKey="value" position="top" fill="#fafafa" fontSize={12} fontWeight={800} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* 3. OUTCOME BREAKDOWN TABLE */}
                    <div className="p-5 rounded-3xl border border-zinc-800 bg-zinc-950 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-400" />
                          <span>OUTCOME BREAKDOWN</span>
                        </h4>
                        <span className="text-[10px] text-zinc-400 font-mono">Calculated from total {prospects} prospects</span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                        <table className="w-full text-left text-xs font-sans border-collapse">
                          <thead>
                            <tr className="bg-zinc-900 border-b border-zinc-800 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider font-mono">
                              <th className="p-3">Outcome</th>
                              <th className="p-3 text-center">Count</th>
                              <th className="p-3 text-center">Percentage</th>
                              <th className="p-3">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800 font-mono text-[11px]">
                            {[
                              {
                                label: 'Delivered',
                                count: delivered,
                                color: 'bg-emerald-900 text-emerald-300 border-emerald-800',
                                desc: 'Real contact-form submission verified successful (1 credit deducted per delivery).',
                              },
                              {
                                label: 'Pending',
                                count: pending,
                                color: 'bg-zinc-900 text-zinc-300 border-zinc-700',
                                desc: 'Awaiting outreach processing window.',
                              },
                              {
                                label: 'Failed',
                                count: failed,
                                color: 'bg-rose-900 text-rose-300 border-rose-800',
                                desc: 'Form found but HTTP submission or verification failed (0 credits).',
                              },
                              {
                                label: 'No Form',
                                count: noForm,
                                color: 'bg-amber-900 text-amber-300 border-amber-800',
                                desc: 'Target website inspected but no public contact form verified (0 credits).',
                              },
                              {
                                label: 'Review Required',
                                count: reviewRequired,
                                color: 'bg-purple-900 text-purple-300 border-purple-800',
                                desc: 'CAPTCHA, bot protection, or field uncertainty routed to review (0 credits).',
                              },
                              {
                                label: 'Execution Error',
                                count: executionError,
                                color: 'bg-red-900 text-red-300 border-red-800',
                                desc: 'Browser launch, DNS timeout, or infrastructure runtime error (0 credits).',
                              },
                              {
                                label: 'Dry Run Completed',
                                count: dryRunCompleted,
                                color: 'bg-teal-900 text-teal-300 border-teal-800',
                                desc: 'Workflow simulation completed safely in test mode (0 credits).',
                              },
                            ].map((row, idx) => {
                              const pct = prospects > 0 ? Math.round((row.count / prospects) * 100) : 0;
                              return (
                                <tr key={idx} className="hover:bg-zinc-900 transition-colors">
                                  <td className="p-3">
                                    <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] border ${row.color}`}>
                                      {row.label}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-extrabold text-zinc-100">{row.count}</td>
                                  <td className="p-3 text-center font-bold text-zinc-300">{pct}%</td>
                                  <td className="p-3 text-[10px] text-zinc-400 font-sans">{row.desc}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Outreach Success Yield Performance Box */}
              <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950 space-y-2 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold font-mono">
                  <span className="text-zinc-300 uppercase tracking-wider">Outreach Deliverability Yield</span>
                  <span className="text-blue-400 font-extrabold text-sm">
                    {selectedReportCamp.prospects > 0 ? Math.round((selectedReportCamp.reached / selectedReportCamp.prospects) * 100) : 0}% Form Deliverability Rate ({selectedReportCamp.reached} / {selectedReportCamp.prospects})
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-zinc-900 overflow-hidden p-0.5 border border-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#0e6de4] transition-all duration-500"
                    style={{
                      width: `${selectedReportCamp.prospects > 0 ? Math.min(100, Math.round((selectedReportCamp.reached / selectedReportCamp.prospects) * 100)) : 0}%`,
                    }}
                  />
                </div>
                {(() => {
                  const logs = getCampaignAuditLogs(selectedReportCamp);
                  const validStarts = logs.map((l: any) => l.startedAt).filter(Boolean);
                  const validEnds = logs.map((l: any) => l.completedAt).filter(Boolean);
                  const startedAtStr = validStarts.length > 0 ? new Date(validStarts[0]).toLocaleString('en-GB') : selectedReportCamp.date;
                  const finishedAtStr = validEnds.length > 0 ? new Date(validEnds[validEnds.length - 1]).toLocaleString('en-GB') : (selectedReportCamp.status === 'active' ? 'In Progress' : 'Completed');
                  const totalMs = logs.reduce((acc: number, l: any) => acc + (l.durationMs || 0), 0);
                  const seconds = Math.floor(totalMs / 1000);
                  const mins = Math.floor(seconds / 60);
                  const durationStr = totalMs > 0 ? (mins > 0 ? `${mins}m ${seconds % 60}s` : `${seconds}s`) : 'N/A';

                  return (
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400 font-mono pt-1">
                      <span>Started At: <strong className="text-zinc-300">{startedAtStr}</strong></span>
                      <span>Finished At: <strong className="text-zinc-300">{finishedAtStr}</strong></span>
                      <span>Duration: <strong className="text-blue-400">{durationStr}</strong></span>
                    </div>
                  );
                })()}
              </div>

              {/* Execution Flow Diagram */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5 shadow-2xs">
                <div className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider font-mono">
                  Outreach Execution Flow Lifecycle
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-bold text-zinc-300">
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 shadow-2xs">Website</span>
                  <span className="text-zinc-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 shadow-2xs">Contact Page</span>
                  <span className="text-zinc-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 shadow-2xs">Form</span>
                  <span className="text-zinc-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 shadow-2xs">Fields</span>
                  <span className="text-zinc-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 shadow-2xs">Submission</span>
                  <span className="text-zinc-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 shadow-2xs">Verification</span>
                  <span className="text-zinc-400">→</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#0e6de4] text-white shadow-2xs font-extrabold">Final Status</span>
                </div>
              </div>

              {/* Collapsible Status Guide */}
              <div className="rounded-2xl border border-blue-900 bg-blue-950/40 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsStatusGuideOpen(!isStatusGuideOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left font-bold text-blue-400 hover:bg-blue-950/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span>Status Guide / What does this mean?</span>
                  </div>
                  <span className="text-xs font-mono font-normal text-zinc-400">
                    {isStatusGuideOpen ? 'Hide Guide ▲' : 'Show Guide ▼'}
                  </span>
                </button>

                {isStatusGuideOpen && (
                  <div className="p-4 border-t border-blue-900/80 bg-zinc-950 space-y-2 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-sans">
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-teal-900 text-teal-300 font-mono font-bold text-[10px]">
                            DRY_RUN_COMPLETED
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Website and form processing was completed in test/simulation mode; no real submission was made.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono font-bold text-[10px]">
                            DELIVERED
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          A real message was submitted to the website contact form and success was verified.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-300 font-mono font-bold text-[10px]">
                            SUBMISSION_FAILED
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          The website and contact form were found, but the real submission was not successfully completed or verified.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-300 font-mono font-bold text-[10px]">
                            UNREACHABLE
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          The target website could not be reached/loaded, such as DNS, timeout, or connection error.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-300 font-mono font-bold text-[10px]">
                            NO_FORM
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          The target website/contact page was successfully reached, but no contact form was found.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-300 font-mono font-bold text-[10px]">
                            REVIEW_REQUIRED
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          The website/form was found, but CAPTCHA, bot protection, required-field uncertainty, or another safety condition prevented automated submission.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Website Audit Breakdown Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <span>Target Website Audit Breakdown</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 font-normal">
                      {getCampaignAuditLogs(selectedReportCamp).length} Prospects Logged
                    </span>
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-mono">Canonical Telemetry Feed</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider font-mono">
                        <th className="p-2.5">Website Domain</th>
                        <th className="p-2.5">Website Status</th>
                        <th className="p-2.5">Contact Page URL</th>
                        <th className="p-2.5">Form Status</th>
                        <th className="p-2.5">Fields Detected</th>
                        <th className="p-2.5">Submission</th>
                        <th className="p-2.5">Verification</th>
                        <th className="p-2.5">Final Status</th>
                        <th className="p-2.5">Diagnostic</th>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 font-sans text-[11px]">
                      {getCampaignAuditLogs(selectedReportCamp).length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-xs font-mono text-zinc-400 bg-zinc-900/50">
                            No website audit records found for this campaign.
                          </td>
                        </tr>
                      ) : (
                        getCampaignAuditLogs(selectedReportCamp).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-blue-950/30 transition-colors">
                            <td className="p-2.5 font-bold text-zinc-100 font-mono">{item.domain}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                item.websiteStatus === 'Reachable'
                                  ? 'bg-emerald-900 text-emerald-300 border border-emerald-800'
                                  : item.websiteStatus === 'Unreachable'
                                  ? 'bg-rose-900 text-rose-300 border border-rose-800'
                                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                              }`}>
                                {item.websiteStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-zinc-400 font-mono text-[10px] max-w-[140px] truncate" title={item.url}>
                              {item.url}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                item.formStatus === 'DETECTED' ? 'bg-emerald-900 text-emerald-300' : 'bg-zinc-900 text-zinc-400'
                              }`}>
                                {item.formStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-zinc-400 text-[10px] max-w-[110px] truncate" title={item.fieldsDetected}>
                              {item.fieldsDetected}
                            </td>
                            <td className="p-2.5 font-mono text-[10px] font-semibold">{item.submissionStatus}</td>
                            <td className="p-2.5 font-mono text-[10px] text-zinc-400">{item.successVerification}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                item.finalStatus === 'DELIVERED' ? 'bg-emerald-900 text-emerald-300 border border-emerald-800' :
                                item.finalStatus === 'FAILED' || item.finalStatus === 'SUBMIT_FAILED' ? 'bg-rose-900 text-rose-300 border border-rose-800' :
                                item.finalStatus === 'NO_CONTACT_PAGE' || item.finalStatus === 'NO-FORM' ? 'bg-amber-900 text-amber-300 border border-amber-800' :
                                item.finalStatus === 'CAPTCHA_REVIEW' || item.finalStatus === 'REVIEW' ? 'bg-purple-900 text-purple-300 border border-purple-800' :
                                'bg-blue-900 text-blue-300 border border-blue-800'
                              }`}>
                                {item.finalStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-[10px] text-zinc-400 max-w-[130px] truncate font-mono" title={item.details || item.code}>
                              {item.details || item.code}
                            </td>
                            <td className="p-2.5 text-[10px] text-zinc-400 font-mono shrink-0">{item.time}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedProspectDetail(item)}
                                className="px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-blue-950 hover:border-blue-400 text-zinc-300 hover:text-blue-400 text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                                title="View detailed prospect telemetry log"
                              >
                                <Eye className="h-3 w-3 text-blue-400" />
                                <span>View Log</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800 shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExportSingleCampaignCSV(selectedReportCamp)}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 hover:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>Download Report CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSingleCampaignPDF(selectedReportCamp)}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-800 bg-blue-950 hover:bg-blue-900 px-4 py-2 text-xs font-bold text-blue-400 shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-blue-400" />
                  <span>Download Report PDF</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReportCamp(null)}
                className="rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white px-5 py-2 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROSPECT DETAILED TELEMETRY DRAWER / MODAL */}
      {selectedProspectDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-zinc-950 p-6 shadow-2xl border border-zinc-800 space-y-4 font-sans">
            {/* Prospect Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-950 text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-100 font-mono flex items-center gap-2">
                    <span>{selectedProspectDetail.domain}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      selectedProspectDetail.finalStatus === 'DELIVERED' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                    }`}>
                      {selectedProspectDetail.finalStatus}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono">Prospect Audit Telemetry Inspector</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProspectDetail(null)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Prospect Telemetry Body */}
            <div className="space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              {/* URLs & Target Details */}
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="font-bold text-zinc-300 uppercase tracking-wider text-[10px] font-mono">Target Website URLs</div>
                <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                  <div><span className="text-zinc-400">Domain:</span> <span className="font-bold text-zinc-100">{selectedProspectDetail.domain}</span></div>
                  <div><span className="text-zinc-400">Contact URL:</span> <a href={selectedProspectDetail.url} target="_blank" rel="noreferrer" className="text-blue-400 underline">{selectedProspectDetail.url}</a></div>
                </div>
              </div>

              {/* Form Inspection & Detection */}
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="font-bold text-zinc-300 uppercase tracking-wider text-[10px] font-mono">Form Detection & Field Mapping</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-zinc-400">Form Status:</span> <strong className="text-zinc-100 font-mono">{selectedProspectDetail.formStatus}</strong></div>
                  <div><span className="text-zinc-400">Fields Mapped:</span> <strong className="text-zinc-100">{selectedProspectDetail.fieldsDetected}</strong></div>
                  <div><span className="text-zinc-400">Tech Stack:</span> <span className="font-mono text-zinc-300">{selectedProspectDetail.techStack}</span></div>
                  <div><span className="text-zinc-400">Domain Registration/Age:</span> <span className="font-mono text-zinc-300">{selectedProspectDetail.domainAge}</span></div>
                </div>
              </div>

              {/* Submission Outcome & Verification */}
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="font-bold text-zinc-300 uppercase tracking-wider text-[10px] font-mono">Execution & Verification Details</div>
                <div className="space-y-1 text-[11px]">
                  <div><span className="text-zinc-400">Submission Outcome:</span> <strong className="text-zinc-100 font-mono">{selectedProspectDetail.submissionStatus}</strong></div>
                  <div><span className="text-zinc-400">Success Verification:</span> <strong className="text-emerald-300 font-mono">{selectedProspectDetail.successVerification}</strong></div>
                  <div><span className="text-zinc-400">Diagnostic Code:</span> <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200 font-mono">{selectedProspectDetail.code}</code></div>
                  <div><span className="text-zinc-400">Diagnostic Details:</span> <p className="mt-0.5 p-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-[10px] leading-relaxed">{selectedProspectDetail.details}</p></div>
                  <div className="pt-1 flex justify-between text-zinc-400 font-mono text-[10px]">
                    <span>Timestamp: {selectedProspectDetail.time}</span>
                    <span>Mode: {selectedProspectDetail.isDryRun ? 'Dry Run' : 'Live Submission'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProspectDetail(null)}
                className="rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

