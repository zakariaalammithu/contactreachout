import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  parseBulkWebsites,
  matchesLeadDetails,
  matchesBulkDomains,
  countLeadsForList,
  pruneEmptyLists,
} from '../src/lib/services/lead-filter-utils.ts';

const lead = {
  firstName: 'Zakaria',
  lastName: 'Mithu',
  companyName: 'B2BGDC',
  domain: 'www.b2bgdc.com',
  website: 'https://www.b2bgdc.com',
  title: 'CEO',
  country: 'Bangladesh',
};

describe('normalizeDomain', () => {
  it('strips protocol, www, path and trailing dot', () => {
    expect(normalizeDomain('https://www.Company.com/page?x=1')).toBe('company.com');
    expect(normalizeDomain('  HTTP://WWW.Example.COM. ')).toBe('example.com');
    expect(normalizeDomain('')).toBe('');
  });
});

describe('parseBulkWebsites', () => {
  it('splits lines/commas, normalizes, dedupes', () => {
    const { domains, truncated } = parseBulkWebsites(
      'https://www.a.com\nb.com, https://a.com\n\nWWW.B.COM/'
    );
    expect(domains).toEqual(['a.com', 'b.com']);
    expect(truncated).toBe(0);
  });

  it('caps at 100 and reports the overflow', () => {
    const input = Array.from({ length: 105 }, (_, i) => `site${i}.com`).join('\n');
    const { domains, truncated } = parseBulkWebsites(input);
    expect(domains).toHaveLength(100);
    expect(truncated).toBe(5);
  });
});

describe('matchesLeadDetails', () => {
  it('matches each field independently, case-insensitive', () => {
    const empty = { jobTitle: '', name: '', company: '', website: '', country: '' };
    expect(matchesLeadDetails(lead, empty)).toBe(true);
    expect(matchesLeadDetails(lead, { ...empty, jobTitle: 'ceo' })).toBe(true);
    expect(matchesLeadDetails(lead, { ...empty, jobTitle: 'cto' })).toBe(false);
    expect(matchesLeadDetails(lead, { ...empty, name: 'zakaria mithu' })).toBe(true);
    expect(matchesLeadDetails(lead, { ...empty, name: 'mithu zakaria' })).toBe(false);
    expect(matchesLeadDetails(lead, { ...empty, company: 'b2b' })).toBe(true);
    expect(matchesLeadDetails(lead, { ...empty, website: 'b2bgdc.com' })).toBe(true);
    expect(matchesLeadDetails(lead, { ...empty, website: 'other.com' })).toBe(false);
    expect(matchesLeadDetails(lead, { ...empty, country: 'bangla' })).toBe(true);
  });
});

describe('countLeadsForList / pruneEmptyLists', () => {
  const listA = { id: 'list-a', name: 'File A', fileName: 'a.xlsx' };
  const listB = { id: 'list-b', name: 'File B', fileName: 'b.xlsx' };
  const leads = [
    { id: '1', listId: 'list-a' },
    { id: '2', listName: 'File A' },
    { id: '3', sourceFileName: 'b.xlsx' },
  ];

  it('counts leads by id, name, or file name (broad match)', () => {
    expect(countLeadsForList(leads, listA)).toBe(2);
    expect(countLeadsForList(leads, listB)).toBe(1);
    expect(countLeadsForList(leads, { id: 'list-c', name: 'File C', fileName: 'c.xlsx' })).toBe(0);
  });

  it('drops only the lists left with zero leads', () => {
    expect(pruneEmptyLists([listA, listB], leads)).toEqual([listA, listB]);
    expect(pruneEmptyLists([listA, listB], leads.slice(0, 2))).toEqual([listA]);
    expect(pruneEmptyLists([listA, listB], [])).toEqual([]);
  });
});

describe('matchesBulkDomains', () => {
  it('matches exact normalized domains only', () => {
    expect(matchesBulkDomains(lead, [])).toBe(true);
    expect(matchesBulkDomains(lead, ['b2bgdc.com'])).toBe(true);
    expect(matchesBulkDomains(lead, ['other.com', 'b2bgdc.com'])).toBe(true);
    expect(matchesBulkDomains(lead, ['other.com'])).toBe(false);
    expect(matchesBulkDomains(lead, ['b2bgdc.com.evil.com'])).toBe(false);
  });
});
