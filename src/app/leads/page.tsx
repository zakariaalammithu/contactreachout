'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Globe,
  Filter,
  UploadCloud,
  ExternalLink,
  Sparkles,
  Building2,
  Linkedin,
  MapPin,
  Trash2,
  Plus,
  Eye,
  FileSpreadsheet,
  X,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { mockLeads } from '@/lib/store/mock-data';
import { readCampaignDrafts, writeCampaignDrafts } from '@/lib/services/campaign-draft-storage';
import {
  parseSpreadsheetPreview,
  suggestColumnMappings,
  processImportRows,
} from '@/lib/services/import-service';
import { generateUniqueLeadListName } from '@/lib/services/lead-list-service';
import { parseBulkWebsites, matchesLeadDetails, matchesBulkDomains, countLeadsForList, pruneEmptyLists } from '@/lib/services/lead-filter-utils';


export default function LeadsPage() {
  const router = useRouter();

  // Instant Route Prefetching & Warmup
  useEffect(() => {
    try {
      router.prefetch('/campaigns/new');
      router.prefetch('/campaigns');
      router.prefetch('/unibox');
      router.prefetch('/processing');
      router.prefetch('/results');
      router.prefetch('/settings');
    } catch (e) {}
  }, [router]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [allLeads, setAllLeads] = useState<any[]>(mockLeads);
  const [newlyImportedCount, setNewlyImportedCount] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<any | null>(null);
  const [isImportingDirectly, setIsImportingDirectly] = useState(false);
  const [leadLists, setLeadLists] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState('');
  const [listFilter, setListFilter] = useState('ALL');
  const [activeListIds, setActiveListIds] = useState<string[]>([]);
  const [jobTitleFilter, setJobTitleFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [bulkSearchInput, setBulkSearchInput] = useState('');
  const [bulkSearchDomains, setBulkSearchDomains] = useState<string[]>([]);
  const [bulkSearchTruncated, setBulkSearchTruncated] = useState(0);
  const [listsFilterOpen, setListsFilterOpen] = useState(true);
  const [listDropdownOpen, setListDropdownOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignFilter, setCampaignFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');

  const availableStatuses = React.useMemo(
    () => Array.from(new Set(allLeads.map((lead) => String(lead.status || 'PENDING').trim()).filter(Boolean))),
    [allLeads]
  );

  // Direct Lead File Selection & Instant Parsing (No Page Redirects)
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsImportingDirectly(true);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const preview = parseSpreadsheetPreview(arrayBuffer, selectedFile.name);
      const suggestedMapping = suggestColumnMappings(preview.detectedHeaders);

      const fileName = selectedFile.name;
      const rawListName = fileName.replace(/\.[^/.]+$/, '');
      const storedLists = typeof window !== 'undefined' ? localStorage.getItem('user_lead_lists') : null;
      const existingLists = storedLists ? JSON.parse(storedLists) : [];
      const activeAccount = (typeof window !== 'undefined' ? (localStorage.getItem('active_account_email') || '') : '').trim().toLowerCase();
      const listName = generateUniqueLeadListName(
        Array.isArray(existingLists) ? existingLists : [],
        rawListName,
        activeAccount,
      );


      const importResult = processImportRows(preview.rawRows, suggestedMapping as any, {
        sourceFileName: fileName,
        listName: listName,
      } as any);

      const validLeads = importResult.validLeads.map((ld: any, idx: number) => ({
        id: `direct-lead-${Date.now()}-${idx}`,
        companyName: ld.companyName || ld.company_name || 'Company',
        company_name: ld.companyName || ld.company_name || 'Company',
        website: ld.website || ld.domain || '',
        domain: ld.domain || ld.website || '',
        email: ld.email || '',
        firstName: ld.firstName || ld.first_name || '',
        first_name: ld.firstName || ld.first_name || '',
        lastName: ld.lastName || ld.last_name || '',
        last_name: ld.lastName || ld.last_name || '',
        phone: ld.phone || '',
        title: ld.title || '',
        industry: ld.industry || '',
        city: ld.city || '',
        country: ld.country || '',
        status: 'UNCONTACTED',
        sourceFileName: fileName,
        source_file: fileName,
        file_name: fileName,
        listId: listName,
        isNewlyImported: true,
      }));

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('user_imported_leads');
        const existing = stored ? JSON.parse(stored) : [];
        const mergedLeads = [...validLeads, ...existing];
        localStorage.setItem('user_imported_leads', JSON.stringify(mergedLeads));

        // Save list metadata
        const storedLists = localStorage.getItem('user_lead_lists');
        if (storedLists) {
          const parsedLists = JSON.parse(storedLists);
          if (Array.isArray(parsedLists)) setLeadLists(parsedLists);
        }
        const existingLists = storedLists ? JSON.parse(storedLists) : [];
        const newListObj = {
          id: `list-${Date.now()}`,
          name: listName,
          fileName: fileName,
          count: validLeads.length,
          uploadedAt: new Date().toISOString(),
        };
        localStorage.setItem('user_lead_lists', JSON.stringify([newListObj, ...existingLists]));
        setLeadLists((prev) => [newListObj, ...prev.filter((item) => item.id !== newListObj.id)]);

        setNewlyImportedCount(validLeads.length);
        setUploadedFileName(fileName);
        setAllLeads((prev) => [...validLeads, ...prev]);
      }
    } catch (err: any) {
      alert(`Error importing lead file: ${err.message}`);
    } finally {
      setIsImportingDirectly(false);
      if (e.target) e.target.value = '';
    }
  };

  // Selection Checkboxes State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Pagination State (Excel-Style Page 1, Page 2 Navigation)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [currentUser, setCurrentUser] = useState<{ email: string; role: string } | null>(null);

  // Load session & user imported leads & list file names with strict user isolation
  useEffect(() => {
    async function loadSessionAndLeads() {
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
        console.error('Session fetch error in CRM:', e);
      }

      const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userEmail === 'mithusquare@gmail.com';

      try {
        const stored = localStorage.getItem('user_imported_leads');
        const storedLists = localStorage.getItem('user_lead_lists');
        const storedCampaigns = readCampaignDrafts(localStorage);
        const deletedLeadIds = new Set<string>(JSON.parse(localStorage.getItem('user_deleted_lead_ids') || '[]'));

        if (storedCampaigns.length) {
          const parsedCampaigns = storedCampaigns;
          if (Array.isArray(parsedCampaigns)) {
            const filteredCamps = isAdmin
              ? parsedCampaigns
              : parsedCampaigns.filter((c: any) => !c.ownerEmail || c.ownerEmail.toLowerCase() === userEmail);
            setCampaigns(filteredCamps);
          }
        }

        // Parsed here, pruned + applied after the leads load below, so
        // files emptied by an earlier delete vanish on first load too.
        let parsedLists: any[] = [];
        if (storedLists) {
          const parsed = JSON.parse(storedLists);
          if (Array.isArray(parsed)) parsedLists = parsed;
        }

        let userLeads: any[] = [];
        let detectedFileName = '';

        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            userLeads = parsed
              .filter((ld: any) => !deletedLeadIds.has(String(ld.id)))
              .filter((ld: any) => {
                if (isAdmin) return true;
                if (ld.ownerEmail) return ld.ownerEmail.toLowerCase() === userEmail;
                return true;
              })
              .map((ld: any) => ({
                ...ld,
                sourceFileName: ld.sourceFileName || ld.fileName || 'Uploaded_Leads_File.csv',
                isNewlyImported: true,
              }));

            setNewlyImportedCount(userLeads.length);
            if (userLeads.length > 0 && userLeads[0].sourceFileName) {
              detectedFileName = userLeads[0].sourceFileName;
            }
            setUploadedFileName(detectedFileName || 'Uploaded_Leads.csv');
          }
        }

        // Admin: include platform mockLeads alongside imported leads.
        // Normal User: ONLY load user's own leads (no mock leads leak).
        const visibleLeads = isAdmin
          ? [...userLeads, ...mockLeads.filter((lead: any) => !deletedLeadIds.has(String(lead.id)))]
          : userLeads;
        setAllLeads(visibleLeads);

        // Drop files with no leads left (e.g. emptied by a delete before
        // this fix shipped) and persist the cleanup. Lists belonging to
        // other accounts are never touched: only the viewer's own
        // filtered lists are pruned, the rest pass through untouched.
        const filteredLists = isAdmin
          ? parsedLists
          : parsedLists.filter((l: any) => !l.ownerEmail || l.ownerEmail.toLowerCase() === userEmail);
        const prunedLists = pruneEmptyLists(filteredLists, visibleLeads);
        setLeadLists(prunedLists);
        if (prunedLists.length !== filteredLists.length) {
          const kept = new Set(prunedLists);
          localStorage.setItem(
            'user_lead_lists',
            JSON.stringify(parsedLists.filter((l) => !filteredLists.includes(l) || kept.has(l)))
          );
        }
      } catch (err) {
        console.error('Error loading imported leads from localStorage:', err);
      }
    }

    loadSessionAndLeads();
  }, []);

  // Live count only: the old upload-time count fallback kept showing
  // e.g. "(4)" for a file whose leads had all been deleted.
  const listLeadCount = (list: any) => countLeadsForList(allLeads, list);

  const visibleLists = leadLists.filter((list) => {
    const name = String(list.name || list.fileName || '').toLowerCase();
    const matchesSearch = !listSearch.trim() || name.includes(listSearch.trim().toLowerCase());
    const count = listLeadCount(list);
    const matchesFilter = listFilter === 'ALL' ||
      (listFilter === 'RECENT' && Date.now() - new Date(list.uploadedAt || list.createdAt || 0).getTime() < 30 * 86400000) ||
      (listFilter === 'LARGEST' && count >= Math.max(...leadLists.map((item) => listLeadCount(item)), 0)) ||
      (listFilter === 'USED' && allLeads.some((lead) => lead.listId === list.id || lead.listName === list.name));
    return matchesSearch && matchesFilter;
  });

  const removeList = (list: any) => {
    if (!window.confirm(`Delete Lead List "${list.name}"? This will remove its imported prospect records.`)) return;
    const nextLists = leadLists.filter((item) => item.id !== list.id);
    const nextLeads = allLeads.filter((lead) => lead.listId !== list.id && lead.listId !== list.name && lead.listName !== list.name);
    setLeadLists(nextLists); setAllLeads(nextLeads);
    setActiveListIds((prev) => prev.filter((id) => id !== list.id && id !== list.name));
    localStorage.setItem('user_lead_lists', JSON.stringify(nextLists));
    localStorage.setItem('user_imported_leads', JSON.stringify(nextLeads.filter((lead) => lead.isNewlyImported)));
  };

  const renameList = (list: any) => {
    const name = window.prompt('Lead List Name', list.name || '');
    if (!name?.trim()) return;
    const nextLists = leadLists.map((item) => item.id === list.id ? { ...item, name: name.trim(), lastUpdated: new Date().toISOString() } : item);
    setLeadLists(nextLists); localStorage.setItem('user_lead_lists', JSON.stringify(nextLists));
  };

  // Listen for direct header lead imports
  useEffect(() => {
    const handleDirectImportEvent = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        const imported = e.detail;
        setNewlyImportedCount(imported.length);
        if (imported[0]?.sourceFileName) {
          setUploadedFileName(imported[0].sourceFileName);
        }
        setAllLeads((prev) => [...imported, ...prev]);
      }
    };
    window.addEventListener('leads_imported_directly', handleDirectImportEvent);
    return () => window.removeEventListener('leads_imported_directly', handleDirectImportEvent);
  }, []);

  // Reset pagination to page 1 whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, campaignFilter, tagFilter, activeListIds, jobTitleFilter, nameFilter, companyFilter, websiteFilter, countryFilter, bulkSearchDomains, pageSize]);

  const clearImportedLeads = () => {
    if (confirm('Clear all your imported leads?')) {
      localStorage.removeItem('user_imported_leads');
      localStorage.removeItem('user_lead_lists');
      setNewlyImportedCount(0);
      setUploadedFileName('');
      setAllLeads(mockLeads);
    }
  };

  const filteredLeads = allLeads.filter((lead) => {
    const searchLower = searchTerm.trim().toLowerCase();
    
    const leadFile = (
      lead.sourceFileName ||
      lead.source_file ||
      lead.fileName ||
      lead.file_name ||
      lead.source ||
      lead.file ||
      uploadedFileName ||
      ''
    ).toLowerCase();

    const matchesSearch =
      !searchLower ||
      (lead.companyName || lead.company_name || '').toLowerCase().includes(searchLower) ||
      (lead.domain || lead.website || '').toLowerCase().includes(searchLower) ||
      (lead.email || '').toLowerCase().includes(searchLower) ||
      (lead.firstName || lead.first_name || '').toLowerCase().includes(searchLower) ||
      (lead.lastName || lead.last_name || '').toLowerCase().includes(searchLower) ||
      (lead.title || '').toLowerCase().includes(searchLower) ||
      (lead.industry || '').toLowerCase().includes(searchLower) ||
      (lead.city || '').toLowerCase().includes(searchLower) ||
      (lead.country || '').toLowerCase().includes(searchLower) ||
      leadFile.includes(searchLower);

    const selectedLists = activeListIds.length
      ? leadLists.filter((list) => activeListIds.includes(list.id) || activeListIds.includes(list.name))
      : [];
    const listKeys = new Set<string>();
    selectedLists.forEach((list) => {
      [list.id, list.name, list.fileName].filter(Boolean).forEach((key) => listKeys.add(String(key)));
    });
    const leadListKeys = [lead.listId, lead.listName, lead.sourceFileName, lead.source_file, lead.fileName, lead.file_name].filter(Boolean).map(String);
    const matchesList = listKeys.size === 0 || leadListKeys.some((key) => listKeys.has(key));
    const matchesDetails = matchesLeadDetails(lead, {
      jobTitle: jobTitleFilter,
      name: nameFilter,
      company: companyFilter,
      website: websiteFilter,
      country: countryFilter,
    });
    const matchesBulk = matchesBulkDomains(lead, bulkSearchDomains);
    const selectedCampaign = campaignFilter === 'ALL' ? null : campaigns.find((campaign) => campaign.id === campaignFilter);
    const campaignLeads = selectedCampaign?.prospectsList || selectedCampaign?.prospects || [];
    const campaignLeadIds = selectedCampaign ? new Set(campaignLeads.map((item: any) => typeof item === 'string' ? item : item.id).filter(Boolean).map(String)) : null;
    const matchesCampaign = !campaignLeadIds || campaignLeadIds.has(String(lead.id)) || campaignLeadIds.has(String(lead.website || lead.domain || ''));
    const matchesTag = tagFilter === 'ALL' || String(lead.tag || lead.tags || '').split(',').map((value: string) => value.trim()).includes(tagFilter);
    const rawStatus = String(lead.status || 'PROSPECT').toUpperCase().trim();
    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PROSPECT') {
        matchesStatus = rawStatus === 'PROSPECT' || rawStatus === 'UNCONTACTED' || rawStatus === 'NEW';
      } else if (statusFilter === 'DELIVERED') {
        matchesStatus = rawStatus === 'DELIVERED' || rawStatus === 'REACHED' || rawStatus === 'SENT';
      } else if (statusFilter === 'FAILED') {
        matchesStatus = rawStatus === 'FAILED';
      } else if (statusFilter === 'NO_FORM') {
        matchesStatus = rawStatus === 'NO_FORM' || rawStatus === 'NO_CONTACT_PAGE';
      } else if (statusFilter === 'REVIEW') {
        matchesStatus = rawStatus === 'REVIEW' || rawStatus === 'CAPTCHA' || rawStatus === 'CAPTCHA_REVIEW';
      } else if (statusFilter === 'REPLIED') {
        matchesStatus = rawStatus === 'REPLIED' || rawStatus === 'INTERESTED';
      } else if (statusFilter === 'PENDING') {
        matchesStatus = rawStatus === 'PENDING';
      } else {
        matchesStatus = rawStatus === statusFilter.toUpperCase();
      }
    }

    return matchesSearch && matchesStatus && matchesList && matchesCampaign && matchesTag && matchesDetails && matchesBulk;
  });

  // Calculate Pagination Slices
  const totalLeads = filteredLeads.length;
  const totalPages = Math.ceil(totalLeads / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalLeads);
  const currentPaginatedLeads = filteredLeads.slice(startIndex, endIndex);

  // Selection Checkboxes Handlers
  const isAllPageSelected =
    currentPaginatedLeads.length > 0 &&
    currentPaginatedLeads.every((l) => selectedLeadIds.includes(l.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(currentPaginatedLeads.map((l) => l.id));
      setSelectedLeadIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = currentPaginatedLeads.map((l) => l.id);
      setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectLead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedLeads = () => {
    if (selectedLeadIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected lead(s)?`)) {
      const updated = allLeads.filter((l) => !selectedLeadIds.includes(l.id));
      setAllLeads(updated);
      setSelectedLeadIds([]);
      // A file whose leads are all deleted removes itself: drop every
      // list left with zero leads (state + storage + active selection).
      const nextLists = pruneEmptyLists(leadLists, updated);
      if (nextLists.length !== leadLists.length) {
        setLeadLists(nextLists);
        const prunedKeys = new Set<string>();
        leadLists.forEach((list) => {
          if (!nextLists.includes(list)) {
            [list.id, list.name, list.fileName].filter(Boolean).forEach((key) => prunedKeys.add(String(key)));
          }
        });
        setActiveListIds((prev) => prev.filter((id) => !prunedKeys.has(id)));
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_lead_lists', JSON.stringify(nextLists));
        }
      }

      if (typeof window !== 'undefined') {
        const deleted = new Set<string>(JSON.parse(localStorage.getItem('user_deleted_lead_ids') || '[]'));
        selectedLeadIds.forEach((id) => deleted.add(String(id)));
        localStorage.setItem('user_deleted_lead_ids', JSON.stringify(Array.from(deleted)));
        const storedImported = localStorage.getItem('user_imported_leads');
        if (storedImported) {
          const parsed = JSON.parse(storedImported);
          const filtered = parsed.filter((l: any) => !selectedLeadIds.includes(l.id));
          localStorage.setItem('user_imported_leads', JSON.stringify(filtered));
        }
      }
    }
  };

  const handleCreateCampaignWithSelected = () => {
    if (selectedLeadIds.length === 0) return;
    const selectedLeads = allLeads.filter((l) => selectedLeadIds.includes(l.id));
    if (typeof window !== 'undefined') {
      const activeAccount = (localStorage.getItem('active_account_email') || '').toLowerCase();
      const campaignId = `campaign-${Date.now()}`;
      const selectedListIds = Array.from(new Set(selectedLeads.map((lead: any) => lead.listId).filter(Boolean)));
      const now = new Date().toISOString();
      const storedCampaigns = readCampaignDrafts(localStorage);
      const campaign = {
        id: campaignId,
        name: `Campaign with ${selectedLeads.length} Leads`,
        tag: 'CUSTOM',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        ownerEmail: activeAccount,
        selectedListId: selectedListIds[0] || '',
        selectedListIds,
        prospectsList: selectedLeads,
        sequences: [],
        isDryRun: false,
        rateLimitPerMinute: 10,
        maxConcurrency: 5,
        sentCount: 0,
        failedCount: 0,
        noFormCount: 0,
        captchaCount: 0,
      };
      writeCampaignDrafts(localStorage, [campaign, ...storedCampaigns]);
      localStorage.setItem('user_imported_leads', JSON.stringify(selectedLeads));
      router.push(`/campaigns/new?edit=${encodeURIComponent(campaignId)}`);
      return;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-[1750px] pb-12">
      {/* Floating Selection Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-zinc-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold font-mono">
              {selectedLeadIds.length}
            </span>
            <span className="text-xs font-bold text-zinc-300">
              lead{selectedLeadIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCreateCampaignWithSelected}
              className="flex items-center gap-1.5 rounded-xl bg-[#0e6de4] hover:bg-[#0758bd] text-white px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Create Campaign with Selected ({selectedLeadIds.length})</span>
            </button>

            <button
              onClick={handleDeleteSelectedLeads}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected</span>
            </button>

            <button
              onClick={() => setSelectedLeadIds([])}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">Contact Lists</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Organize your uploaded lead lists and use them in campaigns.
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleDirectFileUpload} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="primary" size="sm"><UploadCloud className="mr-2 h-4 w-4" />Upload CSV/XLSX</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start w-full">
      <Card className="border-zinc-800 bg-zinc-950 p-3.5 shadow-sm lg:sticky lg:top-4 shrink-0 w-full">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-400" />
            <span>Filters</span>
          </p>
          {(activeListIds.length > 0 || campaignFilter !== 'ALL' || statusFilter !== 'ALL' || jobTitleFilter || nameFilter || companyFilter || websiteFilter || countryFilter || bulkSearchDomains.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setActiveListIds([]);
                setListSearch('');
                setCampaignFilter('ALL');
                setStatusFilter('ALL');
                setJobTitleFilter('');
                setNameFilter('');
                setCompanyFilter('');
                setWebsiteFilter('');
                setCountryFilter('');
                setBulkSearchInput('');
                setBulkSearchDomains([]);
                setBulkSearchTruncated(0);
              }}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="mt-3 divide-y divide-zinc-800 rounded-xl border border-zinc-800/80 bg-zinc-950 overflow-hidden text-xs">
          {/* 1. Campaigns */}
          <details className="group px-3 py-2.5" open={campaignFilter !== 'ALL'}>
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-zinc-300 hover:text-blue-400">
              <span className="flex items-center gap-2">
                <span>Campaigns</span>
                {campaignFilter !== 'ALL' && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-900 text-blue-300 text-[10px] font-mono">1 selected</span>
                )}
              </span>
              <span className="text-zinc-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-2 space-y-1 pt-1">
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </details>

          {/* 2. Lists */}
          <details className="group px-3 py-2.5" open={activeListIds.length > 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-zinc-300 hover:text-blue-400">
              <span className="flex items-center gap-2">
                <span>Lists</span>
                {activeListIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-900 text-blue-300 text-[10px] font-mono">{activeListIds.length} selected</span>
                )}
              </span>
              <span className="text-zinc-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-2 space-y-2 pt-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <input
                  value={listSearch}
                  onFocus={() => setListDropdownOpen(true)}
                  onChange={(e) => {
                    setListSearch(e.target.value);
                    setListDropdownOpen(true);
                  }}
                  placeholder={
                    activeListIds.length > 0
                      ? `${activeListIds.length} list${activeListIds.length > 1 ? 's' : ''} selected`
                      : 'Search lists'
                  }
                  className="w-full rounded-lg border border-zinc-700 py-1.5 pl-8 pr-7 text-xs text-zinc-200 outline-none focus:border-blue-500"
                />
                {activeListIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveListIds([]);
                      setListSearch('');
                      setListDropdownOpen(false);
                    }}
                    className="absolute right-2 top-1.5 text-xs text-zinc-400 hover:text-zinc-300 font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
              {listDropdownOpen && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-1 shadow-md">
                  {visibleLists.length ? (
                    visibleLists.map((list) => {
                      const listKey = list.id || list.name;
                      const selected = activeListIds.includes(listKey);
                      return (
                        <label
                          key={list.id || list.name}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs ${
                            selected ? 'bg-blue-950 font-bold text-blue-300' : 'text-zinc-300 hover:bg-zinc-900'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              setActiveListIds((prev) =>
                                selected ? prev.filter((id) => id !== listKey) : [...prev, listKey]
                              );
                            }}
                            className="h-3.5 w-3.5 shrink-0 rounded border-zinc-700 text-blue-400 focus:ring-blue-500 cursor-pointer"
                          />
                          <span>
                            {list.name || list.fileName}
                            <span className="ml-1 text-zinc-400">({listLeadCount(list)})</span>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="px-2 py-2 text-xs text-zinc-400">No lists found</p>
                  )}
                </div>
              )}
            </div>
          </details>

          {/* Lead details (Apollo-style field filters) */}
          <details className="group px-3 py-2.5" open={!!(jobTitleFilter || nameFilter || companyFilter || websiteFilter || countryFilter)}>
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-zinc-300 hover:text-blue-400">
              <span className="flex items-center gap-2">
                <span>Lead details</span>
                {[jobTitleFilter, nameFilter, companyFilter, websiteFilter, countryFilter].filter(Boolean).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-900 text-blue-300 text-[10px] font-mono">
                    {[jobTitleFilter, nameFilter, companyFilter, websiteFilter, countryFilter].filter(Boolean).length} set
                  </span>
                )}
              </span>
              <span className="text-zinc-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-2 space-y-2 pt-1">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-zinc-400">Job Title</span>
                <input value={jobTitleFilter} onChange={(e) => setJobTitleFilter(e.target.value)} placeholder="Filter by job title..." className="w-full rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-zinc-400">Name</span>
                <input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Filter by contact name..." className="w-full rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-zinc-400">Company</span>
                <input value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} placeholder="Filter by company name..." className="w-full rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-zinc-400">Website</span>
                <input value={websiteFilter} onChange={(e) => setWebsiteFilter(e.target.value)} placeholder="Filter by website or domain..." className="w-full rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-zinc-400">Country</span>
                <input value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} placeholder="Filter by country..." className="w-full rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500" />
              </label>
            </div>
          </details>

          {/* Bulk website search (Apollo-style: paste websites, show only matching leads) */}
          <details className="group px-3 py-2.5" open={bulkSearchDomains.length > 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-zinc-300 hover:text-blue-400">
              <span className="flex items-center gap-2">
                <span>Bulk website search</span>
                {bulkSearchDomains.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-900 text-blue-300 text-[10px] font-mono">{bulkSearchDomains.length} websites</span>
                )}
              </span>
              <span className="text-zinc-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-2 space-y-2 pt-1">
              <textarea
                value={bulkSearchInput}
                onChange={(e) => setBulkSearchInput(e.target.value)}
                placeholder={'Paste websites, one per line...\ncompany.com\nhttps://example.com'}
                rows={4}
                className="w-full rounded-lg border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const { domains, truncated } = parseBulkWebsites(bulkSearchInput);
                    setBulkSearchDomains(domains);
                    setBulkSearchTruncated(truncated);
                  }}
                  disabled={!bulkSearchInput.trim()}
                  className="flex-1 rounded-lg bg-[#0e6de4] px-2 py-1.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                >
                  Search websites
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkSearchInput('');
                    setBulkSearchDomains([]);
                    setBulkSearchTruncated(0);
                  }}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Clear
                </button>
              </div>
              {bulkSearchTruncated > 0 && (
                <p className="text-[11px] text-amber-400">Only the first 100 websites are used ({bulkSearchTruncated} extra ignored).</p>
              )}
              {bulkSearchDomains.length > 0 && (
                <p className="text-[11px] text-zinc-400">Showing leads from {bulkSearchDomains.length} website{bulkSearchDomains.length > 1 ? 's' : ''} only.</p>
              )}
            </div>
          </details>

          {/* 3. PROSPECTS */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'PROSPECT' ? 'ALL' : 'PROSPECT')}
            className={`px-3 py-2.5 flex items-center justify-between cursor-pointer font-bold transition-colors ${
              statusFilter === 'PROSPECT' ? 'bg-zinc-900 text-zinc-100 border-l-4 border-l-slate-700' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span>Prospects</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 text-[10px] font-mono">
              {allLeads.filter((l) => {
                const s = String(l.status || 'PROSPECT').toUpperCase();
                return s === 'PROSPECT' || s === 'UNCONTACTED' || s === 'NEW';
              }).length}
            </span>
          </div>

          {/* 4. DELIVERED */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'DELIVERED' ? 'ALL' : 'DELIVERED')}
            className={`px-3 py-2.5 flex items-center justify-between cursor-pointer font-bold transition-colors ${
              statusFilter === 'DELIVERED' ? 'bg-emerald-950 text-emerald-200 border-l-4 border-l-emerald-600' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Delivered</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 text-[10px] font-mono">
              {allLeads.filter((l) => {
                const s = String(l.status || '').toUpperCase();
                return s === 'DELIVERED' || s === 'REACHED' || s === 'SENT';
              }).length}
            </span>
          </div>

          {/* 5. PENDING */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`px-3 py-2.5 flex items-center justify-between cursor-pointer font-bold transition-colors ${
              statusFilter === 'PENDING' ? 'bg-blue-950 text-blue-200 border-l-4 border-l-blue-600' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Pending</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-900 text-blue-300 text-[10px] font-mono">
              {allLeads.filter((l) => String(l.status || '').toUpperCase() === 'PENDING').length}
            </span>
          </div>

          {/* 6. FAILED */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'FAILED' ? 'ALL' : 'FAILED')}
            className={`px-3 py-2.5 flex items-center justify-between cursor-pointer font-bold transition-colors ${
              statusFilter === 'FAILED' ? 'bg-rose-950 text-rose-200 border-l-4 border-l-rose-600' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Failed</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-900 text-rose-300 text-[10px] font-mono">
              {allLeads.filter((l) => String(l.status || '').toUpperCase() === 'FAILED').length}
            </span>
          </div>

          {/* 7. NO-FORM */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'NO_FORM' ? 'ALL' : 'NO_FORM')}
            className={`px-3 py-2.5 flex items-center justify-between cursor-pointer font-bold transition-colors ${
              statusFilter === 'NO_FORM' ? 'bg-amber-950 text-amber-200 border-l-4 border-l-amber-600' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>No-Form</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-900 text-amber-300 text-[10px] font-mono">
              {allLeads.filter((l) => {
                const s = String(l.status || '').toUpperCase();
                return s === 'NO_FORM' || s === 'NO_CONTACT_PAGE';
              }).length}
            </span>
          </div>

          {/* 8. REVIEW */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'REVIEW' ? 'ALL' : 'REVIEW')}
            className={`px-3 py-2.5 flex items-center justify-between cursor-pointer font-bold transition-colors ${
              statusFilter === 'REVIEW' ? 'bg-purple-950 text-purple-200 border-l-4 border-l-purple-600' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Review</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-900 text-purple-300 text-[10px] font-mono">
              {allLeads.filter((l) => {
                const s = String(l.status || '').toUpperCase();
                return s === 'REVIEW' || s === 'CAPTCHA' || s === 'CAPTCHA_REVIEW';
              }).length}
            </span>
          </div>

          {/* 9. REPLIED */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'REPLIED' ? 'ALL' : 'REPLIED')}
            className={`px-3 py-2.5 flex items-center justify-between cursor-pointer font-bold transition-colors ${
              statusFilter === 'REPLIED' ? 'bg-indigo-950 text-indigo-200 border-l-4 border-l-indigo-600' : 'text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>Replied</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 text-[10px] font-mono">
              {allLeads.filter((l) => {
                const s = String(l.status || '').toUpperCase();
                return s === 'REPLIED' || s === 'INTERESTED';
              }).length}
            </span>
          </div>
        </div>
      </Card>

      <div className="min-w-0 space-y-6">



      {/* Newly Uploaded Banner */}
      {newlyImportedCount > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-900 bg-emerald-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-900 text-emerald-300 flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-emerald-950">
                {newlyImportedCount} Leads Successfully Imported!
              </p>
              <p className="text-[11px] text-emerald-300 mt-0.5">
                Your uploaded file records are displayed at the top of the table. Click &quot;View Full Lead Info&quot; to inspect all 12+ fields & custom attributes.
              </p>
            </div>
          </div>

          <Link href="/campaigns/new">
            <Button variant="primary" size="sm" className="shrink-0 font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm cursor-pointer">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Campaign with These Leads
            </Button>
          </Link>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by company, name, title, email, domain, file name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-slate-400 focus:border-[#0e6de4] focus:outline-none shadow-2xs font-medium"
          />
        </div>
        {filteredLeads.length > 0 && selectedLeadIds.length < filteredLeads.length && (
          <button
            type="button"
            onClick={() => setSelectedLeadIds(filteredLeads.map((l) => l.id))}
            className="shrink-0 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:border-blue-500 cursor-pointer"
          >
            Select all {filteredLeads.length} filtered
          </button>
        )}
      </div>

      {/* Leads Table with Excel-Style Freeze Header (Sticky Top Header) */}
      <Card className="glass-panel overflow-hidden border-zinc-700 bg-zinc-950 shadow-sm flex flex-col">
        {/* Scrollable Container with Sticky Frozen Header */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
          <table className="w-full text-left text-xs border-collapse">
            {/* Excel Freeze Header (Pinned Sticky Header) */}
            <thead className="sticky top-0 z-20 bg-zinc-900 text-zinc-200 border-b-2 border-zinc-700 uppercase font-mono text-[10px] shadow-xs">
              <tr>
                <th className="p-3.5 w-10 text-center font-extrabold tracking-wider bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="h-3.5 w-3.5 rounded border-zinc-700 text-blue-400 focus:ring-blue-500 cursor-pointer"
                    title="Select All Leads on this page"
                  />
                </th>
                <th className="p-3.5 w-12 text-center font-extrabold tracking-wider bg-zinc-900">#</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-zinc-900">Company & Domain</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-zinc-900">Contact Person & Title</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-zinc-900">Email & Industry</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-zinc-900">Location</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-zinc-900">Status</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-zinc-900">Uploaded Source File</th>
                <th className="p-3.5 font-extrabold tracking-wider text-right bg-zinc-900">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {currentPaginatedLeads.map((lead, idx) => (
                <tr
                  key={lead.id || idx}
                  className={`hover:bg-blue-950/50 transition-colors cursor-pointer ${
                    selectedLeadIds.includes(lead.id) ? 'bg-blue-950/70 font-semibold' : ''
                  }`}
                  onClick={(e) => toggleSelectLead(lead.id, e)}
                >
                  {/* Select Checkbox Column */}
                  <td className="p-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={(e) => toggleSelectLead(lead.id, e as any)}
                      className="h-3.5 w-3.5 rounded border-zinc-700 text-blue-400 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  {/* Lead Number (#) Column */}
                  <td className="p-3.5 w-12 text-center font-mono font-bold text-zinc-400 text-[11px]">
                    #{startIndex + idx + 1}
                  </td>
                  {/* Company & Domain */}
                  <td className="p-3.5 font-medium">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-100 text-xs">{lead.companyName || lead.company_name}</span>
                        {lead.isNewlyImported && (
                          <span className="px-1.5 py-0.2 rounded-full bg-zinc-900 text-zinc-400 font-mono text-[9px] font-bold">
                            Uploaded
                          </span>
                        )}
                      </div>
                      <a
                        href={lead.website || `https://${lead.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-zinc-300 hover:text-blue-400 hover:underline font-mono flex items-center gap-1"
                      >
                        {lead.domain || lead.website || 'website.com'}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </td>

                  {/* Contact Person & Title */}
                  <td className="p-3.5">
                    <div className="space-y-0.5">
                      <p className="font-bold text-zinc-100">
                        {lead.firstName || lead.first_name || lead.lastName || lead.last_name
                          ? `${lead.firstName || lead.first_name || ''} ${lead.lastName || lead.last_name || ''}`.trim()
                          : '—'}
                      </p>
                      <p className="text-[11px] text-zinc-400 font-mono">{lead.title || 'Decision Maker'}</p>
                    </div>
                  </td>

                  {/* Email & Industry */}
                  <td className="p-3.5">
                    <div className="space-y-0.5">
                      <p className="font-mono text-[11px] text-zinc-100 font-medium">{lead.email || '—'}</p>
                      <p className="text-[10px] text-zinc-400 font-semibold">{lead.industry || 'B2B Services'}</p>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
                      <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                      <span>
                        {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || 'Global'}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-3.5">
                    {(() => {
                      const st = String(lead.status || 'PROSPECT').toUpperCase().trim();
                      let badgeStyle = 'bg-zinc-900 text-zinc-300 border-zinc-800';
                      if (st === 'DELIVERED' || st === 'REACHED' || st === 'SENT') {
                        badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-900';
                      } else if (st === 'FAILED') {
                        badgeStyle = 'bg-rose-950 text-rose-300 border-rose-900';
                      } else if (st === 'NO_FORM' || st === 'NO_CONTACT_PAGE') {
                        badgeStyle = 'bg-amber-950 text-amber-300 border-amber-900';
                      } else if (st === 'REVIEW' || st === 'CAPTCHA' || st === 'CAPTCHA_REVIEW') {
                        badgeStyle = 'bg-purple-950 text-purple-300 border-purple-900';
                      } else if (st === 'REPLIED' || st === 'INTERESTED') {
                        badgeStyle = 'bg-indigo-950 text-indigo-300 border-indigo-900';
                      } else if (st === 'PENDING') {
                        badgeStyle = 'bg-blue-950 text-blue-300 border-blue-900';
                      }
                      return (
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${badgeStyle}`}>
                          {st.replace(/_/g, ' ')}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Source File Name */}
                  <td className="p-3.5 text-[10px] font-mono">
                    <span className="font-medium text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 inline-block truncate max-w-[160px]">
                      📁 {lead.sourceFileName || uploadedFileName || 'Uploaded File'}
                    </span>
                  </td>

                  {/* View Details Action */}
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setSelectedLeadForModal(lead)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-950 text-zinc-300 hover:bg-zinc-900 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors cursor-pointer shadow-2xs"
                      title="Inspect all uploaded fields in large spreadsheet modal"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Full Lead Info</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Excel-Style Pagination Footer Bar (Page 1, Page 2 ... Previous / Next) */}
        <div className="p-3.5 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-zinc-400 font-mono">
            <span>
              Showing <strong className="text-zinc-100">{totalLeads > 0 ? startIndex + 1 : 0}</strong> to{' '}
              <strong className="text-zinc-100">{endIndex}</strong> of{' '}
              <strong className="text-zinc-100">{totalLeads}</strong> Total Leads
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs font-bold text-zinc-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Page Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            {/* Page Number Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`h-8 w-8 rounded-xl font-mono text-xs font-bold transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-zinc-950 border border-zinc-700 text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalLeads === 0}
              className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Large Full Lead Info Inspection Modal */}
      </div>
      </div>

      {selectedLeadForModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-900 text-blue-300 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-100 flex items-center gap-2">
                    <span>{selectedLeadForModal.companyName || selectedLeadForModal.company_name || 'Lead Record Inspector'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900 text-blue-400 font-mono font-bold">
                      Full Sheet Record
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                    <span>📁 Uploaded Source File:</span>
                    <strong className="text-zinc-200">{selectedLeadForModal.sourceFileName || uploadedFileName || 'Uploaded Lead File'}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLeadForModal(null)}
                className="h-8 w-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body - All 12+ Fields Spreadsheet Inspection Grid */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Account & Person Banner */}
              <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-900 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold font-mono">Company / Domain</span>
                  <h4 className="text-sm font-extrabold text-zinc-100">{selectedLeadForModal.companyName || selectedLeadForModal.company_name}</h4>
                  <a
                    href={selectedLeadForModal.website || `https://${selectedLeadForModal.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-400 font-mono hover:underline flex items-center gap-1"
                  >
                    {selectedLeadForModal.website || selectedLeadForModal.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold font-mono">Contact Person</span>
                  <h4 className="text-sm font-extrabold text-zinc-100">
                    {`${selectedLeadForModal.firstName || selectedLeadForModal.first_name || ''} ${selectedLeadForModal.lastName || selectedLeadForModal.last_name || ''}`.trim() || 'Decision Maker'}
                  </h4>
                  <p className="text-xs text-zinc-400 font-medium">{selectedLeadForModal.title || 'Chief Executive Officer'}</p>
                </div>
              </div>

              {/* Standard 12 Field Spreadsheet Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-blue-400" />
                  Standard B2B Account Fields ({Object.keys(selectedLeadForModal).length} Total Attributes)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Email Address</span>
                    <p className="font-mono text-xs font-bold text-zinc-100">{selectedLeadForModal.email || '—'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Industry Category</span>
                    <p className="font-semibold text-xs text-zinc-100">{selectedLeadForModal.industry || 'B2B Services'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Personal LinkedIn</span>
                    {selectedLeadForModal.personLinkedinUrl ? (
                      <a href={selectedLeadForModal.personLinkedinUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline font-mono truncate block">
                        {selectedLeadForModal.personLinkedinUrl}
                      </a>
                    ) : (
                      <p className="text-zinc-400 font-mono">—</p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Company LinkedIn</span>
                    {selectedLeadForModal.companyLinkedinUrl ? (
                      <a href={selectedLeadForModal.companyLinkedinUrl} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline font-mono truncate block">
                        {selectedLeadForModal.companyLinkedinUrl}
                      </a>
                    ) : (
                      <p className="text-zinc-400 font-mono">—</p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Location Address</span>
                    <p className="text-xs font-medium text-zinc-200">
                      {[selectedLeadForModal.city, selectedLeadForModal.state, selectedLeadForModal.country].filter(Boolean).join(', ') || 'Global'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Outreach Pipeline Status</span>
                    <p className="font-mono font-bold text-xs text-emerald-300">
                      🟢 {selectedLeadForModal.status || 'PENDING'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Personalization Variables Section */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  Custom Personalization Variables & Message Attributes
                </h4>

                <div className="space-y-2">
                  {['personalizedOpeningLine', 'problemParagraph', 'pitch', 'cta'].map((key) => {
                    const val = selectedLeadForModal[key];
                    if (!val) return null;
                    return (
                      <div key={key} className="p-3 rounded-xl bg-purple-950/60 border border-purple-900 space-y-1">
                        <span className="text-[10px] font-bold text-purple-300 uppercase font-mono">
                          Variable: {`{{${key}}}`}
                        </span>
                        <p className="text-xs font-mono text-purple-950 bg-zinc-950 p-2 rounded-lg border border-purple-900 whitespace-pre-wrap">
                          {val}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between">
              <Link href="/campaigns/new">
                <Button variant="primary" size="sm" className="font-bold bg-blue-600 hover:bg-blue-700 cursor-pointer">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Launch Campaign with this Record
                </Button>
              </Link>

              <button
                onClick={() => setSelectedLeadForModal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
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
