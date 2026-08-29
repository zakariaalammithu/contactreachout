import React, { Suspense } from 'react';
import CampaignEditorClient from './CampaignEditorClient';

export const dynamic = 'force-dynamic';

export default function ManyreachCampaignEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <CampaignEditorClient />
    </Suspense>
  );
}
