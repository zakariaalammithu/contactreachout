import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assignLeadToCampaign } from '@/lib/persistence/lead-repository';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';

export const dynamic = 'force-dynamic';
const schema = z.object({ campaignId: z.string().uuid(), leadId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid campaign/lead association.' }, { status: 400 });
    return NextResponse.json({ association: await assignLeadToCampaign(await resolvePersistenceContext(request), parsed.data.campaignId, parsed.data.leadId) }, { status: 201 });
  } catch (error) {
    const denied = error instanceof PersistenceAuthorizationError;
    return NextResponse.json({ error: denied ? error.message : 'Unable to associate lead.' }, { status: denied ? 403 : 503 });
  }
}
