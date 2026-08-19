'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Download,
  Building2,
  Globe,
  FileText,
  Mail,
  SlidersHorizontal,
  FileSpreadsheet,
  RotateCcw,
  Check,
  Ban,
  HelpCircle,
  Maximize2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  DetailedResultItem,
  ExtendedResultStatus,
  ResultsService,
  ResultsFilterCriteria,
} from '@/lib/services/results-service';

// Mock Comprehensive Results Fixture Dataset
const mockDetailedResults: DetailedResultItem[] = [
  {
    id: 'res-001',
    campaignId: 'camp-01',
    campaignName: 'Q3 Enterprise Fintech Outreach',
    companyName: 'Stripe, Inc.',
    website: 'https://stripe.com',
    contactPageUrl: 'https://stripe.com/contact',
    status: 'SUCCESS',
    country: 'United States',
    industry: 'FinTech',
    contactPerson: 'Patrick Collison',
    renderedSubject: 'Partnership with Stripe, Inc.',
    renderedMessage: 'Hi Patrick,\n\nI came across Stripe, Inc. and wanted to reach out regarding our B2B services.\n\nBest,\nAlex',
    startedAt: '2026-08-11T14:20:00Z',
    completedAt: '2026-08-11T14:20:08Z',
    httpStatus: 200,
    screenshotBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="%230f172a"/><text x="50" y="50" fill="%234ade80" font-family="monospace" font-size="16">OUTCOME PROOF: SUCCESS (HTTP 200)</text><text x="50" y="90" fill="%23ffffff" font-family="monospace" font-size="12">Target: https://stripe.com/contact</text><text x="50" y="120" fill="%23ffffff" font-family="monospace" font-size="12">Confirmation: "Thank you for contacting Stripe"</text></svg>',
  },
  {
    id: 'res-002',
    campaignId: 'camp-01',
    campaignName: 'Q3 Enterprise Fintech Outreach',
    companyName: 'Cloudflare, Inc.',
    website: 'https://cloudflare.com',
    contactPageUrl: 'https://cloudflare.com/plans/enterprise/contact',
    status: 'CAPTCHA',
    country: 'United States',
    industry: 'Cybersecurity',
    contactPerson: 'Matthew Prince',
    renderedSubject: 'Intro regarding Cloudflare, Inc.',
    renderedMessage: 'Hi Matthew,\n\nReaching out regarding enterprise DNS performance.\n\nBest,\nAlex',
    startedAt: '2026-08-11T14:21:00Z',
    completedAt: '2026-08-11T14:21:05Z',
    httpStatus: 200,
    errorMessage: 'Cloudflare Turnstile challenge detected on target form. Zero-bypass policy enforced.',
    screenshotBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="%230f172a"/><text x="50" y="50" fill="%23fbbf24" font-family="monospace" font-size="16">OUTCOME PROOF: CAPTCHA DETECTED</text><text x="50" y="90" fill="%23ffffff" font-family="monospace" font-size="12">Turnstile Challenge Screen Identified</text></svg>',
  },
  {
    id: 'res-003',
    campaignId: 'camp-02',
    campaignName: 'Productivity SaaS Q3',
    companyName: 'Linear Software',
    website: 'https://linear.app',
    contactPageUrl: 'https://linear.app/contact',
    status: 'SUCCESS',
    country: 'United States',
    industry: 'Productivity',
    contactPerson: 'Karri Saarinen',
    renderedSubject: 'Feedback on Linear Software',
    renderedMessage: 'Hi Karri,\n\nLoving Linear Software and wanted to explore an API collaboration.\n\nBest,\nAlex',
    startedAt: '2026-08-11T14:22:00Z',
    completedAt: '2026-08-11T14:22:07Z',
    httpStatus: 200,
  },
  {
    id: 'res-004',
    campaignId: 'camp-01',
    campaignName: 'Q3 Enterprise Fintech Outreach',
    companyName: 'Acme Guard Corp',
    website: 'https://acmeguard.co.uk',
    contactPageUrl: 'https://acmeguard.co.uk/inquiry',
    status: 'REVIEW_REQUIRED',
    country: 'United Kingdom',
    industry: 'Security',
    contactPerson: 'James Bond',
    renderedSubject: 'Partnership Inquiry',
    renderedMessage: 'Hi James,\n\nReaching out regarding security compliance.\n\nBest,\nAlex',
    startedAt: '2026-08-11T14:23:00Z',
    errorMessage: 'Field mapping confidence score was 64% (below 70% threshold).',
  },
  {
    id: 'res-005',
    campaignId: 'camp-02',
    campaignName: 'Productivity SaaS Q3',
    companyName: 'Notion Labs',
    website: 'https://notion.so',
    status: 'NO_CONTACT_PAGE',
    country: 'United States',
    industry: 'SaaS',
    contactPerson: 'Ivan Zhao',
    startedAt: '2026-08-11T14:24:00Z',
    completedAt: '2026-08-11T14:24:12Z',
    errorMessage: 'Scanned homepage and probed /contact, /contact-us without locating a public contact URL.',
  },
  {
    id: 'res-006',
    campaignId: 'camp-01',
    campaignName: 'Q3 Enterprise Fintech Outreach',
    companyName: 'SecureBank Global',
    website: 'https://securebank.ch',
    contactPageUrl: 'https://securebank.ch/contact',
    status: 'BLOCKED',
    country: 'Switzerland',
    industry: 'Banking',
    startedAt: '2026-08-11T14:25:00Z',
    completedAt: '2026-08-11T14:25:02Z',
    httpStatus: 403,
    errorMessage: 'Target web server returned HTTP 403 Forbidden (Bot Blocked / Access Denied).',
  },
  {
    id: 'res-007',
    campaignId: 'camp-02',
    campaignName: 'Productivity SaaS Q3',
    companyName: 'Apex Minimalist',
    website: 'https://apexminimal.io',
    contactPageUrl: 'https://apexminimal.io/about',
    status: 'NO_FORM',
    country: 'Germany',
    industry: 'Design',
    startedAt: '2026-08-11T14:26:00Z',
    completedAt: '2026-08-11T14:26:06Z',
    httpStatus: 200,
    errorMessage: 'Contact page found, but no public interactable form elements were detected.',
  },
  {
    id: 'res-008',
    campaignId: 'camp-01',
    campaignName: 'Q3 Enterprise Fintech Outreach',
    companyName: 'SlowResponse Ltd',
    website: 'https://slowresponse.com',
    contactPageUrl: 'https://slowresponse.com/contact',
    status: 'TIMEOUT',
    country: 'Canada',
    industry: 'Logistics',
    startedAt: '2026-08-11T14:27:00Z',
    completedAt: '2026-08-11T14:27:30Z',
    errorMessage: 'Navigation timed out after 30000ms.',
  },
  {
    id: 'res-009',
    campaignId: 'camp-01',
    campaignName: 'Q3 Enterprise Fintech Outreach',
    companyName: 'Pending Growth Co',
    website: 'https://pendinggrowth.com',
    status: 'PENDING',
    country: 'Australia',
    industry: 'Marketing',
    startedAt: '2026-08-11T14:28:00Z',
  },
  {
    id: 'res-010',
    campaignId: 'camp-02',
    campaignName: 'Productivity SaaS Q3',
    companyName: 'Active Node Corp',
    website: 'https://activenode.dev',
    contactPageUrl: 'https://activenode.dev/contact',
    status: 'PROCESSING',
    country: 'United States',
    industry: 'Developer Tools',
    startedAt: '2026-08-11T14:29:00Z',
  },
];

export default function ResultsDashboardPage() {
  const [results, setResults] = useState<DetailedResultItem[]>(mockDetailedResults);
  const [selectedResult, setSelectedResult] = useState<DetailedResultItem | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // Filters State
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-dimensional filtered results
  const filteredResults = useMemo(() => {
    return ResultsService.filterResults(results, {
      campaignId: selectedCampaign,
      status: selectedStatus,
      country: selectedCountry,
      industry: selectedIndustry,
      searchQuery,
    });
  }, [results, selectedCampaign, selectedStatus, selectedCountry, selectedIndustry, searchQuery]);

  // Compute all 10 Status Counters
  const statusSummary = useMemo(() => {
    return ResultsService.computeStatusSummary(results);
  }, [results]);

  // Handle CSV Export Download
  const handleExportCsv = () => {
    const csvData = ResultsService.exportToCsv(filteredResults);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `outreach_results_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Outreach Results & Proof Explorer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit submission outcomes, inspect pre/post-submission visual proofs, and export verified delivery reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={handleExportCsv}>
            {copiedExport ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-emerald-400" /> Exported CSV!
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1.5" /> Export Filtered CSV ({filteredResults.length})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 10 Status KPI Counters Grid (Prompt 14 Requirement) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {[
          { label: 'Total', count: statusSummary.total, color: 'text-white', filter: 'ALL' },
          { label: 'Pending', count: statusSummary.pending, color: 'text-slate-400', filter: 'PENDING' },
          { label: 'Processing', count: statusSummary.processing, color: 'text-cyan-400', filter: 'PROCESSING' },
          { label: 'Success', count: statusSummary.success, color: 'text-emerald-400', filter: 'SUCCESS' },
          { label: 'Failed', count: statusSummary.failed, color: 'text-rose-400', filter: 'FAILED' },
          { label: 'CAPTCHA', count: statusSummary.captcha, color: 'text-amber-400', filter: 'CAPTCHA' },
          { label: 'Review Req.', count: statusSummary.reviewRequired, color: 'text-orange-400', filter: 'REVIEW_REQUIRED' },
          { label: 'Blocked', count: statusSummary.blocked, color: 'text-red-500', filter: 'BLOCKED' },
          { label: 'No Contact', count: statusSummary.noContactPage, color: 'text-slate-500', filter: 'NO_CONTACT_PAGE' },
          { label: 'No Form', count: statusSummary.noForm, color: 'text-slate-500', filter: 'NO_FORM' },
        ].map((stat) => (
          <Card
            key={stat.label}
            onClick={() => setSelectedStatus(stat.filter)}
            className={`glass-panel p-3 text-center cursor-pointer transition-all ${
              selectedStatus === stat.filter
                ? 'border-primary/60 bg-primary/10 shadow-md shadow-primary/10'
                : 'hover:bg-slate-900/60'
            }`}
          >
            <p className="text-[10px] text-muted-foreground uppercase font-bold truncate">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color} mt-0.5`}>{stat.count}</p>
          </Card>
        ))}
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="glass-panel p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Omni Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, website, contact, or error..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-4 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
            />
          </div>

          {/* Campaign Filter */}
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Campaigns</option>
            <option value="camp-01">Q3 Enterprise Fintech Outreach</option>
            <option value="camp-02">Productivity SaaS Q3</option>
          </select>

          {/* Country Filter */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Countries</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Germany">Germany</option>
            <option value="Switzerland">Switzerland</option>
            <option value="Canada">Canada</option>
          </select>

          {/* Industry Filter */}
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Industries</option>
            <option value="FinTech">FinTech</option>
            <option value="Cybersecurity">Cybersecurity</option>
            <option value="Productivity">Productivity</option>
            <option value="SaaS">SaaS</option>
            <option value="Banking">Banking</option>
          </select>
        </div>
      </Card>

      {/* Results Table */}
      <Card className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-muted-foreground border-b border-slate-800 uppercase font-mono tracking-wider">
              <tr>
                <th className="p-3.5">Company & Website</th>
                <th className="p-3.5">Contact Page</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Campaign</th>
                <th className="p-3.5">Started / Completed</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredResults.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      {item.companyName}
                    </div>
                    <a
                      href={item.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono mt-0.5"
                    >
                      {item.website} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </td>

                  <td className="p-3.5 font-mono text-[11px] max-w-xs truncate text-slate-400">
                    {item.contactPageUrl ? (
                      <span className="text-slate-300">{item.contactPageUrl}</span>
                    ) : (
                      <span className="text-slate-500 italic">None Discovered</span>
                    )}
                  </td>

                  <td className="p-3.5">
                    <Badge status={item.status as any} />
                  </td>

                  <td className="p-3.5 text-slate-400 truncate max-w-[160px]">
                    {item.campaignName}
                  </td>

                  <td className="p-3.5 font-mono text-[11px] text-slate-400">
                    <div>{new Date(item.startedAt).toLocaleTimeString()}</div>
                    {item.completedAt && (
                      <div className="text-slate-500">
                        {new Date(item.completedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </td>

                  <td className="p-3.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedResult(item);
                        setIsProofModalOpen(true);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Inspect Proof
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detailed Result & Visual Proof Modal Lightbox */}
      {isProofModalOpen && selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Card className="glass-panel w-full max-w-3xl border-slate-700 bg-slate-950 p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {selectedResult.companyName} — Outcome Audit
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  ID: {selectedResult.id} • Target: {selectedResult.contactPageUrl || selectedResult.website}
                </p>
              </div>

              <button
                onClick={() => setIsProofModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status & Diagnostic Details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <span className="text-muted-foreground">Final Status:</span>
                <div className="mt-1">
                  <Badge status={selectedResult.status as any} />
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <span className="text-muted-foreground">HTTP Status:</span>
                <p className="font-bold text-white mt-1">
                  {selectedResult.httpStatus ? `HTTP ${selectedResult.httpStatus}` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Error Diagnostics if present */}
            {selectedResult.errorMessage && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Diagnostic Trace: </span>
                  {selectedResult.errorMessage}
                </div>
              </div>
            )}

            {/* Rendered Outreach Message Payload */}
            {selectedResult.renderedMessage && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-primary" /> Rendered Outreach Payload
                </h4>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2 text-xs font-mono">
                  <p className="font-bold text-white">Subject: {selectedResult.renderedSubject}</p>
                  <div className="h-px bg-slate-800" />
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {selectedResult.renderedMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Screenshot Proof Lightbox */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> Visual Verification Proof
              </h4>
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-center overflow-hidden">
                {selectedResult.screenshotBase64 ? (
                  <img
                    src={selectedResult.screenshotBase64}
                    alt="Submission Proof Screenshot"
                    className="w-full rounded-lg border border-slate-800 shadow-inner max-h-64 object-contain mx-auto"
                  />
                ) : (
                  <div className="py-8 text-xs text-muted-foreground font-mono">
                    [Visual screenshot proof captured and stored in Supabase object storage]
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setIsProofModalOpen(false)}>
                Close Audit Inspector
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
