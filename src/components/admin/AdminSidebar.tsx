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
  Bell,
  BarChart3,
  TrendingUp,
  Compass,
  UserPlus,
  CreditCard,
  DollarSign,
  Receipt,
  KeyRound,
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
      { name: 'Overview', href: '/admin', icon: LayoutDashboard },
      { name: 'My Campaigns', href: '/admin/my-campaigns', icon: Send },
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Campaigns', href: '/admin/campaigns', icon: Layers },
      { name: 'Leads', href: '/admin/leads', icon: Database },
      { name: 'CRM', href: '/admin/crm', icon: Users },
      { name: 'Submissions', href: '/admin/submissions', icon: FileCheck },
      { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { name: 'Website Visitors', href: '/admin/website-visitors', icon: BarChart3 },
      { name: 'Traffic Sources', href: '/admin/analytics/traffic-sources', icon: Compass },
      { name: 'User Growth', href: '/admin/analytics/user-growth', icon: UserPlus },
      { name: 'Usage & Credits', href: '/admin/credits', icon: TrendingUp },
    ],
  },
  {
    title: 'BILLING',
    items: [
      { name: 'Transactions', href: '/admin/billing/transactions', icon: Receipt },
      { name: 'Revenue', href: '/admin/billing/revenue', icon: DollarSign },
      { name: 'Credit Rules', href: '/admin/credits/rules', icon: CreditCard },
    ],
  },
  {
    title: 'INTEGRATIONS',
    items: [
      { name: 'Email / Resend', href: '/admin/integrations/email', icon: Mail },
      { name: 'Google Sheets', href: '/admin/integrations/google-sheets', icon: FileSpreadsheet },
      { name: 'AI Providers', href: '/admin/integrations/ai', icon: Bot },
      { name: 'AI Chatbot', href: '/admin/chatbot', icon: Bot },
      { name: 'Other APIs', href: '/admin/integrations', icon: Plug },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { name: 'Queue & Workers', href: '/admin/system/queue', icon: Layers, badge: 'Online', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { name: 'Browser Automation', href: '/admin/system/browser', icon: Globe },
      { name: 'Campaign Settings', href: '/admin/system/campaigns', icon: Sliders },
      { name: 'System Health', href: '/admin/system/health', icon: Activity, badge: 'Healthy', badgeColor: 'bg-emerald-100 text-emerald-800' },
    ],
  },
  {
    title: 'SECURITY / SETTINGS',
    items: [
      { name: 'Configure Secrets', href: '/admin/security', icon: KeyRound },
      { name: 'Emergency Controls', href: '/admin/settings', icon: Shield },
      { name: 'Audit Logs', href: '/admin/logs', icon: ScrollText },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = React.useState<{ email: string; name: string; role: string } | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.authenticated && data?.user) {
          setSessionUser(data.user);
        }
      })
      .catch(() => undefined);
    return () => { isMounted = false; };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => undefined);
    if (typeof window !== 'undefined') localStorage.removeItem('active_account_email');
    window.location.href = '/login?tab=signin';
  };

  const userRole = sessionUser?.role || 'SUPER_ADMIN';
  const displayRole = userRole === 'SUPER_ADMIN' ? 'SUPER ADMIN' : userRole === 'ADMIN' ? 'ADMIN' : 'USER';
  const userInitials = (sessionUser?.name || sessionUser?.email || 'Admin').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  return (
    <aside className="w-64 border-r border-slate-200/90 bg-white flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto shadow-xs">
      <div className="p-4 space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link href="/admin" className="flex items-center gap-2.5">
            <img src="/brand/logo-icon.png" alt="ContactReachout logo" width="32" height="32" className="h-8 w-auto max-w-[32px] max-h-[32px] shrink-0 object-contain" />
            <div>
              <div className="font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 text-sm">
                <span className="inline-flex items-center"><span className="text-[#0e6de4]">Contact</span><span className="text-slate-900">Reachout</span></span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#0e6de4] font-mono font-bold">
                  {displayRole}
                </span>
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
                      prefetch={true}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                        isActive
                          ? 'bg-[#0e6de4] text-white shadow-sm font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-slate-400')} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold', isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-100 text-slate-700')}>
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
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0e6de4] hover:bg-blue-50 transition-colors border border-dashed border-slate-300"
        >
          <span>User Dashboard View</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#0e6de4]" />
        </Link>

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 shrink-0 rounded-full bg-[#0e6de4] flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-900 leading-tight truncate max-w-[130px]">{sessionUser?.email || 'Admin'}</p>
              <p className="text-[9px] text-blue-700 font-mono font-bold">{userRole}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
