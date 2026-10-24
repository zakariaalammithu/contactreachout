import { describe, expect, it } from 'vitest';
import { isExpectedGooglePubSubPush } from '@/lib/services/gmail-pubsub-security';

const validClaims = {
  aud: 'https://contactreachout.example/api/gmail/pubsub',
  iss: 'https://accounts.google.com',
  email: 'gmail-push@project.iam.gserviceaccount.com',
  email_verified: true,
};

describe('Gmail Pub/Sub push identity validation', () => {
  const audience = 'https://contactreachout.example/api/gmail/pubsub';
  const serviceAccount = 'gmail-push@project.iam.gserviceaccount.com';

  it('accepts only the configured Google push service account', () => {
    expect(isExpectedGooglePubSubPush(validClaims, audience, serviceAccount)).toBe(true);
  });

  it('fails closed for absent security configuration', () => {
    expect(isExpectedGooglePubSubPush(validClaims, undefined, serviceAccount)).toBe(false);
    expect(isExpectedGooglePubSubPush(validClaims, audience, undefined)).toBe(false);
    expect(isExpectedGooglePubSubPush(validClaims, audience, 'not-a-service-account@example.com')).toBe(false);
  });

  it('rejects invalid identity, audience, issuer, and unverified email claims', () => {
    expect(isExpectedGooglePubSubPush({ ...validClaims, email: 'other@project.iam.gserviceaccount.com' }, audience, serviceAccount)).toBe(false);
    expect(isExpectedGooglePubSubPush({ ...validClaims, aud: 'https://wrong.example' }, audience, serviceAccount)).toBe(false);
    expect(isExpectedGooglePubSubPush({ ...validClaims, iss: 'https://issuer.example' }, audience, serviceAccount)).toBe(false);
    expect(isExpectedGooglePubSubPush({ ...validClaims, email_verified: false }, audience, serviceAccount)).toBe(false);
  });
});
