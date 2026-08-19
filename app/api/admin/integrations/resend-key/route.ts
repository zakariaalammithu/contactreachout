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
  try {
    const body = await req.json();
    const { apiKey } = body;

    if (!apiKey || !apiKey.startsWith('re_')) {
      return NextResponse.json({ error: 'Invalid Resend API Key. Valid keys start with "re_".' }, { status: 400 });
    }

    SecretManager.setSecret('RESEND_API_KEY', apiKey.trim());
    process.env.RESEND_API_KEY = apiKey.trim();

    return NextResponse.json({
      success: true,
      message: 'Resend API Key updated and activated for live email delivery.',
      maskedPreview: SecretManager.maskSecret(apiKey.trim()),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update Resend API Key' }, { status: 500 });
  }
}
