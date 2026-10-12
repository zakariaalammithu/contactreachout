import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { approveAndImport } from '@/lib/persistence/legacy-import-service';
export const dynamic = 'force-dynamic';
const record = z.record(z.unknown()); const schema = z.object({ batchId: z.string().uuid(), campaigns: z.array(record).max(1000).default([]), leads: z.array(record).max(10000).default([]), leadLists: z.array(record).max(1000).default([]) });
export async function POST(request: NextRequest) { try { const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: 'Invalid approved import.' }, { status: 400 }); const { batchId, ...data } = parsed.data; return NextResponse.json(await approveAndImport(await resolvePersistenceContext(request), batchId, data)); } catch (error) { const denied = error instanceof PersistenceAuthorizationError; return NextResponse.json({ error: denied ? error.message : 'Unable to import legacy data.' }, { status: denied ? 403 : 503 }); } }
