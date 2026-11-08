'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  filterLeadLists,
  paginateLeadLists,
  pageNumbers,
  sortLeadLists,
  LEAD_LIST_DEFAULT_PAGE_SIZE,
  LEAD_LIST_DEFAULT_SORT,
  LEAD_LIST_PAGE_SIZES,
  LEAD_LIST_SORT_OPTIONS,
  type LeadListFilter,
  type LeadListRow,
  type LeadListSort,
} from '@/lib/services/lead-list-browse';

type ChooseLeadListsModalProps = {
  open: boolean;
  lists: LeadListRow[];
  initialSelection: string[];
  onCancel: () => void;
  onAdd: (ids: string[]) => void;
};

const FILTER_OPTIONS: Array<{ value: LeadListFilter; label: string }> = [
  { value: 'all', label: 'All Lists' },
  { value: 'with-leads', label: 'With Leads' },
  { value: 'empty', label: 'Empty Lists' },
];

export function ChooseLeadListsModal({ open, lists, initialSelection, onCancel, onAdd }: ChooseLeadListsModalProps) {
  const [selection, setSelection] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LeadListSort>(LEAD_LIST_DEFAULT_SORT);
  const [filter, setFilter] = useState<LeadListFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(LEAD_LIST_DEFAULT_PAGE_SIZE);

  // A fresh modal on every open: selection starts from the campaign's
  // current lists, and browse state resets. Selection lives only in
  // this state while the modal is open, so searching, sorting and
  // paging can never drop a checked list.
  useEffect(() => {
    if (!open) return;
    setSelection(initialSelection);
    setQuery('');
    setSort(LEAD_LIST_DEFAULT_SORT);
    setFilter('all');
    setPage(1);
    setPageSize(LEAD_LIST_DEFAULT_PAGE_SIZE);
    // Reset only when the modal opens, not when the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A new search, sort, filter or page size starts back at page 1.
  useEffect(() => {
    setPage(1);
  }, [query, sort, filter, pageSize]);

  const counts = useMemo(() => {
    let withLeads = 0;
    for (const row of lists) if (row.leadCount > 0) withLeads += 1;
    return { all: lists.length, 'with-leads': withLeads, empty: lists.length - withLeads } as Record<
      LeadListFilter,
      number
    >;
  }, [lists]);

  const visible = useMemo(() => {
    const filtered = filterLeadLists(lists, { query, filter });
    return sortLeadLists(filtered, sort);
  }, [lists, query, filter, sort]);

  const pageData = useMemo(() => paginateLeadLists(visible, page, pageSize), [visible, page, pageSize]);
  const pages = pageNumbers(pageData.page, pageData.totalPages);
  const rangeStart = pageData.total === 0 ? 0 : (pageData.page - 1) * pageData.pageSize + 1;
  const rangeEnd = Math.min(pageData.total, pageData.page * pageData.pageSize);

  const toggleSelection = (id: string) => {
    setSelection((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl">
        {/* Header (fixed) */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Choose Lead Lists</h2>
            <p className="mt-1 text-sm text-zinc-400">Select one or more lists to add to this campaign.</p>
          </div>
          <List className="h-5 w-5 text-blue-400" />
        </div>

        {/* Browse controls (fixed) */}
        <div className="space-y-3 px-6 pt-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lists by name…"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-9 pr-4 text-sm font-semibold text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  filter === option.value
                    ? 'border-blue-500 bg-blue-950 text-blue-200'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-blue-900'
                }`}
              >
                {option.label} ({counts[option.value]})
              </button>
            ))}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as LeadListSort)}
              aria-label="Sort lead lists"
              className="ml-auto rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 focus:border-blue-500 outline-none cursor-pointer"
            >
              {LEAD_LIST_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List (scrolls) */}
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-6 pb-4">
          {lists.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">
              No lead lists are available yet.
            </div>
          ) : pageData.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">
              No lists match your search or filter.
            </div>
          ) : (
            pageData.items.map((list) => {
              const checked = selection.includes(list.id);
              return (
                <label
                  key={list.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                    checked ? 'border-blue-500 bg-blue-950' : 'border-zinc-800 bg-zinc-950 hover:border-blue-900'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                    <span>
                      <span className="block text-sm font-bold text-zinc-100">{list.name}</span>
                      <span className="block text-xs text-zinc-400">{list.leadCount} leads</span>
                    </span>
                  </span>
                  <input type="checkbox" checked={checked} onChange={() => toggleSelection(list.id)} className="h-5 w-5" />
                </label>
              );
            })
          )}
        </div>

        {/* Footer (sticky): pagination + actions */}
        <div className="space-y-3 border-t border-zinc-800 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label="Lists per page"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-bold text-zinc-200 focus:border-blue-500 outline-none cursor-pointer"
            >
              {LEAD_LIST_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
            <span className="font-semibold">
              Showing {rangeStart}–{rangeEnd} of {pageData.total} lists
            </span>
            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                disabled={pageData.page <= 1}
                onClick={() => setPage(pageData.page - 1)}
                aria-label="Previous page"
                className="rounded-lg border border-zinc-700 px-2 py-1.5 font-bold text-zinc-200 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pages.map((item, index) =>
                item === '…' ? (
                  <span key={`gap-${index}`} className="px-1 font-bold">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`rounded-lg border px-2.5 py-1.5 font-bold cursor-pointer ${
                      item === pageData.page
                        ? 'border-blue-500 bg-blue-950 text-blue-200'
                        : 'border-zinc-700 text-zinc-200 hover:border-blue-500'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={pageData.page >= pageData.totalPages}
                onClick={() => setPage(pageData.page + 1)}
                aria-label="Next page"
                className="rounded-lg border border-zinc-700 px-2 py-1.5 font-bold text-zinc-200 hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </span>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {selection.length > 0 && (
              <span className="mr-auto text-xs font-semibold text-zinc-400">{selection.length} selected</span>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300"
            >
              Cancel
            </button>
            <Button type="button" onClick={() => onAdd(selection)} className="px-5 py-2.5">
              Add to Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
