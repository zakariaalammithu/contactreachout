'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { UserMessageTemplate } from '@/lib/services/message-template-service';
import { convertHtmlToEditableText, convertPlainTextToHtml } from '@/lib/services/template-engine';

interface EditTemplateModalProps {
  isOpen: boolean;
  template: UserMessageTemplate | null;
  onClose: () => void;
  onSave: (id: string, data: { name: string; subject: string; body: string; category: 'initial' | 'followup' | 'general' }) => void;
}

export function EditTemplateModal({
  isOpen,
  template,
  onClose,
  onSave,
}: EditTemplateModalProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<'initial' | 'followup' | 'general'>('general');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && template) {
      setName(template.name || '');
      setSubject(template.subject || '');
      // The textarea holds plain text, never raw editor HTML: an HTML body is
      // converted for display (blank lines and signature lines intact, in the
      // exact shape the user typed), and the submit handler converts it back.
      // Storing the textarea value raw was the bug: loading it as innerHTML
      // collapsed every newline and joined the message to its signature.
      setBody(convertHtmlToEditableText(template.body || ''));
      setCategory(template.category || 'general');
      setError('');
    }
  }, [isOpen, template]);

  if (!isOpen || !template) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template Name is required.');
      return;
    }
    const cleanBodyText = body ? body.replace(/<[^>]*>/g, '').trim() : '';
    if (!cleanBodyText && !body.trim()) {
      setError('Message body is required.');
      return;
    }

    onSave(template.id, {
      name: name.trim(),
      subject: subject.trim(),
      body: convertPlainTextToHtml(body),
      category,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-950 p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Edit Message Template</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Update details for &quot;{template.name}&quot;
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-400 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-900 bg-red-950 p-3 text-xs font-semibold text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-200">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-zinc-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-200">
                Category Filter
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="general">General / Any Step</option>
                <option value="initial">Initial Message</option>
                <option value="followup">Follow-up Message</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-200">
                Optional Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Optional Subject"
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-100 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-200">
              Message Content <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-4 py-2 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#0e6de4] hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold cursor-pointer"
            >
              <Save className="mr-1.5 h-4 w-4" />
              Update Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
