import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { WebsiteAnalyticsTracker } from '@/components/analytics/WebsiteAnalyticsTracker';
import './globals.css';

export const metadata: Metadata = {
  title: 'ContactReachout | B2B Outreach Campaigns',
  description: 'Build, manage, and review professional B2B contact-form outreach campaigns.',
  icons: { icon: [{ url: '/favicon.png', type: 'image/png', sizes: '64x64' }], shortcut: '/favicon.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <WebsiteAnalyticsTracker />
        </Suspense>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
