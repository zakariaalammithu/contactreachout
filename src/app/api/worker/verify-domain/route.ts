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
 *
 * Implementation (2026-11-17): candidates are fetched with filtered
 * point lookups (in/ilike), NOT a full-table list. The old list scan of
 * app_campaign_leads returned only 90 rows while the table has 120 (a
 * frozen/truncated list view), so new campaign leads never verified.
 * Point lookups DO see new rows — proven live 2026-11-17, when a point
 * lookup for fxshouldersolutions.com found both the lead and its
 * campaign link while the list still returned 90. The match itself is
 * unchanged (hostMatchesLead, same as before).
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
  if (!client) {
    // This log is the only visibility into the worker -> app callback:
    // the Nov-11/12 new-domain denies recurred with zero evidence after
    // the Nov-4 temporary log was removed, so it stays. Domain + boolean
    // + counts only; never secrets, emails, or lead data.
    console.log(`[verify-domain] domain=${domain} allowed=false error=no-client`);
    return NextResponse.json({ error: 'Unavailable.' }, { status: 503 });
  }

  // Hosts to match: the host itself plus its parent domains, so a lead
  // registered as example.com also verifies sub.example.com. The bare
  // TLD is excluded (a '%com%' website filter would match everything).
  const parentHosts = [domain];
  let rest = domain;
  while (rest.includes('.')) {
    rest = rest.slice(rest.indexOf('.') + 1);
    if (rest.includes('.')) parentHosts.push(rest);
  }

  const byDomain = await client.from('app_leads').select('id, email, domain, website').in('domain', parentHosts);
  if (byDomain.error) {
    console.log(`[verify-domain] domain=${domain} allowed=false error=leads`);
    return NextResponse.json({ error: 'Unavailable.' }, { status: 503 });
  }
  const candidatesById = new Map<string, LeadContact>();
  for (const lead of (byDomain.data || []) as LeadContact[]) candidatesById.set(lead.id, lead);
  let matched = [...candidatesById.values()].filter((lead) => hostMatchesLead(domain, lead));
  if (!matched.length) {
    // Fallback for leads whose domain field is empty but whose website
    // or email domain matches — the same cases the old list scan covered.
    // The broad ilike filter only gathers candidates; hostMatchesLead
    // below still applies the precise match, so a substring hit never
    // allows a non-lead domain.
    const orFilter = [
      ...parentHosts.map((host) => `website.ilike.%${host}%`),
      ...parentHosts.map((host) => `email.ilike.%@${host}`),
    ].join(',');
    const byFallback = await client.from('app_leads').select('id, email, domain, website').or(orFilter);
    if (byFallback.error) {
      console.log(`[verify-domain] domain=${domain} allowed=false error=leads-fallback`);
      return NextResponse.json({ error: 'Unavailable.' }, { status: 503 });
    }
    for (const lead of (byFallback.data || []) as LeadContact[]) candidatesById.set(lead.id, lead);
    matched = [...candidatesById.values()].filter((lead) => hostMatchesLead(domain, lead));
  }
  const matchedIds = [...new Set(matched.map((lead) => lead.id))];
  let allowed = false;
  if (matchedIds.length) {
    const links = await client.from('app_campaign_leads').select('app_lead_id').in('app_lead_id', matchedIds);
    if (links.error) {
      console.log(`[verify-domain] domain=${domain} allowed=false error=links`);
      return NextResponse.json({ error: 'Unavailable.' }, { status: 503 });
    }
    allowed = (links.data || []).length > 0;
  }
  console.log(`[verify-domain] domain=${domain} allowed=${allowed} candidates=${candidatesById.size} matched=${matched.length}`);
  return NextResponse.json({ allowed });
}
