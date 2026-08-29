'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          location: 'New York, NY, USA',
        };
        localStorage.setItem('user_sender_profile', JSON.stringify(defaultProfile));
        localStorage.setItem('user_reply_to_email', 'hello@contactreachout.com');
      }
      localStorage.removeItem('user_logged_out');
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
