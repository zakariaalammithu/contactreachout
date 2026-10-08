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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

import { LogoutModal } from '@/components/ui/LogoutModal';

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
    { name: 'Inbox', href: '/inbox', icon: Inbox },
    { name: 'CRM', href: '/crm', icon: Users },
    { name: 'Usage & History', href: '/logs', icon: ScrollText },
  ] },
  { title: 'ACCOUNT', items: [
    { name: 'Billing & Credits', href: '/credits', icon: CreditCard },
    { name: 'Profile', href: '/profile', icon: UserCircle },
    { name: 'Referral', href: '/referral', icon: Gift },
  ] },
];

export function Sidebar({ isOpen, onClose, currentUserProfile }: { isOpen?: boolean; onClose?: () => void; currentUserProfile?: { name: string; email: string; role?: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [availableCredits, setAvailableCredits] = React.useState(0);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<{ name: string; email: string; role: string }>({
    name: currentUserProfile?.name || 'User',
    email: currentUserProfile?.email || '',
    role: currentUserProfile?.role || 'USER',
  });

  const handleLogout = async () => {
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => undefined);
    if (typeof window !== 'undefined') localStorage.removeItem('active_account_email');
    window.location.href = '/login?tab=signin';
  };

  React.useEffect(() => {
    if (currentUserProfile) {
      setCurrentUser({
        name: currentUserProfile.name,
        email: currentUserProfile.email,
        role: currentUserProfile.role || 'USER',
      });
      return;
    }
  }, [currentUserProfile]);

  React.useEffect(() => {
    const refreshCredits = () => setAvailableCredits(CreditWalletService.getWallet().totalCreditsAvailable);
    refreshCredits();
    window.addEventListener('storage', refreshCredits);
    window.addEventListener('focus', refreshCredits);
    window.addEventListener('credit_wallet_updated', refreshCredits);
    return () => {
      window.removeEventListener('storage', refreshCredits);
      window.removeEventListener('focus', refreshCredits);
      window.removeEventListener('credit_wallet_updated', refreshCredits);
    };
  }, [pathname]);

  const roleBadge = currentUser.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : currentUser.role === 'ADMIN' ? 'ADMIN' : 'USER';
  const userInitials = (currentUser.name || currentUser.email || 'User').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'CR';

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
          'group/sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/90 bg-white shadow-md transition-all duration-300 ease-in-out overflow-x-hidden shrink-0',
          'w-64 lg:static lg:h-screen lg:w-16 lg:hover:w-60 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center border-b border-slate-100 px-3.5 overflow-hidden shrink-0">
          <Link href="/campaigns" prefetch={true} className="flex items-center gap-3">
            <img
              src="/brand/logo-icon.png"
              alt="ContactReachout logo"
              width="36"
              height="36"
              className="h-9 w-9 shrink-0 object-contain"
            />
            <div className="whitespace-nowrap transition-all duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:block lg:hidden">
              <span className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
                <span className="inline-flex items-center"><span className="text-[#0e6de4]">Contact</span><span className="text-slate-900">Reachout</span></span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
                  {roleBadge}
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-mono">contactreachout.com</p>
            </div>
            {/* Mobile Header Always Visible */}
            <div className="whitespace-nowrap lg:hidden">
              <span className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1">
                <span className="inline-flex items-center"><span className="text-[#0e6de4]">Contact</span><span className="text-slate-900">Reachout</span></span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
                  {roleBadge}
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-mono">contactreachout.com</p>
            </div>
          </Link>
        </div>

        {/* Safety Guard Indicator */}
        <div className="mx-2 my-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 shadow-xs shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="whitespace-nowrap transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:block">
              <p className="text-xs font-bold text-emerald-900">Safety Guard Active</p>
              <p className="text-[10px] text-emerald-700 font-mono">Zero-Bypass Compliance</p>
            </div>
            <div className="whitespace-nowrap lg:hidden">
              <p className="text-xs font-bold text-emerald-900">Safety Guard Active</p>
              <p className="text-[10px] text-emerald-700 font-mono">Zero-Bypass Compliance</p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto space-y-4 px-2.5 py-1">
          {navSections.map((section) => (
            <nav key={section.title} className="space-y-1">
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono whitespace-nowrap transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:block">
                {section.title}
              </p>
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono lg:hidden">
                {section.title}
              </p>

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
                    title={item.name}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-xs font-semibold transition-all duration-150 overflow-hidden whitespace-nowrap',
                      isActive
                        ? 'bg-[#0e6de4] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />

                    <span className="flex-1 transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:inline">
                      {item.name}
                    </span>
                    <span className="flex-1 lg:hidden">
                      {item.name}
                    </span>

                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:inline',
                          isActive && 'bg-white/20 text-white',
                          !isActive && item.badgeVariant === 'emerald' && 'bg-emerald-100 text-emerald-800',
                          !isActive && item.badgeVariant === 'amber' && 'bg-amber-100 text-amber-800',
                          !isActive && item.badgeVariant === 'default' && 'bg-blue-100 text-blue-800',
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
          ))}

          {/* Credits Summary Card */}
          <div className="mx-0.5 rounded-2xl border border-blue-100 bg-blue-50/70 p-2.5 overflow-hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#0e6de4] font-bold text-xs">
                ⚡
              </div>
              <div className="whitespace-nowrap transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:block">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Credits</p>
                <p className="text-xs font-black text-slate-950">{availableCredits.toLocaleString()} Available</p>
              </div>
              <div className="whitespace-nowrap lg:hidden">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Credits</p>
                <p className="text-xs font-black text-slate-950">{availableCredits.toLocaleString()} Available</p>
              </div>
            </div>
            <div className="mt-2 transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:block">
              <Link href="/pricing" onClick={onClose} className="inline-flex items-center gap-1 text-xs font-black text-[#0e6de4]">
                Buy Credits <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-2 lg:hidden">
              <Link href="/pricing" onClick={onClose} className="inline-flex items-center gap-1 text-xs font-black text-[#0e6de4]">
                Buy Credits <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-2.5 overflow-hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 shrink-0 rounded-full bg-[#0e6de4] flex items-center justify-center text-[11px] font-bold text-white shadow-xs">
              {userInitials}
            </div>
            <div className="whitespace-nowrap transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:block">
              <p className="max-w-[130px] truncate text-[11px] font-bold text-slate-900 leading-tight">{currentUser.name}</p>
              <p className="max-w-[130px] truncate text-[9px] text-slate-500 font-mono">{currentUser.email}</p>
            </div>
            <div className="whitespace-nowrap lg:hidden">
              <p className="max-w-[130px] truncate text-[11px] font-bold text-slate-900 leading-tight">{currentUser.name}</p>
              <p className="max-w-[130px] truncate text-[9px] text-slate-500 font-mono">{currentUser.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 hidden lg:group-hover/sidebar:block"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
