/**
 * Choose Lead Lists modal — browsing helpers (2026-11-08). Pure, no
 * imports, so the editor and the tests share the exact same rules.
 *
 * The lists live in the browser (localStorage) and are already loaded
 * into editor state when the modal opens, so filtering, sorting and
 * pagination all run client-side over those rows — no extra fetch, no
 * server round-trip, and no lead records are loaded just to browse.
 * The only work that touches the leads is buildLeadListRows, which
 * counts each list in a single pass instead of filtering the whole
 * lead collection once per list on every render.
 */

export type LeadListRow = {
  id: string;
  name: string;
  leadCount: number;
  createdAt: string;
};

export type LeadListSort = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'count-desc' | 'count-asc';

export type LeadListFilter = 'all' | 'with-leads' | 'empty';

export const LEAD_LIST_SORT_OPTIONS: Array<{ value: LeadListSort; label: string }> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'count-desc', label: 'Highest Lead Count' },
  { value: 'count-asc', label: 'Lowest Lead Count' },
];

export const LEAD_LIST_PAGE_SIZES = [25, 50, 100] as const;

export const LEAD_LIST_DEFAULT_PAGE_SIZE = 25;

export const LEAD_LIST_DEFAULT_SORT: LeadListSort = 'newest';

/**
 * Build one row per list with its live lead count. The match rule is
 * the one the modal always used: a lead belongs to a list when its
 * listId matches the list id OR its listName matches the list name.
 * A lead is counted at most once per list, even when it matches that
 * list both ways, and it may count for several lists when it matches
 * several (same as the old per-list filter).
 */
export function buildLeadListRows(
  lists: Array<{ id: string; name: string; createdAt?: string | null }>,
  leads: Array<{ listId?: string | null; listName?: string | null }>,
): LeadListRow[] {
  const counts = new Map<string, number>();
  for (const list of lists) counts.set(list.id, 0);
  const byId = new Map(lists.map((list) => [list.id, list]));
  const byName = new Map<string, Array<{ id: string }>>();
  for (const list of lists) {
    const key = (list.name || '').trim();
    if (!key) continue;
    const bucket = byName.get(key);
    if (bucket) bucket.push(list);
    else byName.set(key, [list]);
  }
  for (const lead of leads) {
    const matched = new Set<string>();
    const listId = (lead.listId || '').trim();
    if (listId && byId.has(listId)) matched.add(listId);
    const listName = (lead.listName || '').trim();
    if (listName) {
      const nameMatches = byName.get(listName);
      if (nameMatches) for (const list of nameMatches) matched.add(list.id);
    }
    for (const id of matched) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return lists.map((list) => ({
    id: list.id,
    name: list.name || '',
    leadCount: counts.get(list.id) || 0,
    createdAt: list.createdAt || '',
  }));
}

export function filterLeadLists(
  rows: LeadListRow[],
  options: { query?: string; filter?: LeadListFilter },
): LeadListRow[] {
  const query = (options.query || '').trim().toLowerCase();
  const filter = options.filter || 'all';
  return rows.filter((row) => {
    if (filter === 'with-leads' && row.leadCount <= 0) return false;
    if (filter === 'empty' && row.leadCount > 0) return false;
    if (query && !row.name.toLowerCase().includes(query)) return false;
    return true;
  });
}

function createdAtTime(row: LeadListRow): number {
  const time = Date.parse(row.createdAt || '');
  return Number.isFinite(time) ? time : 0;
}

function compareName(a: LeadListRow, b: LeadListRow): number {
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

export function sortLeadLists(rows: LeadListRow[], sort: LeadListSort): LeadListRow[] {
  const sorted = [...rows];
  switch (sort) {
    case 'newest':
      sorted.sort((a, b) => createdAtTime(b) - createdAtTime(a) || compareName(a, b));
      break;
    case 'oldest':
      sorted.sort((a, b) => createdAtTime(a) - createdAtTime(b) || compareName(a, b));
      break;
    case 'name-asc':
      sorted.sort(compareName);
      break;
    case 'name-desc':
      sorted.sort((a, b) => compareName(b, a));
      break;
    case 'count-desc':
      sorted.sort((a, b) => b.leadCount - a.leadCount || compareName(a, b));
      break;
    case 'count-asc':
      sorted.sort((a, b) => a.leadCount - b.leadCount || compareName(a, b));
      break;
  }
  return sorted;
}

export function paginateLeadLists(
  rows: LeadListRow[],
  page: number,
  pageSize: number,
): { items: LeadListRow[]; total: number; totalPages: number; page: number; pageSize: number } {
  const size = pageSize > 0 ? pageSize : LEAD_LIST_DEFAULT_PAGE_SIZE;
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * size;
  return {
    items: rows.slice(start, start + size),
    total,
    totalPages,
    page: safePage,
    pageSize: size,
  };
}

/**
 * Compact page numbers: every page when there are few, otherwise the
 * first page, a window around the current page, and the last page,
 * joined by ellipses. Returns page numbers and '…' markers.
 */
export function pageNumbers(current: number, totalPages: number): Array<number | '…'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
}
