/**
 * Disposable & Temporary Email Domain Detection Utility
 * Bulk Contact Form Outreach System — Anti-Abuse Protection
 */

const DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'dispostable.com',
  'getnada.com',
  'trashmail.com',
  'throwawaymail.com',
  'yopmail.com',
  'sharklasers.com',
  'temp-mail.org',
  'fakeinbox.com',
  'maildrop.cc',
  'mohmal.com',
  'crazymailing.com',
  'mytemp.email',
  'mailcatch.com',
  'inboxalias.com',
  'emailondeck.com',
  'tempmailo.com',
]);

export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.trim().toLowerCase().split('@').pop();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
