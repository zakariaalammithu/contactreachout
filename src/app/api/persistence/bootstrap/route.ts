import { NextRequest, NextResponse } from 'next/server';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const context = await resolvePersistenceContext(request);
    return NextResponse.json({ organizationId: context.organizationId, role: context.role });
  } catch (error) {
    const authorizedError = error instanceof PersistenceAuthorizationError;
    return NextResponse.json({ error: authorizedError ? error.message : 'Unable to establish persistent identity.' }, { status: authorizedError ? 403 : 503 });
  }
}
