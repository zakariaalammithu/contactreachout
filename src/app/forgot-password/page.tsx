import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import ForgotPasswordClient from '@/components/auth/ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Forgot Password | ContactReachout',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-sans">
          <div className="h-6 w-6 rounded-full border-2 border-[#0e6de4] border-t-transparent animate-spin" />
        </div>
      }
    >
      <ForgotPasswordClient />
    </Suspense>
  );
}
