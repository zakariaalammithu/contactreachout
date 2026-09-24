'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles, X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AIUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIUpgradeModal({ isOpen, onClose }: AIUpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0e6de4]">
            <Sparkles className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              AI Personalization is a paid feature.
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Upgrade your plan to personalize website contact-form messages with AI.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 space-y-2 text-xs">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#0e6de4]" />
            What&apos;s included in paid plans:
          </p>
          <ul className="space-y-1.5 text-slate-600 pl-5 list-disc font-medium">
            <li>AI-powered message personalization per prospect</li>
            <li>Custom instructions & tone controls</li>
            <li>Use ContactReachout AI or your own OpenAI API key</li>
            <li>0 credits consumed for AI personalization</li>
          </ul>
        </div>

        <div className="mt-7 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold cursor-pointer border-slate-300"
          >
            Cancel
          </Button>

          <Link href="/pricing">
            <Button
              type="button"
              className="bg-[#0e6de4] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 cursor-pointer flex items-center gap-1"
            >
              <span>View Plans</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
