import { describe, it, expect, vi, beforeEach } from 'vitest';

const { detectMock, findContactPageMock } = vi.hoisted(() => ({
  detectMock: vi.fn(),
  findContactPageMock: vi.fn(),
}));

vi.mock('../src/lib/services/browser-worker-client.ts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isBrowserWorkerConfigured: () => true,
    detectWithBrowserWorker: (...args) => detectMock(...args),
  };
});

vi.mock('../src/lib/services/contact-page-finder.ts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ContactPageFinder: { findContactPage: (...args) => findContactPageMock(...args) },
  };
});

import { OutreachPipelineOrchestrator } from '../src/lib/services/outreach-orchestrator.ts';

const lead = {
  id: 'lead-1',
  company_name: 'Example',
  website: 'https://example.com',
  first_name: 'Test',
  email: 'test@example.com',
  phone: '',
  whatsApp: '',
};

const template = {
  id: 'tpl-default',
  subjectTemplate: 'Partnership Inquiry',
  bodyTemplate: 'Hello, reaching out regarding a partnership inquiry.',
};

function foundDiscovery(candidateUrls) {
  return {
    targetWebsite: 'https://example.com',
    targetDomain: 'example.com',
    contactPageUrl: candidateUrls[0].url,
    candidateUrls,
    discoveryMethod: 'path_probe',
    confidenceScore: 95,
    status: 'FOUND',
    httpStatus: 200,
    discoveredAt: new Date().toISOString(),
    durationMs: 10,
  };
}

function link(url) {
  return { url, text: url, score: 85, matchReason: 'Path probe' };
}

function captcha(url, finalUrl) {
  return { available: true, status: 'CAPTCHA_DETECTED', forms: [], finalUrl: finalUrl || url };
}

describe('detection loop budget (504 fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops immediately on an expired deadline and reports DETECTION_TIMEOUT', async () => {
    findContactPageMock.mockResolvedValue(
      foundDiscovery([link('https://example.com/contact'), link('https://example.com/contact-us')])
    );
    detectMock.mockImplementation(async ({ url }) => captcha(url));
    const result = await OutreachPipelineOrchestrator.processLead({
      lead,
      template,
      options: { detectionDeadlineMs: 0 },
    });
    expect(result.finalStatus).toBe('NO_FORM_DETECTED');
    expect(result.detection.errorCode).toBe('DETECTION_TIMEOUT');
    expect(result.detection.errorMessage).toMatch(/DETECTION_TIMEOUT/);
    expect(detectMock).not.toHaveBeenCalled();
  });

  it('stops at the candidate cap and reports DETECTION_CANDIDATE_LIMIT', async () => {
    const candidates = Array.from({ length: 100 }, (_, i) => link(`https://example.com/p${i}`));
    findContactPageMock.mockResolvedValue(foundDiscovery(candidates));
    detectMock.mockImplementation(async ({ url }) => captcha(url));
    const result = await OutreachPipelineOrchestrator.processLead({ lead, template, options: {} });
    expect(result.finalStatus).toBe('NO_FORM_DETECTED');
    expect(result.detection.errorCode).toBe('DETECTION_CANDIDATE_LIMIT');
    expect(detectMock).toHaveBeenCalledTimes(80);
  });

  it('skips redirect-aliases already rendered under another URL', async () => {
    findContactPageMock.mockResolvedValue(
      foundDiscovery([
        link('https://example.com/contact'),
        link('https://example.com/contact-us/'),
        link('https://example.com/contact-us'),
        link('https://example.com/other'),
      ])
    );
    detectMock.mockImplementation(async ({ url }) => {
      if (url === 'https://example.com/contact') return captcha(url, 'https://example.com/contact-us/');
      return { available: true, status: 'NOT_FOUND', forms: [], finalUrl: url };
    });
    const result = await OutreachPipelineOrchestrator.processLead({ lead, template, options: {} });
    // Loop exhausted with a CAPTCHA seen: the honest outcome is the
    // CAPTCHA return (pre-existing bfcbc3e behavior) — the dedup point
    // is that only 2 renders happened, not 4.
    expect(result.finalStatus).toBe('CAPTCHA_DETECTED');
    expect(detectMock).toHaveBeenCalledTimes(2);
    expect(detectMock.mock.calls.map((c) => c[0].url)).toEqual([
      'https://example.com/contact',
      'https://example.com/other',
    ]);
  });

  it('still selects a detected form after the loop changes', async () => {
    findContactPageMock.mockResolvedValue(foundDiscovery([link('https://example.com/contact')]));
    detectMock.mockResolvedValue({
      available: true,
      status: 'DETECTED',
      finalUrl: 'https://example.com/contact',
      forms: [
        {
          selector: '#contact-form',
          action: '/contact',
          method: 'post',
          fields: [
            { selector: '#email', name: 'email', tag: 'input', type: 'email', required: true, label: 'Email' },
            { selector: '#message', name: 'message', tag: 'textarea', type: 'textarea', required: true, label: 'Message' },
          ],
        },
      ],
    });
    const result = await OutreachPipelineOrchestrator.processLead({ lead, template, options: {} });
    expect(result.detection?.selectedForm).toBeTruthy();
    expect(result.finalStatus).not.toBe('NO_FORM_DETECTED');
  });
});
