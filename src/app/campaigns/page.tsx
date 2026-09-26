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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CampaignItem {
  id: string;
  name: string;
  date: string;
  sendersCount: number;
  tag?: string;
  status: 'active' | 'paused' | 'draft' | 'archived';
  prospects: number;
  reached: number;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedReportCamp, setSelectedReportCamp] = useState<CampaignItem | null>(null);
  const [openMenuCampId, setOpenMenuCampId] = useState<string | null>(null);

  // Create Campaign Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('New Campaign');
  const [nameError, setNameError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select input text when modal opens
  useEffect(() => {
    if (isCreateModalOpen) {
      setNewCampaignName('New Campaign');
      setNameError('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isCreateModalOpen]);

  // Create Campaign submit handler
  const handleCreateCampaignSubmit = () => {
    const trimmedName = newCampaignName.trim();
    if (!trimmedName) {
      setNameError('Campaign name is required.');
      return;
    }
    if (isCreating) return;
    setIsCreating(true);

    try {
      const activeAccount = (localStorage.getItem('active_account_email') || '').toLowerCase();
      const newId = `camp-${Date.now()}`;
      const todayDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const newCampItem: CampaignItem = {
        id: newId,
        name: trimmedName,
        date: todayDate,
        sendersCount: 3,
        tag: 'CUSTOM',
        status: 'draft',
        prospects: 0,
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

      const stored = localStorage.getItem('user_campaigns');
      const parsed = safeParseJSON<any[]>(stored, []);
      parsed.unshift(rawCampaign);
      localStorage.setItem('user_campaigns', JSON.stringify(parsed));

      setCampaigns((prev) => [newCampItem, ...prev]);
      setIsCreateModalOpen(false);
      setIsCreating(false);
      router.push(`/campaigns/new?id=${encodeURIComponent(newId)}`);
    } catch (err) {
      console.error('Error creating new campaign:', err);
      setIsCreating(false);
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
                  // Normal User: check owner match (allow if ownerEmail is not set or matches userEmail)
                  const owner = typeof c.ownerEmail === 'string' ? c.ownerEmail.toLowerCase().trim() : '';
                  if (owner && owner !== userEmail.toLowerCase().trim()) return false;
                }
                return true;
              })
              .map((c: any) => {
                const total = Array.isArray(c.prospectsList)
                  ? c.prospectsList.length
                  : typeof c.totalLeads === 'number'
                  ? c.totalLeads
                  : typeof c.prospects === 'number'
                  ? c.prospects
                  : Number(c.totalLeads) || Number(c.prospects) || 0;

                const sent = typeof c.sentCount === 'number' ? c.sentCount : typeof c.reached === 'number' ? c.reached : Number(c.sentCount) || Number(c.reached) || 0;
                const failed = typeof c.failedCount === 'number' ? c.failedCount : typeof c.failed === 'number' ? c.failed : Number(c.failedCount) || Number(c.failed) || 0;
                const noForm = typeof c.noFormCount === 'number' ? c.noFormCount : typeof c.noContactPage === 'number' ? c.noContactPage : Number(c.noFormCount) || Number(c.noContactPage) || 0;
                const captcha = typeof c.captchaCount === 'number' ? c.captchaCount : typeof c.captchaBlocked === 'number' ? c.captchaBlocked : Number(c.captchaCount) || Number(c.captchaBlocked) || 0;
                const replied = typeof c.repliedCount === 'number' ? c.repliedCount : typeof c.replied === 'number' ? c.replied : Number(c.repliedCount) || Number(c.replied) || 0;

                const dateStr = safeFormatDate(c.createdAt, 'Recently');

                return {
                  id: String(c.id || `camp-${Date.now()}`),
                  name: String(c.name || 'Untitled Campaign'),
                  date: dateStr,
                  sendersCount: typeof c.sendersCount === 'number' ? c.sendersCount : 3,
                  tag: String(c.tag || 'CUSTOM'),
                  status: c.status === 'running' || c.status === 'active' ? 'active' : c.status === 'paused' ? 'paused' : c.status === 'archived' ? 'archived' : 'draft',
                  prospects: total,
                  reached: sent,
                  failed,
                  noContactPage: noForm,
                  captchaBlocked: captcha,
                  reachedPercent: total > 0 ? Math.round((sent / total) * 100) : 0,
                  replied,
                };
              });
          }
        }

        if (isAdmin) {
          const filteredInitial = initialCampaignsList.filter((c) => c && c.id && !deletedIds.includes(c.id));
          const customIds = new Set(mappedUserCamps.map((c) => c.id));
          const combined = [
            ...mappedUserCamps,
            ...filteredInitial.filter((c) => !customIds.has(c.id)),
          ];
          setCampaigns(combined);
        } else {
          setCampaigns(mappedUserCamps);
        }
      } catch (err) {
        console.error('Error reading campaigns in page:', err);
      }
    }

    loadSessionAndCampaigns();
  }, []);

  // Real Active Campaign Pacing Execution (Server Validated)
  useEffect(() => {
    let isBusy = false;

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

        let updatedAny = false;

        for (const rawCamp of userCamps) {
          if (!rawCamp || typeof rawCamp !== 'object') continue;
          if (rawCamp.status !== 'running' && rawCamp.status !== 'active') continue;

          const leads: any[] = Array.isArray(rawCamp.prospectsList) ? rawCamp.prospectsList : [];
          const logs: any[] = Array.isArray(rawCamp.logs) ? rawCamp.logs : [];
          const processedLeadIds = new Set(logs.map((l: any) => (l && (l.leadId || l.id)) || ''));

          // Find next uncontacted lead in sequence
          const nextLead = leads.find((l: any) => l && l.id && !processedLeadIds.has(l.id));

          if (nextLead) {
            const template = {
              id: 'tpl-default',
              subjectTemplate: rawCamp.sequences?.[0]?.subject || 'Partnership Inquiry',
              bodyTemplate: rawCamp.sequences?.[0]?.body || 'Hello {{first_name}}, reaching out to {{company_name}}.',
            };

            const res = await fetch('/api/campaigns/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                campaignId: rawCamp.id,
                lead: {
                  id: nextLead.id,
                  company_name: nextLead.companyName || nextLead.company_name || nextLead.domain || 'Target Business',
                  website: nextLead.website || (nextLead.domain ? `https://${nextLead.domain}` : ''),
                  first_name: nextLead.firstName || nextLead.first_name || '',
                  email: nextLead.email || '',
                },
                template,
                options: {
                  dryRun: Boolean(rawCamp.isDryRun),
                  schedule: rawCamp.schedule,
                },
              }),
            });

            if (res.status === 402) {
              // Blocked due to 0 credits! Pause campaign automatically.
              rawCamp.status = 'paused';
              rawCamp.logs = [
                {
                  leadId: nextLead.id,
                  domain: nextLead.website || 'N/A',
                  status: 'FAILED',
                  code: 'BLOCKED_NO_CREDITS - Available credit balance is 0. Campaign paused.',
                  time: safeFormatTime(new Date()),
                  timestamp: new Date().toISOString(),
                },
                ...logs,
              ];
              updatedAny = true;
              break;
            }

            if (res.ok) {
              const data = await res.json();
              if (data.telemetry) {
                rawCamp.logs = [data.telemetry, ...logs];
                if (data.telemetry.status === 'DELIVERED' || data.telemetry.status === 'DRY_RUN_COMPLETED') {
                  rawCamp.sentCount = (rawCamp.sentCount || 0) + 1;
                } else if (data.telemetry.status === 'FAILED') {
                  rawCamp.failedCount = (rawCamp.failedCount || 0) + 1;
                } else if (data.telemetry.status === 'NO-FORM') {
                  rawCamp.noFormCount = (rawCamp.noFormCount || 0) + 1;
                } else if (data.telemetry.status === 'REVIEW') {
                  rawCamp.captchaCount = (rawCamp.captchaCount || 0) + 1;
                }
                updatedAny = true;
              }
            }
          } else if (leads.length > 0 && processedLeadIds.size >= leads.length) {
            // All leads in this campaign have been processed
            rawCamp.status = 'paused';
            updatedAny = true;
          }
        }

        if (updatedAny) {
          localStorage.setItem('user_campaigns', JSON.stringify(userCamps));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error('Real campaign processing error:', err);
      } finally {
        isBusy = false;
      }
    };

    const interval = setInterval(processActiveCampaigns, 6000);
    return () => clearInterval(interval);
  }, []);

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
              .map((log: any) => ({
                domain: safeString(log.domain || log.website),
                url: safeString(log.url || log.contactUrl),
                techStack: safeString(log.techStack || log.cms, 'HTML Form'),
                domainAge: safeString(log.domainAge, 'Verified'),
                lastUpdated: safeString(log.lastUpdated, safeFormatDate(new Date())),
                status: safeString(log.status, 'PENDING'),
                code: safeString(log.code || log.diagnostic),
                time: safeFormatTime(log.time || log.timestamp),
                isDryRun: Boolean(log.isDryRun),
              }));
          }

          // Check if campaign has prospect list records that are unprocessed
          if (rawCamp && Array.isArray(rawCamp.prospectsList) && rawCamp.prospectsList.length > 0) {
            return rawCamp.prospectsList
              .filter((ld: any) => ld && typeof ld === 'object')
              .map((ld: any) => {
                const rawDomain = safeString(ld.website || ld.domain, '');
                const domain = rawDomain && rawDomain !== 'N/A' ? (rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`) : 'N/A';
                return {
                  domain,
                  url: safeString(ld.contactUrl, domain !== 'N/A' ? `${domain.replace(/\/$/, '')}/contact` : 'N/A'),
                  techStack: safeString(ld.techStack, 'HTML Form'),
                  domainAge: 'Verified',
                  lastUpdated: safeFormatDate(new Date()),
                  status: safeString(ld.status, 'PENDING'),
                  code: 'Queued in pacing worker line',
                  time: safeFormatTime(ld.createdAt, 'Awaiting execution'),
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

  // Export Dedicated Single Campaign CSV Report with Flat Horizontal Excel Columns (19 Columns)
  const handleExportSingleCampaignCSV = (camp: CampaignItem) => {
    if (!camp || !isActionAuthorized(camp.id)) {
      alert('Unauthorized: You do not have permission to export telemetry for this campaign.');
      return;
    }

    const auditLogs = getCampaignAuditLogs(camp);
    const delivered = camp.reached || 0;
    const failed = camp.failed || 0;
    const noPage = camp.noContactPage || 0;
    const captcha = camp.captchaBlocked || 0;
    const pending = Math.max(0, camp.prospects - delivered - failed - noPage - captcha);
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
      'Failed Submissions',
      'No Contact Page Found',
      'CAPTCHA / Review Required',
      'Pending',
      'Success Yield %',
      'Website Domain',
      'Contact Page URL',
      'Detected Tech Stack (CMS/Framework)',
      'Domain Registration Date / Age',
      'Last Website Edit Date',
      'Outreach Status',
      'Diagnostic Code / Details',
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
          failed,
          noPage,
          captcha,
          pending,
          `"${yieldPct}%"`,
          `"${safeString(log.domain).replace(/"/g, '""')}"`,
          `"${safeString(log.url).replace(/"/g, '""')}"`,
          `"${safeString(log.techStack).replace(/"/g, '""')}"`,
          `"${safeString(log.domainAge).replace(/"/g, '""')}"`,
          `"${safeString(log.lastUpdated).replace(/"/g, '""')}"`,
          `"${safeString(log.status).replace(/"/g, '""')}"`,
          `"${safeString(log.code).replace(/"/g, '""')}"`,
          `"${safeString(log.time).replace(/"/g, '""')}"`,
        ])
      : [[
          `"${campNameSafe.replace(/"/g, '""')}"`,
          `"${campIdSafe}"`,
          `"${campDateSafe}"`,
          `"${campStatusSafe}"`,
          camp.prospects || 0,
          delivered,
          failed,
          noPage,
          captcha,
          pending,
          `"${yieldPct}%"`,
          '"N/A"',
          '"N/A"',
          '"Not detected"',
          '"N/A"',
          '"N/A"',
          '"N/A"',
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

  // Export All Campaign Summary Reports as CSV
  const handleExportCSV = () => {
    const headers = [
      'Campaign ID',
      'Campaign Name',
      'Date',
      'Status',
      'Total Prospects',
      'Sent (Form Delivered)',
      'Failed Submissions',
      'No Contact Page Found',
      'CAPTCHA / Review Blocked',
      'Pending',
      'Success Yield %',
    ];
    const rows = campaigns.map((c) => {
      const delivered = c.reached || 0;
      const failed = c.failed || 0;
      const noPage = c.noContactPage || 0;
      const captcha = c.captchaBlocked || 0;
      const pending = Math.max(0, c.prospects - delivered - failed - noPage - captcha);
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
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
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
  }, [campaigns, tagFilter, folderFilter, statusFilter]);

  // Calculate Column Totals for Bulk Contact Outreach (memoized)
  const totals = React.useMemo(() => {
    const totalProspects = filtered.reduce((acc, c) => acc + (c.prospects || 0), 0);
    const totalDelivered = filtered.reduce((acc, c) => acc + (c.reached || 0), 0);
    const totalFailed = filtered.reduce((acc, c) => acc + (c.failed || 0), 0);
    const totalNoForm = filtered.reduce((acc, c) => acc + (c.noContactPage || 0), 0);
    const totalCaptcha = filtered.reduce((acc, c) => acc + (c.captchaBlocked || 0), 0);
    const totalPending = filtered.reduce((acc, c) => acc + Math.max(0, c.prospects - (c.reached || 0) - (c.failed || 0) - (c.noContactPage || 0) - (c.captchaBlocked || 0)), 0);
    const totalReplied = filtered.reduce((acc, c) => acc + (c.replied || 0), 0);
    return { totalProspects, totalDelivered, totalFailed, totalNoForm, totalCaptcha, totalPending, totalReplied };
  }, [filtered]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Top Filter Bar & Action Controls (Exact Manyready Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Left Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* All Folders */}
          <div className="relative">
            <select
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
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
              onChange={(e) => setTagFilter(e.target.value)}
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
              onChange={(e) => setStatusFilter(e.target.value)}
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
            onClick={() => setIsCreateModalOpen(true)}
            id="create-new-campaign-btn"
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 text-xs font-extrabold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create New Campaign</span>
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
                onClick={handleCreateCampaignSubmit}
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
              checked={selectedIds.length === filtered.length && filtered.length > 0}
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
            filtered.map((camp) => {
              const pendingCount = Math.max(0, camp.prospects - camp.reached - (camp.failed || 0) - (camp.noContactPage || 0) - (camp.captchaBlocked || 0));
              return (
                <div
                  key={camp.id}
                  onClick={() => router.push(`/campaigns/new?id=${encodeURIComponent(camp.id)}`)}
                  onMouseEnter={() => {
                    try {
                      router.prefetch(`/campaigns/new?id=${encodeURIComponent(camp.id)}`);
                    } catch (e) {}
                  }}
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
                    <div className="flex items-center justify-center w-3 shrink-0">
                      {camp.status === 'active' && (
                        <div className="h-4 w-1.5 rounded-full bg-emerald-500 shadow-xs" title="Active Running" />
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
                        title="Click to edit campaign"
                      >
                        {camp.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                        <span>{camp.date}</span>
                        <span>•</span>
                        <span className="text-slate-500">✈ {camp.sendersCount} Senders</span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/campaigns/new?id=${encodeURIComponent(camp.id)}`);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#0e6de4] hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Edit Campaign"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
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
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{selectedReportCamp.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
                      {selectedReportCamp.status.toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Campaign ID: {selectedReportCamp.id} • Created: {selectedReportCamp.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReportCamp(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Progress Metrics Cards (5 Detailed Telemetry Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Total Prospects</span>
                <p className="text-base font-extrabold text-slate-900 font-mono">{selectedReportCamp.prospects}</p>
              </div>

              <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono">🟢 Form Delivered</span>
                <p className="text-base font-extrabold text-emerald-800 font-mono">{selectedReportCamp.reached}</p>
              </div>

              <div className="p-3 rounded-2xl border border-rose-200 bg-rose-50/60 space-y-1">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-mono">🔴 Submit Failed</span>
                <p className="text-base font-extrabold text-rose-800 font-mono">{selectedReportCamp.failed || 0}</p>
              </div>

              <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-1">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider font-mono">🟡 No Contact Page</span>
                <p className="text-base font-extrabold text-amber-800 font-mono">{selectedReportCamp.noContactPage || 0}</p>
              </div>

              <div className="p-3 rounded-2xl border border-purple-200 bg-purple-50/60 space-y-1">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider font-mono">🟠 CAPTCHA / Review</span>
                <p className="text-base font-extrabold text-purple-800 font-mono">{selectedReportCamp.captchaBlocked || 0}</p>
              </div>
            </div>

            {/* Live Sending Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold font-mono">
                <span className="text-slate-700">Outreach Success Yield</span>
                <span className="text-emerald-600">
                  {selectedReportCamp.prospects > 0 ? Math.round((selectedReportCamp.reached / selectedReportCamp.prospects) * 100) : 0}% Form Deliverability Rate
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-500"
                  style={{
                    width: `${selectedReportCamp.prospects > 0 ? Math.min(100, Math.round((selectedReportCamp.reached / selectedReportCamp.prospects) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Granular Prospect Outreach Audit Log Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>Target Website Audit Breakdown</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                    {getCampaignAuditLogs(selectedReportCamp).length} Websites Logged
                  </span>
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Live Telemetry Feed</span>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-2 space-y-1.5">
                {getCampaignAuditLogs(selectedReportCamp).length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-500 bg-white rounded-xl border border-slate-200">
                    No website audit records found for this campaign.
                  </div>
                ) : (
                  getCampaignAuditLogs(selectedReportCamp).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                      <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                        <div className="font-bold text-slate-900 font-mono flex flex-wrap items-center gap-1.5 truncate">
                          <span>{item.domain}</span>
                          <span className="text-[10px] text-slate-400 font-normal truncate">({item.url})</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 font-mono">
                            ⚙️ {item.techStack}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span>{item.code}</span>
                          <span>•</span>
                          <span className="text-blue-700 font-bold">📅 {item.domainAge}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">📝 {item.lastUpdated}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          item.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          item.status === 'FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          item.status === 'NO_CONTACT_PAGE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          item.status === 'CAPTCHA_REVIEW' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                          'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {item.status === 'DELIVERED' ? '🟢 DELIVERED' : item.status === 'FAILED' ? '🔴 FAILED' : item.status === 'NO_CONTACT_PAGE' ? '🟡 NO CONTACT PAGE' : item.status === 'CAPTCHA_REVIEW' ? '🟠 CAPTCHA REVIEW' : '⏳ PENDING'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => handleExportSingleCampaignCSV(selectedReportCamp)}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                title={`Download CSV report specifically for ${selectedReportCamp.name}`}
              >
                <Download className="h-4 w-4 text-blue-600" />
                <span>Download Report CSV ({selectedReportCamp.name})</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedReportCamp(null);
                    router.push('/campaigns/new');
                  }}
                  className="rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Edit Campaign Steps
                </button>

                <button
                  onClick={() => setSelectedReportCamp(null)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

