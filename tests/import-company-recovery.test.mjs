import { describe, expect, it } from 'vitest';
import {
  findCompanyNameInCustomFields,
  processImportRows,
  suggestColumnMappings,
  validateRequiredImportMappings,
} from '@/lib/services/import-service';

// Regression: an Excel file whose company column was headed "Business" /
// "Organisation" / "Brand" imported with no company name at all — the
// suggestion missed those headers, the unmapped value sat in customFields
// where nothing read it, and the campaign later failed every lead with a
// 400. The company was in the file; the import silently dropped it.
describe('import company-name recovery', () => {
  it('suggests company_name for Business / Organisation / Brand / Client headers', () => {
    expect(suggestColumnMappings(['Business', 'Website']).company_name).toBe('Business');
    expect(suggestColumnMappings(['Organisation', 'Website']).company_name).toBe('Organisation');
    expect(suggestColumnMappings(['Brand', 'Website']).company_name).toBe('Brand');
    expect(suggestColumnMappings(['Client Name', 'Website']).company_name).toBe('Client Name');
    expect(suggestColumnMappings(['Company Name', 'Website']).company_name).toBe('Company Name');
    expect(suggestColumnMappings(['Business Name', 'Website']).company_name).toBe('Business Name');
  });

  it('does not steal Business Type into company_name (it is industry)', () => {
    const mapping = suggestColumnMappings(['Business Type', 'Website']);
    expect(mapping.company_name).toBe('');
    expect(mapping.industry).toBe('Business Type');
  });

  it('recovers the company from an unmapped Organisation column', () => {
    const result = processImportRows(
      [{ Organisation: 'Acme Ltd', Website: 'https://acme.example' }],
      { website: 'Website' },
    );
    expect(result.validLeads).toHaveLength(1);
    expect(result.validLeads[0].companyName).toBe('Acme Ltd');
  });

  it('recovers the company from an unmapped Business column', () => {
    const result = processImportRows(
      [{ Business: 'Handy', Website: 'https://handy.uy' }],
      { website: 'Website' },
    );
    expect(result.validLeads).toHaveLength(1);
    expect(result.validLeads[0].companyName).toBe('Handy');
  });

  it('does not mistake a domain value for a company name', () => {
    const result = processImportRows(
      [{ Organisation: 'acme.com', Website: 'https://acme.example' }],
      { website: 'Website' },
    );
    expect(result.validLeads).toHaveLength(1);
    expect(result.validLeads[0].companyName).toBe('');
  });

  it('keeps the mapped company when one is mapped', () => {
    const result = processImportRows(
      [{ Company: 'Mapped Co', Business: 'Other Co', Website: 'https://mapped.example' }],
      { company_name: 'Company', website: 'Website' },
    );
    expect(result.validLeads).toHaveLength(1);
    expect(result.validLeads[0].companyName).toBe('Mapped Co');
  });

  it('findCompanyNameInCustomFields matches exact keys only', () => {
    expect(findCompanyNameInCustomFields({ Business: 'Handy' })).toBe('Handy');
    expect(findCompanyNameInCustomFields({ ORGANISATION: 'Acme Ltd' })).toBe('Acme Ltd');
    expect(findCompanyNameInCustomFields({ 'Company Size': 25 })).toBe('');
    expect(findCompanyNameInCustomFields({ Company: 'https://acme.example' })).toBe('');
    expect(findCompanyNameInCustomFields({})).toBe('');
    expect(findCompanyNameInCustomFields(null)).toBe('');
  });
});

// The import gate: a lead without a website or a company name can never
// send, so the import is refused instead of failing every lead later.
describe('validateRequiredImportMappings', () => {
  const rows = [{ Website: 'https://acme.example', Company: 'Acme Ltd' }];

  it('passes when both required columns are mapped with values', () => {
    expect(validateRequiredImportMappings({ website: 'Website', company_name: 'Company' }, rows)).toBeNull();
  });

  it('refuses when the website column is unmapped', () => {
    expect(validateRequiredImportMappings({ company_name: 'Company' }, rows)).toContain('Website is required');
  });

  it('refuses when the website column holds no value', () => {
    expect(validateRequiredImportMappings(
      { website: 'Website', company_name: 'Company' },
      [{ Website: '', Company: 'Acme Ltd' }],
    )).toContain('Website is required');
  });

  it('refuses when the company column is unmapped', () => {
    expect(validateRequiredImportMappings({ website: 'Website' }, rows)).toContain('Company Name is required');
  });

  it('refuses when the company column holds no value', () => {
    expect(validateRequiredImportMappings(
      { website: 'Website', company_name: 'Company' },
      [{ Website: 'https://acme.example', Company: '   ' }],
    )).toContain('Company Name is required');
  });
});
