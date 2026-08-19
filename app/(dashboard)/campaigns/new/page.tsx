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
      setShowNamePromptModal(true);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_campaigns');
        const parsed = stored ? JSON.parse(stored) : [];

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
          }
        }
      } catch (e) {}
    }
  }, [editIdParam, searchParams]);

  const [prospects, setProspects] = useState<any[]>([]);

  const [activeImportModal, setActiveImportModal] = useState<'csv' | 'manual' | 'sheet' | 'map_columns' | null>(null);

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-8">
      <h1 className="text-2xl font-bold">Campaign Editor</h1>
      <p className="text-sm text-slate-500">ContactReachout Automated Campaign Builder</p>
    </div>
  );
}
