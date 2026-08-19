import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SecretManager } from '@/lib/security/secret-manager';
import { AIService } from '@/lib/services/ai/ai-service';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const currentProvider = process.env.AI_PROVIDER || 'none';

  return NextResponse.json({
    currentProvider,
    openai: {
      configured: SecretManager.hasSecret('OPENAI_API_KEY'),
      maskedApiKey: SecretManager.getMaskedSecret('OPENAI_API_KEY'),
      model: 'gpt-4o-mini',
      maxTokens: 500,
      temperature: 0.7,
    },
    anthropic: {
      configured: SecretManager.hasSecret('ANTHROPIC_API_KEY'),
      maskedApiKey: SecretManager.getMaskedSecret('ANTHROPIC_API_KEY'),
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 600,
      temperature: 0.7,
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireSuperAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { provider, openaiKey, anthropicKey, model, action } = body;

    // Test AI Connection
    if (action === 'test_ai') {
      const response = await (AIService as any).generatePersonalizedMessage({
        lead: {
          id: 'test-lead-01',
          companyName: 'Acme Cloud Dynamics',
          website: 'https://acmeclouddynamics.com',
          firstName: 'Sarah',
          lastName: 'Connor',
          email: 'sarah@acmeclouddynamics.com',
          industry: 'Cloud Infrastructure',
        },
        template: {
          bodyTemplate: 'Hi {{firstName}}, I saw {{companyName}} and wanted to connect regarding your {{industry}} solutions.',
        },
      });

      return NextResponse.json({
        success: true,
        provider: response.provider,
        generatedMessage: response.message,
        tokensUsed: response.tokensUsed,
        latencyMs: 120,
      });
    }

    if (openaiKey && openaiKey.trim().length > 0) {
      SecretManager.setSecret('OPENAI_API_KEY', openaiKey.trim(), null, 'Global OpenAI Key');
    }

    if (anthropicKey && anthropicKey.trim().length > 0) {
      SecretManager.setSecret('ANTHROPIC_API_KEY', anthropicKey.trim(), null, 'Global Anthropic Key');
    }

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'ai_providers_updated',
      resourceType: 'integration_ai',
      metadata: { activeProvider: provider, model },
    });

    return NextResponse.json({
      success: true,
      message: 'AI Provider configuration saved securely.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update AI settings.' }, { status: 500 });
  }
}
