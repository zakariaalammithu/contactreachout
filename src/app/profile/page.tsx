'use client';

import { useState } from 'react';
import { Bot, User } from 'lucide-react';
import { AIPersonalizationSettings } from '@/components/profile/AIPersonalizationSettings';
import { ContactReplySettings } from '@/components/profile/ContactReplySettings';
import { GmailMailboxSettings } from '@/components/settings/GmailMailboxSettings';


export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'ai'>('profile');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-400">Account Settings</p>
        <h1 className="mt-2 text-3xl font-black text-white">Settings & Profile</h1>
        <p className="mt-2 text-sm text-zinc-400">Manage your personal profile, contact reply settings, and AI personalization provider settings.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#0e6de4] text-white shadow-2xs'
              : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900 border border-zinc-800'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile & Contact Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-[#0e6de4] text-white shadow-2xs'
              : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900 border border-zinc-800'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>AI Personalization</span>
        </button>
      </div>

      {activeTab === 'profile' ? (
        <div className="space-y-6">
          <ContactReplySettings />
          <GmailMailboxSettings />
        </div>
      ) : (
        <AIPersonalizationSettings />
      )}
    </div>
  );
}

