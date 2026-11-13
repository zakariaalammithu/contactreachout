import { describe, expect, it, vi, beforeEach } from 'vitest';

// Profile sender postal address (2026-11-13): the PATCH must store the
// four address fields in AuthStore and write them durably, and — until
// migration 20261113000001 is applied — the durable write must fall
// back to the company columns (then the pre-existing columns) so the
// address fields never break phone/WhatsApp durability.

const mocks = vi.hoisted(() => ({
  upsertRows: [],
  upsertMode: 'ok',
  selectData: null,
  user: null,
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/supabase/admin-client', () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mocks.selectData, error: null }),
        }),
      }),
      upsert: async (row) => {
        mocks.upsertRows.push(row);
        const hasAddress = 'street_address' in row || 'city' in row || 'state_region' in row || 'postal_code' in row;
        const hasCompany = 'company_name' in row || 'website' in row || 'job_title' in row || 'country' in row;
        if (mocks.upsertMode === 'no-address-columns' && hasAddress) {
          return { error: { message: 'column "street_address" does not exist' } };
        }
        if (mocks.upsertMode === 'no-new-columns' && (hasAddress || hasCompany)) {
          return { error: { message: 'column "company_name" does not exist' } };
        }
        return { error: null };
      },
    }),
  }),
}));

vi.mock('@/lib/auth/session', () => ({
  SessionManager: {
    getSessionFromRequest: () => ({ email: 'owner@example.com' }),
  },
}));

vi.mock('@/lib/auth/auth-store', () => ({
  AuthStore: {
    getUserByEmail: () => mocks.user,
    updateUser: (_email, updates) => {
      Object.assign(mocks.user, updates);
      return mocks.user;
    },
  },
}));

const { PATCH, GET } = await import('@/app/api/profile/route.ts');

function patchRequest(body) {
  return new Request('http://localhost/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const baseBody = {
  name: 'Zakaria Alam Mithu',
  phone: '+8801700000000',
  whatsApp: '+8801800000000',
  streetAddress: '124 Whitechapel Road',
  city: 'London',
  stateRegion: 'Greater London',
  postalCode: 'E1 1JE',
  country: 'United Kingdom',
};

beforeEach(() => {
  mocks.upsertRows = [];
  mocks.upsertMode = 'ok';
  mocks.selectData = null;
  mocks.user = {
    id: 'usr-1',
    name: 'Zakaria Alam Mithu',
    email: 'owner@example.com',
    phone: '+8801700000000',
    whatsApp: '+8801800000000',
    replyEmail: 'owner@example.com',
    isEmailVerified: true,
  };
});

describe('PATCH /api/profile sender address', () => {
  it('stores the four address fields in AuthStore and writes them durably when the migration is applied', async () => {
    const res = await PATCH(patchRequest(baseBody));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.contactDurable).toBe(true);
    expect(data.user.streetAddress).toBe('124 Whitechapel Road');
    expect(data.user.city).toBe('London');
    expect(data.user.stateRegion).toBe('Greater London');
    expect(data.user.postalCode).toBe('E1 1JE');
    expect(data.user.country).toBe('United Kingdom');
    expect(mocks.upsertRows).toHaveLength(1);
    expect(mocks.upsertRows[0].street_address).toBe('124 Whitechapel Road');
    expect(mocks.upsertRows[0].city).toBe('London');
    expect(mocks.upsertRows[0].state_region).toBe('Greater London');
    expect(mocks.upsertRows[0].postal_code).toBe('E1 1JE');
  });

  it('falls back to the company columns when only the address migration is missing', async () => {
    mocks.upsertMode = 'no-address-columns';
    const res = await PATCH(patchRequest(baseBody));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.contactDurable).toBe(false);
    expect(data.user.streetAddress).toBe('124 Whitechapel Road');
    expect(mocks.upsertRows).toHaveLength(2);
    expect(mocks.upsertRows[1]).not.toHaveProperty('street_address');
    expect(mocks.upsertRows[1]).not.toHaveProperty('city');
    expect(mocks.upsertRows[1]).not.toHaveProperty('state_region');
    expect(mocks.upsertRows[1]).not.toHaveProperty('postal_code');
    expect(mocks.upsertRows[1].country).toBe('United Kingdom');
    expect(mocks.upsertRows[1].phone).toBe('+8801700000000');
  });

  it('falls back to the pre-existing columns when both migrations are missing', async () => {
    mocks.upsertMode = 'no-new-columns';
    const res = await PATCH(patchRequest(baseBody));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.contactDurable).toBe(false);
    expect(mocks.upsertRows).toHaveLength(3);
    expect(mocks.upsertRows[2]).not.toHaveProperty('street_address');
    expect(mocks.upsertRows[2]).not.toHaveProperty('company_name');
    expect(mocks.upsertRows[2]).not.toHaveProperty('country');
    expect(mocks.upsertRows[2].phone).toBe('+8801700000000');
  });

  it('GET merges the durable address when AuthStore lacks it', async () => {
    mocks.selectData = {
      display_name: 'Zakaria Alam Mithu',
      phone: '+8801700000000',
      whatsapp: '+8801800000000',
      reply_email: 'owner@example.com',
      company_name: 'ContactReachout',
      website: 'https://contactreachout.com',
      job_title: 'Founder',
      country: 'United Kingdom',
      street_address: '124 Whitechapel Road',
      city: 'London',
      state_region: 'Greater London',
      postal_code: 'E1 1JE',
    };
    const res = await GET(new Request('http://localhost/api/profile'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.user.streetAddress).toBe('124 Whitechapel Road');
    expect(data.user.city).toBe('London');
    expect(data.user.stateRegion).toBe('Greater London');
    expect(data.user.postalCode).toBe('E1 1JE');
  });
});
