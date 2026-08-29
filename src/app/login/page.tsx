import React, { Suspense } from 'react';
import LoginClient from '@/components/auth/LoginClient';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F8F6] p-4">
          <div className="h-6 w-6 rounded-full border-2 border-[#007A55] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
