'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { UserMessageTemplate } from '@/lib/services/message-template-service';

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
      setBody(template.body || '');
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
      body: body,
      category,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Edit Message Template</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update details for &quot;{template.name}&quot;
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800">
                Category Filter
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="general">General / Any Step</option>
                <option value="initial">Initial Message</option>
                <option value="followup">Follow-up Message</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800">
                Optional Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Optional Subject"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800">
              Message HTML / Content <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
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
