import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  COMMON_CONTACT_PATHS,
  normalizeDedupUrl,
  extractLocUrls,
  extractRobotsSitemaps,
  isContactishUrl,
  discoverSitemapContactUrls,
} from '../src/lib/services/contact-page-finder.ts';

const NEW_PATHS = [
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
];

describe('extended contact discovery list', () => {
  it('covers the full 78-path list: 40 original + 38 new', () => {
    expect(COMMON_CONTACT_PATHS.length).toBe(78);
    for (const p of NEW_PATHS) {
      expect(COMMON_CONTACT_PATHS).toContain(p);
    }
    for (const p of ['/contact', '/contact-us', '/get-in-touch', '/support', '/book-a-call', '/pages/contact', '/en/contact']) {
      expect(COMMON_CONTACT_PATHS).toContain(p);
    }
    expect(new Set(COMMON_CONTACT_PATHS).size).toBe(COMMON_CONTACT_PATHS.length);
  });

  it('dedups trailing-slash spellings of the same page', () => {
    expect(normalizeDedupUrl('https://example.com/contact/')).toBe('https://example.com/contact');
    expect(normalizeDedupUrl('https://example.com/contact')).toBe('https://example.com/contact');
    expect(normalizeDedupUrl('https://example.com/')).toBe('https://example.com');
  });

  it('parses sitemap <loc> entries', () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://example.com/contact</loc></url><url><loc>https://example.com/about</loc></url></urlset>`;
    expect(extractLocUrls(xml)).toEqual(['https://example.com/contact', 'https://example.com/about']);
  });

  it('parses robots.txt Sitemap lines only', () => {
    const robots = 'User-agent: *\nDisallow: /admin\nSitemap: https://example.com/sitemap.xml\nsitemap: https://example.com/other.xml\n';
    expect(extractRobotsSitemaps(robots)).toEqual(['https://example.com/sitemap.xml', 'https://example.com/other.xml']);
  });

  it('accepts only same-site contactish URLs', () => {
    expect(isContactishUrl('https://example.com/contact-us/', 'example.com')).toBe(true);
    expect(isContactishUrl('https://example.com/business-inquiry', 'example.com')).toBe(true);
    expect(isContactishUrl('https://example.com/about', 'example.com')).toBe(false);
    expect(isContactishUrl('https://other.com/contact', 'example.com')).toBe(false);
    expect(isContactishUrl('not a url', 'example.com')).toBe(false);
  });
});

describe('discoverSitemapContactUrls', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns only same-site contact entries from robots + sitemap', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/robots.txt')) {
        return { ok: true, text: async () => 'User-agent: *\nSitemap: https://example.com/sitemap.xml\n' };
      }
      if (String(url).endsWith('/sitemap.xml')) {
        return {
          ok: true,
          text: async () =>
            '<urlset><url><loc>https://example.com/contact-us</loc></url><url><loc>https://example.com/pricing</loc></url><url><loc>https://other.com/contact</loc></url></urlset>',
        };
      }
      return { ok: false, text: async () => '' };
    });
    vi.stubGlobal('fetch', fetchMock);
    const found = await discoverSitemapContactUrls('https://example.com', 'example.com');
    expect(found).toEqual([
      { url: 'https://example.com/contact-us', text: 'Sitemap entry', score: 90, matchReason: 'Sitemap entry' },
    ]);
  });

  it('returns [] when every sitemap source fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, text: async () => '' })));
    const found = await discoverSitemapContactUrls('https://example.com', 'example.com');
    expect(found).toEqual([]);
  });
});
