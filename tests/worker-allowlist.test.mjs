import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  parseAllowedDomains,
  hostOf,
  hostMatches,
  isHealthy,
  verifyViaApp,
  isTargetAllowed,
} = await import('../browser-worker/allowlist.mjs');

describe('worker target authorization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses the static allow-list case-insensitively and drops blanks', () => {
    expect(parseAllowedDomains('Example.COM, , sub.example.com')).toEqual(['example.com', 'sub.example.com']);
    expect(parseAllowedDomains('')).toEqual([]);
  });

  it('extracts hostnames and rejects malformed URLs', () => {
    expect(hostOf('https://WWW.Example.com/contact')).toBe('www.example.com');
    expect(hostOf('not a url')).toBe(null);
  });

  it('matches exact hosts and subdomains, never parent or lookalike hosts', () => {
    expect(hostMatches('example.com', ['example.com'])).toBe(true);
    expect(hostMatches('www.example.com', ['example.com'])).toBe(true);
    expect(hostMatches('example.com', ['sub.example.com'])).toBe(false);
    expect(hostMatches('badexample.com', ['example.com'])).toBe(false);
    expect(hostMatches(null, ['example.com'])).toBe(false);
  });

  it('reports healthy with a static list or with dynamic verification configured', () => {
    expect(isHealthy({ secret: 's', staticDomains: ['example.com'], appUrl: '' })).toBe(true);
    expect(isHealthy({ secret: 's', staticDomains: [], appUrl: 'https://app.example' })).toBe(true);
    expect(isHealthy({ secret: 's', staticDomains: [], appUrl: '' })).toBe(false);
    expect(isHealthy({ secret: '', staticDomains: ['example.com'], appUrl: '' })).toBe(false);
  });

  it('authorizes static-listed hosts without calling the app', async () => {
    const fetchMock = vi.fn();
    const allowed = await isTargetAllowed({
      staticDomains: ['example.com'],
      appUrl: 'https://app.example',
      secret: 's',
      url: 'https://www.example.com/contact',
      fetchFn: fetchMock,
    });
    expect(allowed).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('authorizes unlisted hosts when the app verifies them as campaign leads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ allowed: true }), { status: 200 }),
    );
    const allowed = await isTargetAllowed({
      staticDomains: [],
      appUrl: 'https://app.example/',
      secret: 's',
      url: 'https://newprospect.com/contact',
      fetchFn: fetchMock,
    });
    expect(allowed).toBe(true);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.example/api/worker/verify-domain?domain=newprospect.com');
    expect(request.headers.authorization).toBe('Bearer s');
  });

  it('denies unlisted hosts when the app says no, errors, or is unreachable', async () => {
    const deny = vi.fn().mockResolvedValue(new Response(JSON.stringify({ allowed: false }), { status: 200 }));
    const serverError = vi.fn().mockResolvedValue(new Response('nope', { status: 503 }));
    const throws = vi.fn().mockRejectedValue(new Error('down'));
    const base = { staticDomains: [], appUrl: 'https://app.example', secret: 's', url: 'https://other.com/contact' };
    await expect(isTargetAllowed({ ...base, fetchFn: deny })).resolves.toBe(false);
    await expect(isTargetAllowed({ ...base, fetchFn: serverError })).resolves.toBe(false);
    await expect(isTargetAllowed({ ...base, fetchFn: throws })).resolves.toBe(false);
  });

  it('denies unlisted hosts when dynamic verification is not configured', async () => {
    const fetchMock = vi.fn();
    await expect(
      isTargetAllowed({ staticDomains: [], appUrl: '', secret: 's', url: 'https://other.com/contact', fetchFn: fetchMock }),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifyViaApp only trusts an explicit allowed:true answer', async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ allowed: true }), { status: 200 }));
    const vague = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    await expect(verifyViaApp({ appUrl: 'https://app.example', secret: 's', domain: 'a.com', fetchFn: ok })).resolves.toBe(true);
    await expect(verifyViaApp({ appUrl: 'https://app.example', secret: 's', domain: 'a.com', fetchFn: vague })).resolves.toBe(false);
  });
});
