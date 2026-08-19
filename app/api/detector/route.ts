import { NextRequest, NextResponse } from 'next/server';
import { ContactFormDetector, detectFormsInHtml } from '@/lib/services/form-detector';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactPageUrl, html } = body;

    // If direct HTML is supplied (e.g. from headless Playwright page snapshot)
    if (html && typeof html === 'string') {
      const result = detectFormsInHtml(html, contactPageUrl || '');
      return NextResponse.json(result);
    }

    if (!contactPageUrl || typeof contactPageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing contactPageUrl or html parameter in request body' },
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
