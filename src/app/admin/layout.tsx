'use client';

import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ShieldCheck, Flame, Bell, Sparkles, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-500/20 selection:text-indigo-950 aimfox-light-backdrop">
      {/* Super Admin Navigation Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              SUPER ADMIN GOVERNANCE CONSOLE
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-400 font-mono">
              • Root Control Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Mode Safety Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono text-slate-700 font-semibold">Dry-Run Protection Active</span>
            </div>

            <Link
              href="/admin/integrations"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0B0F19] text-white shadow-md hover:bg-slate-800 transition-all"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Configure Secrets</span>
            </Link>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
