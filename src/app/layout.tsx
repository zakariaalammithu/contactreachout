import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { WebsiteAnalyticsTracker } from '@/components/analytics/WebsiteAnalyticsTracker';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ContactReachout | B2B Outreach Campaigns',
  description: 'Build, manage, and review professional B2B contact-form outreach campaigns.',
  icons: { icon: [{ url: '/favicon.png', type: 'image/png', sizes: '64x64' }], shortcut: '/favicon.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cr-theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <Suspense fallback={null}>
            <WebsiteAnalyticsTracker />
          </Suspense>
          <DashboardShell>{children}</DashboardShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
