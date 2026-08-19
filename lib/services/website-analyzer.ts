/**
 * Bulk Contact Form Outreach System — Website Analysis Module
 * Light-touch public page analysis for grounding AI personalization.
 * Extracts company description, products/services, and industry signals with caching.
 */

import { validateUrlSafety } from './contact-page-finder';

export type AnalysisStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'SKIPPED';

export interface WebsiteAnalysisResult {
  websiteUrl: string;
  domain: string;
  status: AnalysisStatus;
  companyDescription: string;
  productsServices: string[];
  industrySignals: string[];
  summary: string;
  analyzedAt: string;
  isCached: boolean;
  error?: string;
}

// In-memory cache keyed by domain (prevents repeated crawling)
const analysisCache = new Map<string, WebsiteAnalysisResult>();

export class WebsiteAnalyzer {
  /**
   * Clears the analysis cache (useful for testing).
   */
  public static clearCache(): void {
    analysisCache.clear();
  }

  /**
   * Analyzes public homepage content with strict data-minimization rules.
   */
  public static async analyzeWebsite(
    websiteUrl: string,
    options: { forceRefresh?: boolean; timeoutMs?: number } = {}
  ): Promise<WebsiteAnalysisResult> {
    const { forceRefresh = false, timeoutMs = 15000 } = options;

    // 1. SSRF Safety Check
    const safety = validateUrlSafety(websiteUrl);
    if (!safety.isValid) {
      return {
        websiteUrl,
        domain: '',
        status: 'FAILED',
        companyDescription: '',
        productsServices: [],
        industrySignals: [],
        summary: '',
        analyzedAt: new Date().toISOString(),
        isCached: false,
        error: `SSRF Safety Check Failed: ${safety.error}`,
      };
    }

    const domain = safety.domain;

    // 2. Check Cache
    if (!forceRefresh && analysisCache.has(domain)) {
      const cached = analysisCache.get(domain)!;
      return {
        ...cached,
        isCached: true,
      };
    }

    // 3. Fetch limited HTML (max 60KB payload)
    let pageHtml = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(safety.normalizedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const failedResult: WebsiteAnalysisResult = {
          websiteUrl: safety.normalizedUrl,
          domain,
          status: 'FAILED',
          companyDescription: '',
          productsServices: [],
          industrySignals: [],
          summary: '',
          analyzedAt: new Date().toISOString(),
          isCached: false,
          error: `HTTP ${res.status}: Target website returned error response`,
        };
        analysisCache.set(domain, failedResult);
        return failedResult;
      }

      const text = await res.text();
      // Only keep the first 60,000 characters to prevent excessive processing
      pageHtml = text.substring(0, 60000);
    } catch (err: any) {
      const failedResult: WebsiteAnalysisResult = {
        websiteUrl: safety.normalizedUrl,
        domain,
        status: 'FAILED',
        companyDescription: '',
        productsServices: [],
        industrySignals: [],
        summary: '',
        analyzedAt: new Date().toISOString(),
        isCached: false,
        error: err.message || 'Network timeout or unreachable host',
      };
      analysisCache.set(domain, failedResult);
      return failedResult;
    }

    // 4. Extract Public Business Signals
    const extracted = this.extractBusinessSignals(pageHtml, domain);

    const result: WebsiteAnalysisResult = {
      websiteUrl: safety.normalizedUrl,
      domain,
      status: 'COMPLETED',
      companyDescription: extracted.companyDescription,
      productsServices: extracted.productsServices,
      industrySignals: extracted.industrySignals,
      summary: extracted.summary,
      analyzedAt: new Date().toISOString(),
      isCached: false,
    };

    // Store in cache
    analysisCache.set(domain, result);
    return result;
  }

  /**
   * Helper extracting title, meta description, and hero headlines.
   */
  public static extractBusinessSignals(html: string, domain: string): {
    companyDescription: string;
    productsServices: string[];
    industrySignals: string[];
    summary: string;
  } {
    // Strip scripts and styles
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

    // Extract Title
    const titleMatch = cleanHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract Meta Description
    const metaDescMatch =
      cleanHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      cleanHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    // Extract H1 Headings
    const h1Matches: string[] = [];
    const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
    let match;
    while ((match = h1Regex.exec(cleanHtml)) !== null && h1Matches.length < 3) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text) h1Matches.push(text);
    }

    // Identify Industry Signals
    const industryKeywords = [
      'fintech', 'saas', 'security', 'cybersecurity', 'ecommerce', 'ai', 'analytics',
      'healthcare', 'logistics', 'cloud', 'developer tools', 'marketing', 'consulting',
      'manufacturing', 'education', 'real estate', 'design', 'recruiting'
    ];

    const lowerHtml = cleanHtml.toLowerCase();
    const industrySignals = industryKeywords.filter((kw) => lowerHtml.includes(kw));

    // Products / Offerings heuristics
    const productsServices: string[] = [];
    if (h1Matches.length > 0) {
      productsServices.push(h1Matches[0]);
    }
    if (title && !productsServices.includes(title)) {
      productsServices.push(title);
    }

    const companyDescription =
      metaDescription || (h1Matches.length > 0 ? h1Matches.join(' — ') : `${domain} online services`);

    const summary = `${title ? `${title}. ` : ''}${companyDescription}`.substring(0, 280);

    return {
      companyDescription,
      productsServices: productsServices.slice(0, 3),
      industrySignals: industrySignals.slice(0, 4),
      summary,
    };
  }
}
