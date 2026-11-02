/**
 * Admin action audit (2026-11-02, admin management batch). Server-only.
 *
 * Every admin management action writes TWO records:
 *  1. The durable admin_action_logs table (migration 20261102000003) —
 *     the permanent record. Best-effort: while the migration is unapplied
 *     the write is skipped and the caller gets stored=false (the action
 *     itself still fails closed where it needs the tables; credit-only
 *     actions do not depend on this table).
 *  2. The in-memory AuditLogService — so the action appears on
 *     /admin/logs immediately, alongside the existing trail.
 *
 * request_id is the idempotency key for package/date actions: replaying
 * the same admin request returns the previous result instead of applying
 * twice. hasAdminAction() answers that lookup; a missing table answers
 * false (no durable record exists to replay from).
 */

import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { AuditLogService } from './audit-log-service';

export type AdminActionRecord = {
  actorEmail: string;
  action: string;
  targetEmail: string;
  reason: string;
  details?: Record<string, any>;
  requestId?: string;
};

function isMissingTableError(error: any): boolean {
  const code = (error as any)?.code;
  if (code === 'PGRST205' || code === '42P01') return true;
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('admin_action_logs') && /does not exist|could not find the table|schema cache/i.test(message);
}

/** True when an action with this requestId was already recorded. */
export async function hasAdminAction(requestId: string, action: string): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client || !requestId) return false;
  try {
    const { data, error } = await client
      .from('admin_action_logs')
      .select('id')
      .eq('request_id', requestId)
      .eq('action', action)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
}

/**
 * Records an admin action. Returns stored=true when the durable row was
 * written. The in-memory trail is always written (it never throws for a
 * missing table). Never throws for a missing durable table.
 */
export async function recordAdminAction(input: AdminActionRecord): Promise<{ stored: boolean }> {
  AuditLogService.log({
    userId: input.actorEmail,
    userEmail: input.actorEmail,
    action: input.action as any,
    resourceType: 'user',
    resourceId: input.targetEmail,
    metadata: {
      targetEmail: input.targetEmail,
      reason: input.reason,
      performedBy: input.actorEmail,
      ...(input.details || {}),
    },
  });

  const client = getSupabaseAdminClient();
  if (!client) return { stored: false };
  try {
    const { error } = await client.from('admin_action_logs').insert({
      actor_email: input.actorEmail,
      action: input.action,
      target_email: input.targetEmail.toLowerCase().trim(),
      reason: input.reason,
      details: input.details || {},
      request_id: input.requestId || null,
    });
    if (error) throw error;
    return { stored: true };
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('[admin-actions] durable log skipped: table missing (migration not applied).');
      return { stored: false };
    }
    // A genuine write failure must not silently drop the audit trail:
    // surface it so the caller can report stored=false honestly.
    console.error('[admin-actions] durable log write failed.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { stored: false };
  }
}

/** Durable action rows for one user, newest first (missing table → []). */
export async function listAdminActionsForUser(targetEmail: string): Promise<Array<{
  id: string;
  actorEmail: string;
  action: string;
  reason: string;
  details: Record<string, any>;
  createdAt: string;
}>> {
  const client = getSupabaseAdminClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('admin_action_logs')
      .select('*')
      .eq('target_email', targetEmail.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      reason: row.reason,
      details: row.details || {},
      createdAt: row.created_at,
    }));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}
