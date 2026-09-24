import { MessageTemplate } from '@/types';

export interface UserMessageTemplate {
  id: string;
  ownerEmail: string;
  name: string;
  subject: string;
  body: string;
  category: 'initial' | 'followup' | 'general';
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'user_message_templates';

/**
 * Resolves current user email from local storage active session or sender profile.
 */
export function getCurrentUserEmail(): string {
  if (typeof window === 'undefined') return 'default_user';
  try {
    const active = localStorage.getItem('active_account_email');
    if (active && active.trim()) return active.trim().toLowerCase();

    const senderProfile = localStorage.getItem('user_sender_profile');
    if (senderProfile) {
      const parsed = JSON.parse(senderProfile);
      if (parsed.email && String(parsed.email).includes('@')) {
        return String(parsed.email).trim().toLowerCase();
      }
    }

    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const parsed = JSON.parse(currentUser);
      if (parsed.email && String(parsed.email).includes('@')) {
        return String(parsed.email).trim().toLowerCase();
      }
    }
  } catch (e) {
    // ignore parse errors
  }
  return 'default_user@contactreachout.local';
}

/**
 * Get all templates owned by the specified user (or active user).
 * STRICT USER ISOLATION: Filters strictly by ownerEmail.
 */
export function getUserTemplates(ownerEmail?: string): UserMessageTemplate[] {
  if (typeof window === 'undefined') return [];
  const targetEmail = (ownerEmail || getCurrentUserEmail()).toLowerCase();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: UserMessageTemplate[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((item) => (item.ownerEmail || '').toLowerCase() === targetEmail);
  } catch (e) {
    console.error('Failed to parse user message templates:', e);
    return [];
  }
}

/**
 * Save a new user-scoped message template.
 */
export function saveUserTemplate(
  data: {
    name: string;
    subject?: string;
    body: string;
    category?: 'initial' | 'followup' | 'general';
  },
  ownerEmail?: string
): UserMessageTemplate {
  const targetEmail = (ownerEmail || getCurrentUserEmail()).toLowerCase();
  const now = new Date().toISOString();
  const newTemplate: UserMessageTemplate = {
    id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ownerEmail: targetEmail,
    name: data.name.trim(),
    subject: (data.subject || '').trim(),
    body: data.body || '',
    category: data.category || 'general',
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: UserMessageTemplate[] = raw ? JSON.parse(raw) : [];
      list.unshift(newTemplate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save user message template:', e);
    }
  }

  return newTemplate;
}

/**
 * Update an existing user message template.
 */
export function updateUserTemplate(
  id: string,
  updates: Partial<Omit<UserMessageTemplate, 'id' | 'ownerEmail' | 'createdAt'>>,
  ownerEmail?: string
): UserMessageTemplate | null {
  const targetEmail = (ownerEmail || getCurrentUserEmail()).toLowerCase();
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: UserMessageTemplate[] = raw ? JSON.parse(raw) : [];
    let updatedItem: UserMessageTemplate | null = null;

    const newList = list.map((item) => {
      if (item.id === id && (item.ownerEmail || '').toLowerCase() === targetEmail) {
        updatedItem = {
          ...item,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return updatedItem;
      }
      return item;
    });

    if (updatedItem) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    }
    return updatedItem;
  } catch (e) {
    console.error('Failed to update user message template:', e);
    return null;
  }
}

/**
 * Duplicate a user message template.
 */
export function duplicateUserTemplate(id: string, ownerEmail?: string): UserMessageTemplate | null {
  const targetEmail = (ownerEmail || getCurrentUserEmail()).toLowerCase();
  const templates = getUserTemplates(targetEmail);
  const target = templates.find((t) => t.id === id);
  if (!target) return null;

  return saveUserTemplate(
    {
      name: `${target.name} (Copy)`,
      subject: target.subject,
      body: target.body,
      category: target.category,
    },
    targetEmail
  );
}

/**
 * Delete a user message template.
 * Deleting a template does NOT affect existing campaign messages.
 */
export function deleteUserTemplate(id: string, ownerEmail?: string): boolean {
  const targetEmail = (ownerEmail || getCurrentUserEmail()).toLowerCase();
  if (typeof window === 'undefined') return false;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: UserMessageTemplate[] = raw ? JSON.parse(raw) : [];
    const newList = list.filter(
      (item) => !(item.id === id && (item.ownerEmail || '').toLowerCase() === targetEmail)
    );

    if (newList.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      return true;
    }
  } catch (e) {
    console.error('Failed to delete user message template:', e);
  }
  return false;
}

/**
 * Record usage count and last used timestamp for a template.
 */
export function recordTemplateUsage(id: string, ownerEmail?: string): void {
  const targetEmail = (ownerEmail || getCurrentUserEmail()).toLowerCase();
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: UserMessageTemplate[] = raw ? JSON.parse(raw) : [];

    const newList = list.map((item) => {
      if (item.id === id && (item.ownerEmail || '').toLowerCase() === targetEmail) {
        return {
          ...item,
          usageCount: (item.usageCount || 0) + 1,
          lastUsedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  } catch (e) {
    console.error('Failed to record template usage:', e);
  }
}
