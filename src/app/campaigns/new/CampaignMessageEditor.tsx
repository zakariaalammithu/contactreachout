'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Bookmark, Bot, Code, Eye,
  Italic, Link as LinkIcon, List, ListOrdered, Loader2, Save, Sparkles, Underline, Undo2, Redo2, Lock, ArrowUpRight, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { interpolateTemplate } from '@/lib/services/template-engine';
import type { CampaignSequenceStep, Lead } from '@/types';

import { SavedTemplatesDropdown } from './SavedTemplatesDropdown';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import { EditTemplateModal } from './EditTemplateModal';
import { DeleteTemplateModal } from './DeleteTemplateModal';
import { AIUpgradeModal } from '@/components/ui/AIUpgradeModal';
import {
  getUserTemplates,
  saveUserTemplate,
  updateUserTemplate,
  duplicateUserTemplate,
  deleteUserTemplate,
  recordTemplateUsage,
  getCurrentUserEmail,
  UserMessageTemplate,
} from '@/lib/services/message-template-service';

interface CampaignMessageEditorProps {
  sequence: CampaignSequenceStep & { replyInThread?: boolean };
  onSequenceChange: React.Dispatch<React.SetStateAction<CampaignSequenceStep>>;
  sequenceDate: string;
  sequenceIndex: number;
  sequenceName: string;
  previousSubject?: string;
  onTimingChange: (amount: number, unit: 'days' | 'weeks') => void;
  onSequenceDateChange: (date: string) => void;
  onReplyInThreadChange: (enabled: boolean) => void;
  selectedLeads: Lead[];
  aiPersonalizationEnabled: boolean;
  onAiPersonalizationEnabledChange: (value: boolean) => void;
  aiInstructions: string;
  onAiInstructionsChange: (value: string) => void;
  aiPreview?: { subject: string; body: string; provider: string; isAiGenerated: boolean; companyName: string };
  isGeneratingPreview: boolean;
  onGeneratePreview: () => void;
  editId: string | null;
}

const leadInformationOptions = [
  'First Name',
  'Last Name',
  'Full Name',
  'Company',
  'Industry',
  'Country',
  'City',
  'State',
  'Website',
  'Phone',
  'Job Position',
  'Location',
  'Personal LinkedIn',
  'Company LinkedIn',
  'Company Size',
];

const leadInformationTokens: Record<string, string> = {
  'First Name': 'FIRST_NAME',
  'Last Name': 'LAST_NAME',
  'Full Name': 'FULL_NAME',
  Company: 'COMPANY',
  Industry: 'INDUSTRY',
  Country: 'COUNTRY',
  City: 'CITY',
  State: 'STATE',
  Website: 'WEBSITE',
  Phone: 'PHONE',
  'Job Position': 'JOB_POSITION',
  Location: 'LOCATION',
  'Personal LinkedIn': 'PERSONAL_LINKEDIN',
  'Company LinkedIn': 'COMPANY_LINKEDIN',
  'Company Size': 'COMPANY_SIZE',
};

const customFieldOptions = [
  'Custom 1',
  'Custom 2',
  'Custom 3',
  'Custom 4',
  'Custom 5',
  'Custom 6',
  'Custom 7',
  'Custom 8',
  'Custom 9',
  'Custom 10',
];

const customFieldTokens: Record<string, string> = {
  'Custom 1': 'CUSTOM_1',
  'Custom 2': 'CUSTOM_2',
  'Custom 3': 'CUSTOM_3',
  'Custom 4': 'CUSTOM_4',
  'Custom 5': 'CUSTOM_5',
  'Custom 6': 'CUSTOM_6',
  'Custom 7': 'CUSTOM_7',
  'Custom 8': 'CUSTOM_8',
  'Custom 9': 'CUSTOM_9',
  'Custom 10': 'CUSTOM_10',
};

export function CampaignMessageEditor({
  sequence, onSequenceChange, sequenceDate, sequenceIndex, sequenceName, previousSubject = '', onTimingChange, onSequenceDateChange, onReplyInThreadChange, selectedLeads, aiPersonalizationEnabled, onAiPersonalizationEnabledChange,
  aiInstructions, onAiInstructionsChange, aiPreview, isGeneratingPreview, onGeneratePreview, editId,
}: CampaignMessageEditorProps) {
  const [variableMenuTarget, setVariableMenuTarget] = useState<'subject' | 'body' | null>(null);
  const [spinMenuTarget, setSpinMenuTarget] = useState<'subject' | 'body' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLeadIndex, setPreviewLeadIndex] = useState(0);
  const [bodySourceMode, setBodySourceMode] = useState(false);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const sampleLead = selectedLeads[previewLeadIndex] || selectedLeads[0];
  const timingAmount = sequence.delayUnit === 'weeks' ? sequence.delayDays / 7 : sequence.delayDays;

  // Saved Templates States
  const currentUserEmail = useMemo(() => getCurrentUserEmail(), []);
  const [templates, setTemplates] = useState<UserMessageTemplate[]>([]);
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<UserMessageTemplate | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<UserMessageTemplate | null>(null);

  // AI Access Control States
  const [isPaidPlan, setIsPaidPlan] = useState(false);
  const [providerChoice, setProviderChoice] = useState<'contactreachout' | 'user_openai'>('contactreachout');
  const [aiUpgradeModalOpen, setAiUpgradeModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/user/ai-settings')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setIsPaidPlan(Boolean(data.isPaidPlan));
          if (data.providerChoice) setProviderChoice(data.providerChoice);
        }
      })
      .catch(() => {});
  }, []);

  const refreshTemplates = () => {
    setTemplates(getUserTemplates(currentUserEmail));
  };

  useEffect(() => {
    refreshTemplates();
  }, [currentUserEmail]);

  const handleUseTemplate = (template: UserMessageTemplate) => {
    recordTemplateUsage(template.id, currentUserEmail);

    onSequenceChange((current) => ({
      ...current,
      subject: template.subject !== undefined && template.subject !== null ? template.subject : current.subject,
      body: template.body || '',
    }));

    if (bodyEditorRef.current) {
      bodyEditorRef.current.innerHTML = template.body || '';
    }
    refreshTemplates();
  };

  const handleSaveNewTemplate = (data: {
    name: string;
    subject: string;
    body: string;
    category: 'initial' | 'followup' | 'general';
  }) => {
    saveUserTemplate(data, currentUserEmail);
    refreshTemplates();
  };

  const handleSaveEditTemplate = (
    id: string,
    data: {
      name: string;
      subject: string;
      body: string;
      category: 'initial' | 'followup' | 'general';
    }
  ) => {
    updateUserTemplate(id, data, currentUserEmail);
    refreshTemplates();
    setTemplateToEdit(null);
  };

  const handleDuplicateTemplate = (id: string) => {
    duplicateUserTemplate(id, currentUserEmail);
    refreshTemplates();
  };

  const handleConfirmDeleteTemplate = () => {
    if (templateToDelete) {
      deleteUserTemplate(templateToDelete.id, currentUserEmail);
      refreshTemplates();
      setTemplateToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const insertTemplateToken = (target: 'subject' | 'body', token: string) => {
    if (target === 'subject') {
      const input = subjectInputRef.current;
      const value = sequence.subject || '';
      const position = input?.selectionStart ?? value.length;
      const nextValue = `${value.slice(0, position)}${token}${value.slice(position)}`;
      onSequenceChange((current) => ({ ...current, subject: nextValue }));
      requestAnimationFrame(() => {
        input?.focus();
        input?.setSelectionRange(position + token.length, position + token.length);
      });
      return;
    }
    const editor = bodyEditorRef.current;
    editor?.focus();
    document.execCommand('insertText', false, token);
    onSequenceChange((current) => ({ ...current, body: editor?.innerHTML || '' }));
  };

  const executeFormat = (command: string, value?: string) => {
    if (bodySourceMode) return;
    const editor = bodyEditorRef.current;
    editor?.focus();
    document.execCommand(command, false, value);
    onSequenceChange((current) => ({ ...current, body: editor?.innerHTML || '' }));
  };

  useEffect(() => {
    if (bodySourceMode || !bodyEditorRef.current || document.activeElement === bodyEditorRef.current) return;
    bodyEditorRef.current.innerHTML = sequence.body || '';
  }, [sequence.id, bodySourceMode]);

  const previewContext = sampleLead ? (() => {
    const lead = sampleLead as any;
    const nestedSnake = lead.custom_fields || {};
    const nestedCamel = lead.customFields || {};
    const resolvedCustomFields = Object.fromEntries(Array.from({ length: 10 }, (_, index) => {
      const number = index + 1;
      const candidates = [
        lead[`custom_${number}`], lead[`custom${number}`], lead[`Custom ${number}`], lead[`CUSTOM_${number}`],
        nestedSnake[`custom_${number}`], nestedSnake[`custom${number}`], nestedSnake[`Custom ${number}`], nestedSnake[`CUSTOM_${number}`],
        nestedCamel[`custom_${number}`], nestedCamel[`custom${number}`], nestedCamel[`Custom ${number}`], nestedCamel[`CUSTOM_${number}`],
      ];
      const value = candidates.find((candidate) => candidate !== undefined && candidate !== null && String(candidate).trim() !== '');
      return [`custom_${number}`, value == null ? '' : String(value)];
    }));
    return { ...lead, custom_fields: { ...nestedSnake, ...nestedCamel, ...resolvedCustomFields } };
  })() : {};

  useEffect(() => {
    if (!sampleLead) return;
    console.info('[Campaign Preview] selected lead personalization data', JSON.stringify({
      leadId: (sampleLead as any).id,
      lead: sampleLead,
      customFields: (sampleLead as any).customFields,
      custom_fields: (sampleLead as any).custom_fields,
      resolvedCustomFields: (previewContext as any).custom_fields,
    }));
  }, [sampleLead]);

  const sanitizePreviewHtml = (html: string) => {
    const parsed = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
    parsed.querySelectorAll('script, style, iframe, object, embed').forEach((element) => element.remove());
    parsed.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const unsafeEvent = attribute.name.toLowerCase().startsWith('on');
        const unsafeLink = attribute.name.toLowerCase() === 'href' && attribute.value.trim().toLowerCase().startsWith('javascript:');
        if (unsafeEvent || unsafeLink) element.removeAttribute(attribute.name);
      });
    });
    return parsed.body.firstElementChild?.innerHTML || '';
  };
  const previewSubject = interpolateTemplate(sequence.subject || '', previewContext);
  const previewBodyHtml = sanitizePreviewHtml(interpolateTemplate(sequence.body || '', previewContext));

  const cleanPreviousSub = previousSubject ? previousSubject.replace(/^(?:re:\s*)+/i, '').trim() : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Message and personalization</h2>
          <p className="text-sm text-slate-500">Editing <span className="font-bold text-[#0e6de4]">{sequenceName}</span> · create the contact-form message, insert lead variables, and use supported variations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)} className="px-4 py-2.5"><Eye className="mr-2 h-4 w-4" />Preview & Test</Button>
          <Link href={editId ? `/ai-personalization?campaign=${editId}` : '/ai-personalization'} className="self-center text-sm font-black text-[#0e6de4]">AI Personalization →</Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
        {/* Sequence Control Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-slate-900">{sequenceName}</span>
            {sequenceIndex > 0 ? (
              <div className="flex flex-wrap items-center gap-2.5 border-l border-slate-200/80 pl-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={sequence.replyInThread ?? true}
                    onChange={(e) => onReplyInThreadChange(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0e6de4] focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Reply in Thread</span>
                </label>
                {sequence.replyInThread ?? true ? (
                  <span className="inline-flex items-center rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#0e6de4]">
                    Re: {cleanPreviousSub || 'previous message subject'}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                Initial Message Step
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sequenceIndex > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span>Send this message</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={timingAmount}
                  onChange={(e) => onTimingChange(Math.max(1, Number(e.target.value) || 1), sequence.delayUnit || 'days')}
                  className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-bold text-slate-900 outline-none focus:border-blue-500"
                />
                <select
                  value={sequence.delayUnit || 'days'}
                  onChange={(e) => onTimingChange(timingAmount, e.target.value as 'days' | 'weeks')}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </select>
                <span>after last message</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span className="hidden sm:inline">Date:</span>
              <input
                type="date"
                value={sequenceDate}
                onChange={(e) => onSequenceDateChange(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Optional Subject Section */}
        <div className="relative mt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-slate-900">Optional Subject</label>
                {sequenceIndex > 0 && sequence.replyInThread && cleanPreviousSub && (
                  <span className="text-xs text-slate-400 font-medium">
                    (Threaded to: &quot;{cleanPreviousSub}&quot;)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Used only when the target contact form provides a compatible Subject field.
              </p>
            </div>
            <div className="relative flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => { setVariableMenuTarget(variableMenuTarget === 'subject' ? null : 'subject'); setSpinMenuTarget(null); }} className="px-3 py-1.5 text-xs font-semibold cursor-pointer border-slate-300 text-slate-700 hover:text-slate-900">Personalize</Button>
              <Button type="button" variant="outline" onClick={() => { setSpinMenuTarget(spinMenuTarget === 'subject' ? null : 'subject'); setVariableMenuTarget(null); }} className="px-3 py-1.5 text-xs font-semibold cursor-pointer border-slate-300 text-slate-700 hover:text-slate-900">Variations</Button>
              {variableMenuTarget === 'subject' && (
                <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl text-left font-sans text-xs">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Lead Information
                  </p>
                  <div className="grid max-h-44 gap-0.5 overflow-y-auto pr-1">
                    {leadInformationOptions.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          insertTemplateToken('subject', `{{${leadInformationTokens[label]}}}`);
                          setVariableMenuTarget(null);
                        }}
                        className="rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#0e6de4] transition-colors cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Custom Fields
                    </p>
                    <div className="grid max-h-44 gap-0.5 overflow-y-auto pr-1">
                      {customFieldOptions.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            insertTemplateToken('subject', `{{${customFieldTokens[label]}}}`);
                            setVariableMenuTarget(null);
                          }}
                          className="rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#0e6de4] transition-colors cursor-pointer"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {spinMenuTarget === 'subject' && (
                <div className="absolute right-0 top-11 z-30 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="text-xs font-bold text-slate-900">Message Variations syntax</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Use the existing variation engine with two or more choices separated by a pipe.</p>
                  <code className="mt-2 block rounded-lg bg-slate-100 p-2 text-xs text-slate-700">{`{quick call|short note}`}</code>
                  <Button type="button" onClick={() => { insertTemplateToken('subject', '{quick call|short note}'); setSpinMenuTarget(null); }} className="mt-3 w-full px-3 py-2 text-xs cursor-pointer">Insert syntax</Button>
                </div>
              )}
            </div>
          </div>
          <input
            ref={subjectInputRef}
            value={sequence.subject}
            onChange={(event) => onSequenceChange((current) => ({ ...current, subject: event.target.value }))}
            placeholder={sequenceIndex > 0 && (sequence.replyInThread ?? true) ? `Re: ${cleanPreviousSub || 'Previous subject'}` : 'Partnership opportunity with {{COMPANY}}'}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 font-medium text-slate-900"
          />
        </div>

        {/* Message Section with Toolbar */}
        <div className="relative mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="text-sm font-bold text-slate-900">Message</label>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Missing lead fields use safe fallbacks (e.g. &quot;there&quot; for missing names) and are never invented.
              </p>
            </div>
            <div className="relative flex flex-wrap items-center gap-2">
              <SavedTemplatesDropdown
                templates={templates}
                onUseTemplate={handleUseTemplate}
                onEditTemplate={(tpl) => {
                  setTemplateToEdit(tpl);
                  setEditModalOpen(true);
                }}
                onDuplicateTemplate={handleDuplicateTemplate}
                onDeleteTemplate={(tpl) => {
                  setTemplateToDelete(tpl);
                  setDeleteModalOpen(true);
                }}
                onCreateNewTemplate={() => setSaveAsModalOpen(true)}
                activeSequenceType={sequenceIndex === 0 ? 'initial' : 'followup'}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveAsModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold cursor-pointer border-slate-300 text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#0e6de4]" />
                <span>Save as Template</span>
              </Button>
              <Button type="button" variant="outline" onMouseDown={(event) => event.preventDefault()} onClick={() => { setVariableMenuTarget(variableMenuTarget === 'body' ? null : 'body'); setSpinMenuTarget(null); }} className="px-3 py-1.5 text-xs font-semibold cursor-pointer border-slate-300 text-slate-700 hover:text-slate-900">Personalize</Button>
              <Button type="button" variant="outline" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSpinMenuTarget(spinMenuTarget === 'body' ? null : 'body'); setVariableMenuTarget(null); }} className="px-3 py-1.5 text-xs font-semibold cursor-pointer border-slate-300 text-slate-700 hover:text-slate-900">Variations</Button>

              {variableMenuTarget === 'body' && (
                <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl text-left font-sans text-xs">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Lead Information
                  </p>
                  <div className="grid max-h-44 gap-0.5 overflow-y-auto pr-1">
                    {leadInformationOptions.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          insertTemplateToken('body', `{{${leadInformationTokens[label]}}}`);
                          setVariableMenuTarget(null);
                        }}
                        className="rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#0e6de4] transition-colors cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Custom Fields
                    </p>
                    <div className="grid max-h-44 gap-0.5 overflow-y-auto pr-1">
                      {customFieldOptions.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            insertTemplateToken('body', `{{${customFieldTokens[label]}}}`);
                            setVariableMenuTarget(null);
                          }}
                          className="rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#0e6de4] transition-colors cursor-pointer"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {spinMenuTarget === 'body' && (
                <div className="absolute right-0 top-11 z-30 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="text-xs font-bold text-slate-900">Message Variations syntax</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Use the existing variation engine with two or more choices separated by a pipe.</p>
                  <code className="mt-2 block rounded-lg bg-slate-100 p-2 text-xs text-slate-700">{`{I reviewed|I was checking}`}</code>
                  <Button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { insertTemplateToken('body', '{I reviewed|I was checking}'); setSpinMenuTarget(null); }} className="mt-[#0e6de4] w-full px-3 py-2 text-xs cursor-pointer">Insert syntax</Button>
                </div>
              )}
            </div>
          </div>

          {bodySourceMode ? (
            <textarea rows={10} value={sequence.body} onChange={(event) => onSequenceChange((current) => ({ ...current, body: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-blue-500 text-slate-900" />
          ) : (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-300 focus-within:border-blue-500 bg-white">
              <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
                <button type="button" onClick={() => executeFormat('bold')} aria-label="Bold" className="rounded-lg p-2 hover:bg-white"><Bold className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('italic')} aria-label="Italic" className="rounded-lg p-2 hover:bg-white"><Italic className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('underline')} aria-label="Underline" className="rounded-lg p-2 hover:bg-white"><Underline className="h-4 w-4 text-slate-700" /></button>
                <span className="mx-1 h-5 w-px bg-slate-300" />
                <select onChange={(event) => executeFormat('formatBlock', event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800" defaultValue="p"><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="pre">Preformatted</option></select>
                <button type="button" onClick={() => executeFormat('insertUnorderedList')} aria-label="Bullet list" className="rounded-lg p-2 hover:bg-white"><List className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('insertOrderedList')} aria-label="Numbered list" className="rounded-lg p-2 hover:bg-white"><ListOrdered className="h-4 w-4 text-slate-700" /></button>
                <span className="mx-1 h-5 w-px bg-slate-300" />
                <button type="button" onClick={() => executeFormat('justifyLeft')} aria-label="Align left" className="rounded-lg p-2 hover:bg-white"><AlignLeft className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('justifyCenter')} aria-label="Align center" className="rounded-lg p-2 hover:bg-white"><AlignCenter className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('justifyRight')} aria-label="Align right" className="rounded-lg p-2 hover:bg-white"><AlignRight className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('justifyFull')} aria-label="Justify" className="rounded-lg p-2 hover:bg-white"><AlignJustify className="h-4 w-4 text-slate-700" /></button>
                <span className="mx-1 h-5 w-px bg-slate-300" />
                <button type="button" onClick={() => { const url = window.prompt('Link URL'); if (url) executeFormat('createLink', url); }} aria-label="Insert link" className="rounded-lg p-2 hover:bg-white"><LinkIcon className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('undo')} aria-label="Undo" className="rounded-lg p-2 hover:bg-white"><Undo2 className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('redo')} aria-label="Redo" className="rounded-lg p-2 hover:bg-white"><Redo2 className="h-4 w-4 text-slate-700" /></button>
                <button type="button" onClick={() => executeFormat('removeFormat')} className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-white">Clear</button>
                <button type="button" onClick={() => setBodySourceMode(true)} aria-label="Edit HTML source" className="ml-auto rounded-lg p-2 hover:bg-white"><Code className="h-4 w-4 text-slate-700" /></button>
              </div>
              <div ref={bodyEditorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Message body" onInput={() => onSequenceChange((current) => ({ ...current, body: bodyEditorRef.current?.innerHTML || '' }))} onBlur={() => onSequenceChange((current) => ({ ...current, body: bodyEditorRef.current?.innerHTML || '' }))} className="min-h-[260px] max-w-none px-4 py-3 text-sm leading-6 text-slate-800 outline-none" />
            </div>
          )}
          {bodySourceMode && <Button type="button" variant="outline" onClick={() => setBodySourceMode(false)} className="mt-2 px-3 py-2 text-xs"><Code className="mr-2 h-4 w-4" />Return to visual editor</Button>}
        </div>
      </div>

      {/* AI Personalization Container */}
      {!isPaidPlan ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-950">AI Personalization 🔒</h3>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">Available on paid plans</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">Upgrade your plan to personalize website contact-form messages with AI.</p>
              </div>
            </div>
            <Button type="button" onClick={() => setAiUpgradeModalOpen(true)} className="bg-[#0e6de4] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 cursor-pointer shrink-0">
              Upgrade Plan
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-6 w-6 text-[#0e6de4]" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-950">AI Personalization</h3>
                  <span className="rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-[#0e6de4]">
                    Provider: {providerChoice === 'user_openai' ? 'Your OpenAI API Key' : 'ContactReachout AI'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">Personalize the contact-form message using available prospect and company information.</p>
              </div>
            </div>
            <input type="checkbox" aria-label="Enable AI Personalization" checked={aiPersonalizationEnabled} onChange={(event) => onAiPersonalizationEnabledChange(event.target.checked)} className="mt-1 h-5 w-5 cursor-pointer" />
          </div>
          {aiPersonalizationEnabled && (
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-950">AI instructions<textarea rows={5} value={aiInstructions} onChange={(event) => onAiInstructionsChange(event.target.value)} className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 outline-none focus:border-blue-500 font-medium" /></label>
              <Button type="button" variant="outline" onClick={onGeneratePreview} disabled={isGeneratingPreview}>{isGeneratingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate preview for first prospect</Button>
              {aiPreview && <div className="rounded-xl border border-blue-200 bg-white p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-900">Preview for {aiPreview.companyName}</p><span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase text-[#0e6de4]">{aiPreview.isAiGenerated ? aiPreview.provider : 'Offline fallback'}</span></div><p className="text-sm font-semibold text-slate-800">{aiPreview.subject}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{aiPreview.body}</p></div>}
              <p className="text-xs text-slate-600">Approved per-prospect messages are stored on each lead and remain available to the existing template workflow through personalized fields.</p>
            </div>
          )}
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Preview & Test</h2>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-[#0e6de4]">Website Contact-Form Submission</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {sampleLead
                    ? `Sample prospect: ${[sampleLead.firstName, sampleLead.lastName].filter(Boolean).join(' ') || sampleLead.companyName || sampleLead.website} · The message below will be submitted through the prospect's website contact form.`
                    : 'Select prospects to preview actual lead values.'}
                </p>
                {selectedLeads.length > 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Switch Lead:</span>
                    <select
                      value={previewLeadIndex}
                      onChange={(e) => setPreviewLeadIndex(Number(e.target.value))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {selectedLeads.map((lead, idx) => (
                        <option key={lead.id || idx} value={idx}>
                          Lead #{idx + 1}: {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.companyName || lead.website}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)} className="px-4 py-2 cursor-pointer">Close</Button>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase text-slate-500">Optional Subject (if supported by target website form)</p><p className="mt-1 text-base font-bold text-slate-900">{previewSubject || 'No subject set'}</p></div>
            <div className="mt-4 rounded-2xl border border-slate-200 p-5"><p className="text-xs font-bold uppercase text-slate-500">Message (submitted to detected contact form message field)</p><div className="prose prose-slate mt-2 max-w-none text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: previewBodyHtml || '<p>No message</p>' }} /></div>
          </div>
        </div>
      )}

      {/* SAVE AS TEMPLATE MODAL */}
      <SaveAsTemplateModal
        isOpen={saveAsModalOpen}
        onClose={() => setSaveAsModalOpen(false)}
        initialSubject={sequence.subject || ''}
        initialBody={sequence.body || ''}
        initialCategory={sequenceIndex === 0 ? 'initial' : 'followup'}
        onSave={handleSaveNewTemplate}
      />

      {/* EDIT TEMPLATE MODAL */}
      <EditTemplateModal
        isOpen={editModalOpen}
        template={templateToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setTemplateToEdit(null);
        }}
        onSave={handleSaveEditTemplate}
      />

      {/* DELETE TEMPLATE CONFIRMATION MODAL */}
      <DeleteTemplateModal
        isOpen={deleteModalOpen}
        templateName={templateToDelete?.name || ''}
        onClose={() => {
          setDeleteModalOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleConfirmDeleteTemplate}
      />

      {/* AI UPGRADE MODAL */}
      <AIUpgradeModal
        isOpen={aiUpgradeModalOpen}
        onClose={() => setAiUpgradeModalOpen(false)}
      />
    </div>
  );
}
