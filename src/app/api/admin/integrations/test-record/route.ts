import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { recordVerification } from '@/lib/services/integration-verification-service';

const bodySchema = z.object({
  integration: z.enum(['stripe', 'resend', 'ai']),
  ok: z.boolean(),
});

/**
 * Records the outcome of a dashboard integration test (last-verified
 * time). Called fire-and-forget by detail pages after their own test
 * action completes. Never fails the test UX: a record failure still
 * returns 200 with durable:false so the hub can say so honestly.
 */
export async function POST(req: NextRequest) {
  const { errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid request.' },
      { status: 400 },
    );
  }

  const result = await recordVerification(parsed.data.integration, parsed.data.ok);
  return NextResponse.json({ success: true, recorded: result.recorded, durable: result.durable });
}
