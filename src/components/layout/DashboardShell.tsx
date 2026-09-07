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
  const isPublicRoute = ['/', '/benefits', '/pricing', '/login', '/signup', '/contact', '/help', '/terms', '/privacy'].includes(pathname);

  useEffect(() => {
    if (isPublicRoute) return;
    setSessionVerified(false);
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Authentication required');
        setSessionVerified(true);
      })
      .catch(() => router.replace(`/login?tab=signin&next=${encodeURIComponent(pathname)}`));
  }, [isPublicRoute, pathname, router]);

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

  if (!sessionVerified) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">Verifying your session…</div>;
  }

  return (
    <div className="app-dashboard-shell flex min-h-screen bg-[#f4f8fd] text-slate-950">
      {/* Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#f4f8fd] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
