// Pure helpers for the CRM / Contact Lists filters (Apollo-style field
// filters + bulk website search). Kept free of React so they are unit
// testable. Leads here are the loosely-typed records the leads page
// carries (camelCase and snake_case field variants both occur).

export function normalizeDomain(value: string): string {
  let v = String(value || '').trim().toLowerCase();
  v = v.replace(/^https?:\/\//, '').replace(/^www\./, '');
  v = v.split('/')[0].split('?')[0].split('#')[0];
  return v.replace(/\.$/, '');
}

// Parse a pasted bulk website list (one per line, or comma/space
// separated). Normalizes each entry, drops empties and duplicates, and
// caps the result at 100 entries (Apollo-style bulk limit). Returns the
// applied domains plus how many raw entries were dropped by the cap.
export function parseBulkWebsites(input: string): { domains: string[]; truncated: number } {
  const raw = String(input || '')
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const domains: string[] = [];
  for (const entry of raw) {
    const normalized = normalizeDomain(entry);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      domains.push(normalized);
    }
  }
  const truncated = Math.max(0, domains.length - 100);
  return { domains: domains.slice(0, 100), truncated };
}

export interface LeadDetailFilters {
  jobTitle: string;
  name: string;
  company: string;
  website: string;
  country: string;
}

function includes(haystack: string, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return String(haystack || '').toLowerCase().includes(n);
}

// Apollo-style field filters: each non-empty field must match its own
// lead field (substring, case-insensitive). Name matches the full
// "first last" name; website matches the normalized domain.
export function matchesLeadDetails(lead: any, filters: LeadDetailFilters): boolean {
  const fullName = [lead.firstName || lead.first_name || '', lead.lastName || lead.last_name || '']
    .filter(Boolean)
    .join(' ');
  if (!includes(lead.title || '', filters.jobTitle)) return false;
  if (!includes(fullName, filters.name)) return false;
  if (!includes(lead.companyName || lead.company_name || '', filters.company)) return false;
  if (filters.website.trim()) {
    const needle = normalizeDomain(filters.website);
    const haystack = normalizeDomain(lead.domain || lead.website || '');
    if (!needle || !haystack.includes(needle)) return false;
  }
  if (!includes(lead.country || '', filters.country)) return false;
  return true;
}

// Bulk website search: a lead matches when its normalized domain is
// exactly one of the pasted domains.
export function matchesBulkDomains(lead: any, domains: string[]): boolean {
  if (domains.length === 0) return true;
  const domain = normalizeDomain(lead.domain || lead.website || '');
  return !!domain && domains.includes(domain);
}
