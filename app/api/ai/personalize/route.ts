import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/services/ai/ai-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      websiteUrl,
      industry,
      location,
      contactPersonName,
      campaignInstructions,
      maxWords,
    } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: 'Missing required companyName' },
        { status: 400 }
      );
    }

    const result = await AIService.personalizeMessage({
      companyName,
      websiteUrl,
      industry,
      location,
      contactPersonName,
      campaignInstructions,
      maxWords: maxWords || 120,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal AI personalization error' },
      { status: 500 }
    );
  }
}
