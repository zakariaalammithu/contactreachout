'use client';

import Link from 'next/link';
import { KeyRound, Sparkles } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <div className="admin-app-shell flex min-h-screen bg-[#f4f8fd] text-slate-900 font-sans selection:bg-blue-500/20 selection:text-blue-950"><AdminSidebar/><div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/90 px-6 shadow-xs backdrop-blur-xl"><div className="flex items-center gap-3"><span className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-[#0e6de4] shadow-xs"><Sparkles className="h-3.5 w-3.5"/>SUPER ADMIN GOVERNANCE CONSOLE</span><span className="hidden text-xs font-mono text-slate-400 sm:inline">• Server-authorized session</span></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs shadow-xs sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="text-[11px] font-mono font-semibold text-slate-700">Dry-Run Protection Active</span></div><Link href="/admin/integrations" className="flex items-center gap-1.5 rounded-full bg-[#0e6de4] px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-[#0758bd]"><KeyRound className="h-3.5 w-3.5"/><span>Configure Secrets</span></Link></div></header><main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-6 md:p-8">{children}</main></div></div>;
}
