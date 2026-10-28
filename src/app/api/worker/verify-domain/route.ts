import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

export const dynamic = 'force-dynamic';

/**
 * Worker callback for dynamic campaign-lead verification.
 *
 * The browser worker asks: is this host a lead attached to any campaign?
 * A "yes" authorizes the submission without the host being pre-registered
 * in BROWSER_WORKER_ALLOWED_DOMAINS, so bulk outreach to new domains needs
 * no env edit or redeploy — adding the lead to a campaign is enough.
 * Draft campaigns' leads verify too, so test campaigns work.
 *
 * Security: Bearer-gated with the shared worker secret (the same secret
 * that gates /submit), returns only a boolean, never lead data. An
 * unauthenticated, malformed, or unavailable request denies the target.
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.BROWSER_WORKER_AUTH_SECRET;
  if (!secret) return false;
  const presented = request.headers.get('authorization');
  if (!presented) return false;
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  let host = value.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, '').replace(/^www\./, '');
  host = host.split(/[/:?#]/)[0] || '';
  return host || null;
}

function hostOfWebsite(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = value.includes('://') ? value : `https://${value}`;
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return normalizeDomain(value);
  }
}

function emailDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 0) return null;
  return normalizeDomain(email.slice(at + 1));
}

type LeadContact = { id: string; email: string | null; domain: string | null; website: string | null };

function hostMatchesLead(host: string, lead: LeadContact): boolean {
  const candidates = [normalizeDomain(lead.domain), hostOfWebsite(lead.website), emailDomain(lead.email)].filter(
    (value): value is string => Boolean(value),
  );
  return candidates.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const domain = normalizeDomain(request.nextUrl.searchParams.get('domain'));
  if (!domain) return NextResponse.json({ error: 'Missing domain.' }, { status: 400 });
  const client = getSupabaseAdminClient();
  if (!client) return NextResponse.json({ error: 'Unavailable.' }, { status: 503 });

  const links = await client.from('app_campaign_leads').select('app_lead_id');
  if (links.error) return NextResponse.json({ error: 'Unavailable.' }, { status: 503 });
  const leadIds = [...new Set(((links.data || []) as Array<{ app_lead_id: string }>).map((row) => row.app_lead_id))];
  if (!leadIds.length) return NextResponse.json({ allowed: false });

  const leads = await client.from('app_leads').select('id, email, domain, website').in('id', leadIds);
  if (leads.error) return NextResponse.json({ error: 'Unavailable.' }, { status: 503 });
  const rows = (leads.data || []) as LeadContact[];
  return NextResponse.json({ allowed: rows.some((lead) => hostMatchesLead(domain, lead)) });
}
