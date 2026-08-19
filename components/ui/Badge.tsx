import React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  HelpCircle,
  Ban,
  Radio,
  PauseCircle,
  PlayCircle,
  StopCircle,
} from 'lucide-react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';
  status?: string;
}

export function Badge({ children, variant, status, className, ...props }: BadgeProps) {
  let badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  let IconComponent: React.ElementType | null = null;

  if (status) {
    const s = status.toUpperCase();
    switch (s) {
      case 'SUCCESS':
      case 'SUBMITTED':
      case 'COMPLETED':
        badgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        IconComponent = CheckCircle2;
        break;

      case 'DRY_RUN_SUCCESS':
      case 'DRY_RUN_COMPLETED':
      case 'TEST_MODE_PREVIEW_SUCCESS':
        badgeStyle = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
        IconComponent = CheckCircle2;
        break;

      case 'PROCESSING':
      case 'RUNNING':
      case 'ACTIVE':
        badgeStyle = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
        IconComponent = Radio;
        break;

      case 'READY':
        badgeStyle = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
        IconComponent = PlayCircle;
        break;

      case 'PAUSED':
        badgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        IconComponent = PauseCircle;
        break;

      case 'REVIEW_REQUIRED':
      case 'REVIEW_LATER':
        badgeStyle = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
        IconComponent = AlertTriangle;
        break;

      case 'CAPTCHA':
      case 'CAPTCHA_TRIGGERED':
        badgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        IconComponent = ShieldAlert;
        break;

      case 'BLOCKED':
      case 'BLOCKED_403_429':
        badgeStyle = 'bg-red-500/15 text-red-400 border-red-500/30';
        IconComponent = Ban;
        break;

      case 'FAILED':
      case 'NAVIGATION_FAILED':
        badgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
        IconComponent = XCircle;
        break;

      case 'NO_CONTACT_PAGE':
      case 'NO_FORM':
      case 'TIMEOUT':
        badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700/80';
        IconComponent = HelpCircle;
        break;

      case 'PENDING':
      case 'WAITING':
      case 'QUEUED':
      case 'DRAFT':
        badgeStyle = 'bg-slate-700/40 text-slate-300 border-slate-600/40';
        IconComponent = Clock;
        break;

      case 'CANCELLED':
        badgeStyle = 'bg-slate-800/80 text-slate-500 border-slate-700';
        IconComponent = StopCircle;
        break;

      default:
        badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
        break;
    }
  } else if (variant) {
    switch (variant) {
      case 'success':
        badgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        IconComponent = CheckCircle2;
        break;
      case 'warning':
        badgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        IconComponent = AlertTriangle;
        break;
      case 'danger':
        badgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
        IconComponent = XCircle;
        break;
      case 'info':
        badgeStyle = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
        break;
      case 'purple':
        badgeStyle = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
        break;
      case 'outline':
        badgeStyle = 'bg-transparent text-slate-300 border-slate-700';
        break;
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm transition-all',
        badgeStyle,
        className
      )}
      {...props}
    >
      {IconComponent && <IconComponent className="h-3 w-3 shrink-0" />}
      <span>{children || status}</span>
    </span>
  );
}
