import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectFormPurpose, resolveFormPurpose } from '../src/lib/services/form-detector.ts';
import { pickBestWorkerForm } from '../src/lib/services/outreach-orchestrator.ts';
import { isInternalPageUrl, discoverSitemapUrls } from '../src/lib/services/contact-page-finder.ts';
import { detectWithBrowserWorker } from '@/lib/services/browser-worker-client';

const messageField = { tag: 'textarea', type: 'textarea', name: 'message', label: 'Message' };
const emailField = { tag: 'input', type: 'email', name: 'email', label: 'Email' };
const nameField = { tag: 'input', type: 'text', name: 'full_name', label: 'Full Name' };
const phoneField = { tag: 'input', type: 'tel', name: 'phone', label: 'Phone' };

describe('form purpose detection', () => {
  it('follows the brief priority: contact > inquiry > sales > quote > appointment', () => {
    expect(detectFormPurpose('https://example.com/contact #contact-form')).toBe('contact');
    expect(detectFormPurpose('https://example.com/contact-sales #form')).toBe('contact');
    expect(detectFormPurpose('https://example.com/business-inquiry #form')).toBe('inquiry');
    expect(detectFormPurpose('https://example.com/talk-to-sales #form')).toBe('sales');
    expect(detectFormPurpose('https://example.com/request-a-quote #form')).toBe('quote');
    expect(detectFormPurpose('https://example.com/book-a-consultation #form')).toBe('appointment');
    expect(detectFormPurpose('https://example.com/random #form')).toBe('other');
  });

  it('resolves purpose from form signals first, page URL as fallback', () => {
    expect(resolveFormPurpose('https://example.com/contact', '/submit', 'form')).toBe('contact');
    expect(resolveFormPurpose('https://example.com/contact', '/business-inquiry', '#form')).toBe('inquiry');
    expect(resolveFormPurpose('https://example.com/random', '/submit', 'form')).toBe('other');
  });
});

describe('purpose-first form selection', () => {
  it('prefers a contact form over an inquiry form with equal fields', () => {
    const contact = { selector: '#contact-form', action: '/contact', method: 'post', fields: [messageField, emailField] };
    const inquiry = { selector: '#inquiry-form', action: '/business-inquiry', method: 'post', fields: [messageField, emailField] };
    expect(pickBestWorkerForm([inquiry, contact])).toBe(contact);
  });

  it('still lets a much richer form win across purposes', () => {
    const contact = { selector: '#contact-form', action: '/contact', method: 'post', fields: [messageField] };
    const inquiry = { selector: '#inquiry-form', action: '/business-inquiry', method: 'post', fields: [messageField, emailField, nameField, phoneField] };
    expect(pickBestWorkerForm([contact, inquiry])).toBe(inquiry);
  });

  it('still excludes login and newsletter forms', () => {
    const login = { selector: '#login-form', action: '/login', method: 'post', fields: [messageField, emailField] };
    const newsletter = { selector: '#newsletter-form', action: '/subscribe', method: 'post', fields: [emailField] };
    expect(pickBestWorkerForm([login, newsletter])).toBe(null);
  });
});

describe('internal page detection', () => {
  it('accepts internal pages and rejects contact pages and foreign hosts', () => {
    expect(isInternalPageUrl('https://example.com/services', 'example.com')).toBe(true);
    expect(isInternalPageUrl('https://example.com/services/web-design', 'example.com')).toBe(true);
    expect(isInternalPageUrl('https://example.com/pricing', 'example.com')).toBe(true);
    expect(isInternalPageUrl('https://example.com/about-us', 'example.com')).toBe(false);
    expect(isInternalPageUrl('https://example.com/customer-service', 'example.com')).toBe(false);
    expect(isInternalPageUrl('https://example.com/contact', 'example.com')).toBe(false);
    expect(isInternalPageUrl('https://other.com/services', 'example.com')).toBe(false);
  });
});

describe('sitemap internal pages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('splits sitemap entries into contact candidates and internal pages', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/robots.txt')) {
        return { ok: true, text: async () => 'User-agent: *\nSitemap: https://example.com/sitemap.xml\n' };
      }
      if (String(url).endsWith('/sitemap.xml')) {
        return {
          ok: true,
          text: async () =>
            '<urlset><url><loc>https://example.com/contact</loc></url><url><loc>https://example.com/business-inquiry</loc></url><url><loc>https://example.com/services</loc></url><url><loc>https://example.com/pricing</loc></url><url><loc>https://example.com/about-us</loc></url><url><loc>https://example.com/blog</loc></url></urlset>',
        };
      }
      return { ok: false, text: async () => '' };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { contact, internal } = await discoverSitemapUrls('https://example.com', 'example.com');
    expect(contact.map((c) => c.url)).toEqual([
      'https://example.com/contact',
      'https://example.com/business-inquiry',
      'https://example.com/about-us',
    ]);
    expect(internal).toEqual(['https://example.com/services', 'https://example.com/pricing']);
  });
});

describe('worker alternative contact links', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.BROWSER_WORKER_URL;
    delete process.env.BROWSER_WORKER_AUTH_SECRET;
  });

  it('passes contact links through on NOT_FOUND', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    const links = { emails: ['hello@example.com'], phones: ['+44 20 0000 0000'], whatsapp: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'NOT_FOUND', hasForm: false, forms: [], contactLinks: links }), { status: 200 }))
    );
    const outcome = await detectWithBrowserWorker({ url: 'https://example.com/contact' });
    expect(outcome).toMatchObject({ available: true, status: 'NOT_FOUND', contactLinks: links });
  });

  it('passes contact links through on DETECTED', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    const links = { emails: [], phones: [], whatsapp: ['https://wa.me/442000000000'] };
    const forms = [{ selector: 'form', action: '', method: 'post', fields: [] }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'DETECTED', hasForm: true, forms, contactLinks: links }), { status: 200 }))
    );
    const outcome = await detectWithBrowserWorker({ url: 'https://example.com/contact' });
    expect(outcome).toMatchObject({ available: true, status: 'DETECTED', contactLinks: links });
  });

  it('passes the worker final URL through for redirect dedup', async () => {
    process.env.BROWSER_WORKER_URL = 'https://worker.example.test/submit';
    process.env.BROWSER_WORKER_AUTH_SECRET = 'test-secret';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'NOT_FOUND', hasForm: false, forms: [], finalUrl: 'https://example.com/contact-us/' }), { status: 200 })
      )
    );
    const outcome = await detectWithBrowserWorker({ url: 'https://example.com/contact' });
    expect(outcome).toMatchObject({ available: true, status: 'NOT_FOUND', finalUrl: 'https://example.com/contact-us/' });
  });
});
