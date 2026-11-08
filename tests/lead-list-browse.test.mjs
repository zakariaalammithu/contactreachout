import { describe, expect, it } from 'vitest';

import {
  buildLeadListRows,
  filterLeadLists,
  paginateLeadLists,
  pageNumbers,
  sortLeadLists,
} from '@/lib/services/lead-list-browse';

const ROWS = [
  { id: 'l1', name: 'Alpha Prospects', leadCount: 5, createdAt: '2026-11-01T10:00:00.000Z' },
  { id: 'l2', name: 'beta leads', leadCount: 0, createdAt: '2026-11-04T10:00:00.000Z' },
  { id: 'l3', name: 'Gamma', leadCount: 11, createdAt: '2026-10-30T10:00:00.000Z' },
  { id: 'l4', name: 'Delta', leadCount: 0, createdAt: '' },
  { id: 'l5', name: 'alpha archive', leadCount: 2, createdAt: '2026-11-02T10:00:00.000Z' },
];

describe('buildLeadListRows', () => {
  it('counts leads by list id or list name, once per list per lead', () => {
    const lists = [
      { id: 'a', name: 'Alpha', createdAt: '2026-11-01T00:00:00.000Z' },
      { id: 'b', name: 'Beta', createdAt: '2026-11-02T00:00:00.000Z' },
    ];
    const leads = [
      { listId: 'a', listName: 'Alpha' }, // matches list a both ways: counts once
      { listId: 'a', listName: 'Other' }, // matches list a by id
      { listId: 'zzz', listName: 'Beta' }, // matches list b by name
      { listId: 'zzz', listName: 'Nobody' }, // matches nothing
      { listId: '', listName: '' }, // matches nothing
    ];
    expect(buildLeadListRows(lists, leads)).toEqual([
      { id: 'a', name: 'Alpha', leadCount: 2, createdAt: '2026-11-01T00:00:00.000Z' },
      { id: 'b', name: 'Beta', leadCount: 1, createdAt: '2026-11-02T00:00:00.000Z' },
    ]);
  });

  it('returns zero counts for lists with no leads', () => {
    expect(buildLeadListRows([{ id: 'a', name: 'Alpha' }], [])).toEqual([
      { id: 'a', name: 'Alpha', leadCount: 0, createdAt: '' },
    ]);
  });
});

describe('filterLeadLists', () => {
  it('searches by name, case-insensitive, trimmed', () => {
    expect(filterLeadLists(ROWS, { query: 'ALPHA' }).map((r) => r.id)).toEqual(['l1', 'l5']);
    expect(filterLeadLists(ROWS, { query: '  beta ' }).map((r) => r.id)).toEqual(['l2']);
    expect(filterLeadLists(ROWS, { query: 'zzz' })).toEqual([]);
    expect(filterLeadLists(ROWS, {}).length).toBe(5);
  });

  it('filters by lead presence', () => {
    expect(filterLeadLists(ROWS, { filter: 'with-leads' }).map((r) => r.id)).toEqual(['l1', 'l3', 'l5']);
    expect(filterLeadLists(ROWS, { filter: 'empty' }).map((r) => r.id)).toEqual(['l2', 'l4']);
    expect(filterLeadLists(ROWS, { filter: 'all' }).length).toBe(5);
  });

  it('combines search and filter', () => {
    expect(filterLeadLists(ROWS, { query: 'alpha', filter: 'with-leads' }).map((r) => r.id)).toEqual([
      'l1',
      'l5',
    ]);
    expect(filterLeadLists(ROWS, { query: 'alpha', filter: 'empty' })).toEqual([]);
  });
});

describe('sortLeadLists', () => {
  it('sorts newest first and oldest first by createdAt (missing dates sort as oldest)', () => {
    expect(sortLeadLists(ROWS, 'newest').map((r) => r.id)).toEqual(['l2', 'l5', 'l1', 'l3', 'l4']);
    expect(sortLeadLists(ROWS, 'oldest').map((r) => r.id)).toEqual(['l4', 'l3', 'l1', 'l5', 'l2']);
  });

  it('sorts by name A-Z and Z-A, case-insensitive', () => {
    expect(sortLeadLists(ROWS, 'name-asc').map((r) => r.id)).toEqual(['l5', 'l1', 'l2', 'l4', 'l3']);
    expect(sortLeadLists(ROWS, 'name-desc').map((r) => r.id)).toEqual(['l3', 'l4', 'l2', 'l1', 'l5']);
  });

  it('sorts by lead count with name as the tiebreak', () => {
    expect(sortLeadLists(ROWS, 'count-desc').map((r) => r.id)).toEqual(['l3', 'l1', 'l5', 'l2', 'l4']);
    expect(sortLeadLists(ROWS, 'count-asc').map((r) => r.id)).toEqual(['l2', 'l4', 'l5', 'l1', 'l3']);
  });

  it('does not mutate the input array', () => {
    const input = [...ROWS];
    sortLeadLists(input, 'newest');
    expect(input.map((r) => r.id)).toEqual(['l1', 'l2', 'l3', 'l4', 'l5']);
  });
});

describe('paginateLeadLists', () => {
  const many = Array.from({ length: 60 }, (_, i) => ({
    id: `l${i + 1}`,
    name: `List ${i + 1}`,
    leadCount: i,
    createdAt: '',
  }));

  it('slices pages at 25 by default', () => {
    const page1 = paginateLeadLists(many, 1, 25);
    expect(page1.items.map((r) => r.id)).toEqual(many.slice(0, 25).map((r) => r.id));
    expect(page1.total).toBe(60);
    expect(page1.totalPages).toBe(3);
    expect(paginateLeadLists(many, 3, 25).items.length).toBe(10);
  });

  it('supports 50 and 100 per page', () => {
    expect(paginateLeadLists(many, 1, 50).totalPages).toBe(2);
    expect(paginateLeadLists(many, 1, 100).totalPages).toBe(1);
    expect(paginateLeadLists(many, 1, 100).items.length).toBe(60);
  });

  it('clamps out-of-range pages', () => {
    expect(paginateLeadLists(many, 0, 25).page).toBe(1);
    expect(paginateLeadLists(many, 99, 25).page).toBe(3);
    expect(paginateLeadLists(many, 99, 25).items.length).toBe(10);
  });

  it('handles an empty list', () => {
    const result = paginateLeadLists([], 1, 25);
    expect(result).toEqual({ items: [], total: 0, totalPages: 1, page: 1, pageSize: 25 });
  });
});

describe('pageNumbers', () => {
  it('shows every page when there are few', () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('collapses to a window with ellipses when there are many', () => {
    expect(pageNumbers(1, 20)).toEqual([1, 2, '…', 20]);
    expect(pageNumbers(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
    expect(pageNumbers(20, 20)).toEqual([1, '…', 19, 20]);
  });
});
