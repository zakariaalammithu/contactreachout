'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AdminQueuePage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/system/queue');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setActionErrorMessage(json.error || 'Failed to fetch queue statistics.');
      }
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Error connecting to queue service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleQueueAction = async (action: string, confirmPrompt?: string) => {
    if (confirmPrompt && !window.confirm(confirmPrompt)) {
      return;
    }

    try {
      setIsProcessingAction(true);
      setActionSuccessMessage(null);
      setActionErrorMessage(null);

      const res = await fetch('/api/admin/system/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setActionSuccessMessage(json.message);
        fetchQueue();
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } else {
        setActionErrorMessage(json.error || 'Failed to process queue action.');
      }
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Error executing queue control command.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const metrics = data?.metrics || {};
  const isPaused = Boolean(data?.isPaused);
  const brokerStatus = data?.brokerStatus || (isLoading ? 'CHECKING' : 'ONLINE');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0e6de4]">
              <Layers className="h-5 w-5" />
            </div>
            <span>Redis BullMQ Queue & Worker Controls</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor distributed BullMQ worker pools, throttle concurrency, and control live queue execution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            disabled={isLoading}
            className="font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4] animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4]" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success Alert */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {actionErrorMessage && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-800 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{actionErrorMessage}</span>
        </div>
      )}

      {/* 4 Telemetry Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 space-y-1.5 border-slate-200 bg-white shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Workers</span>
          <div className="text-2xl font-black text-[#0e6de4]">{isLoading ? '...' : metrics.active || 0}</div>
          <p className="text-[10px] text-slate-500 font-mono">Concurrency: {data?.workerConcurrency || 5} threads</p>
        </Card>

        <Card className="p-4 space-y-1.5 border-slate-200 bg-white shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Waiting in Queue</span>
          <div className="text-2xl font-black text-slate-900">{isLoading ? '...' : metrics.waiting || 0}</div>
          <p className="text-[10px] text-slate-500 font-mono">Paced with 3s inter-delay</p>
        </Card>

        <Card className="p-4 space-y-1.5 border-slate-200 bg-white shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed Jobs</span>
          <div className="text-2xl font-black text-emerald-600">{isLoading ? '...' : (metrics.completed || 0).toLocaleString()}</div>
          <p className="text-[10px] text-emerald-700 font-mono font-semibold">Audited & Verified</p>
        </Card>

        <Card className="p-4 space-y-1.5 border-slate-200 bg-white shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Failed / Retried</span>
          <div className="text-2xl font-black text-rose-600">{isLoading ? '...' : metrics.failed || 0}</div>
          <p className="text-[10px] text-rose-700 font-mono font-semibold">Max 2 retries cap</p>
        </Card>
      </div>

      {/* Admin Action Controls Card */}
      <Card className="p-6 space-y-4 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Super Admin Queue Governance Controls</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control worker dispatch state across all campaign queues.</p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border shrink-0 ${
              isPaused
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : brokerStatus === 'ONLINE'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            BROKER: {brokerStatus}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={isProcessingAction || isPaused}
            onClick={() =>
              handleQueueAction(
                'pause_queue',
                'Are you sure you want to pause all queue dispatchers? Ongoing campaign submissions will be held until resumed.'
              )
            }
            className="font-bold text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
          >
            <Pause className="h-3.5 w-3.5 mr-1.5" />
            Pause All Queue Dispatchers
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isProcessingAction || !isPaused}
            onClick={() => handleQueueAction('resume_queue')}
            className="font-bold bg-[#0e6de4] hover:bg-[#0c5bc2] text-white disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Resume Queue Processing
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isProcessingAction}
            onClick={() =>
              handleQueueAction(
                'retry_failed_jobs',
                'Re-queue all failed jobs for exponential retry? Existing idempotency checks will prevent duplicate credit deductions.'
              )
            }
            className="font-bold border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-[#0e6de4]" />
            Re-queue Failed Jobs
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={isProcessingAction}
            onClick={() =>
              handleQueueAction(
                'clear_completed',
                'Are you sure you want to clear completed job history from active telemetry? Active, pending, and failed jobs will remain unaffected.'
              )
            }
            className="font-bold text-slate-600 hover:text-rose-600 hover:bg-slate-100 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear Completed Telemetry
          </Button>
        </div>
      </Card>

      {/* Registered Job Schemas Card */}
      <Card className="p-6 space-y-3 border-slate-200 bg-white shadow-xs">
        <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm border-b border-slate-100 pb-2">
          <ShieldCheck className="h-4 w-4 text-[#0e6de4]" />
          <span>6 Registered BullMQ Worker Job Types</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
          {[
            { name: '1. discover_contact_page', desc: 'SSRF-protected anchor scoring & probing' },
            { name: '2. detect_contact_form', desc: 'Semantic classifier & honeypot isolation' },
            { name: '3. map_form_fields', desc: 'Composite name & threshold mapping' },
            { name: '4. generate_preview', desc: 'Spintax & AI personalization preview' },
            { name: '5. submit_contact_form', desc: '14-point check & mode gated submit' },
            { name: '6. verify_submission', desc: 'Post-submission proof screenshot & audit' },
          ].map((j) => (
            <div key={j.name} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 font-mono text-xs">
              <p className="font-bold text-[#0e6de4]">{j.name}</p>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">{j.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
