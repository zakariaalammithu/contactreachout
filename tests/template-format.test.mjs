import { describe, it, expect } from 'vitest';
import {
  convertHtmlToEditableText,
  convertHtmlToPlainText,
  convertPlainTextToHtml,
  looksLikeHtml,
} from '../src/lib/services/template-engine.ts';

const SIGNATURE_TEXT =
  'Main message line\n\nThanks & Warm Regards\nZakaria Alam Mithu\nTop Rated Freelancer at Fiverr & Upwork\nb2bgdc.com | linkedin.com/in/zakariaalammithu';

describe('convertPlainTextToHtml', () => {
  it('keeps a blank line between the message and the signature', () => {
    const html = convertPlainTextToHtml(SIGNATURE_TEXT);
    expect(html).toContain('<p>Main message line</p>');
    expect(html).toContain('<p><br></p>');
    expect(html).toContain('Thanks &amp; Warm Regards<br>Zakaria Alam Mithu');
  });

  it('turns single newlines into line breaks inside one paragraph', () => {
    expect(convertPlainTextToHtml('Line one\nLine two')).toBe('<p>Line one<br>Line two</p>');
  });

  it('escapes markup so signature text is never parsed as HTML', () => {
    expect(convertPlainTextToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>');
  });

  it('returns empty for blank input', () => {
    expect(convertPlainTextToHtml('')).toBe('');
    expect(convertPlainTextToHtml('   \n  ')).toBe('');
  });
});

describe('template plain-text round-trip', () => {
  it('plain -> html -> plain returns the original signature text', () => {
    expect(convertHtmlToPlainText(convertPlainTextToHtml(SIGNATURE_TEXT))).toBe(SIGNATURE_TEXT);
  });
});

describe('convertHtmlToEditableText', () => {
  it('keeps the blank line and tight signature lines exactly as typed', () => {
    const html =
      '<p>Main message line</p><p><br></p><p>Thanks &amp; Warm Regards</p><p>Zakaria Alam Mithu</p>';
    expect(convertHtmlToEditableText(html)).toBe(
      'Main message line\n\nThanks & Warm Regards\nZakaria Alam Mithu',
    );
  });

  it('keeps a blank line and single line breaks from editor HTML', () => {
    const html = '<p>Main message line</p><p><br></p><p>Thanks &amp; Warm Regards<br>Zakaria Alam Mithu</p>';
    expect(convertHtmlToEditableText(html)).toBe(
      'Main message line\n\nThanks & Warm Regards\nZakaria Alam Mithu',
    );
  });

  it('is stable across edit -> save -> edit (no blank lines creep in)', () => {
    const html = '<p>Main message line</p><p><br></p><p>Thanks &amp; Warm Regards</p><p>Zakaria Alam Mithu</p>';
    const text = convertHtmlToEditableText(html);
    expect(convertHtmlToEditableText(convertPlainTextToHtml(text))).toBe(text);
  });
});

describe('looksLikeHtml', () => {
  it('detects editor HTML', () => {
    expect(looksLikeHtml('<p>Hello</p>')).toBe(true);
    expect(looksLikeHtml('<div>Hello<br>World</div>')).toBe(true);
    expect(looksLikeHtml('Hello <b>World</b>')).toBe(true);
  });

  it('rejects plain text, even with newlines', () => {
    expect(looksLikeHtml(SIGNATURE_TEXT)).toBe(false);
    expect(looksLikeHtml('')).toBe(false);
  });
});
