'use client';

import React, { useState, useRef } from 'react';
import {
  FileText,
  Plus,
  Sparkles,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  Eye,
  Copy,
  Users,
  ShieldCheck,
  Save,
  RotateCcw,
  Bot,
  Sliders,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockTemplates, mockLeads } from '@/lib/store/mock-data';
import {
  STANDARD_VARIABLES,
  validateTemplate,
  interpolateTemplate,
} from '@/lib/services/template-engine';
import { AIService } from '@/lib/services/ai/ai-service';
import { MessageTemplate } from '@/types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(mockTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(mockTemplates[0]?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Active form state
  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const [formName, setFormName] = useState(activeTemplate?.name || '');
  const [formSubject, setFormSubject] = useState(activeTemplate?.subjectTemplate || '');
  const [formBody, setFormBody] = useState(activeTemplate?.bodyTemplate || '');
  const [formFooter, setFormFooter] = useState(activeTemplate?.complianceFooter || '');
  const [isSpintaxEnabled, setIsSpintaxEnabled] = useState(activeTemplate?.isSpintaxEnabled ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI-Powered Personalization State (Prompt 16)
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('Highlight our B2B integration tools, concise and direct tone.');
  const [aiMaxWords, setAiMaxWords] = useState(120);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedDraft, setAiGeneratedDraft] = useState<{ subject: string; body: string } | null>(null);

  // Real Lead Selector for Live Preview
  const [selectedLeadId, setSelectedLeadId] = useState<string>(mockLeads[0]?.id || '');
  const [randomizeSpintax, setRandomizeSpintax] = useState(false);

  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const handleSelectTemplate = (tpl: MessageTemplate) => {
    setSelectedTemplateId(tpl.id);
    setIsCreatingNew(false);
    setFormName(tpl.name);
    setFormSubject(tpl.subjectTemplate);
    setFormBody(tpl.bodyTemplate);
    setFormFooter(tpl.complianceFooter);
    setIsSpintaxEnabled(tpl.isSpintaxEnabled);
    setAiGeneratedDraft(null);
    setSaveSuccess(false);
  };

  // Variable Validation
  const subjectValidation = validateTemplate(formSubject);
  const bodyValidation = validateTemplate(formBody);
  const allUnknownVariables = Array.from(
    new Set([...subjectValidation.unknownVariables, ...bodyValidation.unknownVariables])
  );
  const allValidVariables = Array.from(
    new Set([...subjectValidation.validVariables, ...bodyValidation.validVariables])
  );

  // Insert Variable at Cursor Position in Body
  const handleInsertVariable = (variableToken: string) => {
    const textarea = bodyInputRef.current;
    if (!textarea) {
      setFormBody((prev) => `${prev} {{${variableToken}}}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textToInsert = `{{${variableToken}}}`;
    const newBody =
      formBody.substring(0, start) + textToInsert + formBody.substring(end);

    setFormBody(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  };

  // AI Generation & Regeneration Trigger
  const handleGenerateAiMessage = async () => {
    const selectedLead = mockLeads.find((l) => l.id === selectedLeadId) || mockLeads[0];
    setIsGeneratingAi(true);

    try {
      const res = await AIService.personalizeMessage({
        companyName: selectedLead.companyName,
        websiteUrl: selectedLead.website,
        industry: selectedLead.industry || 'Technology',
        location: `${selectedLead.city || ''}, ${selectedLead.country || ''}`,
        contactPersonName: selectedLead.firstName,
        campaignInstructions: aiInstructions,
        maxWords: aiMaxWords,
      });

      setAiGeneratedDraft({
        subject: res.subject,
        body: res.body,
      });

      // Populate form with AI generated draft
      setFormSubject(res.subject);
      setFormBody(res.body);
    } catch (err) {
      console.error('AI generation error:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Load saved templates from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_message_templates');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped: MessageTemplate[] = parsed.map((t: any) => ({
              id: t.id,
              name: t.name,
              subjectTemplate: t.subject || t.subjectTemplate || '',
              bodyTemplate: t.body || t.bodyTemplate || '',
              complianceFooter: t.complianceFooter || '',
              isSpintaxEnabled: t.isSpintaxEnabled ?? true,
              variables: t.variables || [],
              createdAt: t.createdAt || new Date().toISOString(),
              updatedAt: t.updatedAt || new Date().toISOString(),
            }));
            setTemplates([...mapped, ...mockTemplates]);
          }
        }
      } catch (err) {
        console.error('Error loading saved templates in page:', err);
      }
    }
  }, []);

  // Save / Update Template
  const handleSave = () => {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) return;

    let updatedList: MessageTemplate[] = [];

    if (isCreatingNew) {
      const newTemplate: MessageTemplate = {
        id: `tpl-${Date.now()}`,
        name: formName,
        subjectTemplate: formSubject,
        bodyTemplate: formBody,
        complianceFooter: formFooter,
        isSpintaxEnabled,
        variables: allValidVariables,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedList = [newTemplate, ...templates];
      setTemplates(updatedList);
      setSelectedTemplateId(newTemplate.id);
      setIsCreatingNew(false);
    } else {
      updatedList = templates.map((t) =>
        t.id === selectedTemplateId
          ? {
              ...t,
              name: formName,
              subjectTemplate: formSubject,
              bodyTemplate: formBody,
              complianceFooter: formFooter,
              isSpintaxEnabled,
              variables: allValidVariables,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      setTemplates(updatedList);
    }

    try {
      if (typeof window !== 'undefined') {
        const toStore = updatedList.map((t) => ({
          id: t.id,
          name: t.name,
          subject: t.subjectTemplate,
          body: t.bodyTemplate,
          subjectTemplate: t.subjectTemplate,
          bodyTemplate: t.bodyTemplate,
          complianceFooter: t.complianceFooter,
          isSpintaxEnabled: t.isSpintaxEnabled,
        }));
        localStorage.setItem('user_message_templates', JSON.stringify(toStore));
      }
    } catch (err) {
      console.error('Error storing templates to localStorage:', err);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Delete Template
  const handleDelete = (id: string) => {
    if (templates.length <= 1) {
      alert('You must keep at least one message template.');
      return;
    }
    const remaining = templates.filter((t) => t.id !== id);
    setTemplates(remaining);
    if (selectedTemplateId === id) {
      handleSelectTemplate(remaining[0]);
    }
  };

  // Create New Handler
  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedTemplateId('new');
    setFormName('New Outreach Template');
    setFormSubject('{Partnership|Intro} regarding {{company_name}}');
    setFormBody(
      'Hi {{first_name}},\n\nI came across {{company_name}} and wanted to reach out regarding your work in {{industry}}.\n\nBest,\nAlex'
    );
    setFormFooter(
      'Sent by Acme Outreach Corp, 500 Market St, San Francisco, CA. Reply with STOP to opt out.'
    );
    setIsSpintaxEnabled(true);
    setAiGeneratedDraft(null);
    setSaveSuccess(false);
  };

  // Selected Real Lead for Preview
  const selectedLead = mockLeads.find((l) => l.id === selectedLeadId) || mockLeads[0];

  const leadContext = {
    first_name: selectedLead?.firstName || 'Alex',
    last_name: selectedLead?.lastName || 'Rivera',
    company_name: selectedLead?.companyName || 'Acme Corp',
    website: selectedLead?.website || 'https://acme.com',
    industry: selectedLead?.industry || 'Technology',
    city: selectedLead?.city || 'San Francisco',
    country: selectedLead?.country || 'United States',
    email: selectedLead?.email || 'contact@acme.com',
    custom_fields: {
      tier: 'Enterprise Tier-1',
      notes: 'Featured on TechCrunch',
    },
  };

  const previewSubject = interpolateTemplate(formSubject, leadContext, {
    randomizeSpintax,
    fallbackPlaceholder: '[Missing Field]',
  });

  const previewBody = interpolateTemplate(formBody, leadContext, {
    randomizeSpintax,
    fallbackPlaceholder: '[Missing Field]',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Message Template & AI Studio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Craft compliant outreach templates with deterministic Spintax, variable mapping, and optional non-deceptive AI personalization.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={handleStartCreateNew}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Template List (4 cols) */}
        <div className="space-y-3 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Templates ({templates.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {templates.map((tpl) => {
              const isSelected = !isCreatingNew && selectedTemplateId === tpl.id;
              return (
                <Card
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`cursor-pointer p-4 transition-all duration-150 ${
                    isSelected
                      ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/10'
                      : 'glass-panel hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white truncate max-w-[200px]">
                      {tpl.name}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {tpl.isSpintaxEnabled && (
                        <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                          Spintax
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(tpl.id);
                        }}
                        className="rounded p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground truncate font-mono">
                    {tpl.subjectTemplate}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {tpl.variables.slice(0, 4).map((v) => (
                      <span
                        key={v}
                        className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {tpl.variables.length > 4 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{tpl.variables.length - 4} more
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: Template Editor & AI Studio (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="glass-panel p-6 space-y-5">
            {/* Editor Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-primary" />
                  {isCreatingNew ? 'Create New Template' : `Edit Template: ${activeTemplate?.name}`}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Insert dynamic variables or enable AI personalization.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handleSave}>
                  {saveSuccess ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-emerald-400" /> Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1.5" /> Save Template
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* AI Personalization Option Block (Prompt 16) */}
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bot className="h-5 w-5 text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      AI Message Personalization (Optional)
                      <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 font-normal">
                        Provider: {process.env.NEXT_PUBLIC_AI_PROVIDER || 'None / Offline Fallback'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300">
                      Uses minimal public company info. Truthfulness enforced: no deceptive claims or fake facts.
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isAiEnabled}
                  onChange={(e) => setIsAiEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                />
              </div>

              {isAiEnabled && (
                <div className="space-y-3 pt-2 border-t border-indigo-500/20">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                        Campaign Prompt Guidance
                      </label>
                      <input
                        type="text"
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value)}
                        placeholder="e.g. Focus on B2B partnership, courteous tone"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                        Max Length ({aiMaxWords} words)
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="250"
                        step="10"
                        value={aiMaxWords}
                        onChange={(e) => setAiMaxWords(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isGeneratingAi}
                      onClick={handleGenerateAiMessage}
                      className="bg-indigo-600 hover:bg-indigo-500"
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      {aiGeneratedDraft ? 'Re-generate AI Variant' : 'Generate Personalized Draft'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Template Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Template Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Partnership Cold Inquiry v3"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>

            {/* Variable Insertion Toolbar */}
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Click to Insert Variable:</span>
                <span className="text-[11px] text-muted-foreground">Inserts into message body</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STANDARD_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleInsertVariable(v)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-primary hover:bg-primary/15 hover:border-primary/40 transition-all active:scale-95"
                  >
                    + {`{{${v}}}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleInsertVariable('custom.notes')}
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-xs font-mono text-indigo-400 hover:bg-indigo-500/20 transition-all"
                >
                  + {'{{custom.field}}'}
                </button>
              </div>
            </div>

            {/* Unknown Variable Warnings */}
            {allUnknownVariables.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Unknown Variables Detected: </span>
                  {allUnknownVariables.map((uv) => (
                    <span
                      key={uv}
                      className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 font-mono font-bold"
                    >
                      {`{{${uv}}}`}
                    </span>
                  ))}
                  <p className="mt-1 text-[11px] text-amber-300/80">
                    Unknown variables will not be replaced unless mapped to a custom CSV column.
                  </p>
                </div>
              </div>
            )}

            {/* Subject Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Subject Line Template (Editable)
              </label>
              <input
                ref={subjectInputRef}
                type="text"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="e.g. Inquiry regarding {{company_name}}"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>

            {/* Message Body (Editable) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Message Body (Manual Editing Supported)
                </label>
                <span className="text-[11px] text-slate-400">
                  Supports Spintax syntax: <code className="text-primary">{'{Hi|Hello|Dear}'}</code>
                </span>
              </div>
              <textarea
                ref={bodyInputRef}
                rows={8}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Hi {{first_name}},\n\nI came across {{company_name}}..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 p-4 text-xs font-mono leading-relaxed text-white focus:border-primary focus:outline-none"
              />
            </div>

            {/* Compliance Footer */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Anti-Spam Compliance Footer (Mandatory Physical Address & Opt-Out)
              </label>
              <input
                type="text"
                value={formFooter}
                onChange={(e) => setFormFooter(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-primary focus:outline-none font-mono"
              />
            </div>
          </Card>

          {/* Live Preview with Real Lead Data */}
          <Card className="glass-panel p-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-white">Live Rendered Preview</h3>
              </div>

              <div className="flex items-center gap-3">
                {/* Real Lead Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Sample Lead:</span>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-white focus:border-primary focus:outline-none"
                  >
                    {mockLeads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName} ({lead.companyName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Spintax Randomizer Button */}
                <button
                  type="button"
                  onClick={() => setRandomizeSpintax(!randomizeSpintax)}
                  className="rounded-md border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
                  title="Re-roll Spintax Variant"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Preview Output Box */}
            <div className="rounded-xl border border-primary/20 bg-slate-950 p-5 space-y-3 shadow-inner">
              <div className="space-y-1">
                <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                  Subject Line:
                </span>
                <p className="text-sm font-semibold text-white">{previewSubject}</p>
              </div>

              <div className="h-px bg-slate-900" />

              <div className="space-y-1">
                <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
                  Message Body:
                </span>
                <p className="text-xs font-mono text-slate-200 whitespace-pre-line leading-relaxed">
                  {previewBody}
                </p>
              </div>

              <div className="h-px bg-slate-900" />

              <p className="text-[11px] text-slate-500 font-mono pt-1">{formFooter}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
