import { NextRequest, NextResponse } from 'next/server';
import { ContactFormDetector } from '@/lib/services/form-detector';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactPageUrl } = body;

    if (!contactPageUrl || typeof contactPageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing contactPageUrl parameter in request body' },
        { status: 400 }
      );
    }

    const result = await ContactFormDetector.detectFormOnPage(contactPageUrl);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error during form detection' },
      { status: 500 }
    );
  }
}
