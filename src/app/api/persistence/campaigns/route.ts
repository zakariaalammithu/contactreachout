import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCampaign, listCampaigns } from '@/lib/persistence/campaign-repository';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';

export const dynamic = 'force-dynamic';
const createSchema = z.object({ name: z.string().trim().min(1).max(255), status: z.string().trim().max(64).optional(), isDryRun: z.boolean().optional(), settings: z.record(z.unknown()).optional() });

export async function GET(request: NextRequest) {
  try { return NextResponse.json({ campaigns: await listCampaigns(await resolvePersistenceContext(request)) }); }
  catch (error) { const denied = error instanceof PersistenceAuthorizationError; return NextResponse.json({ error: denied ? error.message : 'Unable to list campaigns.' }, { status: denied ? 403 : 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid campaign.' }, { status: 400 });
    return NextResponse.json({ campaign: await createCampaign(await resolvePersistenceContext(request), parsed.data) }, { status: 201 });
  } catch (error) { const denied = error instanceof PersistenceAuthorizationError; return NextResponse.json({ error: denied ? error.message : 'Unable to create campaign.' }, { status: denied ? 403 : 503 }); }
}
