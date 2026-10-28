'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

const navigation = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Outreach', href: '/contact-form-outreach' },
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
    <header className={`sticky top-3 z-50 mx-auto w-[min(1280px,calc(100%-2rem))] rounded-full border border-zinc-800 bg-zinc-950/95 text-white shadow-xl shadow-black/40 backdrop-blur-xl transition-all ${isScrolled ? 'shadow-2xl shadow-black/50' : ''}`}>
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img src="/brand/logo-icon-square.png" alt="ContactReachout logo" width="40" height="40" className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-md" />
          <div className="min-w-0"><p className="truncate text-lg font-black tracking-tight text-white"><span className="text-white">Contact</span><span className="text-blue-100">Reachout</span></p><p className="hidden truncate text-[10px] font-bold text-zinc-400 sm:block">Find Clients Through Website Contact Forms</p></div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navigation.map((item) => <Link key={item.label} href={item.href} className="rounded-full px-3 py-2 text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white">{item.label}</Link>)}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login?tab=signin" className="rounded-full border border-zinc-700 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-100 transition hover:bg-white/10">Login</Link>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-zinc-950 shadow-lg shadow-black/30 transition hover:bg-zinc-200">Start Free <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <button onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-full border border-zinc-700 bg-white/5 p-2.5 text-white lg:hidden" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mx-4 mb-3 rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-4 shadow-xl shadow-black/40 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Mobile navigation">
            {navigation.map((item) => <Link key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/10 hover:text-white">{item.label}</Link>)}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800 pt-4 sm:hidden">
              <Link href="/login?tab=signin" onClick={() => setMobileMenuOpen(false)} className="rounded-full border border-zinc-700 px-4 py-2.5 text-center text-sm font-black text-zinc-100">Login</Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="rounded-full bg-white px-4 py-2.5 text-center text-sm font-black text-zinc-950">Start Free</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
