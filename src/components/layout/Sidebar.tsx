'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  PlusCircle,
  UploadCloud,
  Users,
  FileText,
  Cpu,
  CheckCircle2,
  ScrollText,
  Settings,
  ShieldCheck,
  LogOut,
  Sparkles,
  ArrowUpRight,
  Flame,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: 'default' | 'amber' | 'emerald';
}

const navItems: NavItem[] = [
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone, badge: 2, badgeVariant: 'emerald' },
  { name: 'Inbox', href: '/unibox', icon: Inbox, badge: 3, badgeVariant: 'amber' },
  { name: 'Contact List', href: '/leads', icon: Users },
  { name: 'Processing Queue', href: '/processing', icon: Cpu, badge: 'Live', badgeVariant: 'default' },
  { name: 'Results & Review', href: '/results', icon: CheckCircle2, badge: 12, badgeVariant: 'amber' },
  { name: 'System Logs', href: '/logs', icon: ScrollText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  // Instant Route Prefetching & Route Warmup
  React.useEffect(() => {
    navItems.forEach((item) => {
      try {
        router.prefetch(item.href);
      } catch (e) {}
    });
    try {
      router.prefetch('/campaigns/new');
      router.prefetch('/admin');
    } catch (e) {}
  }, [router]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/90 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/campaigns" prefetch={true} className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="ContactReachout Logo"
              className="h-9 w-9 rounded-xl object-cover shadow-md shadow-blue-500/20 ring-1 ring-blue-500/30"
            />
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
                ContactReachout <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">PRO</span>
              </span>
              <p className="text-[10px] text-slate-400 font-mono">contactreachout.com</p>
            </div>
          </Link>
        </div>

        {/* Safety Guard Indicator */}
        <div className="mx-3.5 my-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-900">Dry-Run Guard Active</p>
              <p className="text-[10px] text-emerald-700 font-mono">Zero-Bypass Compliance</p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Navigation Menu
          </div>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === '/campaigns'
                  ? pathname === '/campaigns' || pathname.startsWith('/campaigns/')
                  : pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onMouseEnter={() => {
                    try {
                      router.prefetch(item.href);
                    } catch (e) {}
                  }}
                  onTouchStart={() => {
                    try {
                      router.prefetch(item.href);
                    } catch (e) {}
                  }}
                  onClick={onClose}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-slate-400')} />
                    <span>{item.name}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold',
                        isActive && 'bg-slate-800 text-white',
                        !isActive && item.badgeVariant === 'emerald' && 'bg-emerald-100 text-emerald-800',
                        !isActive && item.badgeVariant === 'amber' && 'bg-amber-100 text-amber-800',
                        !isActive && item.badgeVariant === 'default' && 'bg-indigo-100 text-indigo-800',
                        !isActive && !item.badgeVariant && 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User & Small Super Admin Icon Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              CR
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-900 leading-tight">ContactReachout Team</p>
              <p className="text-[9px] text-slate-500 font-mono">hello@contactreachout.com</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/admin"
              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Super Admin Console"
            >
              <Sparkles className="h-4 w-4" />
            </Link>

            <Link
              href="/login"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
              title="Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
