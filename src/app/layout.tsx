import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
