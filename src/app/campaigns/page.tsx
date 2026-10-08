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
  const [reportDateRange, setReportDateRange] = useState<'7d' | '14d' | '30d' | 'all'>('all');
  const [activeChartSeries, setActiveChartSeries] = useState<{ [key: string]: boolean }>({
    delivered: true,
    processed: true,
    failed: true,
    noForm: true,
    review: true,
    executionError: true,
  });

  // Create Campaign Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('New Campaign');
  const [nameError, setNameError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [navigatingRoute, setNavigatingRoute] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select input text when modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      const activeAccount = (localStorage.getItem('active_account_email') || '').toLowerCase();
      const stored = localStorage.getItem('user_campaigns');
      const deletedIds: string[] = safeParseJSON(localStorage.getItem('user_deleted_campaign_ids'), []);
      const parsed = safeParseJSON<any[]>(stored, []);
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
    if (isCreating || navigatingRoute === 'new') return;
    setIsCreating(true);
    setNavigatingRoute('new');

    try {
      const activeAccount = (localStorage.getItem('active_account_email') || '').toLowerCase();
      const stored = localStorage.getItem('user_campaigns');
      const parsed = safeParseJSON<any[]>(stored, []);

      const trimmedInput = typeof customName === 'string' ? customName.trim() : newCampaignName.trim();
      const trimmedName = (trimmedInput && trimmedInput !== 'New Campaign')
        ? trimmedInput
        : generateNextUniqueCampaignName(campaigns.length > 0 ? campaigns : parsed);
      const newId = `camp-${Date.now()}`;

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

      const updated = [rawCampaign, ...parsed];
      localStorage.setItem('user_campaigns', JSON.stringify(updated));
      try {
        window.dispatchEvent(new Event('campaigns_updated'));
      } catch (e) {}

      setIsCreateModalOpen(false);
      const targetUrl = `/campaigns/new?id=${encodeURIComponent(newId)}`;

      try {
        router.prefetch(targetUrl);
      } catch (e) {}

      // Execute instant direct navigation without low-priority startTransition deferral
      router.push(targetUrl);

      // Fallback guard to guarantee instant navigation even under heavy dev server compilation
      setTimeout(() => {
        if (typeof window !== 'undefined' && !window.location.href.includes('/campaigns/new')) {
          window.location.assign(targetUrl);
        }
      }, 400);
    } catch (err) {
      console.error('Error creating new campaign:', err);
      setIsCreating(false);
      setNavigatingRoute(null);
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
      const stored = localStorage.getItem('user_campaigns');
      let mappedUserCamps: CampaignItem[] = [];

      if (stored) {
        const parsed = safeParseJSON<any[]>(stored, []);
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
        const stored = localStorage.getItem('user_campaigns');
        if (!stored) {
          isBusy = false;
          return;
        }

        const userCamps = safeParseJSON<any[]>(stored, []);
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
                const currentStored = localStorage.getItem('user_campaigns');
                if (currentStored) {
                  const currentCamps = safeParseJSON<any[]>(currentStored, []);
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

                    localStorage.setItem('user_campaigns', JSON.stringify(currentCamps));
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
              localStorage.setItem('user_campaigns', JSON.stringify(userCamps));
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
      const stored = localStorage.getItem('user_campaigns');
      if (stored) {
        const parsed = safeParseJSON<any[]>(stored, []);
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
      const stored = localStorage.getItem('user_campaigns');
      if (stored) {
        const parsed = safeParseJSON<any[]>(stored, []);
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
            const stored = localStorage.getItem('user_campaigns');
            if (stored) {
              const parsed = safeParseJSON<any[]>(stored, []);
              const updated = parsed.map((item: any) =>
                item && item.id === id ? { ...item, status: newStatus === 'active' ? 'running' : 'paused' } : item
              );
              localStorage.setItem('user_campaigns', JSON.stringify(updated));
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
      const remaining = campaigns.filter((c) => !selectedIds.includes(c.id));
      setCampaigns(remaining);
      setSelectedIds([]);

      try {
        const deletedIdsStr = localStorage.getItem('user_deleted_campaign_ids');
        const deletedIds: string[] = safeParseJSON(deletedIdsStr, []);
        const updatedDeleted = Array.from(new Set([...deletedIds, ...selectedIds]));
        localStorage.setItem('user_deleted_campaign_ids', JSON.stringify(updatedDeleted));

        const stored = localStorage.getItem('user_campaigns');
        if (stored) {
          const parsed = safeParseJSON<any[]>(stored, []);
          const updatedStored = parsed.filter((c: any) => c && !selectedIds.includes(c.id));
          localStorage.setItem('user_campaigns', JSON.stringify(updatedStored));
        }
      } catch (e) {
        console.error('Error updating localStorage after bulk delete:', e);
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
      const remaining = campaigns.filter((c) => c.id !== id);
      setCampaigns(remaining);
      setSelectedIds((prev) => prev.filter((item) => item !== id));

      try {
        const deletedIdsStr = localStorage.getItem('user_deleted_campaign_ids');
        const deletedIds: string[] = safeParseJSON(deletedIdsStr, []);
        if (!deletedIds.includes(id)) {
          deletedIds.push(id);
          localStorage.setItem('user_deleted_campaign_ids', JSON.stringify(deletedIds));
        }

        const stored = localStorage.getItem('user_campaigns');
        if (stored) {
          const parsed = safeParseJSON<any[]>(stored, []);
          const updatedStored = parsed.filter((c: any) => c && c.id !== id);
          localStorage.setItem('user_campaigns', JSON.stringify(updatedStored));
        }
      } catch (e) {
        console.error('Error updating localStorage after single delete:', e);
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
      const stored = localStorage.getItem('user_campaigns');
      const parsed = safeParseJSON<any[]>(stored, []);
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
      localStorage.setItem('user_campaigns', JSON.stringify(parsed));
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
      const stored = localStorage.getItem('user_campaigns');
      if (stored) {
        const parsed = safeParseJSON<any[]>(stored, []);
        const updated = parsed.map((c: any) =>
          c && c.id === campId ? { ...c, status: 'archived' } : c
        );
        localStorage.setItem('user_campaigns', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error archiving campaign in storage:', err);
    }
  };

  // Clear All Campaigns (Fresh Start)
  const handleClearAllCampaigns = () => {
    if (window.confirm('Are you sure you want to delete ALL campaigns and start completely fresh?')) {
      const allIds = campaigns.map((c) => c.id);
      setCampaigns([]);
      setSelectedIds([]);

      try {
        const deletedIdsStr = localStorage.getItem('user_deleted_campaign_ids');
        const deletedIds: string[] = safeParseJSON(deletedIdsStr, []);
        const updatedDeleted = Array.from(new Set([...deletedIds, ...allIds, 'camp-new', 'camp-01', 'camp-02', 'camp-03', 'camp-04']));
        localStorage.setItem('user_deleted_campaign_ids', JSON.stringify(updatedDeleted));
        localStorage.setItem('user_campaigns', JSON.stringify([]));
      } catch (e) {
        console.error('Error clearing all campaigns:', e);
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
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-5 lg:-mx-6 -mt-4 sm:-mt-5 lg:-mt-6 px-4 sm:px-5 lg:px-6 py-3 bg-[#f4f8fd]/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
        {/* Left Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={campaignSearch}
              onChange={(event) => setCampaignSearch(event.target.value)}
              placeholder="Search campaigns..."
              aria-label="Search campaigns by name"
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-700 shadow-2xs outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All Folders">All Folders</option>
              <option value="B2B SaaS">B2B SaaS</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Agencies">Agencies</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* All Tags */}
          <div className="relative">
            <select
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All Tags">All Tags</option>
              <option value="071928SAASC">071928SAASC</option>
              <option value="070326BRR">070326BRR</option>
              <option value="062226SAASHC">062226SAASHC</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* All Statuses */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
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
        </div>
      </div>

      {/* COMPACT CREATE CAMPAIGN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">Create Campaign</h2>
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setNameError(''); }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-[#0e6de4] focus:ring-2 focus:ring-[#0e6de4]/20 transition-all"
                />
                {nameError && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">{nameError}</p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setNameError(''); }}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
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
        <div className="flex items-center justify-between bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
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
              className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Campaigns Table with 8 Real Bulk Contact Outreach Columns (Responsive Wrapper) */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/40 p-1">
        <div className="min-w-[900px] lg:min-w-0 space-y-3">
          {/* Frozen / Sticky Table Header Columns */}
        <div className="sticky top-0 z-20 grid grid-cols-12 items-center px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono bg-slate-100/95 backdrop-blur-md border-y border-slate-200/90 shadow-2xs rounded-xl">
          <div className="col-span-3 flex items-center gap-3">
            <input
              type="checkbox"
              checked={paginatedCampaigns.length > 0 && paginatedCampaigns.every((campaign) => selectedIds.includes(campaign.id))}
              onChange={toggleSelectAll}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="font-extrabold text-slate-800">CAMPAIGNS</span>
          </div>

          <div className="col-span-1 text-center font-bold text-slate-700">
            <span>PROSPECTS</span>
          </div>

          <div className="col-span-1 text-center font-bold text-emerald-700">
            <span>DELIVERED</span>
          </div>

          <div className="col-span-1 text-center font-bold text-blue-700">
            <span>PENDING</span>
          </div>

          <div className="col-span-1 text-center font-bold text-rose-700">
            <span>FAILED</span>
          </div>

          <div className="col-span-1 text-center font-bold text-amber-700">
            <span>NO-FORM</span>
          </div>

          <div className="col-span-1 text-center font-bold text-purple-700">
            <span>REVIEW</span>
          </div>

          <div className="col-span-1 text-center font-bold text-indigo-700">
            <span>REPLIED</span>
          </div>

          <div className="col-span-2 text-center font-bold text-slate-600">
            <span>ACTIONS</span>
          </div>
        </div>

        {/* Campaign Rows */}
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              No campaigns found. Click{' '}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="font-bold text-blue-600 underline cursor-pointer"
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
                      ? 'border-blue-400 bg-blue-50/30'
                      : 'border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Col 1: Checkbox + Status Indicator + Name & Tags */}
                  <div className="col-span-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(camp.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(camp.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />

                    {/* Left Status Bar / Icon */}
                    <div className="flex items-center justify-center shrink-0">
                      {camp.status === 'active' && (
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200" title="Active Running">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[9px] font-extrabold text-emerald-700 tracking-wider font-mono uppercase">RUNNING</span>
                        </div>
                      )}
                      {camp.status === 'paused' && (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-400 flex items-center justify-center text-[9px] font-bold text-slate-500" title="Paused">
                          ⏸
                        </div>
                      )}
                      {camp.status === 'draft' && (
                        <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      {camp.status === 'archived' && (
                        <span title="Archived">
                          <Archive className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                      )}
                    </div>

                    {/* Campaign Name & Subtitle Meta */}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h3
                        className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate cursor-pointer hover:underline"
                        title="Click to view campaign details & telemetry report"
                      >
                        {camp.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                        <span>{camp.date}</span>
                        <span>•</span>
                        <span className="text-slate-500">✈ {formatSenderCount(camp.sendersCount)}</span>
                        {camp.status === 'active' && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold font-mono">
                              Progress {processedCount}/{camp.prospects}
                            </span>
                          </>
                        )}
                        {camp.tag && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                            {camp.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Col 2: PROSPECTS */}
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {camp.prospects}
                    </span>
                  </div>

                  {/* Col 3: DELIVERED */}
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-bold text-emerald-600 font-mono">
                      {camp.reached}{' '}
                      <span className="text-[10px] text-emerald-700 font-normal">
                        ({camp.prospects > 0 ? Math.round((camp.reached / camp.prospects) * 100) : 0}%)
                      </span>
                    </span>
                  </div>

                  {/* Col 4: PENDING */}
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-semibold text-blue-600 font-mono">
                      {pendingCount}
                    </span>
                  </div>

                  {/* Col 5: FAILED */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold font-mono ${camp.failed ? 'text-rose-600 font-bold' : 'text-slate-300'}`}>
                      {camp.failed || 0}
                    </span>
                  </div>

                  {/* Col 6: NO-FORM */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold font-mono ${camp.noContactPage ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                      {camp.noContactPage || 0}
                    </span>
                  </div>

                  {/* Col 7: REVIEW (CAPTCHA) */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold font-mono ${camp.captchaBlocked ? 'text-purple-600 font-bold' : 'text-slate-300'}`}>
                      {camp.captchaBlocked || 0}
                    </span>
                  </div>

                  {/* Col 8: REPLIED */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold font-mono ${camp.replied ? 'text-indigo-600 font-bold' : 'text-slate-300'}`}>
                      {camp.replied || 0}
                    </span>
                  </div>

                  {/* Col 9: ACTIONS (Toggle Switch + Edit + Analytics + Vertical Three-Dot Action Menu) */}
                  <div className="col-span-2 flex items-center justify-center gap-1.5 relative" onClick={(e) => e.stopPropagation()}>
                    {/* Active / Paused Toggle Switch */}
                    <button
                      onClick={(e) => toggleCampaignStatus(camp.id, e)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        camp.status === 'active' ? 'bg-[#2563EB]' : 'bg-slate-300'
                      }`}
                      title={camp.status === 'active' ? 'Click to Pause' : 'Click to Activate'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
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
                      className="p-1 rounded-lg text-slate-400 hover:text-[#0e6de4] hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
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
                      className="p-1 rounded-lg text-slate-400 hover:text-[#0e6de4] hover:bg-blue-50 transition-colors cursor-pointer"
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
                            ? 'bg-slate-100 text-slate-800'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Campaign Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Popover Action Menu */}
                      {openMenuCampId === camp.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white border border-slate-200 shadow-xl z-50 py-1 font-sans text-xs text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => handleCopyCampaign(camp.id, e)}
                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                            Copy Campaign
                          </button>
                          <button
                            onClick={(e) => handleArchiveCampaign(camp.id, e)}
                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            <Archive className="h-3.5 w-3.5 text-slate-400" />
                            Archive
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuCampId(null);
                              router.push(`/campaigns/new?id=${encodeURIComponent(camp.id)}`);
                            }}
                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                            Edit
                          </button>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            onClick={(e) => {
                              setOpenMenuCampId(null);
                              handleDeleteSingle(camp.id, e);
                            }}
                            className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
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

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-slate-600">
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
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
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
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {paginationItems.map((item, index) => item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-1.5 text-slate-400" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setCurrentPage(item)}
                aria-current={item === activePage ? 'page' : undefined}
                className={`min-w-7 rounded-lg px-2 py-1.5 font-bold transition-colors ${item === activePage ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={activePage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>

        {/* 3. Bottom Summary Row (Aggregating all 8 Contact Form Outreach Metrics) */}
        <div className="grid grid-cols-12 items-center px-6 py-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs">
          <div className="col-span-3 text-slate-600 font-sans">
            Showing {filtered.length} campaigns
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-slate-900">
            {totals.totalProspects}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-emerald-600">
            {totals.totalDelivered}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-blue-600">
            {totals.totalPending}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-rose-600">
            {totals.totalFailed}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-amber-600">
            {totals.totalNoForm}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-purple-600">
            {totals.totalCaptcha}
          </div>

          <div className="col-span-1 text-center font-mono font-bold text-indigo-600">
            {totals.totalReplied}
          </div>

          <div className="col-span-2 text-center text-[10px] text-slate-400 font-mono">
            Total Totals
          </div>
        </div>
      </div>
    </div>

      {/* DETAILED CAMPAIGN GRAPH & METRICS REPORT MODAL */}
      {selectedReportCamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-[#0e6de4]">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{selectedReportCamp.name}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0e6de4] font-mono font-bold">
                      {selectedReportCamp.status.toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Campaign ID: {selectedReportCamp.id} • Created: {selectedReportCamp.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/campaigns/new?id=${encodeURIComponent(selectedReportCamp.id)}`)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit Campaign</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSingleCampaignCSV(selectedReportCamp)}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
                  title="Download CSV Report"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
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
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer ml-1"
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

                // Filter logs by date range selector
                const now = new Date();
                let cutoffDate: Date | null = null;
                if (reportDateRange === '7d') cutoffDate = new Date(now.getTime() - 7 * 86400000);
                else if (reportDateRange === '14d') cutoffDate = new Date(now.getTime() - 14 * 86400000);
                else if (reportDateRange === '30d') cutoffDate = new Date(now.getTime() - 30 * 86400000);

                const dailyMetricsMap: Record<string, {
                  dateLabel: string;
                  rawDate: string;
                  processed: number;
                  delivered: number;
                  failed: number;
                  noForm: number;
                  review: number;
                  executionError: number;
                  dryRun: number;
                }> = {};

                logs.forEach((l: any) => {
                  const rawTime = l.startedAt || l.timestamp || l.completedAt;
                  let d = new Date();
                  if (rawTime) {
                    const parsed = new Date(rawTime);
                    if (!isNaN(parsed.getTime())) d = parsed;
                  }
                  if (cutoffDate && d < cutoffDate) return;

                  const isoDate = d.toISOString().slice(0, 10);
                  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  if (!dailyMetricsMap[isoDate]) {
                    dailyMetricsMap[isoDate] = {
                      dateLabel,
                      rawDate: isoDate,
                      processed: 0,
                      delivered: 0,
                      failed: 0,
                      noForm: 0,
                      review: 0,
                      executionError: 0,
                      dryRun: 0,
                    };
                  }

                  const st = String(l.finalStatus || l.status || '').toUpperCase();
                  const code = String(l.code || l.details || '');
                  const isExecErr = code.includes('EXECUTION_ERROR') || code.includes('BROWSER_LAUNCH_FAILED');

                  dailyMetricsMap[isoDate].processed += 1;
                  if (st === 'DELIVERED') dailyMetricsMap[isoDate].delivered += 1;
                  else if (st === 'DRY_RUN_COMPLETED') dailyMetricsMap[isoDate].dryRun += 1;
                  else if (isExecErr) dailyMetricsMap[isoDate].executionError += 1;
                  else if (st === 'FAILED' || st === 'SUBMIT_FAILED') dailyMetricsMap[isoDate].failed += 1;
                  else if (st === 'NO_CONTACT_PAGE' || st === 'NO-FORM') dailyMetricsMap[isoDate].noForm += 1;
                  else if (st === 'CAPTCHA_REVIEW' || st === 'REVIEW' || st === 'CAPTCHA_DETECTED') dailyMetricsMap[isoDate].review += 1;
                });

                const chartSeriesData = Object.values(dailyMetricsMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

                return (
                  <>
                    {/* 1. CONTACTREACHOUT 9 KPI METRICS GRID */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 font-mono">
                      <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Prospects</span>
                        <p className="text-lg font-extrabold text-slate-900">{prospects}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Processed</span>
                        <p className="text-lg font-extrabold text-slate-900">{processed}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-blue-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-[#0e6de4] uppercase tracking-wider block">Delivered</span>
                        <p className="text-lg font-extrabold text-[#0e6de4]">{delivered}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending</span>
                        <p className="text-lg font-extrabold text-slate-700">{pending}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Failed</span>
                        <p className="text-lg font-extrabold text-slate-800">{failed}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">No Form</span>
                        <p className="text-lg font-extrabold text-slate-800">{noForm}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Review Req</span>
                        <p className="text-lg font-extrabold text-slate-800">{reviewRequired}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Exec Error</span>
                        <p className="text-lg font-extrabold text-slate-800">{executionError}</p>
                      </div>

                      <div className="p-3 rounded-2xl border border-blue-200 bg-white shadow-2xs space-y-1">
                        <span className="text-[10px] font-bold text-[#0e6de4] uppercase tracking-wider block">Credits Used</span>
                        <p className="text-lg font-extrabold text-[#0e6de4]">{creditsUsed}</p>
                      </div>
                    </div>

                    {/* 2. MAIN GRAPH: CAMPAIGN ACTIVITY & RESULTS BY DATE */}
                    <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-[#0e6de4]" />
                            <span>Campaign Activity & Results by Date</span>
                          </h4>
                          <p className="text-xs text-slate-500 font-sans mt-0.5">
                            Daily timeline of website contact-form processing and verification outcomes.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 font-mono">Date Range:</span>
                          <select
                            value={reportDateRange}
                            onChange={(e) => setReportDateRange(e.target.value as any)}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-[#0e6de4] outline-none cursor-pointer font-mono"
                          >
                            <option value="7d">Last 7 Days</option>
                            <option value="14d">Last 14 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Available Days</option>
                          </select>
                        </div>
                      </div>

                      {/* Interactive Legend */}
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        {[
                          { key: 'delivered', label: 'Delivered', color: 'bg-[#0e6de4]' },
                          { key: 'processed', label: 'Processed', color: 'bg-slate-700' },
                          { key: 'failed', label: 'Failed', color: 'bg-rose-500' },
                          { key: 'noForm', label: 'No Form', color: 'bg-amber-500' },
                          { key: 'review', label: 'Review Req', color: 'bg-purple-500' },
                          { key: 'executionError', label: 'Exec Error', color: 'bg-red-600' },
                        ].map((s) => {
                          const isActive = activeChartSeries[s.key] !== false;
                          return (
                            <button
                              key={s.key}
                              type="button"
                              onClick={() =>
                                setActiveChartSeries((prev) => ({
                                  ...prev,
                                  [s.key]: !isActive,
                                }))
                              }
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none ${
                                isActive
                                  ? 'bg-slate-50 border-slate-300 font-bold text-slate-800'
                                  : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-60'
                              }`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                              <span>{s.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* SVG Line Chart / Empty State */}
                      {chartSeriesData.length === 0 || processed === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-2">
                          <BarChart2 className="h-10 w-10 text-slate-300" />
                          <p className="text-sm font-bold text-slate-700">No campaign activity yet</p>
                          <p className="text-xs text-slate-500 max-w-sm">
                            {prospects > 0
                              ? `Campaign contains ${prospects} prospects available. Results will appear here automatically after processing begins.`
                              : 'Add prospects to this campaign to start website outreach and track daily performance.'}
                          </p>
                        </div>
                      ) : (
                        <div className="relative w-full h-64 bg-slate-50/40 rounded-2xl p-4 border border-slate-200/80">
                          {(() => {
                            const padding = { top: 20, right: 30, bottom: 35, left: 40 };
                            const width = 800;
                            const height = 200;
                            const chartW = width - padding.left - padding.right;
                            const chartH = height - padding.top - padding.bottom;

                            const maxY = Math.max(
                              10,
                              ...chartSeriesData.flatMap((d) => [
                                d.processed,
                                d.delivered,
                                d.failed,
                                d.noForm,
                                d.review,
                                d.executionError,
                              ])
                            );

                            const pointsCount = chartSeriesData.length;
                            const getX = (idx: number) =>
                              padding.left + (pointsCount > 1 ? (idx / (pointsCount - 1)) * chartW : chartW / 2);
                            const getY = (val: number) =>
                              padding.top + chartH - (val / maxY) * chartH;

                            const seriesKeys: Array<{ key: keyof typeof chartSeriesData[0]; color: string }> = [
                              { key: 'processed', color: '#334155' },
                              { key: 'delivered', color: '#0e6de4' },
                              { key: 'failed', color: '#f43f5e' },
                              { key: 'noForm', color: '#f59e0b' },
                              { key: 'review', color: '#a855f7' },
                              { key: 'executionError', color: '#dc2626' },
                            ];

                            return (
                              <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                                {/* Grid Horizontal Lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                  const y = padding.top + chartH * (1 - ratio);
                                  const labelVal = Math.round(maxY * ratio);
                                  return (
                                    <g key={i}>
                                      <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                                      <text x={padding.left - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                                        {labelVal}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Lines & Dots for each series */}
                                {seriesKeys.map(({ key, color }) => {
                                  if (activeChartSeries[key] === false) return null;
                                  const points = chartSeriesData.map((d, idx) => ({
                                    x: getX(idx),
                                    y: getY(Number(d[key]) || 0),
                                    val: Number(d[key]) || 0,
                                  }));

                                  const pathD = points.reduce(
                                    (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                                    ''
                                  );

                                  return (
                                    <g key={key}>
                                      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                      {points.map((p, idx) => (
                                        <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke={color} strokeWidth="2">
                                          <title>{`${chartSeriesData[idx].dateLabel} - ${key}: ${p.val}`}</title>
                                        </circle>
                                      ))}
                                    </g>
                                  );
                                })}

                                {/* X-Axis Labels */}
                                {chartSeriesData.map((d, idx) => (
                                  <text key={idx} x={getX(idx)} y={height - 8} textAnchor="middle" className="text-[9px] fill-slate-500 font-mono font-bold">
                                    {d.dateLabel}
                                  </text>
                                ))}
                              </svg>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* 3. OUTCOME BREAKDOWN TABLE */}
                    <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0e6de4]" />
                          <span>OUTCOME BREAKDOWN</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">Calculated from total {prospects} prospects</span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-xs font-sans border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider font-mono">
                              <th className="p-3">Outcome</th>
                              <th className="p-3 text-center">Count</th>
                              <th className="p-3 text-center">Percentage</th>
                              <th className="p-3">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {[
                              {
                                label: 'Delivered',
                                count: delivered,
                                color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                                desc: 'Real contact-form submission verified successful (1 credit deducted per delivery).',
                              },
                              {
                                label: 'Pending',
                                count: pending,
                                color: 'bg-slate-100 text-slate-700 border-slate-300',
                                desc: 'Awaiting outreach processing window.',
                              },
                              {
                                label: 'Failed',
                                count: failed,
                                color: 'bg-rose-100 text-rose-800 border-rose-300',
                                desc: 'Form found but HTTP submission or verification failed (0 credits).',
                              },
                              {
                                label: 'No Form',
                                count: noForm,
                                color: 'bg-amber-100 text-amber-800 border-amber-300',
                                desc: 'Target website inspected but no public contact form verified (0 credits).',
                              },
                              {
                                label: 'Review Required',
                                count: reviewRequired,
                                color: 'bg-purple-100 text-purple-800 border-purple-300',
                                desc: 'CAPTCHA, bot protection, or field uncertainty routed to review (0 credits).',
                              },
                              {
                                label: 'Execution Error',
                                count: executionError,
                                color: 'bg-red-100 text-red-800 border-red-300',
                                desc: 'Browser launch, DNS timeout, or infrastructure runtime error (0 credits).',
                              },
                              {
                                label: 'Dry Run Completed',
                                count: dryRunCompleted,
                                color: 'bg-teal-100 text-teal-800 border-teal-300',
                                desc: 'Workflow simulation completed safely in test mode (0 credits).',
                              },
                            ].map((row, idx) => {
                              const pct = prospects > 0 ? Math.round((row.count / prospects) * 100) : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="p-3">
                                    <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] border ${row.color}`}>
                                      {row.label}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center font-extrabold text-slate-900">{row.count}</td>
                                  <td className="p-3 text-center font-bold text-slate-700">{pct}%</td>
                                  <td className="p-3 text-[10px] text-slate-500 font-sans">{row.desc}</td>
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
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold font-mono">
                  <span className="text-slate-700 uppercase tracking-wider">Outreach Deliverability Yield</span>
                  <span className="text-[#0e6de4] font-extrabold text-sm">
                    {selectedReportCamp.prospects > 0 ? Math.round((selectedReportCamp.reached / selectedReportCamp.prospects) * 100) : 0}% Form Deliverability Rate ({selectedReportCamp.reached} / {selectedReportCamp.prospects})
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
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
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                      <span>Started At: <strong className="text-slate-700">{startedAtStr}</strong></span>
                      <span>Finished At: <strong className="text-slate-700">{finishedAtStr}</strong></span>
                      <span>Duration: <strong className="text-blue-600">{durationStr}</strong></span>
                    </div>
                  );
                })()}
              </div>

              {/* Execution Flow Diagram */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                  Outreach Execution Flow Lifecycle
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono font-bold text-slate-700">
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs">Website</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs">Contact Page</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs">Form</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs">Fields</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs">Submission</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs">Verification</span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#0e6de4] text-white shadow-2xs font-extrabold">Final Status</span>
                </div>
              </div>

              {/* Collapsible Status Guide */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsStatusGuideOpen(!isStatusGuideOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left font-bold text-[#0e6de4] hover:bg-blue-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-[#0e6de4]" />
                    <span>Status Guide / What does this mean?</span>
                  </div>
                  <span className="text-xs font-mono font-normal text-slate-500">
                    {isStatusGuideOpen ? 'Hide Guide ▲' : 'Show Guide ▼'}
                  </span>
                </button>

                {isStatusGuideOpen && (
                  <div className="p-4 border-t border-blue-100/80 bg-white space-y-2 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-sans">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-mono font-bold text-[10px]">
                            DRY_RUN_COMPLETED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Website and form processing was completed in test/simulation mode; no real submission was made.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                            DELIVERED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          A real message was submitted to the website contact form and success was verified.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold text-[10px]">
                            SUBMISSION_FAILED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          The website and contact form were found, but the real submission was not successfully completed or verified.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[10px]">
                            UNREACHABLE
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          The target website could not be reached/loaded, such as DNS, timeout, or connection error.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[10px]">
                            NO_FORM
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          The target website/contact page was successfully reached, but no contact form was found.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono font-bold text-[10px]">
                            REVIEW_REQUIRED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
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
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
                    <span>Target Website Audit Breakdown</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                      {getCampaignAuditLogs(selectedReportCamp).length} Prospects Logged
                    </span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Canonical Telemetry Feed</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider font-mono">
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
                    <tbody className="divide-y divide-slate-100 font-sans text-[11px]">
                      {getCampaignAuditLogs(selectedReportCamp).length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-xs font-mono text-slate-500 bg-slate-50/50">
                            No website audit records found for this campaign.
                          </td>
                        </tr>
                      ) : (
                        getCampaignAuditLogs(selectedReportCamp).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-2.5 font-bold text-slate-900 font-mono">{item.domain}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                item.websiteStatus === 'Reachable'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : item.websiteStatus === 'Unreachable'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {item.websiteStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 font-mono text-[10px] max-w-[140px] truncate" title={item.url}>
                              {item.url}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                item.formStatus === 'DETECTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.formStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 text-[10px] max-w-[110px] truncate" title={item.fieldsDetected}>
                              {item.fieldsDetected}
                            </td>
                            <td className="p-2.5 font-mono text-[10px] font-semibold">{item.submissionStatus}</td>
                            <td className="p-2.5 font-mono text-[10px] text-slate-600">{item.successVerification}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                item.finalStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                item.finalStatus === 'FAILED' || item.finalStatus === 'SUBMIT_FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                item.finalStatus === 'NO_CONTACT_PAGE' || item.finalStatus === 'NO-FORM' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                item.finalStatus === 'CAPTCHA_REVIEW' || item.finalStatus === 'REVIEW' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                                'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}>
                                {item.finalStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-[10px] text-slate-500 max-w-[130px] truncate font-mono" title={item.details || item.code}>
                              {item.details || item.code}
                            </td>
                            <td className="p-2.5 text-[10px] text-slate-400 font-mono shrink-0">{item.time}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedProspectDetail(item)}
                                className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-400 text-slate-700 hover:text-[#0e6de4] text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                                title="View detailed prospect telemetry log"
                              >
                                <Eye className="h-3 w-3 text-[#0e6de4]" />
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
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExportSingleCampaignCSV(selectedReportCamp)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span>Download Report CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSingleCampaignPDF(selectedReportCamp)}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 px-4 py-2 text-xs font-bold text-[#0e6de4] shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-[#0e6de4]" />
                  <span>Download Report PDF</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReportCamp(null)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
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
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 font-sans">
            {/* Prospect Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
                    <span>{selectedProspectDetail.domain}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      selectedProspectDetail.finalStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedProspectDetail.finalStatus}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">Prospect Audit Telemetry Inspector</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProspectDetail(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Prospect Telemetry Body */}
            <div className="space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              {/* URLs & Target Details */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-mono">Target Website URLs</div>
                <div className="grid grid-cols-1 gap-1 font-mono text-[11px]">
                  <div><span className="text-slate-500">Domain:</span> <span className="font-bold text-slate-900">{selectedProspectDetail.domain}</span></div>
                  <div><span className="text-slate-500">Contact URL:</span> <a href={selectedProspectDetail.url} target="_blank" rel="noreferrer" className="text-[#0e6de4] underline">{selectedProspectDetail.url}</a></div>
                </div>
              </div>

              {/* Form Inspection & Detection */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-mono">Form Detection & Field Mapping</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-slate-500">Form Status:</span> <strong className="text-slate-900 font-mono">{selectedProspectDetail.formStatus}</strong></div>
                  <div><span className="text-slate-500">Fields Mapped:</span> <strong className="text-slate-900">{selectedProspectDetail.fieldsDetected}</strong></div>
                  <div><span className="text-slate-500">Tech Stack:</span> <span className="font-mono text-slate-700">{selectedProspectDetail.techStack}</span></div>
                  <div><span className="text-slate-500">Domain Registration/Age:</span> <span className="font-mono text-slate-700">{selectedProspectDetail.domainAge}</span></div>
                </div>
              </div>

              {/* Submission Outcome & Verification */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-mono">Execution & Verification Details</div>
                <div className="space-y-1 text-[11px]">
                  <div><span className="text-slate-500">Submission Outcome:</span> <strong className="text-slate-900 font-mono">{selectedProspectDetail.submissionStatus}</strong></div>
                  <div><span className="text-slate-500">Success Verification:</span> <strong className="text-emerald-700 font-mono">{selectedProspectDetail.successVerification}</strong></div>
                  <div><span className="text-slate-500">Diagnostic Code:</span> <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">{selectedProspectDetail.code}</code></div>
                  <div><span className="text-slate-500">Diagnostic Details:</span> <p className="mt-0.5 p-2 rounded bg-white border border-slate-200 text-slate-800 font-mono text-[10px] leading-relaxed">{selectedProspectDetail.details}</p></div>
                  <div className="pt-1 flex justify-between text-slate-500 font-mono text-[10px]">
                    <span>Timestamp: {selectedProspectDetail.time}</span>
                    <span>Mode: {selectedProspectDetail.isDryRun ? 'Dry Run' : 'Live Submission'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProspectDetail(null)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
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

