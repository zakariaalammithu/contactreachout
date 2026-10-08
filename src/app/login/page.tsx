import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import LoginClient from '@/components/auth/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In | ContactReachout',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f6f9ff] p-4 font-sans">
          <div className="h-6 w-6 rounded-full border-2 border-[#0e6de4] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
