import { describe, expect, it, vi, beforeEach } from 'vitest';

// Profile sender company + website (2026-11-11): the PATCH must store
// them in AuthStore and write them durably, and — until migration
// 20261111000001 is applied — the durable write must fall back to the
// pre-existing columns so phone/WhatsApp durability never regresses.

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
        if (mocks.upsertMode === 'no-new-columns' && ('company_name' in row || 'website' in row)) {
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

describe('PATCH /api/profile sender company + website', () => {
  it('stores company and website in AuthStore and writes them durably when the migration is applied', async () => {
    const res = await PATCH(patchRequest({
      name: 'Zakaria Alam Mithu',
      phone: '+8801700000000',
      whatsApp: '+8801800000000',
      companyName: 'ContactReachout',
      website: 'contactreachout.com',
      jobTitle: 'Founder',
      country: 'United Kingdom',
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.contactDurable).toBe(true);
    expect(data.user.companyName).toBe('ContactReachout');
    expect(data.user.website).toBe('https://contactreachout.com');
    expect(data.user.jobTitle).toBe('Founder');
    expect(data.user.country).toBe('United Kingdom');
    expect(mocks.upsertRows).toHaveLength(1);
    expect(mocks.upsertRows[0].company_name).toBe('ContactReachout');
    expect(mocks.upsertRows[0].website).toBe('https://contactreachout.com');
    expect(mocks.upsertRows[0].job_title).toBe('Founder');
    expect(mocks.upsertRows[0].country).toBe('United Kingdom');
  });

  it('falls back to the pre-existing columns when the migration is not applied, and still reports not durable', async () => {
    mocks.upsertMode = 'no-new-columns';
    const res = await PATCH(patchRequest({
      name: 'Zakaria Alam Mithu',
      phone: '+8801700000000',
      whatsApp: '+8801800000000',
      companyName: 'ContactReachout',
      website: 'contactreachout.com',
      jobTitle: 'Founder',
      country: 'United Kingdom',
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.contactDurable).toBe(false);
    expect(data.user.companyName).toBe('ContactReachout');
    expect(data.user.website).toBe('https://contactreachout.com');
    expect(data.user.jobTitle).toBe('Founder');
    expect(data.user.country).toBe('United Kingdom');
    expect(mocks.upsertRows).toHaveLength(2);
    expect(mocks.upsertRows[1]).not.toHaveProperty('company_name');
    expect(mocks.upsertRows[1]).not.toHaveProperty('website');
    expect(mocks.upsertRows[1]).not.toHaveProperty('job_title');
    expect(mocks.upsertRows[1]).not.toHaveProperty('country');
    expect(mocks.upsertRows[1].phone).toBe('+8801700000000');
  });

  it('GET merges the durable company and website when AuthStore lacks them', async () => {
    mocks.selectData = {
      display_name: 'Zakaria Alam Mithu',
      phone: '+8801700000000',
      whatsapp: '+8801800000000',
      reply_email: 'owner@example.com',
      company_name: 'ContactReachout',
      website: 'https://contactreachout.com',
      job_title: 'Founder',
      country: 'United Kingdom',
    };
    const res = await GET(new Request('http://localhost/api/profile'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.user.companyName).toBe('ContactReachout');
    expect(data.user.website).toBe('https://contactreachout.com');
    expect(data.user.jobTitle).toBe('Founder');
    expect(data.user.country).toBe('United Kingdom');
  });
});
