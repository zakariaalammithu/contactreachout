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

  const publicRoutes = [
    '/',
    '/features',
    '/how-it-works',
    '/pricing',
    '/contact-form-outreach',
    '/website-contact-form-automation',
    '/ai-outreach',
    '/b2b-lead-generation',
    '/ai-personalization',
    '/benefits',
    '/about',
    '/contact',
    '/help',
    '/terms',
    '/privacy',
    '/login',
    '/signup',
  ];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAdminRoute = pathname.startsWith('/admin');

  // Deterministic session initialization on Server and Client initial render
  const [sessionVerified, setSessionVerified] = useState<boolean>(() => {
    if (isPublicRoute || isAdminRoute) return true;
    return false;
  });

  const [sessionUser, setSessionUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (isPublicRoute || isAdminRoute) return;

    let isMounted = true;

    // Immediately hydrate session user from localStorage on client mount
    if (typeof window !== 'undefined') {
      const localEmail = (localStorage.getItem('active_account_email') || localStorage.getItem('user_auth_email') || '').toLowerCase().trim();
      if (localEmail) {
        let savedName = '';
        const savedSender = localStorage.getItem('user_sender_profile');
        if (savedSender) {
          try {
            const p = JSON.parse(savedSender);
            if (p.name && p.name.trim()) savedName = p.name.trim();
          } catch (e) {}
        }
        if (!savedName) {
          savedName = localEmail === 'mithusquare@gmail.com' ? 'Zakaria Alam Mithu' : localEmail.split('@')[0];
        }
        setSessionUser({ name: savedName, email: localEmail });
        setSessionVerified(true);
      }
    }

    async function checkServerSession() {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (isMounted && data?.authenticated && data?.user?.email) {
            const currentEmail = data.user.email.toLowerCase().trim();
            const userName = (data.user.name && data.user.name.trim())
              ? data.user.name.trim()
              : (currentEmail === 'mithusquare@gmail.com' ? 'Zakaria Alam Mithu' : currentEmail.split('@')[0]);

            if (typeof window !== 'undefined') {
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
            setSessionUser({ name: userName, email: currentEmail });
            setSessionVerified(true);
            return;
          }
        }
      } catch (e) {
        // Non-blocking network catch
      }

      // If server session returns unauthenticated AND no local storage account exists
      if (typeof window !== 'undefined') {
        const localEmail = (localStorage.getItem('active_account_email') || localStorage.getItem('user_auth_email') || '').trim();
        if (!localEmail && isMounted) {
          setSessionVerified(false);
          router.replace(`/login?tab=signin&next=${encodeURIComponent(pathname)}`);
        } else if (localEmail && isMounted) {
          setSessionVerified(true);
        }
      }
    }

    checkServerSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, isPublicRoute, isAdminRoute, router]);

  useEffect(() => {
    if (isPublicRoute || isAdminRoute) return;
    ['/dashboard', '/campaigns', '/campaigns/new', '/import', '/ai-personalization'].forEach((route) => router.prefetch(route));
  }, [isPublicRoute, isAdminRoute, router]);

  if (isPublicRoute) {
    return <>{children}<ChatbotWidget /></>;
  }

  if (isAdminRoute) {
    return <>{children}</>;
  }

  if (!sessionVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-3 font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        <p className="text-xs font-bold text-slate-600">Verifying your session…</p>
      </div>
    );
  }

  return (
    <div className="app-dashboard-shell flex h-screen w-screen overflow-hidden bg-[#f4f8fd] text-slate-950">
      {/* Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} currentUserProfile={sessionUser || undefined} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-screen min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} initialUserProfile={sessionUser || undefined} />
        <main className="flex-1 overflow-y-auto bg-[#f4f8fd] p-4 sm:p-5 lg:p-6">
          <div className="w-full max-w-[1750px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

