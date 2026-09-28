'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Camera, Save, UserCircle, Bot, User } from 'lucide-react';
import { AIPersonalizationSettings } from '@/components/profile/AIPersonalizationSettings';
import { ContactReplySettings } from '@/components/profile/ContactReplySettings';


type Profile = { name: string; email: string; phone: string; avatarUrl: string; replyEmail?: string; createdAt?: string };

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'ai'>('profile');
  const [profile, setProfile] = useState<Profile>({ name: '', email: '', phone: '', avatarUrl: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setProfile(payload.user);
      })
      .catch((error) => setMessage(error.message || 'Unable to load profile.'));
  }, []);

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
      setMessage('Choose an image smaller than 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfile((current) => ({ ...current, avatarUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Profile updated successfully.' : payload.error || 'Unable to update profile.');
    if (response.ok) {
      localStorage.setItem(
        'user_sender_profile',
        JSON.stringify({ ...JSON.parse(localStorage.getItem('user_sender_profile') || '{}'), ...payload.user })
      );
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0e6de4]">Account Settings</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Settings & Profile</h1>
        <p className="mt-2 text-sm text-slate-500">Manage your personal profile, contact reply settings, and AI personalization provider settings.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#0e6de4] text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>AI Personalization</span>
        </button>
      </div>

      {activeTab === 'profile' ? (
        <div className="space-y-6">
          <ContactReplySettings />
        </div>
      ) : (
        <AIPersonalizationSettings />
      )}
    </div>
  );
}

function ProfileField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0e6de4] disabled:bg-slate-50 disabled:text-slate-500 font-medium"
      />
    </label>
  );
}
