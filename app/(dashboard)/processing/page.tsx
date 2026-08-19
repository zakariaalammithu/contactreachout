'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Play,
  Pause,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  StopCircle,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockProcessingJobs } from '@/lib/store/mock-data';

export default function ProcessingQueuePage() {
  const [jobs, setJobs] = useState(mockProcessingJobs);
  const [isPaused, setIsPaused] = useState(false);
  const [concurrency, setConcurrency] = useState(3);
  const [stats, setStats] = useState({
    queued: 145,
    processing: 2,
    completed: 894,
    failed: 18,
    reviewRequired: 43,
  });

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleCancelAll = () => {
    if (confirm('Are you sure you want to cancel all pending and queued jobs for this campaign?')) {
      setStats((prev) => ({ ...prev, queued: 0 }));
      alert('All pending jobs in the queue have been cancelled.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Queue Level Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">BullMQ Worker Processing Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Distributed job telemetry, concurrency throttling, exponential backoff, and campaign lifecycle controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dynamic Concurrency Control */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            <Sliders className="h-3.5 w-3.5 text-primary" />
            <span>Concurrency:</span>
            <select
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="bg-transparent font-bold text-white focus:outline-none"
            >
              <option value="1">1 Thread</option>
              <option value="2">2 Threads</option>
              <option value="3">3 Threads (Default)</option>
              <option value="5">5 Threads</option>
              <option value="10">10 Threads</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={handleTogglePause}>
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-1.5 text-emerald-400" /> Resume Queue
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-1.5 text-amber-400" /> Pause Queue
              </>
            )}
          </Button>

          <Button variant="secondary" size="sm" onClick={handleCancelAll} className="text-rose-400 hover:text-rose-300">
            <StopCircle className="h-4 w-4 mr-1.5" /> Cancel Queue
          </Button>
        </div>
      </div>

      {/* Dashboard Statistics Grid (Prompt 13 Requirements) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="glass-panel p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Queued</p>
          <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" /> {stats.queued}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1 block">Awaiting execution</span>
        </Card>

        <Card className="glass-panel p-4 border-cyan-500/30 bg-cyan-950/20">
          <p className="text-xs text-cyan-400 uppercase font-semibold">Processing</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            {isPaused ? 0 : stats.processing}
          </p>
          <span className="text-[10px] text-cyan-300/80 mt-1 block">{concurrency} workers active</span>
        </Card>

        <Card className="glass-panel p-4">
          <p className="text-xs text-emerald-400 uppercase font-semibold">Completed</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> {stats.completed}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">100% Verified</span>
        </Card>

        <Card className="glass-panel p-4">
          <p className="text-xs text-rose-400 uppercase font-semibold">Failed (Retryable)</p>
          <p className="text-2xl font-bold text-rose-400 mt-1 flex items-center gap-1.5">
            <XCircle className="h-4 w-4" /> {stats.failed}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Max 3 retries</span>
        </Card>

        <Card className="glass-panel p-4">
          <p className="text-xs text-amber-400 uppercase font-semibold">Review Required</p>
          <p className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> {stats.reviewRequired}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">CAPTCHA / Low score</span>
        </Card>
      </div>

      {/* Active Jobs Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Headless Playwright Contexts
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Status: {isPaused ? <span className="text-amber-400 font-bold">PAUSED</span> : <span className="text-emerald-400 font-bold">ACTIVE</span>}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="glass-panel p-5 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{job.companyName}</h4>
                      <Badge status={job.status} />
                      {job.isDryRun && (
                        <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                          Dry-Run
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {job.website} • Campaign: {job.campaignName}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-muted-foreground font-mono">
                  Duration: {(job.durationMs / 1000).toFixed(1)}s
                </div>
              </div>

              {/* Progress Bar & Current Phase */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    Current Phase:{' '}
                    <span className="text-primary font-mono">{job.currentStep}</span>
                  </span>
                  <span className="text-muted-foreground">{job.progressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-primary transition-all duration-300"
                    style={{ width: `${job.progressPercent}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
