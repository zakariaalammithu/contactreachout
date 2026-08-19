import React from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  colorVariant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'slate';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  colorVariant = 'blue',
}: StatCardProps) {
  const colorMap = {
    blue: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    rose: 'text-rose-700 bg-rose-50 border-rose-100',
    purple: 'text-purple-700 bg-purple-50 border-purple-100',
    cyan: 'text-cyan-700 bg-cyan-50 border-cyan-100',
    slate: 'text-slate-700 bg-slate-100 border-slate-200',
  };

  return (
    <Card className="glass-panel-interactive p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</h3>
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', colorMap[colorVariant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                'font-bold',
                trendDirection === 'up'
                  ? 'text-emerald-600'
                  : trendDirection === 'down'
                  ? 'text-rose-600'
                  : 'text-slate-500'
              )}
            >
              {trend}
            </span>
          )}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
