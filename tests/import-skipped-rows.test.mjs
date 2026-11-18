// Imported leads must never vanish silently (2026-11-17: a 5-row file
// showed 1 lead and the banner said only "1 leads imported
// successfully" — nobody could tell an invalid website from a duplicate
// domain). processImportRows now returns every skipped row with its
// reason, and buildImportSummary turns it into the banner text.
import { describe, expect, it } from 'vitest';
import { buildImportSummary, processImportRows } from '@/lib/services/import-service';

const MAPPING = {
  first_name: 'First Name',
  last_name: 'Last Name',
  company_name: 'Company',
  website: 'Website',
  email: 'Email',
};

function row(first, company, website) {
  return { 'First Name': first, 'Last Name': '', Company: company, Website: website, Email: '' };
}

describe('import skipped rows', () => {
  it('a 5-row file with 1 valid lead names the 4 skipped rows and why', () => {
    const result = processImportRows(
      [
        row('Joushua', 'ATA Engineering', 'http://www.ata-e.com'),
        row('NoDot', 'No Dot Co', 'nodot'),
        row('Dup', 'ATA Engineering', 'ata-e.com'),
        row('Slash', 'Slash Co', 'N/A'),
        row('Plain', 'Plain Co', 'example'),
      ],
      MAPPING,
    );
    expect(result.validLeads).toHaveLength(1);
    expect(result.validLeads[0].companyName).toBe('ATA Engineering');
    expect(result.invalidRowsCount).toBe(4);
    expect(result.duplicateWebsitesCount).toBe(1);
    expect(result.skippedRows).toHaveLength(4);
    expect(result.skippedRows.map((r) => r.rowNumber)).toEqual([2, 3, 4, 5]);
    expect(result.skippedRows[0].reasons.join(' ')).toContain('Invalid website URL format');
    expect(result.skippedRows[1].reasons.join(' ')).toContain('Duplicate domain');
    expect(result.skippedRows[1].reasons.join(' ')).toContain('ata-e.com');
    expect(result.skippedRows[2].website).toBe('N/A');
    expect(result.skippedRows[3].website).toBe('example');
  });

  it('buildImportSummary reports the skip in the banner text', () => {
    const result = processImportRows(
      [
        row('Joushua', 'ATA Engineering', 'http://www.ata-e.com'),
        row('NoDot', 'No Dot Co', 'nodot'),
        row('Dup', 'ATA Engineering', 'ata-e.com'),
        row('Slash', 'Slash Co', 'N/A'),
        row('Plain', 'Plain Co', 'example'),
      ],
      MAPPING,
    );
    const summary = buildImportSummary(result);
    expect(summary).toContain('1 lead imported successfully');
    expect(summary).toContain('4 rows skipped');
    expect(summary).toContain('row 2');
    expect(summary).toContain('row 3');
    expect(summary).toContain('Duplicate domain');
    expect(summary).toContain('Invalid website URL format');
  });

  it('a clean file reports no skips', () => {
    const result = processImportRows(
      [
        row('A', 'Alpha Co', 'alpha.com'),
        row('B', 'Beta Co', 'beta.com'),
      ],
      MAPPING,
    );
    expect(result.skippedRows).toHaveLength(0);
    expect(buildImportSummary(result)).toBe('2 leads imported successfully.');
  });

  it('an empty website still imports (the campaign start gate rejects it later)', () => {
    const result = processImportRows([row('Empty', 'Empty Web Co', '')], MAPPING);
    expect(result.validLeads).toHaveLength(1);
    expect(result.skippedRows).toHaveLength(0);
  });

  it('duplicate detection is domain-based, ignoring www and case', () => {
    const result = processImportRows(
      [
        row('A', 'Alpha Co', 'http://www.alpha.com'),
        row('B', 'Alpha Co', 'WWW.ALPHA.COM'),
      ],
      MAPPING,
    );
    expect(result.validLeads).toHaveLength(1);
    expect(result.duplicateWebsitesCount).toBe(1);
    expect(result.skippedRows[0].reasons.join(' ')).toContain('Duplicate domain');
  });

  it('a row with a valid website but no company is dropped and named (2026-11-18)', () => {
    const result = processImportRows(
      [
        row('Good', 'Good Co', 'good.com'),
        row('Nameless', '', 'nameless.com'),
        row('Blank', '   ', 'blank.com'),
      ],
      MAPPING,
    );
    expect(result.validLeads).toHaveLength(1);
    expect(result.validLeads[0].companyName).toBe('Good Co');
    expect(result.skippedRows).toHaveLength(2);
    expect(result.skippedRows.map((r) => r.rowNumber)).toEqual([2, 3]);
    expect(result.skippedRows[0].reasons).toContain('Missing Company Name');
    expect(result.skippedRows[0].website).toBe('nameless.com');
    const summary = buildImportSummary(result);
    expect(summary).toContain('1 lead imported successfully');
    expect(summary).toContain('2 rows skipped');
    expect(summary).toContain('Missing Company Name');
  });

  it('a company under an unmapped Organisation header is still recovered, not dropped', () => {
    const result = processImportRows(
      [{ 'First Name': 'Org', 'Last Name': '', Organisation: 'Org Co', Website: 'org.com', Email: '' }],
      MAPPING,
    );
    expect(result.validLeads).toHaveLength(1);
    expect(result.validLeads[0].companyName).toBe('Org Co');
    expect(result.skippedRows).toHaveLength(0);
  });
});
