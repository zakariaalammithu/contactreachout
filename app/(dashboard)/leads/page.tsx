'use client';

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
import { Badge } from '@/components/ui/Badge';
import { mockLeads } from '@/lib/store/mock-data';
import {
  parseSpreadsheetPreview,
  suggestColumnMappings,
  processImportRows,
} from '@/lib/services/import-service';

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
      const listName = fileName.replace(/\.[^/.]+$/, '');

      const importResult = processImportRows(preview.rawRows, suggestedMapping as any, {
        sourceFileName: fileName,
        listName: listName,
      });

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
        const existingLists = storedLists ? JSON.parse(storedLists) : [];
        const newListObj = {
          id: `list-${Date.now()}`,
          name: listName,
          fileName: fileName,
          count: validLeads.length,
          uploadedAt: new Date().toISOString(),
        };
        localStorage.setItem('user_lead_lists', JSON.stringify([newListObj, ...existingLists]));

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

  // Load user imported leads & list file names from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_imported_leads');
        const storedLists = localStorage.getItem('user_lead_lists');

        let detectedFileName = '';
        if (storedLists) {
          const parsedLists = JSON.parse(storedLists);
          if (Array.isArray(parsedLists) && parsedLists.length > 0) {
            detectedFileName = parsedLists[0].fileName || parsedLists[0].name || '';
          }
        }

        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNewlyImportedCount(parsed.length);
            if (!detectedFileName && parsed[0].sourceFileName) {
              detectedFileName = parsed[0].sourceFileName;
            }
            setUploadedFileName(detectedFileName || 'Uploaded_Leads.csv');

            // Attach source file name fallback if missing
            const leadsWithSource = parsed.map((ld: any) => ({
              ...ld,
              sourceFileName: ld.sourceFileName || detectedFileName || 'Uploaded_Leads_File.csv',
              isNewlyImported: true,
            }));

            setAllLeads([...leadsWithSource, ...mockLeads]);
          }
        }
      } catch (err) {
        console.error('Error loading imported leads from localStorage:', err);
      }
    }
  }, []);

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
  }, [searchTerm, statusFilter, pageSize]);

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

    const matchesStatus =
      statusFilter === 'ALL' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
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

      if (typeof window !== 'undefined') {
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
      localStorage.setItem('user_imported_leads', JSON.stringify(selectedLeads));
    }
    const campName = `Campaign with ${selectedLeads.length} Leads`;
    router.push(`/campaigns/new?name=${encodeURIComponent(campName)}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Floating Selection Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold font-mono">
              {selectedLeadIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              lead{selectedLeadIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCreateCampaignWithSelected}
              className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
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
              className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Target Contact List Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View, search, inspect, and manage all outreach fields across your uploaded business accounts and discovered forms.
          </p>
        </div>

      </div>

      {/* Newly Uploaded Banner */}
      {newlyImportedCount > 0 && (
        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-emerald-950">
                {newlyImportedCount} Leads Successfully Imported!
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
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

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company, name, title, email, domain, file name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none shadow-2xs font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'DRY_RUN_COMPLETED', 'SUBMITTED', 'REVIEW_REQUIRED'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Leads Table with Excel-Style Freeze Header (Sticky Top Header) */}
      <Card className="glass-panel overflow-hidden border-slate-300 bg-white shadow-sm flex flex-col">
        {/* Scrollable Container with Sticky Frozen Header */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
          <table className="w-full text-left text-xs border-collapse">
            {/* Excel Freeze Header (Pinned Sticky Header) */}
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 border-b-2 border-slate-300 uppercase font-mono text-[10px] shadow-xs">
              <tr>
                <th className="p-3.5 w-10 text-center font-extrabold tracking-wider bg-slate-100">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select All Leads on this page"
                  />
                </th>
                <th className="p-3.5 w-12 text-center font-extrabold tracking-wider bg-slate-100">#</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-slate-100">Company & Domain</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-slate-100">Contact Person & Title</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-slate-100">Email & Industry</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-slate-100">Location</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-slate-100">Status</th>
                <th className="p-3.5 font-extrabold tracking-wider bg-slate-100">Uploaded Source File</th>
                <th className="p-3.5 font-extrabold tracking-wider text-right bg-slate-100">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentPaginatedLeads.map((lead, idx) => (
                <tr
                  key={lead.id || idx}
                  className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${
                    selectedLeadIds.includes(lead.id) ? 'bg-blue-50/70 font-semibold' : ''
                  }`}
                  onClick={(e) => toggleSelectLead(lead.id, e)}
                >
                  {/* Select Checkbox Column */}
                  <td className="p-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={(e) => toggleSelectLead(lead.id, e)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  {/* Lead Number (#) Column */}
                  <td className="p-3.5 w-12 text-center font-mono font-bold text-slate-500 text-[11px]">
                    #{startIndex + idx + 1}
                  </td>
                  {/* Company & Domain */}
                  <td className="p-3.5 font-medium">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">{lead.companyName || lead.company_name}</span>
                        {lead.isNewlyImported && (
                          <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-mono text-[9px] font-bold">
                            Uploaded
                          </span>
                        )}
                      </div>
                      <a
                        href={lead.website || `https://${lead.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline font-mono flex items-center gap-1"
                      >
                        {lead.domain || lead.website || 'website.com'}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </td>

                  {/* Contact Person & Title */}
                  <td className="p-3.5">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">
                        {lead.firstName || lead.first_name || lead.lastName || lead.last_name
                          ? `${lead.firstName || lead.first_name || ''} ${lead.lastName || lead.last_name || ''}`.trim()
                          : '—'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">{lead.title || 'Decision Maker'}</p>
                    </div>
                  </td>

                  {/* Email & Industry */}
                  <td className="p-3.5">
                    <div className="space-y-0.5">
                      <p className="font-mono text-[11px] text-slate-900 font-medium">{lead.email || '—'}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{lead.industry || 'B2B Services'}</p>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>
                        {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || 'Global'}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-3.5">
                    <Badge variant={lead.status === 'SUBMITTED' ? 'submitted' : lead.status === 'REVIEW_REQUIRED' ? 'review_required' : 'pending'} size="sm">
                      {lead.status || 'PENDING'}
                    </Badge>
                  </td>

                  {/* Source File Name */}
                  <td className="p-3.5 text-[10px] font-mono">
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200 inline-block truncate max-w-[160px]">
                      📁 {lead.sourceFileName || uploadedFileName || 'Uploaded File'}
                    </span>
                  </td>

                  {/* View Details Action */}
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setSelectedLeadForModal(lead)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold flex items-center gap-1.5 ml-auto transition-colors cursor-pointer shadow-2xs"
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
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600 font-mono">
            <span>
              Showing <strong className="text-slate-900">{totalLeads > 0 ? startIndex + 1 : 0}</strong> to{' '}
              <strong className="text-slate-900">{endIndex}</strong> of{' '}
              <strong className="text-slate-900">{totalLeads}</strong> Total Leads
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
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
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
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
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalLeads === 0}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Large Full Lead Info Inspection Modal */}
      {selectedLeadForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{selectedLeadForModal.companyName || selectedLeadForModal.company_name || 'Lead Record Inspector'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-mono font-bold">
                      Full Sheet Record
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                    <span>📁 Uploaded Source File:</span>
                    <strong className="text-slate-800">{selectedLeadForModal.sourceFileName || uploadedFileName || 'Uploaded Lead File'}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLeadForModal(null)}
                className="h-8 w-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body - All 12+ Fields Spreadsheet Inspection Grid */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Account & Person Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-blue-600 font-bold font-mono">Company / Domain</span>
                  <h4 className="text-sm font-extrabold text-slate-900">{selectedLeadForModal.companyName || selectedLeadForModal.company_name}</h4>
                  <a
                    href={selectedLeadForModal.website || `https://${selectedLeadForModal.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-700 font-mono hover:underline flex items-center gap-1"
                  >
                    {selectedLeadForModal.website || selectedLeadForModal.domain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold font-mono">Contact Person</span>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {`${selectedLeadForModal.firstName || selectedLeadForModal.first_name || ''} ${selectedLeadForModal.lastName || selectedLeadForModal.last_name || ''}`.trim() || 'Decision Maker'}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">{selectedLeadForModal.title || 'Chief Executive Officer'}</p>
                </div>
              </div>

              {/* Standard 12 Field Spreadsheet Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                  Standard B2B Account Fields ({Object.keys(selectedLeadForModal).length} Total Attributes)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Email Address</span>
                    <p className="font-mono text-xs font-bold text-slate-900">{selectedLeadForModal.email || '—'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Industry Category</span>
                    <p className="font-semibold text-xs text-slate-900">{selectedLeadForModal.industry || 'B2B Services'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Personal LinkedIn</span>
                    {selectedLeadForModal.personLinkedinUrl ? (
                      <a href={selectedLeadForModal.personLinkedinUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-mono truncate block">
                        {selectedLeadForModal.personLinkedinUrl}
                      </a>
                    ) : (
                      <p className="text-slate-400 font-mono">—</p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Company LinkedIn</span>
                    {selectedLeadForModal.companyLinkedinUrl ? (
                      <a href={selectedLeadForModal.companyLinkedinUrl} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline font-mono truncate block">
                        {selectedLeadForModal.companyLinkedinUrl}
                      </a>
                    ) : (
                      <p className="text-slate-400 font-mono">—</p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Location Address</span>
                    <p className="text-xs font-medium text-slate-800">
                      {[selectedLeadForModal.city, selectedLeadForModal.state, selectedLeadForModal.country].filter(Boolean).join(', ') || 'Global'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Outreach Pipeline Status</span>
                    <p className="font-mono font-bold text-xs text-emerald-700">
                      🟢 {selectedLeadForModal.status || 'PENDING'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Personalization Variables Section */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  Custom Personalization Variables & Message Attributes
                </h4>

                <div className="space-y-2">
                  {['personalizedOpeningLine', 'problemParagraph', 'pitch', 'cta'].map((key) => {
                    const val = selectedLeadForModal[key];
                    if (!val) return null;
                    return (
                      <div key={key} className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 space-y-1">
                        <span className="text-[10px] font-bold text-purple-700 uppercase font-mono">
                          Variable: {`{{${key}}}`}
                        </span>
                        <p className="text-xs font-mono text-purple-950 bg-white p-2 rounded-lg border border-purple-100 whitespace-pre-wrap">
                          {val}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <Link href="/campaigns/new">
                <Button variant="primary" size="sm" className="font-bold bg-blue-600 hover:bg-blue-700 cursor-pointer">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Launch Campaign with this Record
                </Button>
              </Link>

              <button
                onClick={() => setSelectedLeadForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
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
