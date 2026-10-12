import 'server-only';

import { NextRequest } from 'next/server';
import { AuthStore } from '@/lib/auth/auth-store';
import { SessionManager } from '@/lib/auth/session';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

export type PersistenceContext = {
  appUserId: string;
  organizationId: string;
  role: 'OWNER' | 'MEMBER';
  emailNormalized: string;
};

export class PersistenceAuthorizationError extends Error {}

const normalizeEmail = (email: string) => email.toLowerCase().trim();

/**
 * Establishes the durable bridge from a verified custom session. Callers never
 * receive authority from request-body user, organization, or role values.
 */
export async function resolvePersistenceContext(request: NextRequest): Promise<PersistenceContext> {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) throw new PersistenceAuthorizationError('Authentication is required.');

  const user = AuthStore.getUserByEmail(session.email);
  if (!user || user.id !== session.userId || user.isSuspended) {
    throw new PersistenceAuthorizationError('The active account is not eligible for persistent data access.');
  }

  const client = getSupabaseAdminClient();
  if (!client) throw new Error('Durable storage is not configured.');
  const emailNormalized = normalizeEmail(user.email);

  let { data: appUser, error } = await client
    .from('app_users')
    .select('id, legacy_authstore_user_id, email_normalized')
    .eq('legacy_authstore_user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not resolve durable identity: ${error.message}`);

  if (!appUser) {
    const byEmail = await client.from('app_users').select('id, legacy_authstore_user_id, email_normalized').eq('email_normalized', emailNormalized).maybeSingle();
    if (byEmail.error) throw new Error(`Could not reconcile durable identity: ${byEmail.error.message}`);
    if (byEmail.data && byEmail.data.legacy_authstore_user_id !== user.id) {
      throw new PersistenceAuthorizationError('This email has an ambiguous durable identity and requires review.');
    }
    const created = await client.from('app_users').insert({ legacy_authstore_user_id: user.id, email_normalized: emailNormalized, display_name: user.name }).select('id, legacy_authstore_user_id, email_normalized').single();
    if (created.error) {
      const retried = await client.from('app_users').select('id, legacy_authstore_user_id, email_normalized').eq('legacy_authstore_user_id', user.id).maybeSingle();
      if (retried.error || !retried.data) throw new Error(`Could not create durable identity: ${created.error.message}`);
      appUser = retried.data;
    } else {
      appUser = created.data;
    }
  }

  const membership = await client
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('app_user_id', appUser.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membership.error) throw new Error(`Could not resolve organization membership: ${membership.error.message}`);

  if (!membership.data) {
    // The unique personal-owner key makes a retry safe after a partial first request.
    const organization = await client.from('app_organizations').upsert({ name: `${user.name || emailNormalized}'s Organization`, kind: 'personal', personal_owner_app_user_id: appUser.id }, { onConflict: 'personal_owner_app_user_id', ignoreDuplicates: true }).select('id').maybeSingle();
    let organizationId = organization.data?.id;
    if (organization.error || !organizationId) {
      const existingOrganization = await client.from('app_organizations').select('id').eq('personal_owner_app_user_id', appUser.id).maybeSingle();
      if (existingOrganization.error || !existingOrganization.data) throw new Error(`Could not create personal organization: ${organization.error?.message || 'unknown error'}`);
      organizationId = existingOrganization.data.id;
    }
    const createdMembership = await client.from('organization_memberships').upsert({ organization_id: organizationId, app_user_id: appUser.id, role: 'OWNER' }, { onConflict: 'organization_id,app_user_id', ignoreDuplicates: true }).select('organization_id, role').maybeSingle();
    if (createdMembership.error || !createdMembership.data) {
      const existingMembership = await client.from('organization_memberships').select('organization_id, role').eq('organization_id', organizationId).eq('app_user_id', appUser.id).maybeSingle();
      if (existingMembership.error || !existingMembership.data) throw new Error(`Could not create organization membership: ${createdMembership.error?.message || 'unknown error'}`);
      return { appUserId: appUser.id, organizationId: existingMembership.data.organization_id, role: existingMembership.data.role as 'OWNER', emailNormalized };
    }
    return { appUserId: appUser.id, organizationId: createdMembership.data.organization_id, role: createdMembership.data.role as 'OWNER', emailNormalized };
  }

  return { appUserId: appUser.id, organizationId: membership.data.organization_id, role: membership.data.role as 'OWNER' | 'MEMBER', emailNormalized };
}
