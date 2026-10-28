import React, { Suspense } from 'react';
import ClientView from './ClientView';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
          <div className="h-6 w-6 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientView />
    </Suspense>
  );
}
