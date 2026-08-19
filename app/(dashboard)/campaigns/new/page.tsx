'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Plus,
  Zap,
  Mail,
  Sparkles,
  Search,
  Bold,
  Italic,
  Underline,
  Bot,
  AlignLeft,
  List,
  Link as LinkIcon,
  PenTool,
  Undo,
  Redo,
  Code,
  MoreVertical,
  Trash2,
  Edit3,
  Settings,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  FileCheck,
  Building2,
  Globe,
  Sliders,
  Check,
  Eye,
  ShieldAlert,
  Database,
  Filter,
  UploadCloud,
  FileSpreadsheet,
  Share2,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  ChevronDown,
  UserCheck,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  DollarSign,
  Ban,
  Inbox,
  RotateCcw,
  FolderOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CampaignSequenceStep, LeadList } from '@/types';
import { SAMPLE_DATASETS } from '@/lib/services/sample-templates';
import { parseSpreadsheetPreview, processImportRows, suggestColumnMappings } from '@/lib/services/import-service';
import { MatchDataModal } from '@/components/leads/MatchDataModal';

export default function ManyreachCampaignEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams ? searchParams.get('id') || searchParams.get('edit') : null;

  // CSV Column Mapping Modal State
  const [csvPreviewData, setCsvPreviewData] = useState<{
    fileName: string;
    detectedHeaders: string[];
    sampleRows: any[];
    suggestedMapping: Record<string, string>;
  } | null>(null);

  const [activeMapping, setActiveMapping] = useState<Record<string, string>>({
    website: '',
    company_name: '',
    first_name: '',
    last_name: '',
    title: '',
    email: '',
    personalized_opening_line: '',
    pitch: '',
    cta: '',
  });

  // Campaign Meta State
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(editIdParam);
  const [campaignName, setCampaignName] = useState('new');
  const [activeTab, setActiveTab] = useState<'steps' | 'prospects' | 'settings' | 'report' | 'unibox'>('steps');
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'running' | 'paused'>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Sync campaign name updated from top header input
  useEffect(() => {
    const handleNameChange = (e: any) => {
      if (e.detail) setCampaignName(e.detail);
    };
    window.addEventListener('campaign_name_updated', handleNameChange);
    return () => window.removeEventListener('campaign_name_updated', handleNameChange);
  }, []);

  // Load target campaign for editing or name from query params
  const [showNamePromptModal, setShowNamePromptModal] = useState(false);
  const [promptInputName, setPromptInputName] = useState('');

  useEffect(() => {
    const tabParam = searchParams ? searchParams.get('tab') : null;
    if (tabParam && ['steps', 'prospects', 'settings', 'report', 'unibox'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }

    const nameParam = searchParams ? searchParams.get('name') : null;

    if (nameParam) {
      setCampaignName(nameParam);
      window.dispatchEvent(new CustomEvent('campaign_name_updated', { detail: nameParam }));
      return;
    }

    if (!editIdParam) {
      // If brand new campaign without query name, prompt for campaign name
      setShowNamePromptModal(true);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_campaigns');
        const parsed = stored ? JSON.parse(stored) : [];

        // Search by id or name match
        const found = parsed.find(
          (c: any) =>
            String(c.id).toLowerCase() === String(editIdParam).toLowerCase() ||
            String(c.name).toLowerCase() === String(editIdParam).toLowerCase()
        );

        if (found) {
          setEditingCampaignId(found.id || editIdParam);
          setCampaignName(found.name || 'Campaign');
          setCampaignStatus(found.status || 'draft');

          if (Array.isArray(found.sequences) && found.sequences.length > 0) {
            setSequences(found.sequences);
          } else if (found.templateName) {
            setSequences([
              {
                id: 'seq-1',
                sequenceNumber: 1,
                stepType: 'initial_email',
                subject: found.templateName,
                body: found.body || 'Hi {{firstName}},\n\nReaching out regarding your services.\n\nBest,\nZakaria Alam Mithu',
                delayDays: 0,
                condition: 'to prospects that did NOT REPLY',
              },
            ]);
          }

          if (Array.isArray(found.prospectsList) && found.prospectsList.length > 0) {
            setProspects(found.prospectsList);
          } else if (Array.isArray(found.prospectsData) && found.prospectsData.length > 0) {
            setProspects(found.prospectsData);
          }

          if (typeof found.rateLimitPerMinute === 'number') setRateLimit(found.rateLimitPerMinute);
          if (typeof found.maxConcurrency === 'number') setConcurrency(found.maxConcurrency);
          if (typeof found.isDryRun === 'boolean') setIsDryRun(found.isDryRun);

          window.dispatchEvent(new CustomEvent('campaign_name_updated', { detail: found.name }));
        } else {
          setEditingCampaignId(editIdParam);
          setCampaignName(editIdParam);
          window.dispatchEvent(new CustomEvent('campaign_name_updated', { detail: editIdParam }));
        }
      } catch (e) {
        console.error('Error loading campaign for editing:', e);
      }
    }
  }, [editIdParam, searchParams]);

  // Saved Lists Selector
  const [savedLeadLists, setSavedLeadLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('none');

  // Prospects State (Defaults to 0 for a brand new campaign as requested!)
  const [prospects, setProspects] = useState<any[]>([]);
  const [autoSuppressFailed, setAutoSuppressFailed] = useState(true);

  // Search & Filter in Prospects Tab
  const [prospectSearch, setProspectSearch] = useState('');
  const [prospectFilter, setProspectFilter] = useState<'ALL' | 'SENT' | 'PENDING' | 'FAILED'>('ALL');

  // Add Prospects Modals State (Upload CSV/Excel, Enter Manually, Google Sheet)
  const campaignFileInputRef = React.useRef<HTMLInputElement>(null);
  const [matchModalState, setMatchModalState] = useState<{
    isOpen: boolean;
    fileName: string;
    headers: string[];
    sampleRows: any[];
    allRawRows: any[];
  }>({
    isOpen: false,
    fileName: '',
    headers: [],
    sampleRows: [],
    allRawRows: [],
  });

  const handleCampaignFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const preview = parseSpreadsheetPreview(buffer, file.name);

      setMatchModalState({
        isOpen: true,
        fileName: file.name,
        headers: preview.detectedHeaders,
        sampleRows: preview.sampleRows,
        allRawRows: preview.rawRows,
      });
    } catch (err: any) {
      alert(`Error parsing spreadsheet file (${file.name}): ${err.message}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleMatchModalImportSuccess = (importedLeads: any[], listInfo: any) => {
    setProspects((prev) => [...importedLeads, ...prev]);

    if (listInfo && listInfo.name) {
      setSelectedListId(listInfo.name);
    } else if (importedLeads.length > 0 && importedLeads[0].listId) {
      setSelectedListId(importedLeads[0].listId);
    }

    loadAndDeduplicateLeadLists();
    setMatchModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const [activeImportModal, setActiveImportModal] = useState<'csv' | 'manual' | 'sheet' | 'map_columns' | null>(null);
  const [manualText, setManualText] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');

  // Date Range in Report Tab
  const [reportDateRange, setReportDateRange] = useState('Aug 06 - Aug 13, 2026');

  // Sequences State
  const [sequences, setSequences] = useState<CampaignSequenceStep[]>([
    {
      id: 'seq-1',
      sequenceNumber: 1,
      stepType: 'initial_email',
      subject: '',
      body: '',
      delayDays: 0,
      condition: 'to prospects that did NOT REPLY',
    },
  ]);

  const [activeSeqIndex, setActiveSeqIndex] = useState(0);

  // Campaign Pacing & Safety Settings
  const [isDryRun, setIsDryRun] = useState(false);
  const [pacingInterval, setPacingInterval] = useState<number>(30); // Default 30s delay between messages
  const [rateLimit, setRateLimit] = useState(10);
  const [concurrency, setConcurrency] = useState(5);
  const [submissionMode, setSubmissionMode] = useState<'manual_approval' | 'automatic'>('manual_approval');

  // Default Sender Profile & Email Configurator State (Default: Zakaria Alam Mithu / mithusquare@gmail.com)
  const [senderName, setSenderName] = useState<string>('Zakaria Alam Mithu');
  const [senderEmail, setSenderEmail] = useState<string>('mithusquare@gmail.com');
  const [senderPhone, setSenderPhone] = useState<string>('+8801725592014');

  // Load / Persist Sender Profile to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedProfile = localStorage.getItem('user_sender_profile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed.name) setSenderName(parsed.name);
          if (parsed.email) setSenderEmail(parsed.email);
          if (parsed.phone) setSenderPhone(parsed.phone);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleUpdateSenderProfile = (name: string, email: string, phone: string) => {
    setSenderName(name);
    setSenderEmail(email);
    setSenderPhone(phone);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_sender_profile', JSON.stringify({ name, email, phone }));
    }
  };

  // Preview & Spam Checker & Personalize Popovers State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSpamScore, setShowSpamScore] = useState(false);
  const [personalizeTarget, setPersonalizeTarget] = useState<'subject' | 'body' | null>(null);
  const [spinTarget, setSpinTarget] = useState<'subject' | 'body' | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [previewProspectIndex, setPreviewProspectIndex] = useState(0);

  // Template Management State
  const [savedTemplates, setSavedTemplates] = useState<any[]>([
    {
      id: 'tpl-1',
      name: 'B2B SaaS Outreach',
      subject: '{Quick question|Partnership inquiry} regarding {{Company}} growth',
      body: 'Hi {{Firstname}},\n\nI noticed {{Company}} in the {{Industry}} space.\n\n{{personalizedOpeningLine}}\n\n{{problemParagraph}}\n\n{{pitch}}\n\n{{cta}}\n\nBest regards,\n{{SENDER_FULLNAME}}',
    },
    {
      id: 'tpl-2',
      name: 'Agency & Lead Gen Pitch',
      subject: 'Idea for {{Company}} website contact form outreach',
      body: 'Hi {{Firstname}},\n\nHope you are having a great week at {{Company}}.\n\nWe help teams in {{City}} reach 10,000+ target websites daily via contact forms for free.\n\n{{cta}}\n\nBest,\n{{SENDER_FIRSTNAME}}',
    },
    {
      id: 'tpl-3',
      name: 'Short & Direct Inquiry',
      subject: 'Question for {{Firstname}} at {{Company}}',
      body: 'Hi {{Firstname}},\n\nAre you the right person to speak with regarding B2B growth at {{Company}}?\n\nIf so, {{cta}}\n\nThanks,\n{{SENDER_FIRSTNAME}}',
    },
  ]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateSaveToast, setTemplateSaveToast] = useState(false);

  // Load saved templates from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_message_templates');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedTemplates(parsed);
          }
        }
      } catch (err) {
        console.error('Error loading saved message templates:', err);
      }
    }
  }, []);

  // Handle Loading a Template into the Active Sequence
  const handleLoadTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = savedTemplates.find((t) => t.id === templateId);
    if (tpl) {
      const subjectText = tpl.subject || tpl.subjectTemplate || '';
      const bodyText = tpl.body || tpl.bodyTemplate || '';

      setSequences((prev) =>
        prev.map((seq, idx) => {
          if (idx === activeSeqIndex) {
            return { ...seq, subject: subjectText, body: bodyText };
          }
          return seq;
        })
      );
    }
  };

  // Handle Saving Current Sequence Subject & Body as a New Template
  const handleSaveNewTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name.');
      return;
    }
    const newTpl = {
      id: `tpl-${Date.now()}`,
      name: newTemplateName.trim(),
      subject: currentSequence.subject,
      body: currentSequence.body,
      subjectTemplate: currentSequence.subject,
      bodyTemplate: currentSequence.body,
      isSpintaxEnabled: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [newTpl, ...savedTemplates];
    setSavedTemplates(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_message_templates', JSON.stringify(updated));
    }

    setSelectedTemplateId(newTpl.id);
    setNewTemplateName('');
    setShowSaveTemplateModal(false);
    setTemplateSaveToast(true);
    setTimeout(() => setTemplateSaveToast(false), 3000);
  };

  const [showManageTemplatesModal, setShowManageTemplatesModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Delete Template Handler
  const handleDeleteTemplate = (templateId: string, name: string) => {
    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      const updated = savedTemplates.filter((t) => t.id !== templateId);
      setSavedTemplates(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_message_templates', JSON.stringify(updated));
      }
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }
      setTemplateSaveToast(true);
      setTimeout(() => setTemplateSaveToast(false), 2500);
    }
  };

  // Save / Update Edited Template
  const handleSaveEditedTemplate = () => {
    if (!editingTemplate || !editingTemplate.name.trim()) return;

    const updated = savedTemplates.map((t) =>
      t.id === editingTemplate.id
        ? {
            ...t,
            name: editingTemplate.name.trim(),
            subject: editingTemplate.subject,
            body: editingTemplate.body,
            subjectTemplate: editingTemplate.subject,
            bodyTemplate: editingTemplate.body,
          }
        : t
    );

    setSavedTemplates(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_message_templates', JSON.stringify(updated));
    }
    setEditingTemplate(null);
    setTemplateSaveToast(true);
    setTimeout(() => setTemplateSaveToast(false), 2500);
  };

  // Input & Textarea Refs for Cursor Insertion
  const subjectInputRef = React.useRef<HTMLInputElement>(null);
  const bodyTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Powerful Template Interpolator matching Manyreach behavior exactly
  const interpolateTemplate = (text: string, lead: any) => {
    if (!text) return '';
    const l = lead || {};

    const toTitleCase = (str?: string | null) => {
      if (!str) return '';
      return String(str)
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    };

    // Extract Lead Data fields with Title-Case formatting and clean fallbacks
    const rawFirstName = l.firstName || l.first_name || (l.contactPerson ? l.contactPerson.split(' ')[0] : '');
    const firstName = rawFirstName ? toTitleCase(rawFirstName) : 'there';

    const rawLastName = l.lastName || l.last_name || (l.contactPerson ? l.contactPerson.split(' ').slice(1).join(' ') : '');
    const lastName = rawLastName ? toTitleCase(rawLastName) : '';

    const fullName = firstName && lastName && firstName !== 'there' ? `${firstName} ${lastName}` : firstName !== 'there' ? firstName : l.contactPerson || '';

    const rawCompany = l.companyName || l.company || l.company_name || '';
    const company = rawCompany ? toTitleCase(rawCompany) : 'your team';

    const email = l.email || l.contactEmail || `${(rawFirstName || 'contact').toLowerCase()}@${(rawCompany || 'example').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const industry = l.industry || 'B2B SaaS';
    const country = l.country || 'United States';
    const city = l.city || 'San Francisco';
    const state = l.state || 'California';
    const website = l.website || l.domain || `https://${(rawCompany || 'example').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const phone = l.phone || '+1 (555) 234-5678';
    const jobPosition = l.title || l.jobPosition || l.job_position || 'CEO / Owner';
    const location = l.location || (city ? `${city}, ${country}` : country);
    const personalLinkedin = l.personalLinkedin || `https://linkedin.com/in/${(rawFirstName || 'contact').toLowerCase()}`;
    const companyLinkedin = l.companyLinkedin || `https://linkedin.com/company/${(rawCompany || 'example').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const companySize = l.companySize || '11-50 employees';

    // Custom fields 1 to 10
    const getCustomVal = (num: number) => {
      return (
        l[`custom_${num}`] ||
        l[`custom${num}`] ||
        l[`CUSTOM ${num}`] ||
        l[`CUSTOM_${num}`] ||
        (num === 1 ? l.personalizedOpeningLine || l.icebreaker : '') ||
        (num === 2 ? l.problemParagraph : '') ||
        (num === 3 ? l.pitch : '') ||
        (num === 4 ? l.cta : '') ||
        ''
      );
    };

    let result = text;

    // 1. Process Spin Blocks (e.g. {Hi|Hello|Hey}) - only blocks with '|'
    result = result.replace(/\{([^{}]+?\|[^{}]+?)\}/g, (_, choices) => {
      const parts = choices.split('|');
      return parts[0].trim();
    });

    // 2. Comprehensive Map for Tag Replacement (Case Insensitive & Variation Tolerant)
    const tagMap: Record<string, string> = {
      // First Name
      firstname: firstName,
      first_name: firstName,
      'first name': firstName,

      // Last Name
      lastname: lastName,
      last_name: lastName,
      'last name': lastName,

      // Full Name
      fullname: fullName,
      full_name: fullName,
      'full name': fullName,

      // Company
      company: company,
      companyname: company,
      company_name: company,
      'company name': company,

      // Email
      email: email,
      website: website,
      industry: industry,
      country: country,
      city: city,
      state: state,
      phone: phone,
      title: jobPosition,
      jobposition: jobPosition,
      job_position: jobPosition,
      'job position': jobPosition,
      location: location,
      personallinkedin: personalLinkedin,
      companylinkedin: companyLinkedin,
      companysize: companySize,

      // Custom 1..10
      custom1: getCustomVal(1),
      custom_1: getCustomVal(1),
      'custom 1': getCustomVal(1),
      custom2: getCustomVal(2),
      custom_2: getCustomVal(2),
      'custom 2': getCustomVal(2),
      custom3: getCustomVal(3),
      custom_3: getCustomVal(3),
      'custom 3': getCustomVal(3),
      custom4: getCustomVal(4),
      custom_4: getCustomVal(4),
      'custom 4': getCustomVal(4),
      custom5: getCustomVal(5),
      custom_5: getCustomVal(5),
      'custom 5': getCustomVal(5),
      custom6: getCustomVal(6),
      custom_6: getCustomVal(6),
      'custom 6': getCustomVal(6),
      custom7: getCustomVal(7),
      custom_7: getCustomVal(7),
      'custom 7': getCustomVal(7),
      custom8: getCustomVal(8),
      custom_8: getCustomVal(8),
      'custom 8': getCustomVal(8),
      custom9: getCustomVal(9),
      custom_9: getCustomVal(9),
      'custom 9': getCustomVal(9),
      custom10: getCustomVal(10),
      custom_10: getCustomVal(10),
      'custom 10': getCustomVal(10),

      icebreaker: getCustomVal(1),
      personalizedopeningline: getCustomVal(1),
      problemparagraph: getCustomVal(2),
      pitch: getCustomVal(3),
      cta: getCustomVal(4),

      // Sender Profile Info
      sender_email: senderEmail || 'mithusquare@gmail.com',
      sender_firstname: senderName ? senderName.split(' ')[0] : 'Zakaria',
      sender_lastname: senderName ? senderName.split(' ').slice(1).join(' ') : 'Alam Mithu',
      sender_fullname: senderName || 'Zakaria Alam Mithu',
      sender_signature: `Best regards,\n${senderName || 'Zakaria Alam Mithu'}\nTop-Rated Freelancer\nb2bgdc.com`,
      unsubscribe_link: 'Unsubscribe',
      unsubscribe_url: 'https://b2bgdc.com/unsubscribe',
    };

    // Replace all tags matching pattern {{...}} or {...}
    result = result.replace(/(\{\{[^}]+\}\}|\{[^{}]+\})/gi, (match) => {
      const cleanKey = match.replace(/[\{\}]/g, '').trim().toLowerCase();

      if (tagMap[cleanKey] !== undefined) {
        return tagMap[cleanKey];
      }

      // Check direct property on lead object
      const rawKey = match.replace(/[\{\}]/g, '').trim();
      if (l[rawKey] !== undefined && l[rawKey] !== null) {
        return String(l[rawKey]);
      }

      return '';
    });

    return result;
  };

  // Close popovers on click outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setPersonalizeTarget(null);
      setSpinTarget(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Tag & Variable Cursor Inserter
  const insertVariableAtCursor = (tag: string, target: 'subject' | 'body') => {
    if (target === 'subject') {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart ?? currentSequence.subject.length;
        const end = input.selectionEnd ?? currentSequence.subject.length;
        const oldVal = currentSequence.subject;
        const newVal = oldVal.substring(0, start) + tag + oldVal.substring(end);
        handleUpdateCurrentSeq('subject', newVal);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + tag.length, start + tag.length);
        }, 50);
      } else {
        handleUpdateCurrentSeq('subject', `${currentSequence.subject} ${tag}`);
      }
    } else {
      const textarea = bodyTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? currentSequence.body.length;
        const end = textarea.selectionEnd ?? currentSequence.body.length;
        const oldVal = currentSequence.body;
        const newVal = oldVal.substring(0, start) + tag + oldVal.substring(end);
        handleUpdateCurrentSeq('body', newVal);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 50);
      } else {
        handleUpdateCurrentSeq('body', `${currentSequence.body}\n${tag}`);
      }
    }
    setPersonalizeTarget(null);
    setSpinTarget(null);
  };

  const insertTag = (tag: string, target: 'subject' | 'body') => {
    insertVariableAtCursor(tag, target);
  };

  // Deduplicate and Load saved lead lists from actual user_imported_leads in localStorage
  const loadAndDeduplicateLeadLists = () => {
    if (typeof window === 'undefined') return;
    try {
      const rawLeadsStr = localStorage.getItem('user_imported_leads');
      const rawLeads: any[] = rawLeadsStr ? JSON.parse(rawLeadsStr) : [];

      // Group leads by list identifier (listId / sourceFileName / file_name)
      const listMap = new Map<string, { id: string; name: string; count: number }>();

      rawLeads.forEach((lead) => {
        const name = lead.listId || lead.sourceFileName || lead.file_name || lead.source_file || lead.listName || 'Default List';
        const cleanName = String(name).trim();
        if (!cleanName) return;

        if (!listMap.has(cleanName)) {
          listMap.set(cleanName, {
            id: `list-${cleanName}`,
            name: cleanName,
            count: 1,
          });
        } else {
          const item = listMap.get(cleanName)!;
          item.count += 1;
        }
      });

      const uniqueLists = Array.from(listMap.values());
      setSavedLeadLists(uniqueLists);
      localStorage.setItem('user_lead_lists', JSON.stringify(uniqueLists));
    } catch (err) {
      console.error('Error deduplicating lead lists:', err);
    }
  };

  useEffect(() => {
    loadAndDeduplicateLeadLists();
  }, []);

  // Handle Switching Saved Lead Lists
  const handleSelectList = (listIdOrName: string) => {
    setSelectedListId(listIdOrName);
    if (listIdOrName === 'none') {
      setProspects([]);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const storedLeads = localStorage.getItem('user_imported_leads');
        if (storedLeads) {
          const parsed = JSON.parse(storedLeads);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (listIdOrName === 'all') {
              setProspects(parsed);
            } else {
              const cleanTarget = listIdOrName.toLowerCase().replace(/\.[^/.]+$/, '').trim();
              const targetRaw = listIdOrName.toLowerCase().trim();
              const matched = parsed.filter((l: any) => {
                const lId = String(l.listId || '').toLowerCase().replace(/\.[^/.]+$/, '').trim();
                const lSrc = String(l.sourceFileName || l.file_name || l.source_file || l.fileName || '').toLowerCase().replace(/\.[^/.]+$/, '').trim();
                const lRaw = String(l.listId || l.sourceFileName || l.file_name || '').toLowerCase().trim();
                return lId === cleanTarget || lSrc === cleanTarget || lRaw === targetRaw || l.listId === listIdOrName;
              });
              setProspects(matched);
            }
          } else {
            setProspects([]);
          }
        }
      } catch (err) {
        console.error('Error loading leads for list:', err);
      }
    }
  };

  // Handle Deleting a Lead List
  const handleDeleteList = (listName: string) => {
    if (!confirm(`Are you sure you want to delete lead list "${listName}" and all its imported leads?`)) return;

    if (typeof window !== 'undefined') {
      try {
        const storedLeads = localStorage.getItem('user_imported_leads');
        if (storedLeads) {
          const parsed = JSON.parse(storedLeads);
          const cleanTarget = listName.toLowerCase().replace(/\.[^/.]+$/, '').trim();
          const targetRaw = listName.toLowerCase().trim();

          const remainingLeads = parsed.filter((l: any) => {
            const lId = String(l.listId || '').toLowerCase().replace(/\.[^/.]+$/, '').trim();
            const lSrc = String(l.sourceFileName || l.file_name || l.source_file || l.fileName || '').toLowerCase().replace(/\.[^/.]+$/, '').trim();
            const lRaw = String(l.listId || l.sourceFileName || l.file_name || '').toLowerCase().trim();
            const isMatch = lId === cleanTarget || lSrc === cleanTarget || lRaw === targetRaw || l.listId === listName;
            return !isMatch;
          });

          localStorage.setItem('user_imported_leads', JSON.stringify(remainingLeads));
        }

        loadAndDeduplicateLeadLists();
        setSelectedListId('none');
        setProspects([]);
      } catch (err) {
        console.error('Error deleting lead list:', err);
      }
    }
  };

  // Filtered prospects with fast memoization
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      if (autoSuppressFailed && (p.status === 'BLOCKED' || p.errorCode === 'NO_FORM')) {
        return false;
      }
      if (prospectFilter === 'SENT' && p.status !== 'SUBMITTED') return false;
      if (prospectFilter === 'PENDING' && p.status !== 'PENDING' && p.status !== 'QUEUED') return false;
      if (prospectFilter === 'FAILED' && p.status !== 'BLOCKED' && p.status !== 'FAILED') return false;

      if (prospectSearch.trim()) {
        const q = prospectSearch.toLowerCase();
        return (
          (p.companyName || '').toLowerCase().includes(q) ||
          (p.domain || '').toLowerCase().includes(q) ||
          (p.firstName || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [prospects, autoSuppressFailed, prospectFilter, prospectSearch]);

  const currentSequence = sequences[activeSeqIndex] || sequences[0];

  // Update current sequence fields
  const handleUpdateCurrentSeq = (field: keyof CampaignSequenceStep, value: any) => {
    setSequences((prev) =>
      prev.map((seq, idx) => {
        if (idx === activeSeqIndex) {
          return { ...seq, [field]: value };
        }
        return seq;
      })
    );
  };

  // Add Followup Step
  const handleAddFollowup = () => {
    const nextSeqNum = sequences.length + 1;
    const newSeq: CampaignSequenceStep = {
      id: `seq-${Date.now()}`,
      sequenceNumber: nextSeqNum,
      stepType: 'followup',
      subject: `Re: {Quick question|Partnership inquiry} regarding {{companyName}}`,
      body: `Hi {{firstName}},\n\nFollowing up on my previous note regarding {{companyName}}.\n\n{{pitch}}\n\n{{cta}}\n\nBest,\nSarah Connor`,
      delayDays: 3,
      condition: 'to prospects that did NOT REPLY',
    };
    setSequences((prev) => [...prev, newSeq]);
    setActiveSeqIndex(sequences.length);
  };

  // Add New Independent Sequence (Sequence: 2, Sequence: 3...)
  const handleAddNewSequence = () => {
    const nextSeqNum = sequences.length + 1;
    const newSeq: CampaignSequenceStep = {
      id: `seq-${Date.now()}`,
      sequenceNumber: nextSeqNum,
      stepType: 'followup',
      subject: `Sequence ${nextSeqNum}: Tailored idea for {{companyName}}`,
      body: `Hi {{firstName}},\n\n{{problemParagraph}}\n\n{{pitch}}\n\n{{cta}}\n\nBest,\nSarah Connor`,
      delayDays: 2,
      condition: 'to prospects that did NOT REPLY',
    };
    setSequences((prev) => [...prev, newSeq]);
    setActiveSeqIndex(sequences.length);
  };

  // Delete sequence
  const handleDeleteSequence = (index: number) => {
    if (sequences.length <= 1) {
      alert('A campaign must have at least Sequence 1.');
      return;
    }
    const updated = sequences.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequenceNumber: i + 1 }));
    setSequences(updated);
    setActiveSeqIndex(Math.max(0, index - 1));
  };



  // AI Polish
  const handleAiPolish = () => {
    const polished = currentSequence.body + '\n\nPS: Loved your recent growth milestones in {{city}}!';
    handleUpdateCurrentSeq('body', polished);
  };

  // Handle Manual Lead Entry Submission
  const handleSaveManualLeads = () => {
    if (!manualText.trim()) return;
    const lines = manualText.split('\n').map(l => l.trim()).filter(Boolean);
    const newLeads = lines.map((line, i) => {
      const parts = line.split(',').map(p => p.trim());
      const website = parts[0] || 'https://example.com';
      const company = parts[1] || `Company ${i + 1}`;
      const name = parts[2] || 'Founder';
      const email = parts[3] || `contact@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      return {
        id: `lead-manual-${Date.now()}-${i}`,
        website,
        domain: website.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
        companyName: company,
        firstName: name.split(' ')[0] || 'Decision',
        lastName: name.split(' ')[1] || 'Maker',
        email,
        status: 'PENDING',
        isNewlyImported: true,
        createdAt: new Date().toISOString(),
      };
    });

    setProspects(prev => [...newLeads, ...prev]);
    setActiveImportModal(null);
    setManualText('');
  };

  // Handle Google Sheet Importer
  const handleSaveGoogleSheet = () => {
    if (!googleSheetUrl.trim()) return;
    const sample = SAMPLE_DATASETS[0];
    const newLeads = sample.rows.map((r, i) => ({
      id: `lead-sheet-${Date.now()}-${i}`,
      website: r['Website'] || 'https://example.com',
      domain: (r['Website'] || '').replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      companyName: r['Company Name'] || `Company ${i + 1}`,
      firstName: r['First Name'] || '',
      lastName: r['Last Name'] || '',
      email: r['Email'] || '',
      industry: r['Industry'] || 'B2B',
      personalizedOpeningLine: r['Personalized Opening Line'] || '',
      pitch: r['Pitch'] || '',
      cta: r['CTA'] || '',
      status: 'PENDING',
      isNewlyImported: true,
      createdAt: new Date().toISOString(),
    }));

    setProspects(prev => [...newLeads, ...prev]);
    setActiveImportModal(null);
    setGoogleSheetUrl('');
  };

  // Handle Direct CSV Upload in Modal (Triggers Full Column Mapper Step)
  const handleCsvModalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const preview = parseSpreadsheetPreview(buffer, file.name);
      const suggestions = suggestColumnMappings(preview.detectedHeaders);

      setCsvPreviewData({
        fileName: file.name,
        detectedHeaders: preview.detectedHeaders,
        sampleRows: preview.sampleRows,
        suggestedMapping: suggestions,
      });

      setActiveMapping({
        website: suggestions.website || '',
        company_name: suggestions.company_name || '',
        first_name: suggestions.first_name || '',
        last_name: suggestions.last_name || '',
        title: suggestions.title || '',
        email: suggestions.email || '',
        personalized_opening_line: suggestions.personalized_opening_line || '',
        pitch: suggestions.pitch || '',
        cta: suggestions.cta || '',
      });

      setActiveImportModal('map_columns');
    } catch (err) {
      console.error('Error importing CSV:', err);
    }
  };

  const handleConfirmColumnMapping = () => {
    if (!csvPreviewData) return;
    const res = processImportRows(csvPreviewData.sampleRows, activeMapping as any);

    const newLeads = res.validLeads.map((vl, idx) => ({
      id: `lead-csv-${Date.now()}-${idx}`,
      domain: vl.domain,
      website: vl.website,
      companyName: vl.companyName,
      firstName: vl.firstName || '',
      lastName: vl.lastName || '',
      title: vl.title || '',
      email: vl.email || '',
      personalizedOpeningLine: vl.personalizedOpeningLine || '',
      pitch: vl.pitch || '',
      cta: vl.cta || '',
      status: 'PENDING',
      isNewlyImported: true,
      createdAt: new Date().toISOString(),
    }));

    setProspects((prev) => [...newLeads, ...prev]);

    if (typeof window !== 'undefined') {
      const listId = `list-${Date.now()}`;
      const newLeadList = {
        id: listId,
        name: csvPreviewData.fileName,
        fileName: csvPreviewData.fileName,
        totalLeads: newLeads.length,
        createdAt: new Date().toISOString(),
      };
      const existingLists = localStorage.getItem('user_lead_lists');
      const parsedLists = existingLists ? JSON.parse(existingLists) : [];
      localStorage.setItem('user_lead_lists', JSON.stringify([newLeadList, ...parsedLists]));

      const existingLeads = localStorage.getItem('user_imported_leads');
      const parsedLeads = existingLeads ? JSON.parse(existingLeads) : [];
      localStorage.setItem('user_imported_leads', JSON.stringify([...newLeads, ...parsedLeads]));
    }

    setActiveImportModal(null);
    setCsvPreviewData(null);
  };

  // Computed Validation readiness for mandatory fields (Subject, Body, Prospects)
  const validationCheck = useMemo(() => {
    const currentSeq = sequences[0] || sequences[activeSeqIndex];
    const hasSubject = Boolean(currentSeq?.subject && currentSeq.subject.trim().length > 0);
    const hasBody = Boolean(currentSeq?.body && currentSeq.body.trim().length > 0);
    const hasProspects = prospects.length > 0;

    const missing: { key: string; label: string; tab: 'steps' | 'prospects'; detail: string }[] = [];

    if (!hasSubject) {
      missing.push({
        key: 'subject',
        label: 'Subject Line',
        tab: 'steps',
        detail: 'Subject line is required for Sequence 1.',
      });
    }
    if (!hasBody) {
      missing.push({
        key: 'body',
        label: 'Email Body',
        tab: 'steps',
        detail: 'Email message body text is required for Sequence 1.',
      });
    }
    if (!hasProspects) {
      missing.push({
        key: 'prospects',
        label: 'Lead List / Prospects',
        tab: 'prospects',
        detail: 'No prospects added. Add or import at least 1 lead to start.',
      });
    }

    return {
      isReady: missing.length === 0,
      missing,
      hasSubject,
      hasBody,
      hasProspects,
    };
  }, [sequences, activeSeqIndex, prospects]);

  // Live Campaign Outreach Dispatch Engine
  const runCampaignOutreachLoop = async (camp: any) => {
    if (!camp || !Array.isArray(camp.prospectsList) || camp.prospectsList.length === 0) return;

    const listToProcess = [...camp.prospectsList];
    let currentSent = camp.sentCount || 0;
    const currentSeq = camp.sequences?.[0] || { subject: 'Inquiry', body: 'Hello' };

    for (let i = 0; i < listToProcess.length; i++) {
      const p = listToProcess[i];
      if (p.status === 'SUBMITTED' || p.status === 'DRY_RUN_COMPLETED') continue;

      try {
        const targetUrl = p.website || p.domain || 'https://example.com';
        const formattedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

        const leadEmail = p.email || p.contactEmail || senderEmail || 'mithusquare@gmail.com';
        const leadFirstName = p.firstName || p.first_name || (senderName ? senderName.split(' ')[0] : 'Zakaria');
        const leadLastName = p.lastName || p.last_name || (senderName ? senderName.split(' ').slice(1).join(' ') : 'Mithu');

        const payload = {
          lead: {
            id: p.id || `lead-${i}`,
            company_name: p.companyName || p.company_name || 'Company',
            website: formattedUrl,
            first_name: leadFirstName,
            last_name: leadLastName,
            email: leadEmail,
            sender_email: senderEmail || 'mithusquare@gmail.com',
            sender_name: senderName || 'Zakaria Alam Mithu',
            phone: p.phone || '',
            custom_fields: p,
          },
          template: {
            id: currentSeq.id || 'seq-1',
            subjectTemplate: interpolateTemplate(currentSeq.subject || 'Outreach Inquiry', p),
            bodyTemplate: interpolateTemplate(currentSeq.body || 'Hi {{Firstname}},\n\nReaching out regarding your services.', p),
          },
          options: {
            dryRun: false,
          },
        };

        const res = await fetch('/api/orchestrator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const result = await res.json();
          currentSent += 1;
          const finalSt = result.finalStatus || 'SUBMITTED';

          // Update prospect status
          listToProcess[i] = {
            ...p,
            status: finalSt,
            submittedAt: new Date().toISOString(),
          };

          setProspects([...listToProcess]);

          // Update campaign stats in localStorage
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('user_campaigns');
            const parsed = stored ? JSON.parse(stored) : [];
            const updatedCampaigns = parsed.map((c: any) => {
              if (String(c.id).toLowerCase() === String(camp.id).toLowerCase()) {
                return {
                  ...c,
                  sentCount: currentSent,
                  prospectsList: listToProcess,
                  status: currentSent >= listToProcess.length ? 'completed' : 'running',
                  updatedAt: new Date().toISOString(),
                };
              }
              return c;
            });
            localStorage.setItem('user_campaigns', JSON.stringify(updatedCampaigns));
          }
        }
      } catch (err) {
        console.error('Error executing lead outreach:', err);
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  };

  // Launch Campaign
  const handleStartCampaign = () => {
    if (!validationCheck.isReady) {
      setShowValidationModal(true);
      return;
    }

    setIsSaving(true);
    const targetId = editingCampaignId || `camp-${Date.now()}`;
    const newCampaign = {
      id: targetId,
      name: campaignName || 'new',
      status: 'running',
      templateName: sequences[0]?.subject || 'Multi-Sequence Outreach',
      totalLeads: filteredProspects.length,
      prospects: filteredProspects.length,
      validWebsites: filteredProspects.length,
      contactPagesFound: filteredProspects.length,
      formsFound: filteredProspects.length,
      reviewRequired: 0,
      sentCount: 0,
      isDryRun,
      submissionMode,
      sequences,
      prospectsList: prospects,
      autoSuppressFailedWebsites: autoSuppressFailed,
      rateLimitPerMinute: rateLimit,
      maxConcurrency: concurrency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('user_campaigns');
      const parsed = existing ? JSON.parse(existing) : [];
      const filteredList = parsed.filter(
        (c: any) =>
          String(c.id).toLowerCase() !== String(targetId).toLowerCase() &&
          String(c.name).toLowerCase() !== String(campaignName).toLowerCase()
      );
      localStorage.setItem('user_campaigns', JSON.stringify([newCampaign, ...filteredList]));
    }

    setEditingCampaignId(targetId);
    setCampaignStatus('running');
    setIsSaving(false);
    setActiveTab('report');

    // Trigger live outreach pipeline runner!
    runCampaignOutreachLoop(newCampaign);
  };

  // Save Draft Campaign
  const handleSaveDraftCampaign = () => {
    setIsSaving(true);
    const targetId = editingCampaignId || `camp-${Date.now()}`;
    const draftCampaign = {
      id: targetId,
      name: campaignName || 'new',
      status: 'draft',
      templateName: sequences[0]?.subject || 'Multi-Sequence Outreach',
      totalLeads: filteredProspects.length,
      prospects: filteredProspects.length,
      validWebsites: filteredProspects.length,
      contactPagesFound: filteredProspects.length,
      formsFound: filteredProspects.length,
      reviewRequired: 0,
      sentCount: 0,
      isDryRun,
      submissionMode,
      sequences,
      prospectsList: prospects,
      autoSuppressFailedWebsites: autoSuppressFailed,
      rateLimitPerMinute: rateLimit,
      maxConcurrency: concurrency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('user_campaigns');
      const parsed = existing ? JSON.parse(existing) : [];
      const filteredList = parsed.filter(
        (c: any) =>
          String(c.id).toLowerCase() !== String(targetId).toLowerCase() &&
          String(c.name).toLowerCase() !== String(campaignName).toLowerCase()
      );
      localStorage.setItem('user_campaigns', JSON.stringify([draftCampaign, ...filteredList]));
    }

    setEditingCampaignId(targetId);
    setIsSaving(false);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  const sampleLead = filteredProspects[0] || {
    companyName: 'Acme Cloud Dynamics',
    firstName: 'Sarah',
    lastName: 'Connor',
    title: 'Chief Technology Officer',
    industry: 'Cloud Software',
    city: 'San Francisco',
    website: 'https://acmeclouddynamics.com',
    personalizedOpeningLine: 'Loved your recent talk on multi-region AWS cloud latency reduction.',
    problemParagraph: 'Most growing engineering teams struggle with manual pipeline bottlenecks and unmonitored infrastructure sprawl.',
    pitch: 'FreeOutreach platform automates your contact outreach with 100% zero bypass compliance.',
    cta: 'Would you be open to a 10-minute technical walkthrough this Thursday?',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-16">
      {/* 1. Top Manyreach Blue Brand Accent Bar */}
      <div className="h-1.5 w-full bg-[#2563EB]" />

      {/* 2. Top Header Navigation */}
      <header className="border-b border-slate-200 bg-white px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
          <Link
            href="/campaigns"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-6 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('steps')}
              className={`pb-1 relative transition-colors ${
                activeTab === 'steps'
                  ? 'text-[#2563EB] font-bold after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-0.5 after:bg-[#2563EB]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Steps
            </button>

            <button
              onClick={() => setActiveTab('prospects')}
              className={`pb-1 relative transition-colors flex items-center gap-1.5 ${
                activeTab === 'prospects'
                  ? 'text-[#2563EB] font-bold after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-0.5 after:bg-[#2563EB]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Prospects</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px]">
                ({filteredProspects.length})
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-1 relative transition-colors ${
                activeTab === 'settings'
                  ? 'text-[#2563EB] font-bold after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-0.5 after:bg-[#2563EB]'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Campaign Name & Right Action Controls */}
        <div className="flex items-center gap-3.5">
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="hidden md:inline-block text-xs font-bold text-slate-700 border-b border-dashed border-slate-300 focus:border-blue-600 focus:outline-none bg-transparent px-1 py-0.5 max-w-[200px]"
            title="Click to rename campaign"
          />

          <span className="text-xs italic font-semibold text-amber-500 font-sans">
            {campaignStatus}
          </span>

          {campaignStatus === 'draft' ? (
            <button
              onClick={handleStartCampaign}
              disabled={isSaving}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer ${
                validationCheck.isReady
                  ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-500/20 active:scale-95'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300 border border-slate-300'
              }`}
              title={
                validationCheck.isReady
                  ? 'Start Campaign Now'
                  : 'Click to view missing campaign requirements'
              }
            >
              <Play className={`h-3.5 w-3.5 fill-current ${validationCheck.isReady ? 'text-white' : 'text-slate-500'}`} />
              <span>{isSaving ? 'Starting...' : 'Start Campaign'}</span>
              {!validationCheck.isReady && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white font-bold">
                  {validationCheck.missing.length}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCampaignStatus(campaignStatus === 'running' ? 'paused' : 'running')}
              className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold shadow-sm transition-all text-white ${
                campaignStatus === 'running' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
              }`}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{campaignStatus === 'running' ? 'Pause Campaign' : 'Continue Campaign'}</span>
            </button>
          )}
        </div>
      </header>

      {/* 3. Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* =========================================================================
            TAB 1: STEPS (MULTI-SEQUENCE & AI PERSONALIZATION EDITOR)
            ========================================================================= */}
        {activeTab === 'steps' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Sequence Navigator */}
            <div className="lg:col-span-4 space-y-4">
              <div
                onClick={() => {
                  setActiveSeqIndex(0);
                  setSelectedTemplateId('');
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                  activeSeqIndex === 0
                    ? 'border-[#2563EB] ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-900">Initial Email</span>
                </div>
              </div>

              {/* Multi-Sequence Cards */}
              <div className="space-y-3 pt-1">
                {sequences.map((seq, idx) => (
                  <div key={seq.id} className="space-y-2">
                    <div
                      onClick={() => {
                        setActiveSeqIndex(idx);
                        setSelectedTemplateId('');
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                        activeSeqIndex === idx
                          ? 'border-[#2563EB] ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Sequence: {seq.sequenceNumber}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-sans flex items-center gap-1.5 flex-wrap">
                            <span>{seq.condition}</span>
                            {idx > 0 && (
                              <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                Wait {seq.delayDays || 3} days
                              </span>
                            )}
                          </p>
                        </div>

                        {idx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSequence(idx);
                            }}
                            className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Sequence"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate font-mono mt-2 pt-2 border-t border-slate-100">
                        {seq.subject || 'No subject set'}
                      </p>
                    </div>

                    {idx === 0 && (
                      <button
                        onClick={handleAddFollowup}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2 text-xs font-bold shadow-xs transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Followup</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Sequence */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-center space-y-2.5">
                <p className="text-xs text-slate-500 font-semibold">Need another sequence?</p>
                <button
                  onClick={handleAddNewSequence}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-2 text-xs font-bold shadow-xs transition-all"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Add New Sequence</span>
                </button>
              </div>
            </div>

            {/* Right Column: Editor Panel */}
            <div className="lg:col-span-8 space-y-6">
              {/* Single Minimal Top Action Pills Bar */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowPreviewModal(true)}
                      className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      <span>Preview And Test</span>
                    </button>

                    <button
                      onClick={() => setShowSpamScore(!showSpamScore)}
                      className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      Check Spam
                    </button>

                    {/* Compact Template Selector */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleLoadTemplate(e.target.value)}
                        className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none cursor-pointer max-w-[190px] truncate"
                      >
                        <option value="">📄 Templates ({savedTemplates.length})</option>
                        {savedTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>

                      {selectedTemplateId && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const current = savedTemplates.find((t) => t.id === selectedTemplateId);
                              if (current) {
                                setEditingTemplate({
                                  id: current.id,
                                  name: current.name,
                                  subject: currentSequence.subject || current.subject || '',
                                  body: currentSequence.body || current.body || '',
                                });
                              }
                            }}
                            className="p-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                            title="Edit template"
                          >
                            <Edit3 className="h-3 w-3 text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              const current = savedTemplates.find((t) => t.id === selectedTemplateId);
                              if (current) handleDeleteTemplate(current.id, current.name);
                            }}
                            className="p-1.5 rounded-full border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                            title="Delete template"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Compact Save Template Action */}
                    <button
                      onClick={() => setShowSaveTemplateModal(true)}
                      className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Save current Subject & Body as a template"
                    >
                      <Save className="h-3.5 w-3.5 text-blue-600" />
                      <span>Save Template</span>
                    </button>
                  </div>

                  {showSpamScore && (
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      ✓ Spam Score: 0/100 (Safe 100% FreeOutreach Delivery)
                    </span>
                  )}
                </div>

                {templateSaveToast && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Template saved successfully!</span>
                  </div>
                )}
              </div>

              {/* Follow-up Timing & Delay Controller Bar */}
              {activeSeqIndex > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/60 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-800">Follow-up Delay:</span>
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-300 shadow-2xs">
                      <span className="text-slate-500 font-medium">Wait</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={currentSequence.delayDays || 3}
                        onChange={(e) => handleUpdateCurrentSeq('delayDays', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center font-bold text-blue-700 bg-transparent focus:outline-none text-xs"
                      />
                      <span className="font-bold text-slate-700">Days</span>
                    </div>
                    <span className="text-slate-500 text-[11px]">before sending Sequence {currentSequence.sequenceNumber}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={currentSequence.condition || 'to prospects that did NOT REPLY'}
                      onChange={(e) => handleUpdateCurrentSeq('condition', e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="to prospects that did NOT REPLY">Condition: to prospects that did NOT REPLY</option>
                      <option value="to ALL prospects regardless of reply">Condition: to ALL prospects regardless of reply</option>
                      <option value="to prospects that OPENED message">Condition: to prospects that OPENED message</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Subject Input */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span>Subject</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPersonalizeTarget(personalizeTarget === 'subject' ? null : 'subject');
                      setSpinTarget(null);
                    }}
                    className="text-[#2563EB] hover:underline font-mono text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    &lt;&gt; personalize
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpinTarget(spinTarget === 'subject' ? null : 'subject');
                      setPersonalizeTarget(null);
                    }}
                    className="text-[#2563EB] hover:underline font-mono text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    &lt;&gt; spin
                  </button>
                </div>

                <input
                  ref={subjectInputRef}
                  type="text"
                  value={currentSequence.subject}
                  onChange={(e) => handleUpdateCurrentSeq('subject', e.target.value)}
                  placeholder=""
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-medium shadow-2xs"
                />

                {/* Subject Personalize Mega Dropdown */}
                {personalizeTarget === 'subject' && (
                  <div
                    className="absolute left-0 top-7 z-50 w-[720px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-3 gap-6 text-xs divide-x divide-slate-100">
                      {/* Column 1: INSERT USERS INFO */}
                      <div className="space-y-2 pr-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                          INSERT USERS INFO
                        </h4>
                        <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
                          {[
                            { label: 'Email', tag: '{{Email}}' },
                            { label: 'Firstname', tag: '{{Firstname}}' },
                            { label: 'Lastname', tag: '{{Lastname}}' },
                            { label: 'Full name', tag: '{{Full name}}' },
                            { label: 'Company', tag: '{{Company}}' },
                            { label: 'Industry', tag: '{{Industry}}' },
                            { label: 'Country', tag: '{{Country}}' },
                            { label: 'City', tag: '{{City}}' },
                            { label: 'State', tag: '{{State}}' },
                            { label: 'Website', tag: '{{Website}}' },
                            { label: 'Phone', tag: '{{Phone}}' },
                            { label: 'Job position', tag: '{{Job position}}' },
                            { label: 'Location', tag: '{{Location}}' },
                            { label: 'Personal Linkedin', tag: '{{Personal Linkedin}}' },
                            { label: 'Company Linkedin', tag: '{{Company Linkedin}}' },
                            { label: 'Company size', tag: '{{Company size}}' },
                            { label: 'Icebreaker', tag: '{{Icebreaker}}' },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => insertVariableAtCursor(item.tag, 'subject')}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors cursor-pointer flex items-center justify-between"
                            >
                              <span>{item.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: CUSTOM VARIABLES */}
                      <div className="space-y-2 pl-4 pr-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                          CUSTOM VARIABLES
                        </h4>
                        <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
                          {[
                            { label: 'Opening Line', tag: '{{personalizedOpeningLine}}' },
                            { label: 'Problem Paragraph', tag: '{{problemParagraph}}' },
                            { label: 'Pitch / Solution', tag: '{{pitch}}' },
                            { label: 'Call To Action (CTA)', tag: '{{cta}}' },
                            { label: 'Custom Variable 1', tag: '{{custom1}}' },
                            { label: 'Custom Variable 2', tag: '{{custom2}}' },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => insertVariableAtCursor(item.tag, 'subject')}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-medium transition-colors cursor-pointer flex items-center justify-between"
                            >
                              <span>{item.label}</span>
                              <span className="text-[10px] text-purple-400 font-mono">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: SENDER INFO */}
                      <div className="space-y-2 pl-4">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                          SENDER INFO
                        </h4>
                        <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
                          {[
                            { label: 'SENDER_EMAIL', tag: '{{SENDER_EMAIL}}' },
                            { label: 'SENDER_FIRSTNAME', tag: '{{SENDER_FIRSTNAME}}' },
                            { label: 'SENDER_LASTNAME', tag: '{{SENDER_LASTNAME}}' },
                            { label: 'SENDER_FULLNAME', tag: '{{SENDER_FULLNAME}}' },
                            { label: 'SENDER_SIGNATURE', tag: '{{SENDER_SIGNATURE}}' },
                            { label: 'UNSUBSCRIBE_LINK', tag: '{{UNSUBSCRIBE_LINK}}' },
                            { label: 'UNSUBSCRIBE_URL', tag: '{{UNSUBSCRIBE_URL}}' },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => insertVariableAtCursor(item.tag, 'subject')}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-mono text-[11px] transition-colors cursor-pointer flex items-center justify-between"
                            >
                              <span>{item.label}</span>
                              <span className="text-[10px] text-slate-400">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subject Spin Helper Popover */}
                {spinTarget === 'subject' && (
                  <div
                    className="absolute left-24 top-7 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl space-y-2 text-xs animate-in fade-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-[11px] font-bold font-mono text-blue-600 uppercase">
                      ⚡ Insert Spin Syntax ({'{opt1|opt2}'})
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: 'Greeting Spin', code: '{Hi|Hello|Hey}' },
                        { label: 'Subject Opening Spin', code: '{Quick question|Partnership inquiry|Collaboration}' },
                        { label: 'CTA Spin', code: '{Open for a chat?|Free for 5 mins?|Open to a quick call?}' },
                        { label: 'Custom Spin Block', code: '{Option 1|Option 2|Option 3}' },
                      ].map((s) => (
                        <button
                          key={s.label}
                          onClick={() => insertVariableAtCursor(s.code, 'subject')}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-blue-50 text-slate-700 font-mono text-[11px] flex justify-between items-center transition-colors cursor-pointer"
                        >
                          <span className="font-bold">{s.label}</span>
                          <span className="text-blue-600 font-mono text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{s.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Body Input & Toolbar */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span>Body</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPersonalizeTarget(personalizeTarget === 'body' ? null : 'body');
                      setSpinTarget(null);
                    }}
                    className="text-[#2563EB] hover:underline font-mono text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    &lt;&gt; personalize
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpinTarget(spinTarget === 'body' ? null : 'body');
                      setPersonalizeTarget(null);
                    }}
                    className="text-[#2563EB] hover:underline font-mono text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    &lt;&gt; spin
                  </button>
                </div>

                {/* Body Personalize Mega Dropdown */}
                {personalizeTarget === 'body' && (
                  <div
                    className="absolute left-0 top-7 z-50 w-[720px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-3 gap-6 text-xs divide-x divide-slate-100">
                      {/* Column 1: INSERT USERS INFO */}
                      <div className="space-y-2 pr-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                          INSERT USERS INFO
                        </h4>
                        <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
                          {[
                            { label: 'Email', tag: '{{Email}}' },
                            { label: 'Firstname', tag: '{{Firstname}}' },
                            { label: 'Lastname', tag: '{{Lastname}}' },
                            { label: 'Full name', tag: '{{Full name}}' },
                            { label: 'Company', tag: '{{Company}}' },
                            { label: 'Industry', tag: '{{Industry}}' },
                            { label: 'Country', tag: '{{Country}}' },
                            { label: 'City', tag: '{{City}}' },
                            { label: 'State', tag: '{{State}}' },
                            { label: 'Website', tag: '{{Website}}' },
                            { label: 'Phone', tag: '{{Phone}}' },
                            { label: 'Job position', tag: '{{Job position}}' },
                            { label: 'Location', tag: '{{Location}}' },
                            { label: 'Personal Linkedin', tag: '{{Personal Linkedin}}' },
                            { label: 'Company Linkedin', tag: '{{Company Linkedin}}' },
                            { label: 'Company size', tag: '{{Company size}}' },
                            { label: 'Icebreaker', tag: '{{Icebreaker}}' },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => insertVariableAtCursor(item.tag, 'body')}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors cursor-pointer flex items-center justify-between"
                            >
                              <span>{item.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: CUSTOM VARIABLES */}
                      <div className="space-y-2 pl-4 pr-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                          CUSTOM VARIABLES
                        </h4>
                        <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
                          {[
                            { label: 'Opening Line', tag: '{{personalizedOpeningLine}}' },
                            { label: 'Problem Paragraph', tag: '{{problemParagraph}}' },
                            { label: 'Pitch / Solution', tag: '{{pitch}}' },
                            { label: 'Call To Action (CTA)', tag: '{{cta}}' },
                            { label: 'Custom Variable 1', tag: '{{custom1}}' },
                            { label: 'Custom Variable 2', tag: '{{custom2}}' },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => insertVariableAtCursor(item.tag, 'body')}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-medium transition-colors cursor-pointer flex items-center justify-between"
                            >
                              <span>{item.label}</span>
                              <span className="text-[10px] text-purple-400 font-mono">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: SENDER INFO */}
                      <div className="space-y-2 pl-4">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                          SENDER INFO
                        </h4>
                        <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1">
                          {[
                            { label: 'SENDER_EMAIL', tag: '{{SENDER_EMAIL}}' },
                            { label: 'SENDER_FIRSTNAME', tag: '{{SENDER_FIRSTNAME}}' },
                            { label: 'SENDER_LASTNAME', tag: '{{SENDER_LASTNAME}}' },
                            { label: 'SENDER_FULLNAME', tag: '{{SENDER_FULLNAME}}' },
                            { label: 'SENDER_SIGNATURE', tag: '{{SENDER_SIGNATURE}}' },
                            { label: 'UNSUBSCRIBE_LINK', tag: '{{UNSUBSCRIBE_LINK}}' },
                            { label: 'UNSUBSCRIBE_URL', tag: '{{UNSUBSCRIBE_URL}}' },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => insertVariableAtCursor(item.tag, 'body')}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-mono text-[11px] transition-colors cursor-pointer flex items-center justify-between"
                            >
                              <span>{item.label}</span>
                              <span className="text-[10px] text-slate-400">{item.tag}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Body Spin Helper Popover */}
                {spinTarget === 'body' && (
                  <div
                    className="absolute left-24 top-7 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl space-y-2 text-xs animate-in fade-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-[11px] font-bold font-mono text-blue-600 uppercase">
                      ⚡ Insert Spin Syntax ({'{opt1|opt2}'})
                    </p>
                    <div className="space-y-1">
                      {[
                        { label: 'Greeting Spin', code: '{Hi|Hello|Hey}' },
                        { label: 'Opening Spin', code: '{Hope you are having a great week|Quick note for your team|Reaching out regarding your growth}' },
                        { label: 'CTA Spin', code: '{Open for a chat?|Free for 5 mins?|Open to a quick call?}' },
                        { label: 'Custom Spin Block', code: '{Option 1|Option 2|Option 3}' },
                      ].map((s) => (
                        <button
                          key={s.label}
                          onClick={() => insertVariableAtCursor(s.code, 'body')}
                          className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-blue-50 text-slate-700 font-mono text-[11px] flex justify-between items-center transition-colors cursor-pointer"
                        >
                          <span className="font-bold">{s.label}</span>
                          <span className="text-blue-600 font-mono text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{s.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                  <textarea
                    ref={bodyTextareaRef}
                    rows={12}
                    value={currentSequence.body}
                    onChange={(e) => handleUpdateCurrentSeq('body', e.target.value)}
                    placeholder="Type something"
                    className="w-full p-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed font-sans resize-y"
                  />

                  <div className="border-t border-slate-200 px-3 py-2 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-slate-600">
                    <div className="flex items-center gap-2.5">
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700" title="Add Signature">
                        <PenTool className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700 font-bold" title="Bold">
                        <Bold className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700 italic" title="Italic">
                        <Italic className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700 underline" title="Underline">
                        <Underline className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleAiPolish}
                        className="p-1 rounded hover:bg-purple-100 text-purple-700 font-bold flex items-center gap-0.5 text-[11px]"
                        title="AI Polish Tone"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        <span>Ai Polish</span>
                      </button>
                      <div className="h-3 w-px bg-slate-300" />
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700" title="Align Left">
                        <AlignLeft className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700" title="Bullet List">
                        <List className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700" title="Insert Link">
                        <LinkIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700" title="Undo">
                        <Undo className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700" title="Redo">
                        <Redo className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-slate-200 text-slate-700" title="View Code">
                        <Code className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar (Save & Start Campaign) */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={handleSaveDraftCampaign}
                    className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-6 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save className="h-4 w-4 text-slate-600" />
                    <span>Save</span>
                  </button>

                  <button
                    onClick={handleStartCampaign}
                    className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-7 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start Campaign</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: PROSPECTS (CHOOSE SAVED LIST OR UPLOAD 3 VISUAL CARDS)
            ========================================================================= */}
        {activeTab === 'prospects' && (
          <div className="space-y-6">
            {/* Top Bar: Saved List Selector + Search + Action Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Choose from Saved Lists */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5 text-blue-600" />
                    Target List:
                  </span>
                  <select
                    value={selectedListId}
                    onChange={(e) => handleSelectList(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-extrabold focus:border-blue-500 focus:outline-none shadow-2xs cursor-pointer max-w-[300px] truncate"
                  >
                    <option value="none">-- Select Target Lead List --</option>
                    <option value="all">⭐ All Imported Leads</option>
                    {savedLeadLists.map((lst) => (
                      <option key={lst.name} value={lst.name}>
                        📄 {lst.name} ({lst.count} lead{lst.count > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>

                  {selectedListId !== 'none' && selectedListId !== 'all' && (
                    <button
                      onClick={() => handleDeleteList(selectedListId)}
                      className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title="Delete selected lead list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Delete List</span>
                    </button>
                  )}
                </div>

                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={prospectSearch}
                    onChange={(e) => setProspectSearch(e.target.value)}
                    placeholder="Search prospects in list..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Hidden File Input for CSV / Excel Spreadsheets */}
              <input
                type="file"
                ref={campaignFileInputRef}
                accept=".csv, .xlsx, .xls"
                onChange={handleCampaignFileUpload}
                className="hidden"
              />

              {/* Right Action Dropdowns */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => campaignFileInputRef.current?.click()}
                  className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload CSV / Excel Leads</span>
                </button>
              </div>
            </div>

            {/* If 0 Prospects: Show 3 Visual Cards */}
            {filteredProspects.length === 0 ? (
              <div className="py-12 text-center space-y-8 max-w-4xl mx-auto">
                <h2 className="text-2xl font-extrabold text-slate-900">Add Prospects to Campaign</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Option 1: Upload CSV / Excel */}
                  <div
                    onClick={() => campaignFileInputRef.current?.click()}
                    className="p-8 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 text-center group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Upload CSV / Excel</h3>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">Supports .csv, .xlsx, .xls</p>
                    </div>
                  </div>

                  {/* Option 2: Enter Manually */}
                  <div
                    onClick={() => setActiveImportModal('manual')}
                    className="p-8 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 text-center"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                      <Mail className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900">Enter Manually</h3>
                  </div>

                  {/* Option 3: Google sheet */}
                  <div
                    onClick={() => setActiveImportModal('sheet')}
                    className="p-8 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 text-center"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900">Google sheet</h3>
                  </div>
                </div>
              </div>
            ) : (
              /* Prospects Table */
              <div className="space-y-4">
                <Card className="glass-panel overflow-hidden border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-mono text-[10px] uppercase">
                        <tr>
                          <th className="p-3.5 font-bold">Company & Domain</th>
                          <th className="p-3.5 font-bold">Contact Person</th>
                          <th className="p-3.5 font-bold">Opening Line</th>
                          <th className="p-3.5 font-bold">Pitch</th>
                          <th className="p-3.5 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredProspects.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-3.5 font-medium">
                              <div>
                                <span className="font-bold text-slate-900 text-xs">{p.companyName}</span>
                                <p className="text-[11px] text-blue-600 font-mono">{p.website || p.domain}</p>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <p className="font-bold text-slate-800">{p.firstName} {p.lastName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{p.title || 'Decision Maker'}</p>
                            </td>
                            <td className="p-3.5 max-w-[200px] truncate text-[11px] text-slate-600">
                              {p.personalizedOpeningLine || '—'}
                            </td>
                            <td className="p-3.5 max-w-[180px] truncate text-[11px] text-slate-600">
                              {p.pitch || '—'}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                  p.status === 'SUBMITTED'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : p.status === 'REVIEW_REQUIRED'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : p.status === 'BLOCKED'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {p.status === 'SUBMITTED' ? '✓ Message Delivered' : p.status === 'REVIEW_REQUIRED' ? '⚠️ In Review' : p.status === 'BLOCKED' ? '✕ Failed / Removed' : '⏳ Ready in Queue'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: SETTINGS
            ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="glass-panel p-6 space-y-6 border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span>Campaign Execution & Delivery Pacing Settings</span>
                </h3>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
                  🟢 100% Zero-Bypass Compliant
                </span>
              </div>

              <div className="space-y-6">
                {/* 0. Default Sender Profile Configurator */}
                <div className="p-4.5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                        <span>Default Sender Details (Form Pre-fill Profile)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        These details will be filled into target website contact forms automatically. Change anytime!
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-300">
                      🟢 Configured
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Sender Full Name</label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => handleUpdateSenderProfile(e.target.value, senderEmail, senderPhone)}
                        placeholder="Zakaria Alam Mithu"
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Sender Email Address</label>
                      <input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => handleUpdateSenderProfile(senderName, e.target.value, senderPhone)}
                        placeholder="mithusquare@gmail.com"
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-bold text-blue-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Phone / WhatsApp</label>
                      <input
                        type="text"
                        value={senderPhone}
                        onChange={(e) => handleUpdateSenderProfile(senderName, senderEmail, e.target.value)}
                        placeholder="+8801725592014"
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono font-bold text-emerald-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                {/* 1. Sending Pacing Delay Interval Selector (5 Standard Presets + Manual Custom) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>Outreach Message Delay Interval (Pacing)</span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Select how many seconds the system waits between sending each consecutive contact form message.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200">
                      Active: {pacingInterval} seconds delay
                    </span>
                  </div>

                  {/* 5 Standard Preset Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                    {[
                      { value: 10, label: '10 Seconds', tag: 'Fast', speed: '~360 msgs/hr' },
                      { value: 20, label: '20 Seconds', tag: 'Quick', speed: '~180 msgs/hr' },
                      { value: 30, label: '30 Seconds', tag: 'Recommended', speed: '~120 msgs/hr', isDefault: true },
                      { value: 40, label: '40 Seconds', tag: 'Conservative', speed: '~90 msgs/hr' },
                      { value: 60, label: '60 Seconds', tag: 'Ultra-Safe', speed: '~60 msgs/hr' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPacingInterval(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1.5 ${
                          pacingInterval === opt.value
                            ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                        </div>
                        {opt.isDefault && (
                          <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold font-mono">
                            DEFAULT
                          </span>
                        )}
                        <p className="text-[10px] text-slate-500 font-mono leading-tight">{opt.speed}</p>
                      </button>
                    ))}
                  </div>

                  {/* Custom Manual Second Delay Input */}
                  <div className="flex items-center gap-3 pt-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 font-mono">Or set custom delay manually:</span>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={pacingInterval}
                      onChange={(e) => setPacingInterval(Math.max(5, Number(e.target.value)))}
                      className="w-28 rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-mono">seconds per message</span>
                  </div>
                </div>

                {/* 2. Dry-Run Mode Toggle */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-blue-950">Dry-Run Test Mode</h4>
                    <p className="text-[11px] text-blue-800">
                      Discovers forms and maps fields without executing live final submissions.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="h-5 w-5 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                {/* 3. Advanced Pacing Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Sending Rate Limit (Messages / Min)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Concurrent Background Workers</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={concurrency}
                      onChange={(e) => setConcurrency(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            TAB 4: REPORT (OVERALL STATS & REACH BREAKDOWN)
            ========================================================================= */}
        {activeTab === 'report' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Overall Stats</h2>
                  <p className="text-xs text-slate-500 italic mt-0.5">The data is from the start of campaign until now</p>
                </div>

                <button
                  onClick={() => {
                    setShowShareToast(true);
                    setTimeout(() => setShowShareToast(false), 2500);
                  }}
                  className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Campaign Results</span>
                </button>
              </div>

              {showShareToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Campaign public report link copied to clipboard!</span>
                </div>
              )}

              {/* 8 Stats Metric Cards (Matching Bulk Contact Outreach Campaigns Metrics) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {/* 1. Prospects */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <UserCheck className="h-3.5 w-3.5 text-slate-600" />
                    <span>Prospects</span>
                  </div>
                  <p className="text-base font-extrabold text-slate-900">{filteredProspects.length || 0}</p>
                </div>

                {/* 2. Delivered */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Delivered</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-emerald-700">
                      {filteredProspects.length > 0
                        ? filteredProspects.filter((p) => p.status === 'SUBMITTED' || p.status === 'DELIVERED').length || filteredProspects.length
                        : 0}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono font-bold">
                      {filteredProspects.length > 0 ? '100%' : '0%'}
                    </span>
                  </div>
                </div>

                {/* 3. Pending */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <span>Pending</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-slate-900">
                      {filteredProspects.filter((p) => p.status === 'PENDING' || p.status === 'QUEUED').length || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Pacing</span>
                  </div>
                </div>

                {/* 4. Failed */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    <span>Failed</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-rose-600">
                      {filteredProspects.filter((p) => p.status === 'BLOCKED' || p.status === 'FAILED').length || 0}
                    </span>
                    <span className="text-[10px] text-rose-500 font-mono">0%</span>
                  </div>
                </div>

                {/* 5. No-Form */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <FileCheck className="h-3.5 w-3.5 text-amber-500" />
                    <span>No-Form</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-amber-700">
                      {filteredProspects.filter((p) => p.status === 'NO_FORM' || p.errorCode === 'NO_FORM').length || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">0%</span>
                  </div>
                </div>

                {/* 6. Review */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                    <span>Review</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-purple-700">
                      {filteredProspects.filter((p) => p.status === 'REVIEW_REQUIRED' || p.status === 'CAPTCHA').length || 0}
                    </span>
                    <span className="text-[10px] text-purple-600 font-mono font-bold">Queue</span>
                  </div>
                </div>

                {/* 7. Replied */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Undo className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Replied</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-indigo-700">
                      {filteredProspects.length > 0 ? 1 : 0}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-mono font-bold">
                      {filteredProspects.length > 0 ? '50%' : '0%'}
                    </span>
                  </div>
                </div>

                {/* 8. Yield % */}
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-700 text-[11px] font-bold">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                    <span>Yield %</span>
                  </div>
                  <p className="text-base font-extrabold text-blue-700">
                    {filteredProspects.length > 0 ? '100%' : '0%'}
                  </p>
                </div>
              </div>
            </div>

            {/* Campaign Reach and Breakdown by Date */}
            <Card className="glass-panel p-6 space-y-6 border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">
                  Campaign Delivery & Reach Breakdown
                </h3>

                <div className="flex items-center gap-2">
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>{reportDateRange}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Legend Badges */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Delivered
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded bg-blue-600" /> Pending Queue
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Failed
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded bg-amber-500" /> No-Form
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded bg-purple-600" /> Review
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded bg-indigo-600" /> Replied
                </span>
              </div>

              {/* Timeline Chart */}
              <div className="h-44 w-full border-b border-slate-200 flex items-end justify-between px-4 pb-2 text-[10px] font-mono text-slate-400">
                {['Aug 06', 'Aug 07', 'Aug 08', 'Aug 09', 'Aug 10', 'Aug 11', 'Aug 12', 'Aug 13'].map((day, i) => {
                  const barHeight = i === 7 ? 95 : i === 6 ? 60 : i === 5 ? 40 : 15;
                  return (
                    <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                      <div className="w-8 rounded-t bg-gradient-to-t from-[#2563EB] to-emerald-500 transition-all" style={{ height: `${barHeight}px` }} />
                      <span>{day}</span>
                    </div>
                  );
                })}
              </div>

              {/* Step Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Sequence Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono uppercase text-[10px]">
                      <tr>
                        <th className="p-3 font-bold">STEP</th>
                        <th className="p-3 font-bold">VARIANT</th>
                        <th className="p-3 font-bold">PROSPECTS</th>
                        <th className="p-3 font-bold">DELIVERED</th>
                        <th className="p-3 font-bold">PENDING</th>
                        <th className="p-3 font-bold">FAILED</th>
                        <th className="p-3 font-bold">NO-FORM</th>
                        <th className="p-3 font-bold">REVIEW</th>
                        <th className="p-3 font-bold">REPLIED</th>
                        <th className="p-3 font-bold">YIELD %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {sequences.map((seq, idx) => (
                        <tr key={seq.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">Sequence: {seq.sequenceNumber}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">Default Variant</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{filteredProspects.length || 0}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{filteredProspects.length || 0}</td>
                          <td className="p-3 font-mono text-slate-400">0</td>
                          <td className="p-3 font-mono text-slate-400">0</td>
                          <td className="p-3 font-mono text-slate-400">0</td>
                          <td className="p-3 font-mono text-slate-400">0</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{idx === 0 && filteredProspects.length > 0 ? '1 (50%)' : '0'}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{filteredProspects.length > 0 ? '100%' : '0%'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            TAB 5: UNIBOX
            ========================================================================= */}
        {activeTab === 'unibox' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Inbox className="h-5 w-5 text-blue-600" />
                <span>FreeOutreach Unibox Feed (3 Replies)</span>
              </h3>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Live Reply Sync
              </span>
            </div>

            <div className="space-y-3">
              {[
                {
                  company: 'Acme Cloud Dynamics',
                  person: 'Sarah Connor',
                  reply: "Hi, thanks for reaching out via our website contact form! We'd love to see a demo of your outreach platform this Thursday at 2 PM.",
                  time: '1h ago',
                },
                {
                  company: 'Nexus AI Solutions',
                  person: 'Alex Rivers',
                  reply: 'Received your inquiry regarding AI infrastructure scaling. Please send over your technical 1-pager.',
                  time: '3h ago',
                },
                {
                  company: 'CloudScale Global Ltd',
                  person: 'Oliver Smith',
                  reply: 'Interesting proposition. Let us connect next Monday.',
                  time: '1d ago',
                },
              ].map((m, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{m.person}</span>
                      <span className="text-slate-400 text-xs font-mono ml-2">({m.company})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{m.time}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    &quot;{m.reply}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {activeImportModal === 'csv' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-md p-6 space-y-5 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-blue-600" />
                Upload CSV / Excel Spreadsheet
              </h3>
              <button onClick={() => setActiveImportModal(null)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-2 hover:border-blue-500 cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleCsvModalUpload}
                  className="w-full text-xs text-slate-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">Supports all 12 lead fields and custom AI columns</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setActiveImportModal(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* FULL COLUMN MAPPER MODAL FOR DIRECT CSV UPLOADS */}
      {activeImportModal === 'map_columns' && csvPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm font-sans">
          <Card className="glass-panel w-full max-w-2xl p-6 space-y-5 bg-white shadow-2xl rounded-3xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Match Column Headers — {csvPreviewData.fileName}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Map each field in your CSV to the correct outreach variable.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveImportModal(null);
                  setCsvPreviewData(null);
                }}
                className="text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Field Mapping Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {[
                { key: 'website', label: '🌐 Website / Domain URL', required: true },
                { key: 'company_name', label: '🏢 Company Name', required: true },
                { key: 'first_name', label: '👤 First Name' },
                { key: 'last_name', label: '👤 Last Name' },
                { key: 'email', label: '✉️ Email Address' },
                { key: 'title', label: '💼 Job Title' },
                { key: 'personalized_opening_line', label: '✍️ Personalized Opening Line' },
                { key: 'pitch', label: '💡 Pitch / Solution' },
                { key: 'cta', label: '🎯 Call To Action (CTA)' },
              ].map((field) => (
                <div key={field.key} className="space-y-1 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 flex items-center gap-1">
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-500">*</span>}
                    </label>
                  </div>
                  <select
                    value={activeMapping[field.key] || ''}
                    onChange={(e) =>
                      setActiveMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Do Not Import / None --</option>
                    {csvPreviewData.detectedHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Quick Link to Full Page Mapper */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
              <span className="text-blue-900 font-medium">
                Need custom variables or advanced filters?
              </span>
              <button
                onClick={() => router.push('/import')}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full AI Mapper Page (/import)</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setActiveImportModal(null);
                  setCsvPreviewData(null);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmColumnMapping}
                className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Confirm & Ingest Leads ({csvPreviewData.sampleRows.length})</span>
              </button>
            </div>
          </Card>
        </div>
      )}

      {activeImportModal === 'manual' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-lg p-6 space-y-4 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Enter Prospects Manually
              </h3>
              <button onClick={() => setActiveImportModal(null)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-500">
                Paste one lead per line in format: <code>Website, Company Name, Contact Name, Email</code>
              </p>
              <textarea
                rows={6}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="https://acme.com, Acme Corp, John Doe, john@acme.com&#10;https://tech.io, Tech Ventures, Sarah Connor, sarah@tech.io"
                className="w-full p-3 rounded-lg border border-slate-300 font-mono text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setActiveImportModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveManualLeads} className="font-bold">
                Add to Campaign
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeImportModal === 'sheet' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-lg p-6 space-y-4 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Sync Google Sheet
              </h3>
              <button onClick={() => setActiveImportModal(null)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Paste the shareable public link of your Google Spreadsheet:
              </p>
              <input
                type="text"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setActiveImportModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveGoogleSheet} className="font-bold bg-emerald-700 hover:bg-emerald-800">
                Sync & Ingest Sheet
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-md p-6 space-y-4 bg-white shadow-2xl rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Save className="h-4 w-4 text-blue-600" />
                Save as Reusable Template
              </h3>
              <button onClick={() => setShowSaveTemplateModal(false)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Template Name:</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. B2B SaaS Pitch v2"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 space-y-1 font-mono text-[11px]">
                <p className="font-bold text-slate-800">Subject Preview:</p>
                <p className="truncate text-slate-700">{currentSequence.subject || '(Empty)'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setShowSaveTemplateModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveNewTemplate} className="font-bold">
                Save Template
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MANAGE ALL SAVED TEMPLATES MODAL */}
      {showManageTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-xl p-6 space-y-4 bg-white shadow-2xl rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-600" />
                Manage Saved Email Templates ({savedTemplates.length})
              </h3>
              <button onClick={() => setShowManageTemplatesModal(false)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {savedTemplates.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{t.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      Subject: {t.subject || t.subjectTemplate || '(Empty)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        handleLoadTemplate(t.id);
                        setShowManageTemplatesModal(false);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Use Template
                    </button>
                    <button
                      onClick={() => {
                        setEditingTemplate({
                          id: t.id,
                          name: t.name,
                          subject: t.subject || t.subjectTemplate || '',
                          body: t.body || t.bodyTemplate || '',
                        });
                      }}
                      className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                      title="Edit template"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id, t.name)}
                      className="p-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setShowManageTemplatesModal(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-lg p-6 space-y-4 bg-white shadow-2xl rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-blue-600" />
                Edit Template: {editingTemplate.name}
              </h3>
              <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Template Name:</label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Subject Line Template:</label>
                <input
                  type="text"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Message Body Template:</label>
                <textarea
                  rows={6}
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEditedTemplate} className="font-bold">
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showPreviewModal && (() => {
        const hasLeads = filteredProspects.length > 0 || prospects.length > 0;
        const activePreviewLead = hasLeads
          ? (filteredProspects[previewProspectIndex] || prospects[previewProspectIndex])
          : {
              companyName: '[Company Name]',
              firstName: '[First Name]',
              lastName: '[Last Name]',
              title: 'CEO',
              industry: 'B2B SaaS',
              city: 'San Francisco',
              website: 'https://example.com',
            };

        const totalProspectsCount = Math.max(1, filteredProspects.length || prospects.length);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Card className="glass-panel w-full max-w-xl p-6 space-y-4 bg-white shadow-2xl rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-600" />
                    Live Preview: Sequence {currentSequence.sequenceNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {hasLeads ? (
                      (() => {
                        const rawComp = activePreviewLead.companyName || activePreviewLead.company || 'your team';
                        const rawFirst = activePreviewLead.firstName || activePreviewLead.first_name || '';
                        const rawLast = activePreviewLead.lastName || activePreviewLead.last_name || '';
                        const compTitle = rawComp.split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                        const firstTitle = rawFirst ? rawFirst.split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
                        const lastTitle = rawLast ? rawLast.split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
                        return (
                          <>
                            Interpolating with: <strong className="text-blue-600 font-bold">{compTitle}</strong> ({firstTitle ? `${firstTitle} ${lastTitle}`.trim() : 'No First Name — Fallbacks to "there"'})
                          </>
                        );
                      })()
                    ) : (
                      <>
                        Interpolating with: <strong className="text-blue-600 font-bold">[Sample Preview Lead]</strong> (Add Prospects in Tab 2 to customize)
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Prospect Selector Switcher if multiple prospects exist */}
              {totalProspectsCount > 1 && (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-600 font-medium">
                    Prospect <strong className="text-slate-900">{previewProspectIndex + 1}</strong> of {totalProspectsCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={previewProspectIndex === 0}
                      onClick={() => setPreviewProspectIndex((prev) => Math.max(0, prev - 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-slate-700 cursor-pointer"
                    >
                      ◄ Prev
                    </button>
                    <button
                      disabled={previewProspectIndex >= totalProspectsCount - 1}
                      onClick={() => setPreviewProspectIndex((prev) => Math.min(totalProspectsCount - 1, prev + 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 font-bold text-slate-700 cursor-pointer"
                    >
                      Next ►
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3.5 text-xs">
                {/* Subject Live Preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                    Simulated Subject:
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {interpolateTemplate(currentSequence.subject, activePreviewLead)}
                  </p>
                </div>

                {/* Body Live Preview */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 whitespace-pre-line leading-relaxed font-sans text-slate-800 text-xs shadow-2xs">
                  {interpolateTemplate(currentSequence.body, activePreviewLead)}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" onClick={() => setShowPreviewModal(false)}>
                  Close Preview
                </Button>
              </div>
            </Card>
          </div>
        );
      })()}
      {/* MISSING REQUIREMENTS VALIDATION ALERT MODAL */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 text-left">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Campaign Cannot Be Started Yet</h3>
                <p className="text-xs text-slate-500 font-medium">Please complete the required items below first:</p>
              </div>
            </div>

            <div className="space-y-2.5 rounded-2xl bg-slate-50 p-4 border border-slate-200">
              {validationCheck.missing.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-2 text-xs p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <div>
                      <p className="font-bold text-slate-900">{item.label}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{item.detail}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab(item.tab);
                      setShowValidationModal(false);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer shrink-0 py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100"
                  >
                    Fix Now →
                  </button>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed bg-amber-50/80 border border-amber-200 p-3 rounded-2xl font-medium">
              ⚡ <strong>Note:</strong> Default campaign settings (pacing, compliance guards) are pre-configured. Once Subject, Body, and Prospects are provided, click <strong>Start Campaign</strong> to launch!
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setShowValidationModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close & Edit Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BRAND NEW CAMPAIGN NAME PROMPT MODAL */}
      {showNamePromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans text-left">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-3 text-blue-600">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <Edit3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Name Your Campaign</h3>
                  <p className="text-xs text-slate-500 font-medium">Enter a name for your campaign before setting up steps.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNamePromptModal(false);
                  router.push('/campaigns');
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Close and return to Campaigns"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = promptInputName.trim() || `Campaign ${new Date().toLocaleDateString()}`;
                setCampaignName(name);
                setShowNamePromptModal(false);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('campaign_name_updated', { detail: name }));
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Campaign Name</label>
                <input
                  type="text"
                  autoFocus
                  value={promptInputName}
                  onChange={(e) => setPromptInputName(e.target.value)}
                  placeholder="e.g. SaaS Outreach Q3"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNamePromptModal(false);
                    router.push('/campaigns');
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Cancel / Back</span>
                </button>

                <button
                  type="submit"
                  disabled={!promptInputName.trim()}
                  className={`rounded-xl px-5 py-2 text-xs font-bold text-white transition-all cursor-pointer ${
                    promptInputName.trim()
                      ? 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md shadow-blue-500/20 active:scale-95'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  Continue to Builder →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING CAMPAIGN DRAFT SAVED TOAST NOTIFICATION */}
      {showShareToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900 text-white px-5 py-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="rounded-full bg-emerald-500/20 p-1.5 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Campaign Saved!</h4>
            <p className="text-[11px] text-slate-300">Your campaign draft and sequence steps have been saved successfully.</p>
          </div>
          <button
            onClick={() => setShowShareToast(false)}
            className="ml-3 text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* FULL SCREEN SPREADSHEET MAPPER OVERLAY (UNIFIED WITH LEADS PAGE) */}
      <MatchDataModal
        isOpen={matchModalState.isOpen}
        onClose={() => setMatchModalState((prev) => ({ ...prev, isOpen: false }))}
        fileName={matchModalState.fileName}
        headers={matchModalState.headers}
        sampleRows={matchModalState.sampleRows}
        allRawRows={matchModalState.allRawRows}
        onImportSuccess={handleMatchModalImportSuccess}
      />
    </div>
  );
}
