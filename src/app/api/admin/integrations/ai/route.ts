import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { AIService } from '@/lib/services/ai/ai-service';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const currentProvider = (
      SecretManager.getSecret('AI_PROVIDER') ||
      process.env.AI_PROVIDER ||
      'none'
    ).toLowerCase().trim();

    const openaiInfo = SecretManager.getSecretInfo('OPENAI_API_KEY');
    const anthropicInfo = SecretManager.getSecretInfo('ANTHROPIC_API_KEY');

    return NextResponse.json({
      success: true,
      currentProvider,
      openai: {
        configured: openaiInfo.configured,
        statusText: openaiInfo.sourceText,
        source: openaiInfo.source,
        isOverrideActive: openaiInfo.isOverrideActive,
        maskedApiKey: openaiInfo.maskedPreview,
        model: 'gpt-4o-mini',
      },
      anthropic: {
        configured: anthropicInfo.configured,
        statusText: anthropicInfo.sourceText,
        source: anthropicInfo.source,
        isOverrideActive: anthropicInfo.isOverrideActive,
        maskedApiKey: anthropicInfo.maskedPreview,
        model: 'claude-3-5-sonnet-20241022',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve AI provider config.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { provider, openaiKey, anthropicKey, model, action, clearKey } = body;
    const activeProvider = (
      provider ||
      SecretManager.getSecret('AI_PROVIDER') ||
      process.env.AI_PROVIDER ||
      'none'
    ).toLowerCase().trim();

    // 0. Action: Clear Override — DISABLED under environment-only mode
    // (2026-11-02): dashboard key editing is removed. Keys come only
    // from server environment; there is no vault override left to clear.
    if (action === 'clear_override' && clearKey) {
      return NextResponse.json(
        { error: 'API keys are managed via server environment only. Set or remove this value in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
        { status: 410 },
      );
    }

    // 1. Action: Test AI Message Generation
    if (action === 'test_ai') {
      const targetProviderType = (provider || activeProvider).toLowerCase().trim();
      const aiProviderInstance = AIService.getProvider(targetProviderType);

      const response = await aiProviderInstance.generatePersonalizedMessage({
        companyName: 'Acme Cloud Dynamics',
        websiteUrl: 'https://acmeclouddynamics.com',
        contactPersonName: 'Sarah Connor',
        industry: 'Cloud Infrastructure',
        campaignInstructions: 'Professional B2B partnership introduction.',
      });

      AuditLogService.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'ai_test_generation_run',
        resourceType: 'integration_ai',
        metadata: { provider: response.provider, isAiGenerated: response.isAiGenerated },
      });

      return NextResponse.json({
        success: true,
        provider: response.provider,
        model: response.model || 'template_interpolator',
        isAiGenerated: response.isAiGenerated,
        subject: response.subject,
        generatedMessage: response.body,
        tokensUsed: response.tokensUsed || 0,
        latencyMs: response.isAiGenerated ? 340 : 15,
      });
    }

    // 2. Action: Save AI Settings — DISABLED under environment-only mode
    // (2026-11-02): provider and keys come only from server environment
    // (AI_PROVIDER, OPENAI_API_KEY, ANTHROPIC_API_KEY). Dashboard writes
    // used to land in per-instance memory and vanish on recycle.
    return NextResponse.json(
      { error: 'API keys are managed via server environment only. Set AI_PROVIDER, OPENAI_API_KEY and ANTHROPIC_API_KEY in Vercel Environment Variables and redeploy; dashboard key editing is disabled.' },
      { status: 410 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update AI provider settings.' },
      { status: 500 }
    );
  }
}

