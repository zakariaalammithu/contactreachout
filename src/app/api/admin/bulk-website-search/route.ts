import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuthStore } from '@/lib/auth/auth-store';
import { AdminLeadStore, type AdminLeadItem } from '@/lib/services/admin-lead-store';

export const dynamic = 'force-dynamic';

const MAX_URLS = 100;
const FETCH_TIMEOUT_MS = 10000;
const FETCH_CONCURRENCY = 5;

function cleanText(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeInput(raw: string): { url: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: 'Empty URL.' };
  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { error: 'Invalid URL.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http(s) URLs are allowed.' };
  }
  return { url: parsed.toString() };
}

function extractPageTitle(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return fallback;
  const cleaned = cleanText(match[1].replace(/<[^>]*>/g, ''));
  return cleaned || fallback;
}

function extractMetaDescription(html: string): string | null {
  const nameFirst = html.match(/<meta[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i);
  if (nameFirst) return cleanText(nameFirst[1]) || null;
  const contentFirst = html.match(/<meta[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']description["']/i);
  if (contentFirst) return cleanText(contentFirst[1]) || null;
  return null;
}

function extractContactPageUrl(html: string, baseUrl: string): string | null {
  const anchorRe = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href) continue;
    const lower = href.toLowerCase();
    if (lower.startsWith('mailto:') || lower.startsWith('tel:') || lower.startsWith('javascript:') || lower.startsWith('#')) {
      continue;
    }
    if (!lower.includes('contact')) continue;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return null;
    }
  }
  return null;
}

async function searchOne(
  rawUrl: string,
  index: number,
  listName: string,
  ownerEmail: string,
  ownerUserId: string,
  ownerName: string
): Promise<{ created?: AdminLeadItem; failed?: { url: string; error: string } }> {
  const normalized = normalizeInput(rawUrl);
  if ('error' in normalized) {
    return { failed: { url: rawUrl.trim(), error: normalized.error } };
  }

  let res: Response;
  try {
    res = await fetch(normalized.url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'ContactReachout Bulk Website Search' },
    });
  } catch (err: any) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return { failed: { url: rawUrl.trim(), error: timedOut ? 'Request timed out (10s).' : 'Fetch failed.' } };
  }

  if (!res.ok) {
    return { failed: { url: rawUrl.trim(), error: `HTTP ${res.status}.` } };
  }

  const finalUrl = res.url || normalized.url;
  let finalParsed: URL;
  try {
    finalParsed = new URL(finalUrl);
  } catch {
    return { failed: { url: rawUrl.trim(), error: 'Invalid final URL.' } };
  }

  const html = await res.text();
  const domain = finalParsed.hostname;
  const title = extractPageTitle(html, domain);
  const description = extractMetaDescription(html);
  const contactPageUrl = extractContactPageUrl(html, finalUrl);

  const lead = AdminLeadStore.saveLead({
    id: `bulk-${Date.now()}-${index}`,
    companyName: title,
    domain,
    website: finalParsed.origin,
    contactPageUrl,
    status: 'UNCONTACTED',
    ownerEmail,
    ownerUserId,
    ownerName,
    listName,
    createdAt: new Date().toISOString(),
    customFields: description ? { Description: description } : {},
  });

  return { created: lead };
}

/**
 * Bulk website search: fetch many company websites at once and turn each
 * into a lead. Company info comes from the page itself (title, meta
 * description, contact-page link) — no job titles, emails, or other data
 * are invented for these leads.
 */
export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const urls = Array.isArray(body.urls) ? body.urls.filter((u: any) => typeof u === 'string' && u.trim()) : [];
  if (urls.length === 0) {
    return NextResponse.json({ error: 'Provide at least one URL.' }, { status: 400 });
  }
  if (urls.length > MAX_URLS) {
    return NextResponse.json({ error: `Maximum ${MAX_URLS} URLs per search.` }, { status: 400 });
  }

  const requestedListName = typeof body.listName === 'string' ? body.listName.trim() : '';
  const listName = requestedListName || `Bulk Website Search ${new Date().toISOString().slice(0, 10)}`;
  const ownerEmail = session.email.toLowerCase().trim();
  const ownerName = AuthStore.getUserByEmail(ownerEmail)?.name || '';

  const created: AdminLeadItem[] = [];
  const failed: Array<{ url: string; error: string }> = [];

  for (let i = 0; i < urls.length; i += FETCH_CONCURRENCY) {
    const batch = urls.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map((rawUrl: string, batchIndex: number) =>
        searchOne(rawUrl, i + batchIndex, listName, ownerEmail, session.userId, ownerName)
      )
    );
    for (const result of results) {
      if (result.created) created.push(result.created);
      if (result.failed) failed.push(result.failed);
    }
  }

  return NextResponse.json({ created, failed });
}
