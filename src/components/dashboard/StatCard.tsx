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
    blue: 'text-blue-400 bg-blue-950 border-blue-900',
    emerald: 'text-emerald-300 bg-emerald-950 border-emerald-900',
    amber: 'text-amber-300 bg-amber-950 border-amber-900',
    rose: 'text-rose-300 bg-rose-950 border-rose-900',
    purple: 'text-blue-400 bg-blue-950 border-blue-900',
    cyan: 'text-blue-400 bg-blue-950 border-blue-900',
    slate: 'text-zinc-300 bg-zinc-900 border-zinc-800',
  };

  return (
    <Card className="glass-panel-interactive p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{title}</p>
          <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-100">{value}</h3>
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
                  ? 'text-emerald-400'
                  : trendDirection === 'down'
                  ? 'text-rose-400'
                  : 'text-zinc-400'
              )}
            >
              {trend}
            </span>
          )}
          {subtitle && <span className="text-zinc-400">{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
