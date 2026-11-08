import { describe, expect, it } from 'vitest';

import {
  parseCampaignSenderIdentity,
  resolveCampaignSenderIdentity,
} from '@/lib/services/campaign-sender-identity';

const ACCOUNT = {
  fullName: 'Zakaria Alam Mithu',
  replyEmail: 'mithusquare@gmail.com',
  phone: '+8801725592014',
  whatsApp: '+8801725592014',
};

describe('parseCampaignSenderIdentity', () => {
  it('parses a full override and trims values', () => {
    expect(
      parseCampaignSenderIdentity({
        fullName: '  Ayesha Rahman ',
        replyEmail: ' ayesha@example.com ',
        phone: '+1 555-123-4567',
        whatsApp: '+44 20 7946 0958',
      }),
    ).toEqual({
      fullName: 'Ayesha Rahman',
      replyEmail: 'ayesha@example.com',
      phone: '+1 555-123-4567',
      whatsApp: '+44 20 7946 0958',
    });
  });

  it('returns null for a missing, non-object, or all-empty override', () => {
    expect(parseCampaignSenderIdentity(null)).toBeNull();
    expect(parseCampaignSenderIdentity(undefined)).toBeNull();
    expect(parseCampaignSenderIdentity('not an object')).toBeNull();
    expect(parseCampaignSenderIdentity(['a'])).toBeNull();
    expect(parseCampaignSenderIdentity({})).toBeNull();
    expect(parseCampaignSenderIdentity({ fullName: '   ', phone: '' })).toBeNull();
  });

  it('ignores unknown fields and non-string values', () => {
    expect(
      parseCampaignSenderIdentity({ fullName: 'Ayesha', extra: 'ignored', phone: 123 }),
    ).toEqual({ fullName: 'Ayesha', replyEmail: '', phone: '', whatsApp: '' });
  });
});

describe('resolveCampaignSenderIdentity', () => {
  it('uses the full campaign override when every field is set', () => {
    const { identity, source } = resolveCampaignSenderIdentity(
      {
        fullName: 'Ayesha Rahman',
        replyEmail: 'ayesha@example.com',
        phone: '+1 555-123-4567',
        whatsApp: '+44 20 7946 0958',
      },
      ACCOUNT,
    );
    expect(source).toBe('campaign');
    expect(identity).toEqual({
      fullName: 'Ayesha Rahman',
      replyEmail: 'ayesha@example.com',
      phone: '+15551234567',
      whatsApp: '+442079460958',
    });
  });

  it('falls back to the account identity when there is no override', () => {
    const { identity, source } = resolveCampaignSenderIdentity(null, ACCOUNT);
    expect(source).toBe('account');
    expect(identity).toEqual(ACCOUNT);
    const empty = resolveCampaignSenderIdentity(
      { fullName: '', replyEmail: '', phone: '', whatsApp: '' },
      ACCOUNT,
    );
    expect(empty.source).toBe('account');
    expect(empty.identity).toEqual(ACCOUNT);
  });

  it('overrides per field: one custom field does not wipe the other account fields', () => {
    const { identity, source } = resolveCampaignSenderIdentity(
      { fullName: '', replyEmail: '', phone: '+1 555-123-4567', whatsApp: '' },
      ACCOUNT,
    );
    expect(source).toBe('campaign');
    expect(identity).toEqual({
      fullName: 'Zakaria Alam Mithu',
      replyEmail: 'mithusquare@gmail.com',
      phone: '+15551234567',
      whatsApp: '+8801725592014',
    });
  });

  it('falls back to the account number for an unparseable campaign number', () => {
    const { identity, source } = resolveCampaignSenderIdentity(
      { fullName: 'Ayesha Rahman', replyEmail: '', phone: 'not-a-number', whatsApp: '' },
      ACCOUNT,
    );
    // The name still came from the campaign, but the bad number must not
    // reach a required form field.
    expect(source).toBe('campaign');
    expect(identity.fullName).toBe('Ayesha Rahman');
    expect(identity.phone).toBe('+8801725592014');
  });

  it('falls back to the account number for a local campaign number with no country context', () => {
    const { identity } = resolveCampaignSenderIdentity(
      { fullName: '', replyEmail: '', phone: '01725592014', whatsApp: '' },
      ACCOUNT,
    );
    expect(identity.phone).toBe('+8801725592014');
  });

  it('falls back to the account email for an invalid campaign reply email', () => {
    const { identity } = resolveCampaignSenderIdentity(
      { fullName: '', replyEmail: 'not-an-email', phone: '', whatsApp: '' },
      ACCOUNT,
    );
    expect(identity.replyEmail).toBe('mithusquare@gmail.com');
  });

  it('lowercases a valid campaign reply email', () => {
    const { identity } = resolveCampaignSenderIdentity(
      { fullName: '', replyEmail: 'Ayesha@Example.COM', phone: '', whatsApp: '' },
      ACCOUNT,
    );
    expect(identity.replyEmail).toBe('ayesha@example.com');
  });

  it('passes an unparseable legacy account number through raw instead of emptying it', () => {
    const { identity, source } = resolveCampaignSenderIdentity(null, {
      fullName: 'Zakaria Alam Mithu',
      replyEmail: 'mithusquare@gmail.com',
      phone: 'legacy-raw',
      whatsApp: '',
    });
    expect(source).toBe('account');
    expect(identity.phone).toBe('legacy-raw');
  });
});
