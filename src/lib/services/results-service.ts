/**
 * Bulk Contact Form Outreach System — Results & Export Service
 * Multi-dimensional filtering, 10-status analytics aggregation, and CSV export generation.
 */

import Papa from 'papaparse';
import { sanitizeCellInput } from './import-service';

export type ExtendedResultStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CAPTCHA'
  | 'REVIEW_REQUIRED'
  | 'BLOCKED'
  | 'NO_CONTACT_PAGE'
  | 'NO_FORM'
  | 'TIMEOUT';

export interface DetailedResultItem {
  id: string;
  campaignId: string;
  campaignName: string;
  companyName: string;
  website: string;
  contactPageUrl?: string;
  status: ExtendedResultStatus;
  country?: string;
  industry?: string;
  contactPerson?: string;
  renderedSubject?: string;
  renderedMessage?: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  httpStatus?: number;
  screenshotUrl?: string;
  screenshotBase64?: string;
}

export interface ResultsFilterCriteria {
  campaignId?: string;
  status?: string;
  country?: string;
  industry?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface StatusCountsSummary {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  captcha: number;
  reviewRequired: number;
  blocked: number;
  noContactPage: number;
  noForm: number;
  timeout: number;
}

export class ResultsService {
  /**
   * Filters results against multi-dimensional criteria.
   */
  public static filterResults(
    items: DetailedResultItem[],
    criteria: ResultsFilterCriteria
  ): DetailedResultItem[] {
    return items.filter((item) => {
      // 1. Campaign Filter
      if (criteria.campaignId && criteria.campaignId !== 'ALL' && item.campaignId !== criteria.campaignId) {
        return false;
      }

      // 2. Status Filter
      if (criteria.status && criteria.status !== 'ALL' && item.status !== criteria.status) {
        return false;
      }

      // 3. Country Filter
      if (criteria.country && criteria.country !== 'ALL' && item.country !== criteria.country) {
        return false;
      }

      // 4. Industry Filter
      if (criteria.industry && criteria.industry !== 'ALL' && item.industry !== criteria.industry) {
        return false;
      }

      // 5. Date Range Filter
      if (criteria.dateFrom) {
        const itemDate = new Date(item.startedAt).getTime();
        const fromDate = new Date(criteria.dateFrom).getTime();
        if (itemDate < fromDate) return false;
      }
      if (criteria.dateTo) {
        const itemDate = new Date(item.startedAt).getTime();
        const toDate = new Date(criteria.dateTo).getTime() + 86400000; // End of day
        if (itemDate > toDate) return false;
      }

      // 6. Omni Search (Company, Website, Contact Page, Error)
      if (criteria.searchQuery && criteria.searchQuery.trim()) {
        const q = criteria.searchQuery.toLowerCase().trim();
        const matchCompany = item.companyName.toLowerCase().includes(q);
        const matchWebsite = item.website.toLowerCase().includes(q);
        const matchContactPage = (item.contactPageUrl || '').toLowerCase().includes(q);
        const matchPerson = (item.contactPerson || '').toLowerCase().includes(q);
        const matchError = (item.errorMessage || '').toLowerCase().includes(q);

        if (!matchCompany && !matchWebsite && !matchContactPage && !matchPerson && !matchError) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Computes the 10 status KPI counters.
   */
  public static computeStatusSummary(items: DetailedResultItem[]): StatusCountsSummary {
    const summary: StatusCountsSummary = {
      total: items.length,
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      captcha: 0,
      reviewRequired: 0,
      blocked: 0,
      noContactPage: 0,
      noForm: 0,
      timeout: 0,
    };

    for (const item of items) {
      switch (item.status) {
        case 'PENDING':
          summary.pending++;
          break;
        case 'PROCESSING':
          summary.processing++;
          break;
        case 'SUCCESS':
          summary.success++;
          break;
        case 'FAILED':
          summary.failed++;
          break;
        case 'CAPTCHA':
          summary.captcha++;
          break;
        case 'REVIEW_REQUIRED':
          summary.reviewRequired++;
          break;
        case 'BLOCKED':
          summary.blocked++;
          break;
        case 'NO_CONTACT_PAGE':
          summary.noContactPage++;
          break;
        case 'NO_FORM':
          summary.noForm++;
          break;
        case 'TIMEOUT':
          summary.timeout++;
          break;
      }
    }

    return summary;
  }

  /**
   * Generates sanitized CSV export content with zero formula injection.
   */
  public static exportToCsv(items: DetailedResultItem[]): string {
    const exportRows = items.map((item) => ({
      'Company Name': sanitizeCellInput(item.companyName),
      'Website URL': sanitizeCellInput(item.website),
      'Contact Page URL': sanitizeCellInput(item.contactPageUrl || ''),
      'Status': item.status,
      'Campaign': sanitizeCellInput(item.campaignName),
      'Country': sanitizeCellInput(item.country || ''),
      'Industry': sanitizeCellInput(item.industry || ''),
      'Contact Person': sanitizeCellInput(item.contactPerson || ''),
      'Subject': sanitizeCellInput(item.renderedSubject || ''),
      'Message Body': sanitizeCellInput(item.renderedMessage || ''),
      'Started At': item.startedAt,
      'Completed At': item.completedAt || '',
      'HTTP Status': item.httpStatus || '',
      'Error Diagnostics': sanitizeCellInput(item.errorMessage || ''),
    }));

    return Papa.unparse(exportRows);
  }
}
