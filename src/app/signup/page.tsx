import React, { Suspense } from 'react';
import SignupClient from '@/components/auth/SignupClient';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-4">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}
