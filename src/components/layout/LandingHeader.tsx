'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

const navigation = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Services', href: '/#features' },
  { label: 'Integrations', href: '/#integrations' },
  { label: 'Features', href: '/#features' },
  { label: 'Benefits', href: '/benefits' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
];

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b border-white/20 bg-[#0e6de4]/95 text-white transition-all backdrop-blur-xl ${isScrolled ? 'shadow-lg shadow-blue-950/15' : ''}`}>
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img src="/logo-128.png" alt="ContactReachout logo" width="40" height="40" className="h-10 w-10 shrink-0 object-contain shadow-sm" />
          <div className="min-w-0"><p className="truncate text-lg font-black tracking-tight text-white">ContactReachout</p><p className="truncate text-[10px] font-bold text-blue-100">Find Clients Through Website Contact Forms</p></div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navigation.map((item) => <Link key={item.label} href={item.href} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white">{item.label}</Link>)}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login?tab=signin" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15">Login</Link>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl border border-white bg-white px-4 py-2.5 text-sm font-black text-[#0e6de4] shadow-lg shadow-blue-950/15 transition hover:bg-blue-50">Start Free <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <button onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-white lg:hidden" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/20 bg-[#0e6de4] px-4 py-4 shadow-lg lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Mobile navigation">
            {navigation.map((item) => <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 hover:text-white">{item.label}</Link>)}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:hidden">
              <Link href="/login?tab=signin" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/25 px-4 py-2.5 text-center text-sm font-black text-white">Login</Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white bg-white px-4 py-2.5 text-center text-sm font-black text-[#0e6de4]">Start Free</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
