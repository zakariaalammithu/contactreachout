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
      // A transient serverless/network failure must not log a user out.
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        try {
          const response = await fetch('/api/auth/session', { cache: 'no-store' });
          if (response.ok) {
            if (!cancelled) {
              const data = await response.json().catch(() => ({}));
              if (!cancelled && data?.user?.email) setSessionUser({ name: data.user.name || 'ContactReachout Team', email: data.user.email });
              const currentEmail = data?.user?.email?.toLowerCase?.();
              if (currentEmail && typeof window !== 'undefined') {
                const previousEmail = localStorage.getItem('active_account_email');
                if (previousEmail && previousEmail !== currentEmail) {
                  ['user_campaigns', 'user_sender_profile', 'user_lead_lists', 'user_imported_leads', 'user_credit_wallet', 'user_credit_transactions'].forEach((key) => localStorage.removeItem(key));
                }
                localStorage.setItem('active_account_email', currentEmail);
                localStorage.setItem('user_auth_email', currentEmail);
              }
              setSessionVerified(true);
            }
            return;
          }
          if (response.status === 401) break;
        } catch { /* retry */ }
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
      if (!cancelled) router.replace(`/login?tab=signin&next=${encodeURIComponent(pathname)}`);
    };
    verify();
    return () => { cancelled = true; };
  // Verify on the initial protected shell mount only. Internal route changes
  // must preserve the authenticated shell instead of flashing a blank screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicRoute, router]);

  useEffect(() => {
    if (isPublicRoute || isAdminRoute) return;
    ['/dashboard', '/campaigns', '/campaigns/new', '/import', '/ai-personalization'].forEach((route) => router.prefetch(route));
  }, [isPublicRoute, isAdminRoute, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userProfile = localStorage.getItem('user_sender_profile');

      if (!userProfile) {
        const defaultProfile = {
          name: 'ContactReachout Team',
          email: 'hello@contactreachout.com',
          phone: '+1 (888) 420-7322',
          company: 'ContactReachout',
          website: 'https://contactreachout.com',
          title: 'Outreach Operations',
          location: 'Austin, TX 73301, USA',
        };
        localStorage.setItem('user_sender_profile', JSON.stringify(defaultProfile));
        localStorage.setItem('user_reply_to_email', 'hello@contactreachout.com');
      }
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
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
