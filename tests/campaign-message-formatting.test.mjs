import { describe, expect, it } from 'vitest';
import { prepareContactFormPlainText } from '@/lib/services/template-engine';

describe('campaign contact-form message formatting', () => {
  it('keeps paragraphs, blank lines, and signature lines after personalization', () => {
    const body = '<p>Hi {{FIRST_NAME}},</p><p>I can help {{COMPANY}}.</p><p>Would you like a sample?</p><p>Best,<br>Example Sender<br>example.com | linkedin.com/in/example</p>';
    const result = prepareContactFormPlainText(body, { first_name: 'Amina', company_name: 'Acme' });

    expect(result).toBe([
      'Hi Amina,',
      '',
      'I can help Acme.',
      '',
      'Would you like a sample?',
      '',
      'Best,',
      'Example Sender',
      'example.com | linkedin.com/in/example',
    ].join('\n'));
  });

  it('does not use whitespace-wide normalization that joins author-selected lines', () => {
    const result = prepareContactFormPlainText('First line\r\n\r\nSecond line\r\nSignature', {});
    expect(result).toBe('First line\n\nSecond line\nSignature');
  });
});
