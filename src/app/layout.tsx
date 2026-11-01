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
            // Split-theme no-flash rule (mirrors ThemeProvider + theme-sections):
            // public routes are always dark; app routes are light unless the
            // stored dashboard preference is 'dark' (white is the default).
            // Self-contained: this runs before any module loads, so the
            // public-route list is inlined here — keep it in sync with
            // src/components/theme/theme-sections.ts.
            __html: `(function(){try{var pub=['/','/features','/how-it-works','/pricing','/contact-form-outreach','/website-contact-form-automation','/ai-outreach','/b2b-lead-generation','/benefits','/about','/contact','/help','/terms','/privacy','/login','/signup'];if(pub.indexOf(window.location.pathname)===-1){var t=localStorage.getItem('cr-theme');if(t!=='dark'){document.documentElement.classList.add('light');}}}catch(e){}})();`,
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
