/**
 * Bulk Contact Form Outreach System — Ingestion & Normalization Engine
 * Handles CSV/XLSX streaming, intelligent fuzzy column header auto-detection,
 * scrambled/jumbled column reordering, URL sanitization, deduplication, and formula injection defense.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface RawImportRow {
  [header: string]: any;
}

export interface NormalizedLead {
  firstName?: string;
  lastName?: string;
  title?: string;
  companyName: string;
  email?: string;
  industry?: string;
  personLinkedinUrl?: string;
  website: string;
  domain: string;
  companyLinkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  personalizedOpeningLine?: string;
  problemParagraph?: string;
  pitch?: string;
  cta?: string;
  customFields: Record<string, any>;
  isValid: boolean;
  validationErrors: string[];
}

export interface ColumnMapping {
  first_name?: string;
  last_name?: string;
  title?: string;
  company_name: string;
  email?: string;
  industry?: string;
  person_linkedin_url?: string;
  website: string;
  company_linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  personalized_opening_line?: string;
  problem_paragraph?: string;
  pitch?: string;
  cta?: string;
  [customField: string]: string | undefined;
}

export interface ImportAnalysisResult {
  filename: string;
  fileSizeBytes: number;
  totalRows: number;
  detectedHeaders: string[];
  suggestedMappings: Record<string, string>;
  sampleRows: RawImportRow[];
  rawRows: RawImportRow[];
}

export interface ImportExecutionResult {
  totalRows: number;
  validLeads: NormalizedLead[];
  invalidRowsCount: number;
  duplicateWebsitesCount: number;
  sanitizedFormulasCount: number;
  importedCount: number;
}

/**
 * Normalizes website strings into a valid, standard HTTPS URL and extracts domain.
 */
export function normalizeWebsiteUrl(urlStr: string): { normalizedUrl: string; domain: string; isValid: boolean } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { normalizedUrl: '', domain: '', isValid: false };
  }

  let cleaned = urlStr.trim();
  if (!cleaned) {
    return { normalizedUrl: '', domain: '', isValid: false };
  }

  // Prepend https:// if no protocol provided
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Validate hostname format
    if (!hostname || !hostname.includes('.') || hostname.endsWith('.')) {
      return { normalizedUrl: cleaned, domain: hostname, isValid: false };
    }

    const normalizedUrl = `${parsed.protocol}//${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    return { normalizedUrl, domain: hostname, isValid: true };
  } catch {
    return { normalizedUrl: cleaned, domain: '', isValid: false };
  }
}

/**
 * Sanitizes spreadsheet formula injection (=, +, -, @).
 */
export function sanitizeCellInput(value: any): any {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Heuristic fuzzy header matching to automatically detect and map detected spreadsheet columns,
 * even if columns are uploaded in completely random, jumbled, or reverse order.
 */
export function suggestColumnMappings(headers: string[]): Record<string, string> {
  const suggestions: Record<string, string> = {
    first_name: '',
    last_name: '',
    title: '',
    company_name: '',
    email: '',
    industry: '',
    person_linkedin_url: '',
    website: '',
    company_linkedin_url: '',
    city: '',
    state: '',
    country: '',
    phone: '',
  };

  // Helper to normalize header string for comparison
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const header of headers) {
    const raw = header.trim();
    const h = normalize(raw);

    // 1. Company LinkedIn URL vs Person LinkedIn URL (Check Company LinkedIn first)
    if (!suggestions.company_linkedin_url && (
      /(companylinkedin|organizationlinkedin|corplinkedin|businesslinkedin|orglinkedin)/i.test(h) ||
      /company.*linkedin.*url/i.test(raw) ||
      /organization.*linkedin/i.test(raw)
    )) {
      suggestions.company_linkedin_url = header;
      continue;
    }

    if (!suggestions.person_linkedin_url && (
      /(personlinkedin|personallinkedin|linkedinprofile|userlinkedin|contactlinkedin|profileurl|^linkedinurl$|^linkedin$)/i.test(h) ||
      /person.*linkedin/i.test(raw) ||
      /personal.*linkedin/i.test(raw) ||
      /linkedin.*profile/i.test(raw) ||
      /profile.*url/i.test(raw) ||
      /linkedin/i.test(raw)
    )) {
      suggestions.person_linkedin_url = header;
      continue;
    }

    // 2. Company Name vs First/Last Name
    if (!suggestions.company_name && (
      /(companyname|company|organization|orgname|businessname|accountname|firmname|^account$)/i.test(h) ||
      /company.*name/i.test(raw) ||
      /company/i.test(raw) ||
      /organization/i.test(raw)
    )) {
      suggestions.company_name = header;
      continue;
    }

    // 3. Website / Domain URL (Exclude LinkedIn headers!)
    if (
      !suggestions.website &&
      !/linkedin/i.test(raw) &&
      !/linkedin/i.test(h) &&
      (/(^website$|websiteurl|weburl|domain|site|homepage|companyurl|companywebsite|companydomain|webaddress|^url$|^web$)/i.test(h) ||
        /website/i.test(raw) ||
        /domain/i.test(raw))
    ) {
      suggestions.website = header;
      continue;
    }

    // 4. First Name
    if (!suggestions.first_name && (
      /(firstname|fname|givenname|forename|leadfirst|^first$)/i.test(h) ||
      /first.*name/i.test(raw) ||
      /fname/i.test(raw)
    )) {
      suggestions.first_name = header;
      continue;
    }

    // 5. Last Name
    if (!suggestions.last_name && (
      /(lastname|lname|surname|familyname|leadlast|^last$)/i.test(h) ||
      /last.*name/i.test(raw) ||
      /lname/i.test(raw) ||
      /surname/i.test(raw)
    )) {
      suggestions.last_name = header;
      continue;
    }

    // 6. Title / Job Title
    if (!suggestions.title && (
      /(^title$|jobtitle|position|role|designation|jobrole|headline|occupation)/i.test(h) ||
      /job.*title/i.test(raw) ||
      /^title$/i.test(raw) ||
      /position/i.test(raw) ||
      /role/i.test(raw)
    )) {
      suggestions.title = header;
      continue;
    }

    // 7. Email
    if (!suggestions.email && (
      /(email|emailaddress|mail|workemail|contactemail)/i.test(h) ||
      /email.*address/i.test(raw) ||
      /email/i.test(raw) ||
      /mail/i.test(raw)
    )) {
      suggestions.email = header;
      continue;
    }

    // 8. Industry
    if (!suggestions.industry && (
      /(industry|sector|category|vertical|businesstype|market)/i.test(h) ||
      /industry/i.test(raw) ||
      /sector/i.test(raw)
    )) {
      suggestions.industry = header;
      continue;
    }

    // 9. City
    if (!suggestions.city && (
      /(^city$|town|municipality|locationcity|metro)/i.test(h) ||
      /^city$/i.test(raw) ||
      /town/i.test(raw)
    )) {
      suggestions.city = header;
      continue;
    }

    // 10. State
    if (!suggestions.state && (
      /(^state$|province|region|stateprovince|territory)/i.test(h) ||
      /^state$/i.test(raw) ||
      /province/i.test(raw) ||
      /region/i.test(raw)
    )) {
      suggestions.state = header;
      continue;
    }

    // 11. Country
    if (!suggestions.country && (
      /(^country$|nation|locationcountry|countrycode|geo)/i.test(h) ||
      /^country$/i.test(raw) ||
      /nation/i.test(raw)
    )) {
      suggestions.country = header;
      continue;
    }

    // 12. Phone
    if (!suggestions.phone && (
      /(phone|tel|telephone|mobile|cell|contactnumber)/i.test(h) ||
      /phone/i.test(raw) ||
      /mobile/i.test(raw)
    )) {
      suggestions.phone = header;
      continue;
    }

    // 13. Personalized Opening Line (Manyreach AI Custom Field)
    if (!suggestions.personalized_opening_line && (
      /(personalizedopeningline|openingline|introline|icebreaker|firstline|customintro|customline)/i.test(h) ||
      /personalized.*opening/i.test(raw) ||
      /opening.*line/i.test(raw) ||
      /icebreaker/i.test(raw)
    )) {
      suggestions.personalized_opening_line = header;
      continue;
    }

    // 14. Problem Paragraph (Manyreach AI Custom Field)
    if (!suggestions.problem_paragraph && (
      /(problemparagraph|painpoint|problemlist|problemstatement|challenge|pain)/i.test(h) ||
      /problem.*paragraph/i.test(raw) ||
      /pain.*point/i.test(raw)
    )) {
      suggestions.problem_paragraph = header;
      continue;
    }

    // 15. Pitch / Solution (Manyreach AI Custom Field)
    if (!suggestions.pitch && (
      /(pitch|solutionpitch|valueprop|valueproposition|offering|solution)/i.test(h) ||
      /solution.*pitch/i.test(raw) ||
      /value.*prop/i.test(raw) ||
      /^pitch$/i.test(raw)
    )) {
      suggestions.pitch = header;
      continue;
    }

    // 16. CTA / Call To Action (Manyreach AI Custom Field)
    if (!suggestions.cta && (
      /(cta|calltoaction|nextstep|actionitem|closingask)/i.test(h) ||
      /call.*to.*action/i.test(raw) ||
      /^cta$/i.test(raw)
    )) {
      suggestions.cta = header;
      continue;
    }
  }

  return suggestions;
}

/**
 * Parses CSV or Excel file buffer / string and extracts headers and sample rows.
 */
export function parseSpreadsheetPreview(
  fileBuffer: ArrayBuffer | string,
  filename: string
): ImportAnalysisResult {
  let headers: string[] = [];
  let rows: RawImportRow[] = [];

  const isExcel = /\.(xlsx|xls)$/i.test(filename);

  if (isExcel) {
    const data = typeof fileBuffer === 'string' ? fileBuffer : new Uint8Array(fileBuffer as ArrayBuffer);
    const workbook = XLSX.read(data, { type: typeof fileBuffer === 'string' ? 'binary' : 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    if (rawData.length > 0) {
      headers = (rawData[0] || []).map((h, i) => String(h || `Column_${i + 1}`).trim()).filter(Boolean);
      const jsonRows = XLSX.utils.sheet_to_json<RawImportRow>(sheet, { defval: '' });
      rows = jsonRows;
    }
  } else {
    // CSV parsing with UTF-8 BOM stripping & header trimming
    let csvContent = typeof fileBuffer === 'string' ? fileBuffer : new TextDecoder('utf-8').decode(fileBuffer);
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    const parsed = Papa.parse<RawImportRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
    });

    headers = (parsed.meta.fields || []).map((f) => f.trim()).filter(Boolean);
    rows = parsed.data || [];
  }

  const sampleRows = rows.slice(0, 10);
  const suggestedMappings = suggestColumnMappings(headers);

  return {
    filename,
    fileSizeBytes: typeof fileBuffer === 'string' ? fileBuffer.length : fileBuffer.byteLength,
    totalRows: rows.length,
    detectedHeaders: headers,
    suggestedMappings,
    sampleRows,
    rawRows: rows,
  };
}

/**
 * Transforms raw spreadsheet rows into validated, normalized leads based on mapping.
 */
export function processImportRows(
  rows: RawImportRow[],
  mapping: ColumnMapping,
  existingDomains: Set<string> = new Set()
): ImportExecutionResult {
  const safeRows = Array.isArray(rows) ? rows : [];
  const domainSet = (existingDomains && typeof (existingDomains as any).has === 'function')
    ? (existingDomains as Set<string>)
    : new Set<string>();
  const seenDomainsInFile = new Set<string>();
  const validLeads: NormalizedLead[] = [];
  let invalidRowsCount = 0;
  let duplicateWebsitesCount = 0;
  let sanitizedFormulasCount = 0;

  for (const rawRow of safeRows) {
    const errors: string[] = [];

    // Extract all 12 mapped fields
    const rawFirstName = mapping.first_name ? rawRow[mapping.first_name] : undefined;
    const rawLastName = mapping.last_name ? rawRow[mapping.last_name] : undefined;
    const rawTitle = mapping.title ? rawRow[mapping.title] : undefined;
    const rawCompanyName = mapping.company_name ? rawRow[mapping.company_name] : undefined;
    const rawEmail = mapping.email ? rawRow[mapping.email] : undefined;
    const rawIndustry = mapping.industry ? rawRow[mapping.industry] : undefined;
    const rawPersonLinkedinUrl = mapping.person_linkedin_url ? rawRow[mapping.person_linkedin_url] : undefined;
    const rawWebsite = mapping.website ? rawRow[mapping.website] : undefined;
    const rawCompanyLinkedinUrl = mapping.company_linkedin_url ? rawRow[mapping.company_linkedin_url] : undefined;
    const rawCity = mapping.city ? rawRow[mapping.city] : undefined;
    const rawState = mapping.state ? rawRow[mapping.state] : undefined;
    const rawCountry = mapping.country ? rawRow[mapping.country] : undefined;
    const rawPhone = mapping.phone ? rawRow[mapping.phone] : undefined;
    const rawPersonalizedOpeningLine = mapping.personalized_opening_line ? rawRow[mapping.personalized_opening_line] : undefined;
    const rawProblemParagraph = mapping.problem_paragraph ? rawRow[mapping.problem_paragraph] : undefined;
    const rawPitch = mapping.pitch ? rawRow[mapping.pitch] : undefined;
    const rawCta = mapping.cta ? rawRow[mapping.cta] : undefined;

    // Validate Required Fields
    const companyName = String(rawCompanyName || '').trim();
    if (!companyName) {
      errors.push('Missing required company name');
    }

    const { normalizedUrl, domain, isValid: isUrlValid } = normalizeWebsiteUrl(String(rawWebsite || ''));
    if (!isUrlValid || !domain) {
      errors.push(`Invalid website URL format: "${rawWebsite || ''}"`);
    }

    // Deduplication check
    if (domain) {
      if (seenDomainsInFile.has(domain) || domainSet.has(domain)) {
        duplicateWebsitesCount++;
        errors.push(`Duplicate domain: "${domain}"`);
      } else {
        seenDomainsInFile.add(domain);
      }
    }

    // Collect custom/unmapped fields
    const customFields: Record<string, any> = {};
    const mappedHeaders = new Set(Object.values(mapping).filter(Boolean));

    for (const [key, val] of Object.entries(rawRow)) {
      if (!mappedHeaders.has(key)) {
        const sanitized = sanitizeCellInput(val);
        if (sanitized !== val) sanitizedFormulasCount++;
        customFields[key] = sanitized;
      }
    }

    // Construct Normalized Lead
    const lead: NormalizedLead = {
      firstName: rawFirstName ? String(sanitizeCellInput(rawFirstName)).trim() : '',
      lastName: rawLastName ? String(sanitizeCellInput(rawLastName)).trim() : '',
      title: rawTitle ? String(sanitizeCellInput(rawTitle)).trim() : '',
      companyName: sanitizeCellInput(companyName),
      email: rawEmail ? String(sanitizeCellInput(rawEmail)).trim() : '',
      industry: rawIndustry ? String(sanitizeCellInput(rawIndustry)).trim() : '',
      personLinkedinUrl: rawPersonLinkedinUrl ? String(sanitizeCellInput(rawPersonLinkedinUrl)).trim() : '',
      website: normalizedUrl,
      domain,
      companyLinkedinUrl: rawCompanyLinkedinUrl ? String(sanitizeCellInput(rawCompanyLinkedinUrl)).trim() : '',
      city: rawCity ? String(sanitizeCellInput(rawCity)).trim() : '',
      state: rawState ? String(sanitizeCellInput(rawState)).trim() : '',
      country: rawCountry ? String(sanitizeCellInput(rawCountry)).trim() : '',
      phone: rawPhone ? String(sanitizeCellInput(rawPhone)).trim() : '',
      personalizedOpeningLine: rawPersonalizedOpeningLine ? String(sanitizeCellInput(rawPersonalizedOpeningLine)).trim() : '',
      problemParagraph: rawProblemParagraph ? String(sanitizeCellInput(rawProblemParagraph)).trim() : '',
      pitch: rawPitch ? String(sanitizeCellInput(rawPitch)).trim() : '',
      cta: rawCta ? String(sanitizeCellInput(rawCta)).trim() : '',
      customFields,
      isValid: errors.length === 0,
      validationErrors: errors,
    };

    if (lead.isValid) {
      validLeads.push(lead);
    } else {
      invalidRowsCount++;
    }
  }

  return {
    totalRows: rows.length,
    validLeads,
    invalidRowsCount,
    duplicateWebsitesCount,
    sanitizedFormulasCount,
    importedCount: validLeads.length,
  };
}
