'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Table,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Check,
  Globe,
  Database,
  Download,
  FileText,
  Play,
  Shuffle,
  Info,
  Filter,
  Layers,
  Sparkle,
  Plus,
  Trash2,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MatchDataModal } from '@/components/leads/MatchDataModal';
import {
  parseSpreadsheetPreview,
  processImportRows,
  RawImportRow,
  ColumnMapping,
  ImportExecutionResult,
  suggestColumnMappings,
} from '@/lib/services/import-service';
import { SAMPLE_DATASETS, downloadSampleCsv } from '@/lib/services/sample-templates';

interface CustomColumnDef {
  id: string;
  label: string;
  tag: string;
  sourceColumn: string;
}

export default function ImportLeadsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File & List Name State
  const [file, setFile] = useState<File | null>(null);
  const [listName, setListName] = useState('My Target Lead List Q3');
  const [isParsing, setIsParsing] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<RawImportRow[]>([]);
  const [allRawRows, setAllRawRows] = useState<RawImportRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Manyreach Match Modal state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchFileData, setMatchFileData] = useState<{
    fileName: string;
    headers: string[];
    sampleRows: any[];
    allRawRows: any[];
  }>({
    fileName: '',
    headers: [],
    sampleRows: [],
    allRawRows: [],
  });

  // Filters during import
  const [filterIndustry, setFilterIndustry] = useState<string>('ALL');
  const [filterCountry, setFilterCountry] = useState<string>('ALL');
  const [filterRequireWebsite, setFilterRequireWebsite] = useState(true);

  // Dynamic Custom Personalized Columns
  const [customColumns, setCustomColumns] = useState<CustomColumnDef[]>([
    { id: 'custom-1', label: 'Personalized Opening Line', tag: '{{personalizedOpeningLine}}', sourceColumn: '' },
    { id: 'custom-2', label: 'Problem Paragraph', tag: '{{problemParagraph}}', sourceColumn: '' },
    { id: 'custom-3', label: 'Pitch / Solution', tag: '{{pitch}}', sourceColumn: '' },
    { id: 'custom-4', label: 'CTA', tag: '{{cta}}', sourceColumn: '' },
  ]);

  // Standard 12 Field Mappings
  const [mapping, setMapping] = useState<ColumnMapping>({
    first_name: '',
    last_name: '',
    title: '',
    company_name: '',
    email: '',
    industry: '',
    person_linkedin_url: '',
    website: '',
    company_linkedin_url: '',
    city: '',
    state: '',
    country: '',
    personalized_opening_line: '',
    problem_paragraph: '',
    pitch: '',
    cta: '',
  });

  // Import Result State
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setListName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    setIsParsing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const preview = parseSpreadsheetPreview(arrayBuffer, selectedFile.name);

      setHeaders(preview.detectedHeaders);
      setSampleRows(preview.sampleRows);
      setAllRawRows(preview.rawRows);
      setTotalRows(preview.totalRows);

      setMatchFileData({
        fileName: selectedFile.name,
        headers: preview.detectedHeaders,
        sampleRows: preview.sampleRows,
        allRawRows: preview.rawRows,
      });
      setShowMatchModal(true);
    } catch (err: any) {
      alert(`Error parsing spreadsheet: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleMatchImportSuccess = (importedLeads: any[], listInfo: any) => {
    if (typeof window !== 'undefined') {
      const existingLeads = localStorage.getItem('user_imported_leads');
      const parsedLeads = existingLeads ? JSON.parse(existingLeads) : [];
      localStorage.setItem('user_imported_leads', JSON.stringify([...importedLeads, ...parsedLeads]));

      const existingLists = localStorage.getItem('user_lead_lists');
      const parsedLists = existingLists ? JSON.parse(existingLists) : [];
      localStorage.setItem('user_lead_lists', JSON.stringify([listInfo, ...parsedLists]));

      window.dispatchEvent(new CustomEvent('leads_imported_directly', { detail: importedLeads }));
      setImportSuccess(true);
      router.push('/leads');
    }
  };

  // Listen for direct file upload events from top header and auto-trigger if url has ?action=upload
  useEffect(() => {
    const handleDirectEvent = (e: any) => {
      const directFile = e?.detail?.file;
      if (directFile) {
        const fakeEvent = {
          target: { files: [directFile] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(fakeEvent);
      }
    };

    window.addEventListener('app:direct-file-upload', handleDirectEvent);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'upload') {
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 150);
      }
    }

    return () => {
      window.removeEventListener('app:direct-file-upload', handleDirectEvent);
    };
  }, []);

  // 1-Click Load Pre-filled Sample Dataset (12 Columns + 4 AI Personalization Fields)
  const handleLoadSampleDataset = (datasetId: string = 'b2b-saas') => {
    const dataset = SAMPLE_DATASETS.find((d) => d.id === datasetId) || SAMPLE_DATASETS[0];
    const dummyFile = new File(['mock content'], `${dataset.name.toLowerCase().replace(/\s+/g, '_')}_leads.csv`, {
      type: 'text/csv',
    });
    setFile(dummyFile);
    setListName(dataset.name);
    setHeaders(dataset.headers);
    setSampleRows(dataset.rows);
    setAllRawRows(dataset.rows);
    setTotalRows(dataset.rows.length);

    const initialMapping: ColumnMapping = {
      first_name: 'First Name',
      last_name: 'Last Name',
      title: 'Title',
      company_name: 'Company Name',
      email: 'Email',
      industry: 'Industry',
      person_linkedin_url: 'Person Linkedin Url',
      website: 'Website',
      company_linkedin_url: 'Company Linkedin Url',
      city: 'City',
      state: 'State',
      country: 'Country',
      personalized_opening_line: 'Personalized Opening Line',
      problem_paragraph: 'Problem Paragraph',
      pitch: 'Pitch',
      cta: 'CTA',
    };
    setMapping(initialMapping);

    setCustomColumns([
      { id: 'custom-1', label: 'Personalized Opening Line', tag: '{{personalizedOpeningLine}}', sourceColumn: 'Personalized Opening Line' },
      { id: 'custom-2', label: 'Problem Paragraph', tag: '{{problemParagraph}}', sourceColumn: 'Problem Paragraph' },
      { id: 'custom-3', label: 'Pitch / Solution', tag: '{{pitch}}', sourceColumn: 'Pitch' },
      { id: 'custom-4', label: 'CTA', tag: '{{cta}}', sourceColumn: 'CTA' },
    ]);
  };

  // Auto-Detect / Re-Order Mappings Button
  const handleAutoDetectMappings = () => {
    if (headers.length === 0) return;
    const autoMapped = suggestColumnMappings(headers);
    setMapping(autoMapped as any);
  };

  // Add a new custom personalized column
  const handleAddCustomColumn = () => {
    const count = customColumns.length + 1;
    const name = `Custom Variable ${count}`;
    const tag = `{{customVariable${count}}}`;
    setCustomColumns([
      ...customColumns,
      {
        id: `custom-${Date.now()}`,
        label: name,
        tag,
        sourceColumn: headers[0] || '',
      },
    ]);
  };

  const handleRemoveCustomColumn = (id: string) => {
    setCustomColumns(customColumns.filter((c) => c.id !== id));
  };

  const handleUpdateCustomColumn = (id: string, field: 'label' | 'sourceColumn', value: string) => {
    setCustomColumns(
      customColumns.map((c) => {
        if (c.id === id) {
          if (field === 'label') {
            const cleanTag = `{{${value.replace(/[^a-zA-Z0-9]/g, '')}}}`;
            return { ...c, label: value, tag: cleanTag };
          }
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  // Handle Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const fakeEvent = {
        target: { files: [dropped] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  // Update Individual Field Mapping
  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  // Execute Import & Validation
  const handleRunImport = () => {
    if (allRawRows.length === 0) return;
    setIsImporting(true);

    try {
      // 1. Process & sanitize raw rows with column mapping
      let result = processImportRows(allRawRows, mapping);

      // 2. Apply Ingestion Filters
      let filteredValid = result.validLeads;
      if (filterIndustry !== 'ALL') {
        filteredValid = filteredValid.filter((l) => (l.industry || '').toLowerCase().includes(filterIndustry.toLowerCase()));
      }
      if (filterCountry !== 'ALL') {
        filteredValid = filteredValid.filter((l) => (l.country || '').toLowerCase().includes(filterCountry.toLowerCase()));
      }
      if (filterRequireWebsite) {
        filteredValid = filteredValid.filter((l) => l.website && l.website.length > 3);
      }

      result.validLeads = filteredValid;
      (result as any).validCount = filteredValid.length;

      // 3. Save Named Lead List and Leads to localStorage
      if (typeof window !== 'undefined') {
        const listId = `list-${Date.now()}`;
        const newLeadList = {
          id: listId,
          name: listName || 'Target Lead List',
          fileName: file?.name || 'leads_export.csv',
          totalLeads: result.validLeads.length,
          columns: headers,
          createdAt: new Date().toISOString(),
        };

        const existingLists = localStorage.getItem('user_lead_lists');
        const parsedLists = existingLists ? JSON.parse(existingLists) : [];
        localStorage.setItem('user_lead_lists', JSON.stringify([newLeadList, ...parsedLists]));

        // Inject list metadata & custom columns into each lead
        const leadsWithList = result.validLeads.map((vl) => ({
          ...vl,
          listId,
          listName: newLeadList.name,
          status: 'PENDING',
          isNewlyImported: true,
          createdAt: new Date().toISOString(),
        }));

        const existingLeads = localStorage.getItem('user_imported_leads');
        const parsedLeads = existingLeads ? JSON.parse(existingLeads) : [];
        localStorage.setItem('user_imported_leads', JSON.stringify([...leadsWithList, ...parsedLeads]));
      }

      setImportResult(result);
      setImportSuccess(true);
    } catch (err) {
      console.error('Import processing error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const standardFieldList: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
    { key: 'website', label: 'Website (Domain / URL)', required: true },
    { key: 'company_name', label: 'Company Name', required: true },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'title', label: 'Job Title' },
    { key: 'email', label: 'Email' },
    { key: 'industry', label: 'Industry' },
    { key: 'person_linkedin_url', label: 'Person LinkedIn URL' },
    { key: 'company_linkedin_url', label: 'Company LinkedIn URL' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State / Region' },
    { key: 'country', label: 'Country' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-sans">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <UploadCloud className="h-6 w-6 text-blue-600" />
          Lead List Ingestion & AI Personalization Mapper
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Upload spreadsheets, apply filters, match columns, and add custom personalized message variables for <strong>FreeOutreach</strong> (freeoutreach.com).
        </p>
      </div>

      {/* Download Pre-built Templates & 1-Click Load */}
      <Card className="glass-panel p-5 space-y-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 font-mono flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Download Example 16-Column Datasets (.CSV)
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Includes 12 standard account fields + 4 AI personalization columns: <code>Personalized Opening Line</code>, <code>Problem Paragraph</code>, <code>Pitch</code>, <code>CTA</code>.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleLoadSampleDataset('b2b-saas')}
            className="text-xs font-bold bg-[#0B0F19] hover:bg-slate-800 text-white rounded-xl shadow-xs"
          >
            <Play className="h-3 w-3 mr-1 fill-current" />
            1-Click Load AI Sample Dataset
          </Button>
        </div>

        {/* 3 Downloadable Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-slate-100">
          {SAMPLE_DATASETS.map((ds) => (
            <div
              key={ds.id}
              className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{ds.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-mono font-bold">
                    16 Fields
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">{ds.description}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSampleCsv(ds.id)}
                  className="flex-1 text-[11px] h-7 px-2 font-semibold"
                >
                  <Download className="h-3 w-3 mr-1 text-purple-600" />
                  Download .CSV
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleLoadSampleDataset(ds.id)}
                  className="text-[11px] h-7 px-2.5 font-bold"
                >
                  Use Data
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Upload Dropzone */}
      {!file && (
        <Card
          className="glass-panel-interactive border-2 border-dashed border-slate-300 hover:border-blue-500 p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            id="main-lead-file-input"
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Upload Target Lead Spreadsheet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag and drop your <strong>.csv</strong> or <strong>.xlsx</strong> file here, or click to browse.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-slate-500 font-mono">
            <span>✓ Scrambled Header Auto-Detection</span>
            <span>•</span>
            <span>✓ Custom Opening Line / Pitch Columns</span>
            <span>•</span>
            <span>✓ Save as Named List</span>
          </div>
        </Card>
      )}

      {/* Column Mapping & Filter Options Section */}
      {file && (
        <div className="space-y-6">
          {/* File summary & Lead List Name input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Lead List / File Name (Used to select in Campaigns)
                </label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="e.g. Fintech CEOs USA"
                  className="w-full sm:w-72 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoDetectMappings}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold"
              >
                <Shuffle className="h-3.5 w-3.5 mr-1 text-blue-600" />
                Auto-Detect Headers
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setHeaders([]);
                  setSampleRows([]);
                  setImportResult(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Change File
              </Button>
            </div>
          </div>

          {/* Import Filters Bar (Manyready Style Filter Rules) */}
          <Card className="glass-panel p-5 space-y-3 border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-blue-600" />
                Lead Ingestion Filters & Exclusions
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Total Rows Detected: <strong>{totalRows}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Filter by Industry:</label>
                <select
                  value={filterIndustry}
                  onChange={(e) => setFilterIndustry(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="ALL">All Industries (No Filter)</option>
                  <option value="SaaS">SaaS & Software</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Agency">Agencies & Marketing</option>
                  <option value="E-Commerce">E-Commerce</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600">Filter by Country:</label>
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="ALL">All Countries (Worldwide)</option>
                  <option value="USA">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterRequireWebsite}
                    onChange={(e) => setFilterRequireWebsite(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-700">Require Valid Website / Domain</span>
                </label>
              </div>
            </div>
          </Card>

          {/* 1. Standard 12 Field Mappings */}
          <Card className="glass-panel p-6 space-y-5 border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Table className="h-4 w-4 text-blue-600" />
                  12 Standard Outreach Lead Fields
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Matches your spreadsheet columns to standard B2B account properties.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Scrambled Auto-Detect Active
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {standardFieldList.map((f) => (
                <div
                  key={f.key}
                  className={`space-y-1.5 p-3 rounded-2xl border ${
                    f.required ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{f.label}</span>
                    {f.required ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-mono font-bold">
                        REQUIRED
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-mono">OPTIONAL</span>
                    )}
                  </label>

                  <select
                    value={mapping[f.key] || ''}
                    onChange={(e) => handleMappingChange(f.key, e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Not Mapped --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          {/* 2. Custom AI Personalization Message Columns (Dynamic Adder) */}
          <Card className="glass-panel p-6 space-y-5 border-purple-200 bg-purple-50/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Custom Personalized Message Columns (Manyready System)
                </h3>
                <p className="text-xs text-purple-800 mt-0.5">
                  Map custom columns from your spreadsheet or add new custom variables to use in message bodies.
                </p>
              </div>

              <button
                onClick={handleAddCustomColumn}
                className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Custom Column</span>
              </button>
            </div>

            {/* Custom Columns Grid */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {customColumns.map((col) => (
                <div
                  key={col.id}
                  className="space-y-2 p-3.5 rounded-2xl border border-purple-200 bg-white shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={col.label}
                      onChange={(e) => handleUpdateCustomColumn(col.id, 'label', e.target.value)}
                      className="text-xs font-bold text-purple-950 border-b border-dashed border-purple-300 focus:border-purple-600 focus:outline-none bg-transparent w-36"
                    />
                    <button
                      onClick={() => handleRemoveCustomColumn(col.id)}
                      className="text-slate-300 hover:text-rose-600 p-0.5"
                      title="Remove column"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-purple-600 font-bold block">
                    Variable: {col.tag}
                  </span>

                  <select
                    value={col.sourceColumn}
                    onChange={(e) => handleUpdateCustomColumn(col.id, 'sourceColumn', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">-- Select Sheet Column --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Execution & Save List Button */}
            <div className="flex justify-end pt-3 border-t border-purple-100">
              <Button
                variant="primary"
                size="md"
                onClick={handleRunImport}
                isLoading={isImporting}
                className="font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 rounded-xl shadow-md shadow-blue-500/20"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save & Ingest &quot;{listName}&quot; ({totalRows} Leads)
              </Button>
            </div>
          </Card>

          {/* Success Banner */}
          {importSuccess && importResult && (
            <Card className="glass-panel p-6 border-emerald-300 bg-emerald-50/60 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Check className="h-5 w-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Lead List &quot;{listName}&quot; Saved & Ingested Successfully!
                  </h3>
                  <p className="text-xs text-emerald-800">
                    {(importResult as any)?.validCount || importResult?.validLeads?.length || 0} valid leads ready with 12 standard fields + {customColumns.length} custom AI message columns.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/campaigns/new')}
                  className="font-bold bg-[#2563EB] hover:bg-[#1D4ED8]"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  Launch Campaign with this List
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/leads')}
                  className="text-xs font-bold"
                >
                  View in Directory
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* MANYREACH.COM MATCH YOUR DATA MODAL */}
      <MatchDataModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        fileName={matchFileData.fileName}
        headers={matchFileData.headers}
        sampleRows={matchFileData.sampleRows}
        allRawRows={matchFileData.allRawRows}
        onImportSuccess={handleMatchImportSuccess}
      />
    </div>
  );
}
