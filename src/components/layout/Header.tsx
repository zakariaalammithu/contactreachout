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
  User,
  UserCheck,
  Building2,
  Settings,
  ChevronDown,
  Check,
  LifeBuoy,
  Scale,
  LockKeyhole,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { MatchDataModal } from '@/components/leads/MatchDataModal';
import { LogoutModal } from '@/components/ui/LogoutModal';
import {
  parseSpreadsheetPreview,
  suggestColumnMappings,
  processImportRows,
} from '@/lib/services/import-service';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  initialUserProfile?: { name: string; email: string };
}

export function Header({ onOpenMobileMenu, initialUserProfile }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>([]);
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

  const [userProfile, setUserProfile] = useState<{ name: string; email: string }>(initialUserProfile || {
    name: 'ContactReachout Team',
    email: 'hello@contactreachout.com',
  });

  const userMenuRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string): string => {
    if (!name) return 'ZM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => undefined);
    if (typeof window !== 'undefined') localStorage.removeItem('active_account_email');
    setUserMenuOpen(false);
    router.replace('/login?tab=signin');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetch('/api/notifications', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => undefined);

    if (initialUserProfile?.email) {
      setUserProfile(initialUserProfile);
    } else if (typeof window !== 'undefined') {
      const localEmail = (localStorage.getItem('active_account_email') || localStorage.getItem('user_auth_email') || '').toLowerCase().trim();
      if (localEmail) {
        const savedSender = localStorage.getItem('user_sender_profile');
        let savedName = '';
        if (savedSender) {
          try {
            const p = JSON.parse(savedSender);
            if (p.name && p.name.trim()) savedName = p.name.trim();
          } catch (err) {}
        }
        if (!savedName) {
          savedName = localEmail === 'mithusquare@gmail.com' ? 'Zakaria Alam Mithu' : localEmail.split('@')[0];
        }
        setUserProfile({ name: savedName, email: localEmail });
      }
    }
  }, [initialUserProfile]);




  // Listen for campaign name updates from editor. Next.js will prefetch links on demand.
  useEffect(() => {
    const handleNameChange = (e: any) => {
      if (e.detail) setCurrentHeaderCampName(e.detail);
    };
    window.addEventListener('campaign_name_updated', handleNameChange);
    return () => window.removeEventListener('campaign_name_updated', handleNameChange);
  }, []);

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

  const safeParseJSON = <T,>(jsonString: string | null, fallback: T): T => {
    if (!jsonString || typeof jsonString !== 'string') return fallback;
    try {
      const parsed = JSON.parse(jsonString);
      return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const handleMatchImportSuccess = (validLeads: any[], listInfo: any) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_imported_leads');
      const existing = safeParseJSON<any[]>(stored, []);
      const mergedLeads = [...validLeads, ...existing];
      localStorage.setItem('user_imported_leads', JSON.stringify(mergedLeads));

      // Save list metadata
      const storedLists = localStorage.getItem('user_lead_lists');
      const existingLists = safeParseJSON<any[]>(storedLists, []);
      localStorage.setItem('user_lead_lists', JSON.stringify([listInfo, ...existingLists]));

      // Dispatch custom event so active page updates immediately
      window.dispatchEvent(new CustomEvent('leads_imported_directly', { detail: validLeads }));

      alert(`✅ Success! Imported ${validLeads.length} leads from "${listInfo.fileName}" directly into your account!`);
    }
  };

  const handleCreateCampaignSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = inputCampaignName.trim() || `Campaign ${new Date().toLocaleDateString()}`;
    const now = new Date().toISOString();
    const id = `campaign-${Date.now()}`;
    const campaigns = safeParseJSON<any[]>(localStorage.getItem('user_campaigns'), []);
    campaigns.unshift({ id, name: finalName, tag: 'CUSTOM', status: 'draft', createdAt: now, updatedAt: now, selectedListId: '', prospectsList: [], sequences: [], isDryRun: false, rateLimitPerMinute: 10, maxConcurrency: 5, sentCount: 0, failedCount: 0, noFormCount: 0, captchaCount: 0 });
    localStorage.setItem('user_campaigns', JSON.stringify(campaigns));
    setShowNameModal(false);
    setInputCampaignName('');
    router.push(`/campaigns/new?edit=${encodeURIComponent(id)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md font-sans">
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
          <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
            <Home className="h-3.5 w-3.5" />
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="capitalize font-semibold text-slate-800">
            {pathname === '/dashboard' ? 'Dashboard' : pathname.replace('/', '').replace(/-/g, ' ')}
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

        {pathname.startsWith('/campaigns/new') && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-3.5 py-1.5 text-xs font-bold text-blue-800 shadow-2xs">
            <span className="text-[10px] uppercase font-mono text-blue-500 font-bold">Campaign Name:</span>
            <span className="font-bold text-blue-950 text-xs font-sans max-w-[200px] truncate">
              {currentHeaderCampName || 'New campaign'}
            </span>
          </div>
        )}

        {/* User Profile / Account Switcher Controls */}
        <div className="flex items-center gap-2.5 relative" ref={userMenuRef}>
          {/* User Full Name Pill with Dropdown Arrow */}
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            <span className="truncate max-w-[150px] sm:max-w-[220px]">
              {userProfile?.name || 'Zakaria Alam Mithu'}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationOpen((open) => !open)}
              aria-label="Notifications"
              className="relative grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0e6de4] transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {notifications.some((item) => !item.read) && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>
            {notificationOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-extrabold text-slate-900">Notifications</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length ? (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          if (!item.read) {
                            await fetch('/api/notifications', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: item.id }),
                            });
                            setNotifications((current) =>
                              current.map((candidate) =>
                                candidate.id === item.id ? { ...candidate, read: true } : candidate
                              )
                            );
                          }
                        }}
                        className={`block w-full border-b border-slate-100 px-4 py-3 text-left ${
                          item.read ? 'bg-white' : 'bg-blue-50/70'
                        }`}
                      >
                        <p className="text-xs font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">{item.message}</p>
                      </button>
                    ))
                  ) : (
                    <p className="p-6 text-center text-sm text-slate-500">No new notifications.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar Circle */}
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0e6de4] text-xs font-extrabold text-white shadow-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            title={userProfile?.name || 'Account'}
          >
            {getInitials(userProfile?.name || 'Zakaria Alam Mithu')}
          </button>

          {/* Manyreach-Style Profile / Account Switcher Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl bg-white p-3 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-150 font-sans text-slate-800">
              {/* SECTION 1: SELECT YOUR ACCOUNT */}
              <div className="px-2 py-1 mb-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  SELECT YOUR ACCOUNT
                </p>
              </div>

              {/* Active Account Item */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-xs font-semibold text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0e6de4] text-white font-bold text-xs shrink-0 shadow-2xs">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <span className="truncate">{userProfile?.name || 'Zakaria Alam Mithu'}</span>
                    <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md shrink-0">
                      [main]
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 font-normal truncate">
                    {userProfile?.email || 'hello@contactreachout.com'}
                  </p>
                </div>
                <Check className="h-4 w-4 text-blue-600 shrink-0 stroke-[2.5]" />
              </div>

              <div className="my-2.5 border-b border-slate-100" />

              {/* SECTION 2: WORKSPACE ACCOUNTS */}
              <div className="px-2 py-1 flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  WORKSPACE ACCOUNTS
                </p>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title="Workspace Settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-0.5 pt-1">
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                >
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  <span>Account & Profile Settings</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span>Manage Workspaces</span>
                </Link>
              </div>

              <div className="my-2.5 border-b border-slate-100" />

              {/* SECTION 3: HELP & LEGAL */}
              <div className="px-2 py-1 flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  HELP & LEGAL
                </p>
              </div>

              <div className="space-y-0.5 pt-1">
                <Link
                  href="/help"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                >
                  <LifeBuoy className="h-4 w-4 text-slate-400" />
                  <span>Help & Support</span>
                </Link>

                <Link
                  href="/terms"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                >
                  <Scale className="h-4 w-4 text-slate-400" />
                  <span>Terms & Conditions</span>
                </Link>

                <Link
                  href="/privacy"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                >
                  <LockKeyhole className="h-4 w-4 text-slate-400" />
                  <span>Privacy Policy</span>
                </Link>
              </div>

              <div className="my-2.5 border-b border-slate-100" />

              {/* SECTION 4: LOG OUT */}
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>Log Out</span>
              </button>
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
                      ? 'bg-[#0e6de4] hover:bg-[#0758bd] shadow-md shadow-blue-500/20 active:scale-95'
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

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleSignOut}
      />
    </header>
  );
}
