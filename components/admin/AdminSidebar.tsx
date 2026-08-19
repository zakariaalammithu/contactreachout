'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Send,
  Database,
  FileCheck,
  Mail,
  FileSpreadsheet,
  Bot,
  Plug,
  Layers,
  Globe,
  Sliders,
  Shield,
  Settings,
  ScrollText,
  Activity,
  UserCheck,
  LogOut,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'ADMIN',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Users', href: '/admin/users', icon: Users, badge: '3', badgeColor: 'bg-indigo-100 text-indigo-800' },
      { name: 'Campaigns', href: '/admin/campaigns', icon: Send },
      { name: 'Leads', href: '/admin/leads', icon: Database },
      { name: 'Submissions', href: '/admin/submissions', icon: FileCheck },
    ],
  },
  {
    title: 'INTEGRATIONS',
    items: [
      { name: 'Email / Resend', href: '/admin/integrations/email', icon: Mail },
      { name: 'Google Sheets', href: '/admin/integrations/google-sheets', icon: FileSpreadsheet },
      { name: 'AI Providers', href: '/admin/integrations/ai', icon: Bot },
      { name: 'Other APIs', href: '/admin/integrations', icon: Plug },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { name: 'Queue & Workers', href: '/admin/system/queue', icon: Layers, badge: 'Online', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { name: 'Browser Automation', href: '/admin/system/browser', icon: Globe },
      { name: 'Campaign Settings', href: '/admin/system/campaigns', icon: Sliders },
      { name: 'Security', href: '/admin/security', icon: Shield },
      { name: 'System Settings', href: '/admin/settings', icon: Settings },
    ],
  },
  {
    title: 'MONITORING',
    items: [
      { name: 'Logs & Audit', href: '/admin/logs', icon: ScrollText },
      { name: 'System Health', href: '/admin/system/health', icon: Activity, badge: 'Healthy', badgeColor: 'bg-emerald-100 text-emerald-800' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { name: 'Admin Profile', href: '/admin/profile', icon: UserCheck },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200/90 bg-white flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto shadow-xs">
      <div className="p-4 space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#FF5722] to-[#FF8A65] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 text-sm">
                Aimfox <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 font-mono font-bold">SUPER ADMIN</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Enterprise Control</p>
            </div>
          </Link>
        </div>

        {/* Global Live Killswitch Indicator */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
            <span className="text-[11px] font-bold text-rose-900">Live Killswitch</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-rose-600 border border-rose-200">
            DISABLED (SAFE)
          </span>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-slate-400')} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold', isActive ? 'bg-slate-800 text-white' : item.badgeColor || 'bg-slate-100 text-slate-700')}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Profile & Switch Link */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-900 hover:bg-indigo-50 transition-colors border border-dashed border-slate-300"
        >
          <span>User Dashboard View</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-indigo-600" />
        </Link>

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              MA
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-900 leading-tight">mithusquare@gmail.com</p>
              <p className="text-[9px] text-emerald-700 font-mono font-bold">SUPER_ADMIN</p>
            </div>
          </div>
          <Link href="/login" className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <LogOut className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
