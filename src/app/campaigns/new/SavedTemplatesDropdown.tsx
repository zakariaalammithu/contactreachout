'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  ChevronDown,
  FileText,
  Clock,
  Tag,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { UserMessageTemplate } from '@/lib/services/message-template-service';

interface SavedTemplatesDropdownProps {
  templates: UserMessageTemplate[];
  onUseTemplate: (template: UserMessageTemplate) => void;
  onEditTemplate: (template: UserMessageTemplate) => void;
  onDuplicateTemplate: (id: string) => void;
  onDeleteTemplate: (template: UserMessageTemplate) => void;
  onCreateNewTemplate: () => void;
  activeSequenceType?: 'initial' | 'followup';
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return '';
  }
}

export function SavedTemplatesDropdown({
  templates,
  onUseTemplate,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onCreateNewTemplate,
  activeSequenceType = 'initial',
}: SavedTemplatesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'initial' | 'followup'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      // Category filter
      if (categoryFilter === 'initial' && tpl.category !== 'initial' && tpl.category !== 'general') {
        return false;
      }
      if (categoryFilter === 'followup' && tpl.category !== 'followup' && tpl.category !== 'general') {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (tpl.name || '').toLowerCase().includes(q);
      const subjectMatch = (tpl.subject || '').toLowerCase().includes(q);
      const bodyText = stripHtml(tpl.body || '').toLowerCase();
      const bodyMatch = bodyText.includes(q);

      return nameMatch || subjectMatch || bodyMatch;
    });
  }, [templates, searchQuery, categoryFilter]);

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-xs font-semibold cursor-pointer gap-1.5 text-slate-700 hover:text-slate-900 border-slate-300"
      >
        <FileText className="h-3.5 w-3.5 text-[#0e6de4]" />
        <span>Saved Templates</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-10 z-40 w-[340px] sm:w-[400px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Saved Message Templates
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0e6de4]">
                  {templates.length}
                </span>
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="mt-3 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-[#0e6de4] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('initial')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  categoryFilter === 'initial'
                    ? 'bg-[#0e6de4] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Initial Message
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('followup')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  categoryFilter === 'followup'
                    ? 'bg-[#0e6de4] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Follow-up
              </button>
            </div>
          </div>

          {/* Templates List */}
          <div className="mt-2 max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                {templates.length === 0 ? (
                  <>
                    <p className="text-xs font-bold text-slate-800">No saved message templates yet.</p>
                    <p className="mt-1 text-[11px] text-slate-500 max-w-[240px] mx-auto">
                      Save a message as a template to reuse it in future campaigns.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onCreateNewTemplate();
                      }}
                      className="mt-3 bg-[#0e6de4] hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Create Template
                    </Button>
                  </>
                ) : (
                  <p className="text-xs font-medium text-slate-500">No templates match &quot;{searchQuery}&quot;</p>
                )}
              </div>
            ) : (
              filteredTemplates.map((tpl) => {
                const previewSnippet = stripHtml(tpl.body || '');
                return (
                  <div
                    key={tpl.id}
                    className="group rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-xs font-bold text-slate-900 truncate">{tpl.name}</h5>
                          {tpl.category !== 'general' && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 uppercase">
                              {tpl.category === 'initial' ? 'Initial' : 'Follow-up'}
                            </span>
                          )}
                        </div>

                        {tpl.subject && (
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-700 truncate">
                            <span className="text-slate-400 font-normal">Subject:</span> {tpl.subject}
                          </p>
                        )}

                        <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          &quot;{previewSnippet}&quot;
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                          {tpl.updatedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(tpl.updatedAt)}
                            </span>
                          )}
                          {tpl.usageCount !== undefined && tpl.usageCount > 0 && (
                            <span>Used {tpl.usageCount}x</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit Template"
                          onClick={() => onEditTemplate(tpl)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Duplicate Template"
                          onClick={() => onDuplicateTemplate(tpl.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete Template"
                          onClick={() => onDeleteTemplate(tpl)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onUseTemplate(tpl);
                        }}
                        className="bg-[#0e6de4] hover:bg-blue-700 text-white px-3 py-1 text-[11px] font-bold rounded-lg cursor-pointer"
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
