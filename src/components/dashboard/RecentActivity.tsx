import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { mockLeads } from '@/lib/store/mock-data';
import { formatDate } from '@/lib/utils';
import { Globe, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function RecentActivity() {
  return (
    <Card className="glass-panel col-span-1">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Recent Site Interactions</CardTitle>
          <CardDescription className="text-xs">Live stream of target domain executions</CardDescription>
        </div>
        <Link href="/results" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3.5">
          {mockLeads.slice(0, 5).map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60 transition-all hover:bg-slate-900/80"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-semibold text-white">{lead.companyName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{lead.domain}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge status={lead.status} />
                <span className="text-[10px] text-muted-foreground">{formatDate(lead.lastAttemptAt || lead.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
