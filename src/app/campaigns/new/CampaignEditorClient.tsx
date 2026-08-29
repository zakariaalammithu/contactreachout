'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Play, Plus, Zap, Mail, Sparkles, Search, Bold, Italic, Underline, Bot, AlignLeft,
  List, Link as LinkIcon, PenTool, Undo, Redo, Code, MoreVertical, Trash2, Edit3, Settings,
  Clock, ShieldCheck, CheckCircle2, AlertTriangle, Save, FileCheck, Building2, Globe, Sliders,
  Check, Eye, ShieldAlert, Database, Filter, UploadCloud, FileSpreadsheet, Share2, TrendingUp,
  Download, Calendar, Layers, ChevronDown, UserCheck, AlertCircle, ExternalLink, MessageSquare,
  ThumbsUp, DollarSign, Ban, Inbox, RotateCcw, FolderOpen, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CampaignSequenceStep, LeadList } from '@/types';
import { SAMPLE_DATASETS } from '@/lib/services/sample-templates';
import { parseSpreadsheetPreview, processImportRows, suggestColumnMappings } from '@/lib/services/import-service';
import { MatchDataModal } from '@/components/leads/MatchDataModal';

export default function CampaignEditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams ? searchParams.get('id') || searchParams.get('edit') : null;

  // State & Handler definitions identical to existing editor page...
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(editIdParam);
  const [campaignName, setCampaignName] = useState('new');
  const [activeTab, setActiveTab] = useState<'steps' | 'prospects' | 'settings' | 'report' | 'unibox'>('steps');

  useEffect(() => {
    if (searchParams) {
      const tabParam = searchParams.get('tab');
      if (tabParam && ['steps', 'prospects', 'settings', 'report', 'unibox'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
      const nameParam = searchParams.get('name');
      if (nameParam) {
        setCampaignName(nameParam);
      }
    }
  }, [searchParams]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{campaignName || 'Campaign Editor'}</h1>
            <p className="text-xs text-slate-500">Configure sequence steps, prospects, and safety settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
