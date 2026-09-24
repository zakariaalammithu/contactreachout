'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DeleteTemplateModalProps {
  isOpen: boolean;
  templateName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteTemplateModal({
  isOpen,
  templateName,
  onClose,
  onConfirm,
}: DeleteTemplateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900">
              Delete &quot;{templateName}&quot;?
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              This template will be removed from your saved templates library.
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2">
              Note: Existing campaign messages and sent outreach history using this template will not be affected.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold cursor-pointer"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
