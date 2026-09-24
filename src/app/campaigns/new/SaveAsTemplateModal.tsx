'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialBody?: string;
  initialCategory?: 'initial' | 'followup' | 'general';
  onSave: (data: {
    name: string;
    subject: string;
    body: string;
    category: 'initial' | 'followup' | 'general';
  }) => void;
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  initialSubject = '',
  initialBody = '',
  initialCategory = 'general',
  onSave,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [category, setCategory] = useState<'initial' | 'followup' | 'general'>(initialCategory);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSubject(initialSubject);
      setBody(initialBody);
      setCategory(initialCategory);
      setError('');
    }
  }, [isOpen, initialSubject, initialBody, initialCategory]);

  if (!isOpen) return null;

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

    onSave({
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
            <h3 className="text-lg font-bold text-slate-900">Save Message Template</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Save message content to reuse across initial and follow-up outreach steps.
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
              placeholder="e.g., Partnership Outreach, Follow-up General"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
              autoFocus
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
                placeholder="Partnership Inquiry"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800">
              Message Content <span className="text-red-500">*</span>
            </label>
            <div
              className="mt-1.5 max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 leading-relaxed font-mono"
            >
              {body ? (
                <div dangerouslySetInnerHTML={{ __html: body }} />
              ) : (
                <span className="text-slate-400 italic">No message content in editor</span>
              )}
            </div>
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
              Save Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
