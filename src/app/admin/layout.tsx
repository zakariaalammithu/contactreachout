import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthStore } from '@/lib/auth/auth-store';
import { SessionManager } from '@/lib/auth/session';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessionId = cookies().get(SessionManager.COOKIE_NAME)?.value;
  const session = sessionId ? AuthStore.getSession(sessionId) : null;
  if (!session || (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN')) redirect('/login?tab=signin');
  return <AdminShell>{children}</AdminShell>;
}
