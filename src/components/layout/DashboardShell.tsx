'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ChatbotWidget } from '@/components/layout/ChatbotWidget';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ name: string; email: string } | null>(null);
  const isPublicRoute = ['/', '/benefits', '/pricing', '/login', '/signup', '/contact', '/help', '/terms', '/privacy'].includes(pathname);
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (isPublicRoute || isAdminRoute) return;
    let cancelled = false;

    const verify = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (!cancelled && data?.authenticated && data?.user?.email) {
            const userName = data.user.name || data.user.email.split('@')[0];
            setSessionUser({ name: userName, email: data.user.email });
            const currentEmail = data.user.email.toLowerCase().trim();
            if (typeof window !== 'undefined') {
              const previousEmail = localStorage.getItem('active_account_email');
              if (previousEmail && previousEmail !== currentEmail) {
                ['user_campaigns', 'user_sender_profile', 'user_lead_lists', 'user_imported_leads', 'user_credit_wallet', 'user_credit_transactions'].forEach((key) => localStorage.removeItem(key));
              }
              localStorage.setItem('active_account_email', currentEmail);
              localStorage.setItem('user_auth_email', currentEmail);
              const profile = {
                name: userName,
                email: currentEmail,
                company: 'ContactReachout',
                website: 'https://contactreachout.com',
              };
              localStorage.setItem('user_sender_profile', JSON.stringify(profile));
            }
            setSessionVerified(true);
            return;
          }
        }
      } catch (e) {
        console.error('Session verify error:', e);
      }

      // Fallback to active local storage account if server cookie session is transient/unauthenticated
      if (typeof window !== 'undefined') {
        const localEmail = (localStorage.getItem('active_account_email') || localStorage.getItem('user_auth_email') || '').toLowerCase().trim();
        if (localEmail && !cancelled) {
          setSessionUser({ name: localEmail.split('@')[0], email: localEmail });
          setSessionVerified(true);
          return;
        }
      }

      if (!cancelled) {
        router.replace(`/login?tab=signin&next=${encodeURIComponent(pathname)}`);
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [isPublicRoute, isAdminRoute, pathname, router]);

  useEffect(() => {
    if (isPublicRoute || isAdminRoute) return;
    ['/dashboard', '/campaigns', '/campaigns/new', '/import', '/ai-personalization'].forEach((route) => router.prefetch(route));
  }, [isPublicRoute, isAdminRoute, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_logged_out');
    }
  }, []);

  if (isPublicRoute) {
    return <>{children}<ChatbotWidget /></>;
  }

  if (isAdminRoute) {
    return <>{children}</>;
  }

  if (!sessionVerified) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">Verifying your session…</div>;
  }

  return (
    <div className="app-dashboard-shell flex min-h-screen bg-[#f4f8fd] text-slate-950">
      {/* Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} initialUserProfile={sessionUser || undefined} />
        <main className="flex-1 overflow-y-auto bg-[#f4f8fd] p-4 sm:p-5 lg:p-6">
          <div className="w-full max-w-[1750px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
