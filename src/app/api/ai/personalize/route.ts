import { NextRequest, NextResponse } from 'next/server';
import { AIService, OpenAIProvider } from '@/lib/services/ai/ai-service';
import { SessionManager } from '@/lib/auth/session';
import { WebsiteAnalyzer } from '@/lib/services/website-analyzer';
import { checkAIPersonalizationAccess } from '@/lib/services/ai/ai-entitlement';
import { SecretManager } from '@/lib/security/secret-manager';

export async function POST(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // CANONICAL SERVER-SIDE AUTHORIZATION CHECK
    const access = checkAIPersonalizationAccess(session.email, session.role);

    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            'AI Personalization is available on paid plans. Please upgrade your plan to use AI Personalization.',
        },
        { status: 403 }
      );
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
      providerOverride,
    } = body;

    if (!companyName && !websiteUrl) {
      return NextResponse.json(
        { error: 'Missing required lead target (websiteUrl or companyName)' },
        { status: 400 }
      );
    }

    const isDomainCompany = typeof companyName === 'string' && (/^(http|www\.)/i.test(companyName) || /\.(com|org|net|io|co)$/i.test(companyName));
    const safeCompanyName = companyName && !isDomainCompany ? companyName.trim() : 'Not available';
    const safeContactPerson = contactPersonName && contactPersonName !== 'there' ? contactPersonName.trim() : 'Not available';

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
      `First Name: ${safeContactPerson}`,
      `Company: ${safeCompanyName}`,
      `Website: ${websiteUrl || 'Not available'}`,
      'STRICT RULE: Do NOT invent a person name or company name if listed as "Not available".',
    ].filter(Boolean).join('\n');

    const context = {
      companyName: safeCompanyName,
      websiteUrl: websiteUrl || '',
      industry: industry || '',
      location: location || '',
      contactPersonName: safeContactPerson,
      campaignInstructions: groundedGuidance,
      maxWords: maxWords || 120,
    };

    // Determine AI Provider based on Paid User Settings
    const activeProviderChoice = providerOverride || access.providerChoice;
    let providerToUse;

    if (activeProviderChoice === 'user_openai') {
      const userApiKey = SecretManager.getSecret(`USER_OPENAI_KEY_${session.email.toLowerCase()}`);
      if (!userApiKey || !userApiKey.trim()) {
        return NextResponse.json(
          {
            error:
              'Your OpenAI API key is not configured in Settings. Please configure your API key or select ContactReachout AI.',
          },
          { status: 400 }
        );
      }
      providerToUse = new OpenAIProvider(userApiKey.trim());
    } else {
      providerToUse = AIService.getProvider();
    }

    const result = await providerToUse.generatePersonalizedMessage(context);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal AI personalization error' },
      { status: 500 }
    );
  }
}
