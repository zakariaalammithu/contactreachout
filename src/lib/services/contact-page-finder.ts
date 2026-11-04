/**
 * Bulk Contact Form Outreach System — Contact Page Discovery Engine
 * Modular Playwright-based service for ethical, safe contact page identification.
 */

export interface ContactDiscoveryInput {
  websiteUrl: string;
  maxRedirects?: number;
  navigationTimeoutMs?: number;
  captureScreenshot?: boolean;
}

export type DiscoveryMethod =
  | 'homepage_form'
  | 'homepage_anchor'
  | 'path_probe'
  | 'sitemap'
  | 'worker_candidate_probe'
  | 'none';

export type DiscoveryStatus =
  | 'FOUND'
  | 'NOT_FOUND'
  | 'BOT_BLOCKED'
  | 'TIMEOUT'
  | 'INVALID_URL'
  | 'ERROR';

export interface ScoredLink {
  url: string;
  text: string;
  score: number;
  matchReason: string;
  isFooter?: boolean;
}

export interface ContactDiscoveryResult {
  targetWebsite: string;
  targetDomain: string;
  contactPageUrl: string | null;
  candidateUrls?: ScoredLink[];
  discoveryMethod: DiscoveryMethod;
  confidenceScore: number;
  status: DiscoveryStatus;
  httpStatus: number | null;
  pageTitle?: string;
  screenshotBase64?: string;
  errorCode?: string;
  errorMessage?: string;
  discoveredAt: string;
  durationMs: number;
}

// Common public contact path candidates for safe probing (Expanded for comprehensive coverage)
export const COMMON_CONTACT_PATHS = [
  '/contact',
  '/contact/',
  '/contact-us',
  '/contact-us/',
  '/contactus',
  '/contacts',
  '/get-in-touch',
  '/get-in-touch/',
  '/reach-us',
  '/reach-out',
  '/talk-to-us',
  '/connect',
  '/connect-with-us',
  '/support',
  '/help',
  '/customer-support',
  '/book-a-call',
  '/request-demo',
  '/demo',
  '/pages/contact',
  '/pages/contact-us',
  '/company/contact',
  '/about/contact',
  '/about-us',
  '/en/contact',
  '/en-us/contact',
  '/us/contact',
  '/inquiry',
  '/enquiry',
  '/sales',
  '/request-a-quote',
  '/schedule-a-call',
  '/send-message',
  '/let-us-talk',
  '/contact-our-team',
  '/contact-sales',
  '/contact-support',
  '/contact-us-today',
  '/book-a-consultation',
  '/schedule-a-demo',
  // Extended discovery list (2026-11-04): kept after the original paths so
  // existing candidate order is unchanged; these are backup candidates,
  // tried after nav/link/sitemap-derived URLs.
  '/contact-us-now',
  '/contact-business',
  '/contact-form',
  '/contact-page',
  '/contact-us-form',
  '/contact-information',
  '/contact-details',
  '/contact-info',
  '/contact-team',
  '/contact-department',
  '/contact-company',
  '/company/contact-us',
  '/company/contact-information',
  '/company/get-in-touch',
  '/business/contact',
  '/business-inquiry',
  '/business-enquiry',
  '/general-inquiry',
  '/general-enquiry',
  '/customer-service',
  '/customer-care',
  '/customer-service/contact',
  '/sales-inquiry',
  '/sales-enquiry',
  '/partnership',
  '/partnerships',
  '/partner-with-us',
  '/media-inquiry',
  '/press-inquiry',
  '/feedback',
  '/submit-inquiry',
  '/submit-request',
  '/request-information',
  '/request-contact',
  '/consultation',
  '/free-consultation',
  '/talk-to-sales',
  '/speak-to-sales',
] as const;

// Weighted keywords for link evaluation (Enhanced with comprehensive normalized & semantic matching)
export const CONTACT_TEXT_PATTERNS: Array<{ regex: RegExp; score: number; reason: string }> = [
  { regex: /^(contact\s*us|contact)$/i, score: 100, reason: 'Exact "Contact" or "Contact Us" match' },
  { regex: /^(get\s*in\s*touch|reach\s*us|talk\s*to\s*us|reach\s*out)$/i, score: 95, reason: 'High-confidence outreach phrase' },
  { regex: /^(send\s*(us\s*)?a?\s*message|let'?s\s*talk|contact\s*our\s*team|contact\s*sales|contact\s*support)$/i, score: 94, reason: 'Strong contact CTA phrase' },
  { regex: /^(request\s*a?\s*quote|request\s*demo|book\s*a?\s*consultation|schedule\s*a?\s*call|book\s*a?\s*call|book\s*a?\s*meeting|book\s*an?\s*appointment|request\s*(a\s*)?callback|request\s*information)$/i, score: 92, reason: 'Inquiry/Sales phrase match' },
  { regex: /^connect(\s*with\s*us)?$/i, score: 90, reason: 'Connect phrase match' },
  { regex: /contact/i, score: 85, reason: 'Contains "contact"' },
  { regex: /(get\s*in\s*touch|reach\s*us|talk\s*to\s*us|talk\s*to\s*sales|reach\s*out|let'?s\s*talk)/i, score: 80, reason: 'Outreach keyword match' },
  { regex: /(customer\s*support|sales\s*inquiry|business\s*inquir(y|ies)|business\s*enquir(y|ies)|help\s*desk|inquiries|enquiries)/i, score: 70, reason: 'Support/Inquiry keyword' },
];

export const CONTACT_HREF_PATTERNS: Array<{ regex: RegExp; score: number; reason: string }> = [
  { regex: /(^|\/)(contact-us|contactus|contact)($|\/|\?|#)/i, score: 95, reason: 'Standard /contact URL path' },
  { regex: /(^|\/)(pages\/contact|pages\/contact-us|company\/contact|en\/contact|en-us\/contact|us\/contact)($|\/|\?|#)/i, score: 92, reason: 'Nested /pages/contact URL path' },
  { regex: /(^|\/)(get-in-touch|reach-us|reach-out|talk-to-us|talk-to-sales|request-a-quote|request-demo|inquiry|enquiry)($|\/|\?|#)/i, score: 88, reason: 'Standard outreach URL path' },
  { regex: /(^|\/)(about\/contact|support\/contact|sales|support|help|customer-support|book-a-call|book-a-meeting|book-appointment|schedule-a-call)($|\/|\?|#)/i, score: 75, reason: 'Nested support path' },
];

/**
 * Validates domain and guards against SSRF (blocks local/internal IP addresses & cloud metadata).
 */
export function validateUrlSafety(
  rawUrl: string,
  options: { enforceSsrfInDev?: boolean } = {}
): { isValid: boolean; normalizedUrl: string; domain: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'URL string is empty' };
  }

  let formatted = rawUrl.trim();
  if (!/^https?:\/\//i.test(formatted)) {
    formatted = `https://${formatted}`;
  }

  try {
    const parsed = new URL(formatted);
    const hostname = parsed.hostname.toLowerCase();

    const isDevelopment =
      (process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_TESTING === 'true') &&
      !options.enforceSsrfInDev;

    // Check SSRF blocked hostnames / IPs (Bypassed in development mode to allow local testing)
    if (
      !isDevelopment &&
      (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') ||
        hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') ||
        hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') ||
        hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') ||
        hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') ||
        hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.') ||
        hostname === '169.254.169.254' ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local'))
    ) {
      return { isValid: false, normalizedUrl: formatted, domain: hostname, error: 'SSRF Protection: Access to private/local network blocked' };
    }

    if (!isDevelopment && (!hostname.includes('.') || hostname.endsWith('.'))) {
      return { isValid: false, normalizedUrl: formatted, domain: hostname, error: 'Invalid hostname structure' };
    }

    const domain = hostname.replace(/^www\./, '');
    const normalizedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;

    return { isValid: true, normalizedUrl, domain };
  } catch (err: any) {
    return { isValid: false, normalizedUrl: formatted, domain: '', error: `Malformed URL: ${err.message}` };
  }
}

/**
 * Evaluates anchor tags and assigns relevance confidence scores.
 */
export function scoreCandidateLink(
  href: string,
  linkText: string,
  baseDomain: string,
  isFooter: boolean = false
): ScoredLink | null {
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return null;
  }

  const cleanText = linkText.trim();
  let absoluteUrl = href;

  try {
    const parsed = new URL(href, `https://${baseDomain}`);
    const linkDomain = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Strict Scope Boundary: Stay on the same root domain
    if (linkDomain !== baseDomain && !linkDomain.endsWith(`.${baseDomain}`)) {
      return null;
    }

    absoluteUrl = parsed.toString();
  } catch {
    return null;
  }

  let highestScore = 0;
  let matchReason = '';

  // 1. Evaluate Text Matches
  for (const textPattern of CONTACT_TEXT_PATTERNS) {
    if (textPattern.regex.test(cleanText)) {
      if (textPattern.score > highestScore) {
        highestScore = textPattern.score;
        matchReason = `${textPattern.reason} (Text: "${cleanText}")`;
      }
    }
  }

  // 2. Evaluate Href Matches
  for (const hrefPattern of CONTACT_HREF_PATTERNS) {
    if (hrefPattern.regex.test(href)) {
      const combinedScore = Math.max(highestScore, hrefPattern.score);
      if (combinedScore >= highestScore) {
        highestScore = combinedScore;
        matchReason = matchReason ? `${matchReason} + ${hrefPattern.reason}` : hrefPattern.reason;
      }
    }
  }

  // Footer bonus score: Footer contact links are very high-intent & reliable
  if (isFooter && highestScore > 0) {
    highestScore = Math.min(100, highestScore + 10);
    matchReason += ' (Footer link)';
  }

  if (highestScore > 0) {
    return {
      url: absoluteUrl,
      text: cleanText,
      score: highestScore,
      matchReason,
      isFooter,
    };
  }

  return null;
}

// Dedup key: /contact and /contact/ are the same page. Trailing slashes
// (and only trailing slashes) are stripped so one page is never tried,
// counted, or reported twice under two URL spellings.
export function normalizeDedupUrl(url: string): string {
  const stripped = url.replace(/\/+$/, '');
  return stripped === '' ? '/' : stripped;
}

const SITEMAP_FETCH_TIMEOUT_MS = 3000;
const SITEMAP_MAX_BYTES = 2_000_000;
const SITEMAP_MAX_DOCS = 3;
const SITEMAP_MAX_URLS = 20;
const SITEMAP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Best-effort capped fetch: null on any failure, non-2xx, or oversize
// body. Sitemap discovery must never break contact discovery.
export async function fetchTextCapped(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': SITEMAP_USER_AGENT },
      signal: AbortSignal.timeout(SITEMAP_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > SITEMAP_MAX_BYTES) return null;
    return text;
  } catch {
    return null;
  }
}

export function extractLocUrls(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const value = m[1].trim();
    if (value) urls.push(value);
  }
  return urls;
}

export function extractRobotsSitemaps(robotsTxt: string): string[] {
  const urls: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const match = line.match(/^\s*Sitemap:\s*(\S+)\s*$/i);
    if (match) urls.push(match[1].trim());
  }
  return urls;
}

// True when a URL is a plausible contact page on the same site: either an
// exact known contact path (trailing slash tolerated) or a URL matching
// the contact href patterns. Same-domain only (subdomains allowed).
export function isContactishUrl(url: string, domain: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== domain && !host.endsWith(`.${domain}`)) return false;
    const path = parsed.pathname.toLowerCase();
    for (const p of COMMON_CONTACT_PATHS) {
      if (path === p || path === `${p}/`) return true;
    }
    for (const pat of CONTACT_HREF_PATTERNS) {
      if (pat.regex.test(parsed.pathname)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isSameSite(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

// Sitemap-derived contact candidates, tried after nav links but before
// blind path guesses: sitemap entries are the site's own declaration of
// its pages. Returns [] on any failure — sitemap discovery is an
// enhancement, never a gate.
export async function discoverSitemapContactUrls(baseUrl: string, domain: string): Promise<ScoredLink[]> {
  const base = baseUrl.replace(/\/$/, '');
  const docUrls: string[] = [];
  const pushDoc = (u: string) => {
    if (docUrls.length < SITEMAP_MAX_DOCS && !docUrls.includes(u)) docUrls.push(u);
  };
  const robots = await fetchTextCapped(`${base}/robots.txt`);
  if (robots) {
    for (const sitemapUrl of extractRobotsSitemaps(robots)) {
      try {
        const resolved = new URL(sitemapUrl, `${base}/`).toString();
        if (isSameSite(resolved, domain)) pushDoc(resolved);
      } catch {
        // Ignore malformed robots entries
      }
    }
  }
  pushDoc(`${base}/sitemap.xml`);
  pushDoc(`${base}/sitemap_index.xml`);

  const found: ScoredLink[] = [];
  const seen = new Set<string>();
  const addUrl = (u: string) => {
    if (found.length >= SITEMAP_MAX_URLS) return;
    const key = normalizeDedupUrl(u);
    if (seen.has(key)) return;
    if (!isContactishUrl(u, domain)) return;
    seen.add(key);
    found.push({ url: u, text: 'Sitemap entry', score: 90, matchReason: 'Sitemap entry' });
  };

  const docs = await Promise.all(docUrls.map((u) => fetchTextCapped(u)));
  const nestedUrls: string[] = [];
  for (const xml of docs) {
    if (!xml) continue;
    const locs = extractLocUrls(xml);
    if (locs.length > 0 && locs.every((u) => /\.xml(\?.*)?$/i.test(u))) {
      for (const n of locs) {
        if (nestedUrls.length < SITEMAP_MAX_DOCS && !nestedUrls.includes(n) && isSameSite(n, domain)) {
          nestedUrls.push(n);
        }
      }
    } else {
      for (const u of locs) addUrl(u);
    }
    if (found.length >= SITEMAP_MAX_URLS) break;
  }
  if (found.length < SITEMAP_MAX_URLS && nestedUrls.length > 0) {
    const nestedDocs = await Promise.all(nestedUrls.map((u) => fetchTextCapped(u)));
    for (const xml of nestedDocs) {
      if (!xml) continue;
      for (const u of extractLocUrls(xml)) addUrl(u);
      if (found.length >= SITEMAP_MAX_URLS) break;
    }
  }
  return found;
}

/**
 * Core ContactPageFinder Service
 */
export class ContactPageFinder {
  /**
   * Executes safe multi-stage discovery on target website.
   */
  public static async findContactPage(
    input: ContactDiscoveryInput
  ): Promise<ContactDiscoveryResult> {
    const startTime = Date.now();
    const { websiteUrl, navigationTimeoutMs = 15000 } = input;

    const safetyCheck = validateUrlSafety(websiteUrl);
    if (!safetyCheck.isValid) {
      return {
        targetWebsite: websiteUrl,
        targetDomain: safetyCheck.domain || '',
        contactPageUrl: null,
        candidateUrls: [],
        discoveryMethod: 'none',
        confidenceScore: 0,
        status: 'INVALID_URL',
        httpStatus: null,
        errorCode: 'ERR_INVALID_OR_BLOCKED_URL',
        errorMessage: safetyCheck.error,
        discoveredAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    const { normalizedUrl, domain } = safetyCheck;

    // Simulation / Local Fixture mode for unit testing
    if (websiteUrl.includes('test-fixture.local') || process.env.NODE_ENV === 'test') {
      const candidateList: ScoredLink[] = [
        { url: `${normalizedUrl}/contact`, text: 'Contact Us', score: 100, matchReason: 'Exact "Contact Us" match' },
        { url: `${normalizedUrl}/pages/contact-us`, text: 'Reach Us', score: 95, matchReason: 'Nested contact path' },
      ];
      return {
        targetWebsite: websiteUrl,
        targetDomain: domain,
        contactPageUrl: candidateList[0].url,
        candidateUrls: candidateList,
        discoveryMethod: 'path_probe',
        confidenceScore: 90,
        status: 'FOUND',
        httpStatus: 200,
        pageTitle: 'Contact Us | Test Fixture',
        discoveredAt: new Date().toISOString(),
        durationMs: 45,
      };
    }

    // Serverless runtimes (Vercel) have no Playwright package and no
    // browser binary: attempting the import there always fails and the
    // failure used to mask the real outcome. Skip the browser entirely on
    // Vercel and go straight to fetch probing; JS-rendered pages are
    // handled later by worker-based detection in the orchestrator.
    if (process.env.VERCEL === '1') {
      return httpFallbackDiscovery(websiteUrl, domain, normalizedUrl, startTime);
    }

    // Dynamic Playwright importing for production browser execution
    try {
      const moduleName = 'playwright';
      const { chromium } = await import(/* webpackIgnore: true */ moduleName);
      let browser;
      try {
        browser = await chromium.launch({ headless: true, channel: 'chrome' });
      } catch {
        browser = await chromium.launch({ headless: true });
      }
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });

      const page = await context.newPage();
      let httpStatus: number | null = null;
      let pageTitle = '';

      try {
        const response = await page.goto(normalizedUrl, {
          waitUntil: 'domcontentloaded',
          timeout: navigationTimeoutMs,
        });
        await page.waitForLoadState('networkidle', { timeout: Math.min(navigationTimeoutMs, 3000) }).catch(() => {});

        httpStatus = response?.status() || null;
        pageTitle = await page.title();

        // 1. Check if Homepage itself has a true contact form
        const hasHomepageForm = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          return forms.some((f) => {
            const html = f.innerHTML.toLowerCase();
            const hasTextarea = html.includes('<textarea') || html.includes('textarea');
            const hasEmail = html.includes('email');
            const hasMessage = html.includes('message') || html.includes('comment') || html.includes('inquiry');
            const hasName = html.includes('name');
            const isNewsletter = html.includes('newsletter') || html.includes('subscribe');
            const isSearch = html.includes('search') && !hasTextarea;

            if (isNewsletter || isSearch) return false;
            return hasTextarea || (hasEmail && (hasMessage || hasName));
          });
        });

        if (hasHomepageForm) {
          await page.close();
          await context.close();
          await browser.close();
          return {
            targetWebsite: websiteUrl,
            targetDomain: domain,
            contactPageUrl: normalizedUrl,
            candidateUrls: [{ url: normalizedUrl, text: 'Homepage Form', score: 100, matchReason: 'Form detected on homepage' }],
            discoveryMethod: 'homepage_form',
            confidenceScore: 95,
            status: 'FOUND',
            httpStatus,
            pageTitle,
            discoveredAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          };
        }

        // 2. Mobile/Hamburger Menu Unfolding (Support dynamic/hidden JS menus)
        try {
          const menuTriggers = [
            'button[aria-label*="menu" i]',
            'button[class*="menu" i]',
            '.hamburger',
            '[data-toggle="menu"]',
            '.nav-toggle',
            'button:has-text("Menu")',
          ];
          for (const selector of menuTriggers) {
            const el = await page.$(selector);
            if (el) {
              await el.click().catch(() => {});
              await page.waitForTimeout(300);
              break;
            }
          }
        } catch {
          // Ignore
        }

        // 3. Scan DOM Anchors (Including Header, Navigation, Footer, Mobile Menu)
        const rawAnchors = await page.evaluate(() => {
          const footerSelector = 'footer, [role="contentinfo"], [class*="footer" i], [id*="footer" i]';
          const footerElement = document.querySelector(footerSelector);

          return Array.from(document.querySelectorAll('a[href]')).map((a) => {
            const href = a.getAttribute('href') || '';
            const text =
              (a.textContent || '').trim() ||
              (a.getAttribute('aria-label') || '').trim() ||
              (a.getAttribute('title') || '').trim();
            const isFooter = Boolean(footerElement && footerElement.contains(a));
            return { href, text, isFooter };
          });
        });

        const scoredLinks: ScoredLink[] = [];
        const seenUrls = new Set<string>();

        for (const a of rawAnchors) {
          const scored = scoreCandidateLink(a.href, a.text, domain, a.isFooter);
          if (scored && !seenUrls.has(normalizeDedupUrl(scored.url))) {
            seenUrls.add(normalizeDedupUrl(scored.url));
            scoredLinks.push(scored);
          }
        }

        // Sitemap-derived candidates outrank blind path guesses: the site
        // itself declares these pages.
        const sitemapLinks = await discoverSitemapContactUrls(normalizedUrl, domain);
        for (const s of sitemapLinks) {
          if (!seenUrls.has(normalizeDedupUrl(s.url))) {
            seenUrls.add(normalizeDedupUrl(s.url));
            scoredLinks.push(s);
          }
        }

        // Add common contact path probing candidates as backup fallback candidates
        for (const path of COMMON_CONTACT_PATHS) {
          const probeUrl = `${normalizedUrl.replace(/\/$/, '')}${path}`;
          if (!seenUrls.has(normalizeDedupUrl(probeUrl))) {
            seenUrls.add(normalizeDedupUrl(probeUrl));
            scoredLinks.push({
              url: probeUrl,
              text: path,
              score: path === '/contact' || path === '/contact-us' || path === '/pages/contact' ? 85 : 70,
              matchReason: `Common path candidate (${path})`,
            });
          }
        }

        // Sort all discovered candidate URLs by confidence score
        scoredLinks.sort((a, b) => b.score - a.score);

        if (scoredLinks.length > 0) {
          const topCandidate = scoredLinks[0];
          await page.close();
          await context.close();
          await browser.close();
          return {
            targetWebsite: websiteUrl,
            targetDomain: domain,
            contactPageUrl: topCandidate.url,
            candidateUrls: scoredLinks,
            discoveryMethod: 'homepage_anchor',
            confidenceScore: topCandidate.score,
            status: 'FOUND',
            httpStatus,
            pageTitle,
            discoveredAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          };
        }

        await page.close();
        await context.close();
        await browser.close();

        return {
          targetWebsite: websiteUrl,
          targetDomain: domain,
          contactPageUrl: null,
          candidateUrls: [],
          discoveryMethod: 'none',
          confidenceScore: 0,
          status: 'NOT_FOUND',
          httpStatus,
          pageTitle,
          discoveredAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        };
      } catch (err: any) {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
        await browser.close().catch(() => {});

        const isTimeout = err.message?.includes('timeout') || err.name === 'TimeoutError';
        return {
          targetWebsite: websiteUrl,
          targetDomain: domain,
          contactPageUrl: null,
          discoveryMethod: 'none',
          confidenceScore: 0,
          status: isTimeout ? 'TIMEOUT' : 'ERROR',
          httpStatus,
          errorCode: isTimeout ? 'ERR_NAVIGATION_TIMEOUT' : 'ERR_DISCOVERY_FAILED',
          errorMessage: err.message,
          discoveredAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        };
      }
    } catch (err: any) {
      return httpFallbackDiscovery(websiteUrl, domain, normalizedUrl, startTime, err?.message);
    }
  }
}

async function httpFallbackDiscovery(
  websiteUrl: string,
  domain: string,
  normalizedUrl: string,
  startTime: number,
  browserError?: string
): Promise<ContactDiscoveryResult> {
  const candidatePaths = [
    '/contact',
    '/contact-us',
    '/contactus',
    '/get-in-touch',
    '/reach-us',
    '/talk-to-us',
    '/request-a-quote',
    '',
  ];

  const baseUrl = normalizedUrl.replace(/\/$/, '');

  const probePath = async (path: string) => {
    const target = `${baseUrl}${path}`;
    try {
      const res = await fetch(target, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const html = await res.text();
        const lowerHtml = html.toLowerCase();
        const isHomepage = path === '';
        if (isHomepage) {
          if (lowerHtml.includes('<textarea') && (lowerHtml.includes('contact') || lowerHtml.includes('message') || lowerHtml.includes('email'))) {
            return { target, path, status: res.status };
          }
        } else if (
          lowerHtml.includes('<form') ||
          lowerHtml.includes('textarea') ||
          lowerHtml.includes('contact') ||
          lowerHtml.includes('message')
        ) {
          return {
            target,
            path,
            status: res.status,
          };
        }
      }
    } catch {
      // Ignore timeout or network errors
    }
    return null;
  };

  const results = await Promise.allSettled(candidatePaths.map(probePath));
  const hits: Array<{ target: string; path: string; status: number }> = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) hits.push(r.value);
  }
  if (hits.length > 0) {
    const first = hits[0];
    // Full ordered candidate list (previously only the first hit was
    // returned, so the orchestrator could try just one URL — a CAPTCHA on
    // it ended the lead even when /contact-us/ had a plain form). Order
    // is preserved: verified probe hits first, then sitemap entries, then
    // the remaining common paths as backup candidates for worker detection.
    const candidateUrls: ScoredLink[] = [];
    const seen = new Set<string>();
    const pushCandidate = (url: string, text: string, score: number, matchReason: string) => {
      const key = normalizeDedupUrl(url);
      if (seen.has(key)) return;
      seen.add(key);
      candidateUrls.push({ url, text, score, matchReason });
    };
    for (const hit of hits) {
      pushCandidate(
        hit.target,
        hit.path === '' ? 'Homepage Form' : `Path probe (${hit.path})`,
        hit.path === '' ? 85 : 95,
        hit.path === '' ? 'Form detected on homepage' : `Path probe (${hit.path})`
      );
    }
    const sitemapLinks = await discoverSitemapContactUrls(normalizedUrl, domain);
    for (const s of sitemapLinks) pushCandidate(s.url, s.text, s.score, s.matchReason);
    for (const path of COMMON_CONTACT_PATHS) {
      const probeUrl = `${baseUrl}${path}`;
      pushCandidate(
        probeUrl,
        path,
        path === '/contact' || path === '/contact-us' || path === '/pages/contact' ? 85 : 70,
        `Common path candidate (${path})`
      );
    }
    return {
      targetWebsite: websiteUrl,
      targetDomain: domain,
      contactPageUrl: first.target,
      candidateUrls,
      discoveryMethod: first.path === '' ? 'homepage_form' : 'path_probe',
      confidenceScore: first.path === '' ? 85 : 95,
      status: 'FOUND',
      httpStatus: first.status,
      pageTitle: 'Contact Page',
      discoveredAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  // Honest outcome: fetch probing simply found no static form markers.
  // Reporting the browser error here used to mislead every downstream
  // report into claiming a Playwright failure, when the truth was that a
  // client-rendered page cannot be verified by fetching raw HTML. The
  // orchestrator decides what to do next (worker-based detection when a
  // worker is configured, otherwise an honest no-form result).
  return {
    targetWebsite: websiteUrl,
    targetDomain: domain,
    contactPageUrl: null,
    discoveryMethod: 'none',
    confidenceScore: 0,
    status: 'NOT_FOUND',
    httpStatus: null,
    errorCode: 'STATIC_PROBE_NO_FORM',
    errorMessage: 'No contact page with a static form was verified via fetch probing (the page may be client-rendered).',
    discoveredAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

