import { NextRequest, NextResponse } from 'next/server';
import { ContactPageFinder } from '@/lib/services/contact-page-finder';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteUrl, navigationTimeoutMs } = body;

    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing websiteUrl in request body' },
        { status: 400 }
      );
    }

    const result = await ContactPageFinder.findContactPage({
      websiteUrl,
      navigationTimeoutMs: navigationTimeoutMs || 20000,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error in ContactPageFinder service' },
      { status: 500 }
    );
  }
}
