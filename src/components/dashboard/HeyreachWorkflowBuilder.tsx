'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  Search,
  FormInput,
  Sparkles,
  ShieldCheck,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Layers,
  ArrowDown,
  ArrowRight,
  Sliders,
  Database,
  ExternalLink,
  Bot,
  Flame,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface WorkflowNode {
  id: string;
  stepNumber: number;
  title: string;
  category: 'ingestion' | 'discovery' | 'detection' | 'mapping' | 'personalization' | 'submission' | 'safety' | 'audit';
  status: 'active' | 'completed' | 'waiting' | 'branch';
  icon: React.ElementType;
  color: string;
  description: string;
  stats: string;
  inputs: string[];
  outputs: string[];
  configSnippet: string;
}

export function HeyreachWorkflowBuilder() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-1');
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimulationStep, setActiveSimulationStep] = useState<number>(0);

  const nodes: WorkflowNode[] = [
    {
      id: 'node-1',
      stepNumber: 1,
      title: 'Target Lead Ingestion',
      category: 'ingestion',
      status: 'completed',
      icon: UploadCloud,
      color: 'from-blue-500 to-indigo-600 text-blue-600 bg-blue-50 border-blue-200',
      description: 'Ingests target leads from CSV, XLSX, or Google Sheets with 12 standard outreach fields and scrambled header auto-detection.',
      stats: '18,450 Verified Target Domains',
      inputs: ['CSV / Excel File', 'Google Sheets OAuth', 'Direct API Webhook'],
      outputs: ['Normalized Lead Record', 'Extracted Domain', 'Custom Variables'],
      configSnippet: 'mapping: { company_name: "Company", website: "Website", email: "Work Email" }',
    },
    {
      id: 'node-2',
      stepNumber: 2,
      title: 'Contact Page Finder',
      category: 'discovery',
      status: 'completed',
      icon: Search,
      color: 'from-indigo-500 to-purple-600 text-indigo-600 bg-indigo-50 border-indigo-200',
      description: 'Crawls target domains with SSRF IP protection to discover contact pages (/contact, /about/contact, /get-in-touch).',
      stats: '92.0% Discovery Yield (16,974 Found)',
      inputs: ['Normalized Domain URL'],
      outputs: ['Validated Contact Page URL', 'Anchor Heuristic Score (0.96)'],
      configSnippet: 'heuristic: { anchorKeywords: ["contact", "get in touch", "support"], ssrfGuard: true }',
    },
    {
      id: 'node-3',
      stepNumber: 3,
      title: 'Semantic Form Detection',
      category: 'detection',
      status: 'completed',
      icon: FormInput,
      color: 'from-purple-500 to-pink-600 text-purple-600 bg-purple-50 border-purple-200',
      description: 'Analyzes DOM structure, classifies inquiry forms vs search bars, isolates honeypot traps, and evaluates anti-bot challenges.',
      stats: '85.0% Forms Detected (15,682 Forms)',
      inputs: ['Contact Page HTML DOM'],
      outputs: ['Form Field Schemas', 'Honeypot Trap Coordinates', 'Protection Marker State'],
      configSnippet: 'detector: { excludeSearchBars: true, stripHoneypots: true, checkRecaptcha: true }',
    },
    {
      id: 'node-4a',
      stepNumber: 4,
      title: 'Deterministic Field Mapper',
      category: 'mapping',
      status: 'completed',
      icon: Sliders,
      color: 'from-emerald-500 to-teal-600 text-emerald-600 bg-emerald-50 border-emerald-200',
      description: 'Maps lead data into target form fields using semantic scoring, composite name handling, and required field validation.',
      stats: '100% High Confidence Resolution',
      inputs: ['Lead Record Data', 'Detected Form Fields'],
      outputs: ['Field Fill Payload', 'Confidence Matrix (98.4%)'],
      configSnippet: 'mappingEngine: { fullNameSplit: true, phoneFormatting: "E.164", requireEmail: true }',
    },
    {
      id: 'node-5a',
      stepNumber: 5,
      title: 'Spintax & AI Personalizer',
      category: 'personalization',
      status: 'completed',
      icon: Sparkles,
      color: 'from-pink-500 to-rose-600 text-pink-600 bg-pink-50 border-pink-200',
      description: 'Renders dynamic Spintax message variations and optional truth-enforced AI personalization without hallucinations.',
      stats: '5,000+ Unique Message Combinations',
      inputs: ['Template String', 'Company Intelligence Signals', 'Lead Name & Title'],
      outputs: ['Interpolated Subject & Body', 'Compliance Opt-Out Footer'],
      configSnippet: 'template: "{Hi|Hello|Hey} {{firstName}}, loved what {{companyName}} is building in {{industry}}."',
    },
    {
      id: 'node-6a',
      stepNumber: 6,
      title: 'Playwright Safe Form Submitter',
      category: 'submission',
      status: 'completed',
      icon: Layers,
      color: 'from-teal-500 to-cyan-600 text-teal-600 bg-teal-50 border-teal-200',
      description: 'Executes form fill in headless browser sandbox with 14-point safety checks and captures visual screenshot proof.',
      stats: '1.4s Average Latency • 97.8% Deliverability',
      inputs: ['Filled Form Payload', 'Target Destination URL'],
      outputs: ['Pre/Post Submission Visual Proof', 'HTTP Response Outcome (200 OK)'],
      configSnippet: 'submitter: { mode: "LIVE_SUBMIT", screenshotProof: true, captureConfirmation: true }',
    },
    {
      id: 'node-4b',
      stepNumber: 4,
      title: 'Zero-Bypass Protection Shield',
      category: 'safety',
      status: 'branch',
      icon: ShieldCheck,
      color: 'from-amber-500 to-orange-600 text-amber-700 bg-amber-50 border-amber-200',
      description: 'Enforces strict anti-bot compliance. If reCAPTCHA, hCaptcha, or Cloudflare challenge is found, processing immediately halts.',
      stats: '100% Zero-Bypass Enforced (98 Halted)',
      inputs: ['Anti-Bot Protection Detected'],
      outputs: ['Status: REVIEW_REQUIRED', 'Operator Triage Queue Item'],
      configSnippet: 'policy: { neverBypassCaptcha: true, haltOn403: true, haltOn429: true }',
    },
    {
      id: 'node-7',
      stepNumber: 7,
      title: 'Delivery Audit & CRM Sync',
      category: 'audit',
      status: 'completed',
      icon: CheckCircle2,
      color: 'from-indigo-600 to-purple-700 text-indigo-700 bg-indigo-50 border-indigo-200',
      description: 'Logs immutable SHA-256 visual proof, updates campaign progress, and synchronizes real-time status back to Google Sheets & Webhooks.',
      stats: '14,210 Submissions Audited & Synced',
      inputs: ['Submission Result Record', 'Visual Proof Asset'],
      outputs: ['Real-Time Dashboard Telemetry', 'Google Sheets Row Status Updated'],
      configSnippet: 'sync: { googleSheets: true, webhookDispatch: true, appendProofUrl: true }',
    },
  ];

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const handleSimulate = () => {
    setIsSimulating(true);
    setActiveSimulationStep(1);

    const interval = setInterval(() => {
      setActiveSimulationStep((prev) => {
        if (prev >= 7) {
          clearInterval(interval);
          setIsSimulating(false);
          return 0;
        }
        return prev + 1;
      });
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header & Simulator Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 font-mono">
              HEYREACH WORKFLOW ARCHITECTURE
            </span>
            <span className="text-xs text-slate-400 font-mono">• Node-Based Pipeline</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Visual Campaign Flowchart & Autonomous Workflow
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Click any workflow box below to inspect its live heuristics, inputs, outputs, and safety controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleSimulate}
            disabled={isSimulating}
            className="font-bold text-xs shadow-md"
          >
            <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
            {isSimulating ? `Simulating Step ${activeSimulationStep}/7...` : '▶ Simulate Live Campaign Flow'}
          </Button>
        </div>
      </div>

      {/* Grid: Visual Box Workflow Canvas (Left) & Node Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Canvas: Interactive Heyreach Box Flow (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Main Linear Flow */}
          <div className="space-y-3">
            {/* Box 1: Lead Ingestion */}
            <div
              onClick={() => setSelectedNodeId('node-1')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                selectedNodeId === 'node-1'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${activeSimulationStep === 1 ? 'ring-4 ring-purple-500 animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">STEP 1</span>
                      <h4 className="text-sm font-bold text-slate-900">Target Lead List Ingestion</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">12 outreach fields mapped with scrambled header auto-detection</p>
                  </div>
                </div>
                <Badge variant="completed" size="sm">18,450 Leads</Badge>
              </div>
            </div>

            {/* Connector Line 1 */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-indigo-200 flex items-center justify-center">
                <ArrowDown className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            </div>

            {/* Box 2: Discovery */}
            <div
              onClick={() => setSelectedNodeId('node-2')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                selectedNodeId === 'node-2'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${activeSimulationStep === 2 ? 'ring-4 ring-purple-500 animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">STEP 2</span>
                      <h4 className="text-sm font-bold text-slate-900">Contact Page Finder & Heuristics</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">SSRF firewall safe crawler scores anchor links (/contact, /about)</p>
                  </div>
                </div>
                <Badge variant="completed" size="sm">92.0% Yield</Badge>
              </div>
            </div>

            {/* Connector Line 2 */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-indigo-200 flex items-center justify-center">
                <ArrowDown className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            </div>

            {/* Box 3: Form Detection */}
            <div
              onClick={() => setSelectedNodeId('node-3')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                selectedNodeId === 'node-3'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${activeSimulationStep === 3 ? 'ring-4 ring-purple-500 animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                    <FormInput className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">STEP 3</span>
                      <h4 className="text-sm font-bold text-slate-900">Semantic Form Classifier & Honeypot Trap Isolation</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Classifies contact forms, ignores search bars, evaluates protection</p>
                  </div>
                </div>
                <Badge variant="completed" size="sm">15,682 Forms</Badge>
              </div>
            </div>

            {/* Branching Split Header */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                Condition Branching Matrix
              </span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* 2-Branch Grid: Standard Form vs Protected Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branch Path A: Clean Form */}
              <div className="space-y-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold font-mono">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  PATH A: STANDARD FORM (95.4%)
                </div>

                {/* Box 4A: Field Mapper */}
                <div
                  onClick={() => setSelectedNodeId('node-4a')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer bg-white ${
                    selectedNodeId === 'node-4a' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                  } ${activeSimulationStep === 4 ? 'ring-4 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="h-4 w-4 text-emerald-600" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">4A. Deterministic Field Mapper</h5>
                      <p className="text-[10px] text-slate-500">Maps first/last name, company, email</p>
                    </div>
                  </div>
                </div>

                {/* Box 5A: Personalizer */}
                <div
                  onClick={() => setSelectedNodeId('node-5a')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer bg-white ${
                    selectedNodeId === 'node-5a' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                  } ${activeSimulationStep === 5 ? 'ring-4 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-pink-600" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">5A. Spintax & AI Message Variations</h5>
                      <p className="text-[10px] text-slate-500">5,000+ unique copy variations</p>
                    </div>
                  </div>
                </div>

                {/* Box 6A: Submitter & Proof */}
                <div
                  onClick={() => setSelectedNodeId('node-6a')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer bg-white ${
                    selectedNodeId === 'node-6a' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                  } ${activeSimulationStep === 6 ? 'ring-4 ring-emerald-500 animate-pulse' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-teal-600" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">6A. Playwright Safe Form Submission</h5>
                      <p className="text-[10px] text-slate-500">Captures pre/post screenshot proof</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Branch Path B: Bot Challenge / CAPTCHA */}
              <div className="space-y-3 p-4 rounded-2xl border border-amber-200 bg-amber-50/30 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 text-xs font-bold font-mono">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    PATH B: BOT CHALLENGE DETECTED
                  </div>

                  {/* Box 4B: Zero-Bypass Shield */}
                  <div
                    onClick={() => setSelectedNodeId('node-4b')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer bg-white ${
                      selectedNodeId === 'node-4b' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Zero-Bypass Policy Enforced</h5>
                        <p className="text-[10px] text-slate-500">Halts on reCAPTCHA/Cloudflare challenge</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-200 bg-white">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Route to Human Review Queue</h5>
                        <p className="text-[10px] text-slate-500">Operator manual triage</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-100/60 text-[10px] text-amber-950 font-mono">
                  ✓ 100% Anti-Bot Compliance Guarantee
                </div>
              </div>
            </div>

            {/* Connector Line to Final Step */}
            <div className="flex justify-center pt-1">
              <div className="w-0.5 h-6 bg-indigo-200 flex items-center justify-center">
                <ArrowDown className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            </div>

            {/* Box 7: Delivery Audit & Sync */}
            <div
              onClick={() => setSelectedNodeId('node-7')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                selectedNodeId === 'node-7'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${activeSimulationStep === 7 ? 'ring-4 ring-indigo-500 animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">STEP 7</span>
                      <h4 className="text-sm font-bold text-slate-900">Delivery Audit & Live Google Sheets Sync</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Logs immutable proof, updates CRM, writes status to spreadsheet</p>
                  </div>
                </div>
                <Badge variant="completed" size="sm">14,210 Audited</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Selected Node Inspector (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="glass-panel p-6 space-y-5 sticky top-24 border-slate-200/90 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${selectedNode.color}`}>
                  <selectedNode.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{selectedNode.title}</h4>
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
                    Category: {selectedNode.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">Node Description:</p>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedNode.description}</p>
            </div>

            {/* Performance Stat Pill */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Telemetry:</span>
              <p className="text-xs font-extrabold text-indigo-900 mt-0.5 font-mono">{selectedNode.stats}</p>
            </div>

            {/* Inputs & Outputs */}
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-slate-700 mb-1">Incoming Inputs:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.inputs.map((inp) => (
                    <span key={inp} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono">
                      → {inp}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-1">Generated Outputs:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.outputs.map((out) => (
                    <span key={out} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono">
                      ✓ {out}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Configuration snippet */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-700">Underlying Engine Logic:</p>
              <pre className="p-2.5 rounded-xl bg-slate-900 text-indigo-300 text-[10px] font-mono overflow-x-auto">
                {selectedNode.configSnippet}
              </pre>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
