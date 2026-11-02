

import { NextRequest, NextResponse } from 'next/server';
import { SecretManager } from '@/lib/security/secret-manager';

export async function GET() {
  const apiKey = SecretManager.getSecret('RESEND_API_KEY') || process.env.RESEND_API_KEY;
  return NextResponse.json({
    configured: Boolean(apiKey && apiKey.startsWith('re_')),
    maskedPreview: SecretManager.maskSecret(apiKey),
  });
}

export async function POST(req: NextRequest) {
  // DISABLED under environment-only mode (2026-11-02): RESEND_API_KEY
  // comes only from server environment. This endpoint used to write the
  // key into per-instance memory, where it vanished on recycle.
  return NextResponse.json(
    { error: 'API keys are managed via server environment only. Set RESEND_API_KEY in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
    { status: 410 },
  );
}
