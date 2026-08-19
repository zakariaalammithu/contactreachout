'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Sparkles,
  Zap,
  FileSpreadsheet,
  ShieldCheck,
  BarChart3,
  Menu,
  X,
  Shield,
  Layers,
  ArrowRight,
  User,
  Crown
} from 'lucide-react';

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'features' | 'admin' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const featuresRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);

  // Scroll detection for sticky header dynamic styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        featuresRef.current && !featuresRef.current.contains(event.target as Node) &&
        adminRef.current && !adminRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (dropdown: 'features' | 'admin') => {
    setActiveDropdown(prev => (prev === dropdown ? null : dropdown));
  };

  return (
    <div className="sticky top-0 z-50 w-full pt-3 pb-2 px-4 sm:px-6 transition-all duration-300">
      <header
        className={`max-w-7xl mx-auto rounded-2xl border transition-all duration-300 px-5 sm:px-6 py-3 flex items-center justify-between ${
          isScrolled
            ? 'border-indigo-500/30 bg-[#0A0D1B]/95 backdrop-blur-2xl shadow-2xl shadow-indigo-950/40 ring-1 ring-white/10'
            : 'border-slate-800/80 bg-[#0E1122]/90 backdrop-blur-xl shadow-2xl'
        }`}
      >
        {/* FreeOutreach Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="ContactReachout Logo"
            className="h-9 w-9 rounded-xl object-cover shadow-md shadow-blue-500/20 ring-1 ring-white/20 group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white font-sans group-hover:text-blue-400 transition-colors">
              ContactReachout
            </span>
            <span className="text-[10px] text-blue-400 font-mono -mt-1">contactreachout.com</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-300">
          {/* Features Dropdown Button */}
          <div className="relative" ref={featuresRef}>
            <button
              onClick={() => toggleDropdown('features')}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-all ${
                activeDropdown === 'features'
                  ? 'text-white bg-slate-800/80'
                  : 'hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <span>Features</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  activeDropdown === 'features' ? 'rotate-180 text-purple-400' : 'text-slate-400'
                }`}
              />
            </button>

            {/* Features Dropdown Menu */}
            {activeDropdown === 'features' && (
              <div className="absolute top-full left-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-[#0D1022]/98 p-3 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="space-y-1">
                  <a
                    href="#workflow"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800/50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-blue-300">
                        Contact Form Workflow
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        Automated visual discovery & form submissions
                      </div>
                    </div>
                  </a>

                  <Link
                    href="/import"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-800/50 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-purple-300">
                        12-Field AI Mapper
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        Scrambled CSV/Excel column auto-detection
                      </div>
                    </div>
                  </Link>

                  <a
                    href="#features"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                        Zero-Bypass Shield
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        100% CAN-SPAM & CAPTCHA safety routing
                      </div>
                    </div>
                  </a>

                  <a
                    href="#comparison"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/50 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-indigo-300">
                        Why FreeOutreach
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        Compare deliverability vs cold email
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            )}
          </div>

          <Link href="/campaigns" className="hover:text-white hover:bg-slate-800/40 py-1 px-3 rounded-lg transition-all">
            Campaigns
          </Link>

          <a href="#workflow" className="hover:text-white hover:bg-slate-800/40 py-1 px-3 rounded-lg transition-all">
            Workflow
          </a>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/pricing"
            className="text-sm font-semibold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-xl hover:bg-blue-950/40 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pricing</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800/40 transition-colors"
          >
            Log in
          </Link>
          <Link href="/campaigns/new">
            <button className="rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] px-5 py-2 text-xs font-bold text-white hover:opacity-95 shadow-lg shadow-purple-500/25 transition-all font-sans flex items-center gap-1.5 group">
              <span>Start for free</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-[#0D1022]/98 p-5 shadow-2xl backdrop-blur-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2 border-b border-slate-800/80 pb-4 text-sm font-semibold text-slate-300">
            <div className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider px-2">
              Features
            </div>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200"
            >
              <Zap className="h-4 w-4 text-blue-400" />
              <span>Contact Form Workflow</span>
            </a>
            <Link
              href="/import"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200"
            >
              <FileSpreadsheet className="h-4 w-4 text-purple-400" />
              <span>12-Field AI Mapper</span>
            </Link>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Zero-Bypass Shield</span>
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200"
            >
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              <span>Why FreeOutreach</span>
            </a>
          </div>

          <div className="space-y-2 border-b border-slate-800/80 pb-4 text-sm font-semibold text-slate-300">
            <Link
              href="/campaigns"
              onClick={() => setMobileMenuOpen(false)}
              className="block p-2 rounded-xl hover:bg-slate-800 text-slate-200"
            >
              Campaigns
            </Link>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center text-sm font-bold text-slate-300 bg-slate-800/60 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/campaigns/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center text-sm font-bold text-white bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] py-2.5 rounded-xl shadow-lg shadow-purple-500/25 hover:opacity-95 transition-all"
            >
              Start for free
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
