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
  ArrowUpRight,
  Flame,
  Inbox,
  Gift,
  Bot,
  CreditCard,
  UserCircle,
  LifeBuoy,
  Scale,
  LockKeyhole,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: 'default' | 'amber' | 'emerald';
}

const navSections: Array<{ title: string; items: NavItem[] }> = [
  { title: 'MAIN', items: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
    { name: 'AI Personalization', href: '/ai-personalization', icon: Bot },
    { name: 'Inbox', href: '/unibox', icon: Inbox },
    { name: 'Contact List', href: '/leads', icon: Users },
    { name: 'Usage & History', href: '/logs', icon: ScrollText },
  ] },
  { title: 'ACCOUNT', items: [
    { name: 'Billing & Credits', href: '/credits', icon: CreditCard },
    { name: 'Profile', href: '/profile', icon: UserCircle },
    { name: 'Referral', href: '/referral', icon: Gift },
  ] },
];

const supportItems: NavItem[] = [
  { name: 'Help & Support', href: '/help', icon: LifeBuoy },
  { name: 'Terms & Conditions', href: '/terms', icon: Scale },
  { name: 'Privacy Policy', href: '/privacy', icon: LockKeyhole },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [availableCredits, setAvailableCredits] = React.useState(0);
  const [currentUser, setCurrentUser] = React.useState({ name: 'Your account', email: '' });

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login?tab=signin');
    router.refresh();
  };

  React.useEffect(() => {
    const refreshCredits = () => setAvailableCredits(CreditWalletService.getWallet().totalCreditsAvailable);
    refreshCredits();
    window.addEventListener('storage', refreshCredits);
    window.addEventListener('focus', refreshCredits);
    return () => {
      window.removeEventListener('storage', refreshCredits);
      window.removeEventListener('focus', refreshCredits);
    };
  }, [pathname]);

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
              src="/logo-128.png"
              alt="ContactReachout Logo"
              width="36"
              height="36"
              className="h-9 w-9 object-contain shadow-md shadow-blue-500/20"
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
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
          {navSections.map((section) => <nav key={section.title} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">{section.title}</p>
            {section.items.map((item) => {
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
                      ? 'bg-[#0e6de4] text-white shadow-sm'
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
                        isActive && 'bg-white/20 text-white',
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
          </nav>)}

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Credits</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">Available Credits</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{availableCredits.toLocaleString()}</p>
            <Link href="/pricing" onClick={onClose} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#0e6de4]">Buy Credits <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>

          <nav className="space-y-1 pb-3">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">SUPPORT</p>
            {supportItems.map((item) => { const Icon = item.icon; return <Link key={item.name} href={item.href} onClick={onClose} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-[#0e6de4]"><Icon className="h-4 w-4 text-slate-400" />{item.name}</Link>; })}
          </nav>
        </div>

        {/* User & Small Super Admin Icon Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              CR
            </div>
            <div>
              <p className="max-w-[130px] truncate text-[11px] font-bold text-slate-900 leading-tight">{currentUser.name}</p>
              <p className="max-w-[130px] truncate text-[9px] text-slate-500 font-mono">{currentUser.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
              title="Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
