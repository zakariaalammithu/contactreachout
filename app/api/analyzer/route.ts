import { NextRequest, NextResponse } from 'next/server';
import { WebsiteAnalyzer } from '@/lib/services/website-analyzer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteUrl, forceRefresh } = body;

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Missing required websiteUrl' },
        { status: 400 }
      );
    }

    const result = await WebsiteAnalyzer.analyzeWebsite(websiteUrl, {
      forceRefresh: Boolean(forceRefresh),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal website analysis error' },
      { status: 500 }
    );
  }
}
