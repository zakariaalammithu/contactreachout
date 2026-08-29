import React, { Suspense } from 'react';
import PricingClient from './PricingClient';

export const dynamic = 'force-dynamic';

export default function AdminPricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white p-6">
          <div className="h-8 w-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <PricingClient />
    </Suspense>
  );
}
