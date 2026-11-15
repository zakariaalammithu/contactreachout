/**
 * Durable user registry sync (2026-11-15, new-user-invisible-in-admin bug).
 * Server-only.
 *
 * Problem: AuthStore is a per-serverless-instance in-memory Map. A user
 * created by signup (email OTP or Google) exists only on the instance
 * that handled the signup; the Admin Users list (GET /api/admin/users)
 * reads AuthStore.getAllUsers() on whatever instance serves it, so a new
 * user is invisible there — the owner sees only the seeded super-admin.
 * The durable home is public.app_users (service-role client bypasses
 * RLS): verify-otp writes a contact row for email signups, and the
 * Google callback now writes one too. This module is the bridge: list
 * and materialize durable rows into the local registry so the admin
 * panel sees and can manage every registered user.
 *
 * Safety: a materialized record is created with a RANDOM unusable
 * password and isEmailVerified=true (a durable row only exists for a
 * verified signup or a profile save). The random password matters: the
 * signin route signs a verified user in directly when NO password hash
 * exists, so a password-less verified record would let anyone in with
 * any password. Google users sign in via the Google callback, which
 * links their googleSub onto the materialized record.
 */
import 'server-only';

import { randomBytes } from 'node:crypto';
import { AuthStore, type UserAccount } from '@/lib/auth/auth-store';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

export type DurableUserRow = {
  email: string;
  name: string;
  company: string;
  createdAt: string;
};

const MAX_SYNC_USERS = 500;

type RawRow = {
  email_normalized?: string | null;
  display_name?: string | null;
  company_name?: string | null;
  created_at?: string | null;
};

function toRow(data: RawRow): DurableUserRow | null {
  const email = (data.email_normalized || '').toLowerCase().trim();
  if (!email || !email.includes('@')) return null;
  return {
    email,
    name: (data.display_name || '').trim(),
    company: (data.company_name || '').trim(),
    createdAt: (data.created_at || '').trim(),
  };
}

function toRows(data: unknown): DurableUserRow[] {
  if (!Array.isArray(data)) return [];
  const rows: DurableUserRow[] = [];
  for (const item of data as RawRow[]) {
    const row = toRow(item || {});
    if (row) rows.push(row);
  }
  return rows;
}

/** All durable user rows, newest first. [] when Supabase is unavailable — never throws. */
export async function listDurableUsers(): Promise<DurableUserRow[]> {
  const client = getSupabaseAdminClient();
  if (!client) return [];
  try {
    const full = await client
      .from('app_users')
      .select('email_normalized, display_name, company_name, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_SYNC_USERS);
    if (!full.error && full.data) return toRows(full.data);
    // company_name lives behind migration 20261111000001; if it is not
    // applied yet, the full select fails — retry without it.
    const legacy = await client
      .from('app_users')
      .select('email_normalized, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_SYNC_USERS);
    if (legacy.error || !legacy.data) return [];
    return toRows(legacy.data);
  } catch {
    return [];
  }
}

async function fetchDurableRow(email: string): Promise<DurableUserRow | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;
  const key = email.toLowerCase().trim();
  try {
    const full = await client
      .from('app_users')
      .select('email_normalized, display_name, company_name, created_at')
      .eq('email_normalized', key)
      .maybeSingle();
    if (!full.error && full.data) return toRow(full.data as RawRow);
    const legacy = await client
      .from('app_users')
      .select('email_normalized, display_name, created_at')
      .eq('email_normalized', key)
      .maybeSingle();
    if (legacy.error || !legacy.data) return null;
    return toRow(legacy.data as RawRow);
  } catch {
    return null;
  }
}

function materializeRow(row: DurableUserRow): UserAccount | null {
  try {
    const created = AuthStore.createUser({
      name: row.name || row.email.split('@')[0],
      email: row.email,
      // Random unusable password (see header): a verified record with
      // no password hash would pass the signin route's fall-through.
      password: randomBytes(32).toString('base64url'),
      company: row.company || undefined,
      isEmailVerified: true,
      plan: 'Free',
    });
    if (row.createdAt) {
      try {
        AuthStore.updateUser(row.email, { createdAt: row.createdAt });
      } catch {
        // Keep the creation time; the record itself is what matters.
      }
    }
    return AuthStore.getUserByEmail(row.email) || created;
  } catch {
    // A concurrent creation on this instance wins; return whatever is there.
    return AuthStore.getUserByEmail(row.email);
  }
}

/**
 * Ensure an AuthStore record exists for this email, materializing one
 * from the durable row when the local registry does not have it. Returns
 * the record or null (no durable row). Never throws. The primary super
 * admin is seeded on every instance and is never fabricated.
 */
export async function ensureUserInRegistry(email: string): Promise<UserAccount | null> {
  const key = email.toLowerCase().trim();
  if (!key || !key.includes('@')) return null;
  const existing = AuthStore.getUserByEmail(key);
  if (existing) return existing;
  if (key === AuthStore.PRIMARY_SUPER_ADMIN_EMAIL) return null;
  const row = await fetchDurableRow(key);
  if (!row) return null;
  return materializeRow(row);
}

/**
 * Materialize every durable user missing from the local registry.
 * Returns how many were synced. Never throws.
 */
export async function syncDurableUsersIntoRegistry(): Promise<number> {
  const rows = await listDurableUsers();
  let synced = 0;
  for (const row of rows) {
    if (AuthStore.getUserByEmail(row.email)) continue;
    if (row.email === AuthStore.PRIMARY_SUPER_ADMIN_EMAIL) continue;
    if (materializeRow(row)) synced += 1;
  }
  return synced;
}

/**
 * Best-effort delete of the durable row, so an admin-deleted user does
 * not resurrect on the next sync. Never throws.
 */
export async function deleteDurableUser(email: string): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('app_users')
      .delete()
      .eq('email_normalized', email.toLowerCase().trim());
    return !error;
  } catch {
    return false;
  }
}
