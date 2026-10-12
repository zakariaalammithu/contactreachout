import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolvePersistenceContext, PersistenceAuthorizationError } from '@/lib/persistence/identity';
import { createImportPreview } from '@/lib/persistence/legacy-import-service';

export const dynamic = 'force-dynamic';
const record = z.record(z.unknown());
const schema = z.object({ campaigns: z.array(record).max(1000).default([]), leads: z.array(record).max(10000).default([]), leadLists: z.array(record).max(1000).default([]) });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Legacy data payload is invalid or too large.' }, { status: 400 });
    const context = await resolvePersistenceContext(request);
    const preview = await createImportPreview(context, parsed.data);
    return NextResponse.json({ ...preview, importRequiresApproval: true });
  } catch (error) {
    const denied = error instanceof PersistenceAuthorizationError;
    return NextResponse.json({ error: denied ? error.message : 'Unable to preview legacy data.' }, { status: denied ? 403 : 503 });
  }
}
