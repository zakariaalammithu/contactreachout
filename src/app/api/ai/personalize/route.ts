

import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/services/ai/ai-service';
import { SessionManager } from '@/lib/auth/session';
import { WebsiteAnalyzer } from '@/lib/services/website-analyzer';
import { AuthStore } from '@/lib/auth/auth-store';

export async function POST(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const account = AuthStore.getUserByEmail(session.email);
    if (account && account.role === 'USER' && account.paidCredits <= 0) {
      return NextResponse.json({ error: 'AI Personalization is available on paid plans. Upgrade your plan to unlock AI-powered personalized outreach.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      companyName,
      websiteUrl,
      industry,
      location,
      contactPersonName,
      campaignInstructions,
      maxWords,
      offer,
      messageGoal,
      tone,
      customInstructions,
      leadFields,
    } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: 'Missing required companyName' },
        { status: 400 }
      );
    }

    let websiteContext = '';
    if (typeof websiteUrl === 'string' && websiteUrl.trim()) {
      const analysis = await WebsiteAnalyzer.analyzeWebsite(websiteUrl.trim(), { timeoutMs: 8000 });
      if (analysis.status === 'COMPLETED') websiteContext = analysis.summary;
    }
    const groundedGuidance = [
      `What the sender offers: ${offer || 'Not provided'}`,
      `Message goal: ${messageGoal || 'Generate Interest'}`,
      `Tone: ${tone || 'Professional'}`,
      campaignInstructions,
      customInstructions,
      websiteContext ? `Verified public website context: ${websiteContext}` : 'Website context unavailable; rely only on supplied lead fields.',
      leadFields && typeof leadFields === 'object' ? `Available lead fields: ${JSON.stringify(leadFields).slice(0, 2000)}` : '',
    ].filter(Boolean).join('\n');
    const result = await AIService.personalizeMessage({
      companyName,
      websiteUrl,
      industry,
      location,
      contactPersonName,
      campaignInstructions: groundedGuidance,
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
