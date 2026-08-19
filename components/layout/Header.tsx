'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Plus,
  Upload,
  Bell,
  Activity,
  Sparkles,
  ArrowLeft,
  Home,
  ChevronRight,
  LogOut,
  Rocket,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MatchDataModal } from '@/components/leads/MatchDataModal';
import {
  parseSpreadsheetPreview,
  suggestColumnMappings,
  processImportRows,
} from '@/lib/services/import-service';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [inputCampaignName, setInputCampaignName] = useState('');
  const [currentHeaderCampName, setCurrentHeaderCampName] = useState('new');

  // Manyreach.com Style Match your data Modal State
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchFileData, setMatchFileData] = useState<{
    fileName: string;
    headers: string[];
    sampleRows: any[];
    allRawRows: any[];
  }>({
    fileName: '',
    headers: [],
    sampleRows: [],
    allRawRows: [],
  });

  const [userProfile, setUserProfile] = useState<{ name: string; email: string }>({
    name: 'ContactReachout Team',
    email: 'hello@contactreachout.com',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_sender_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserProfile({
            name: parsed.name || 'ContactReachout Team',
            email: parsed.email || 'hello@contactreachout.com',
          });
        }
      } catch (e) {
        // Fallback
      }
    }
  }, []);

  // Listen for campaign name updates from editor & prefetch routes
  useEffect(() => {
    try {
      router.prefetch('/campaigns/new');
      router.prefetch('/campaigns');
      router.prefetch('/unibox');
      router.prefetch('/leads');
      router.prefetch('/processing');
      router.prefetch('/results');
      router.prefetch('/logs');
      router.prefetch('/settings');
    } catch (e) {}

    const handleNameChange = (e: any) => {
      if (e.detail) setCurrentHeaderCampName(e.detail);
    };
    window.addEventListener('campaign_name_updated', handleNameChange);
    return () => window.removeEventListener('campaign_name_updated', handleNameChange);
  }, [router]);

  const handleImportLeadsClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const preview = parseSpreadsheetPreview(arrayBuffer, file.name);

      setMatchFileData({
        fileName: file.name,
        headers: preview.detectedHeaders,
        sampleRows: preview.sampleRows,
        allRawRows: preview.rawRows,
      });
      setShowMatchModal(true);
    } catch (err: any) {
      alert(`Error reading spreadsheet file: ${err.message}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleMatchImportSuccess = (validLeads: any[], listInfo: any) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_imported_leads');
      const existing = stored ? JSON.parse(stored) : [];
      const mergedLeads = [...validLeads, ...existing];
      localStorage.setItem('user_imported_leads', JSON.stringify(mergedLeads));

      // Save list metadata
      const storedLists = localStorage.getItem('user_lead_lists');
      const existingLists = storedLists ? JSON.parse(storedLists) : [];
      localStorage.setItem('user_lead_lists', JSON.stringify([listInfo, ...existingLists]));

      // Dispatch custom event so active page updates immediately
      window.dispatchEvent(new CustomEvent('leads_imported_directly', { detail: validLeads }));

      alert(`✅ Success! Imported ${validLeads.length} leads from "${listInfo.fileName}" directly into your account!`);
    }
  };

  const handleCreateCampaignSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = inputCampaignName.trim() || `Campaign ${new Date().toLocaleDateString()}`;
    setShowNameModal(false);
    setInputCampaignName('');
    router.push(`/campaigns/new?name=${encodeURIComponent(finalName)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-6 backdrop-blur-md font-sans">
      {/* Hidden File Input for Import Leads button */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />

      {/* Left section: Mobile menu trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 text-slate-500 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Navigation Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <Home className="h-3.5 w-3.5" />
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="capitalize font-semibold text-slate-800">
            {pathname === '/' ? 'Dashboard' : pathname.replace('/', '').replace(/-/g, ' ')}
          </span>
        </nav>
      </div>

      {/* Right Section: Controls & Profile */}
      <div className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx,.xls"
          className="hidden"
        />

        <Link
          href="/campaigns/new"
          id="header-create-campaign-btn"
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md rounded-xl px-4 py-2 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4 text-white stroke-[2.5]" />
          <span>Create Campaign</span>
        </Link>

        <Button
          variant="primary"
          size="sm"
          onClick={handleImportLeadsClick}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md rounded-xl px-4 py-2 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Upload className="h-4 w-4 text-white" />
          <span>Import Leads File</span>
        </Button>

        {pathname.startsWith('/campaigns/new') && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-3.5 py-1.5 text-xs font-bold text-blue-800 shadow-2xs">
            <span className="text-[10px] uppercase font-mono text-blue-500 font-bold">Campaign Name:</span>
            <input
              type="text"
              value={currentHeaderCampName}
              placeholder="e.g. SaaS Outreach Q3"
              className="bg-transparent font-bold text-blue-950 outline-none text-xs w-32 sm:w-44 focus:w-56 transition-all font-sans"
              onChange={(e) => {
                setCurrentHeaderCampName(e.target.value);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('campaign_name_updated', { detail: e.target.value }));
                }
              }}
            />
          </div>
        )}

        {/* Profile Dropdown Badge */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 pr-3 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-xs">
              {userProfile.name.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'ZA'}
            </div>
            <span className="text-xs font-bold text-slate-700 hidden sm:inline-block">
              {userProfile.name.split(' ')[0] || 'Zakaria'}
            </span>
          </button>

          {/* Profile Menu Popup */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{userProfile.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{userProfile.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl"
                >
                  Account Settings
                </Link>
                <Link
                  href="/login"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW CAMPAIGN NAME PROMPT MODAL */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans text-left">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create New Campaign</h3>
                  <p className="text-xs text-slate-500 font-medium">Please enter a campaign name to get started.</p>
                </div>
              </div>
              <button
                onClick={() => setShowNameModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Campaign Name</label>
                <input
                  type="text"
                  autoFocus
                  value={inputCampaignName}
                  onChange={(e) => setInputCampaignName(e.target.value)}
                  placeholder="e.g. SaaS Outreach Q3"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNameModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inputCampaignName.trim()}
                  className={`rounded-xl px-5 py-2 text-xs font-bold text-white transition-all cursor-pointer ${
                    inputCampaignName.trim()
                      ? 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md shadow-blue-500/20 active:scale-95'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  Continue to Builder →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANYREACH.COM MATCH YOUR DATA MODAL */}
      <MatchDataModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        fileName={matchFileData.fileName}
        headers={matchFileData.headers}
        sampleRows={matchFileData.sampleRows}
        allRawRows={matchFileData.allRawRows}
        onImportSuccess={handleMatchImportSuccess}
      />
    </header>
  );
}
