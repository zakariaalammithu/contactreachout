import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { checkAIPersonalizationAccess } from '@/lib/services/ai/ai-entitlement';
import { SecretManager } from '@/lib/security/secret-manager';

export async function GET(request: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const access = checkAIPersonalizationAccess(session.email, session.role);
    const user = AuthStore.getUserByEmail(session.email);

    const userSecretKey = SecretManager.getSecret(`USER_OPENAI_KEY_${session.email.toLowerCase()}`);
    const openaiConfigured = Boolean(userSecretKey && userSecretKey.trim());
    const maskedApiKey = openaiConfigured ? SecretManager.maskSecret(userSecretKey) : 'NOT_CONFIGURED';

    return NextResponse.json({
      isPaidPlan: access.isPaidPlan,
      canUseAi: access.allowed,
      userPlan: access.userPlan,
      providerChoice: (user as any)?.aiProviderChoice || 'contactreachout',
      openaiConfigured,
      maskedApiKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const access = checkAIPersonalizationAccess(session.email, session.role);
    
    // CRITICAL BUSINESS RULE: Free users CANNOT configure or use AI Personalization
    if (!access.isPaidPlan) {
      return NextResponse.json(
        {
          error:
            'AI Personalization is available on paid plans. Please upgrade your plan to use AI Personalization.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, providerChoice, openaiApiKey } = body;

    const emailKey = session.email.toLowerCase().trim();

    if (action === 'test_connection') {
      const keyToTest =
        openaiApiKey && openaiApiKey.trim()
          ? openaiApiKey.trim()
          : SecretManager.getSecret(`USER_OPENAI_KEY_${emailKey}`);

      if (!keyToTest) {
        return NextResponse.json(
          { success: false, error: 'Please enter an OpenAI API key to test.' },
          { status: 400 }
        );
      }

      try {
        const testRes = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${keyToTest}`,
          },
        });

        if (testRes.ok) {
          return NextResponse.json({
            success: true,
            message: 'OpenAI connection successful.',
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Unable to connect. Please verify your API key.' },
            { status: 400 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { success: false, error: 'Unable to connect to OpenAI network.' },
          { status: 500 }
        );
      }
    }

    // Save Settings Action
    const chosenProvider = providerChoice === 'user_openai' ? 'user_openai' : 'contactreachout';

    if (openaiApiKey !== undefined && openaiApiKey !== null && openaiApiKey.trim() !== '') {
      const cleanKey = openaiApiKey.trim();
      SecretManager.setSecret(`USER_OPENAI_KEY_${emailKey}`, cleanKey, 'User-provided OpenAI API Key');
      AuthStore.updateUser(session.email, {
        openaiApiKeyConfigured: true,
        aiProviderChoice: chosenProvider,
      } as any);
    } else {
      AuthStore.updateUser(session.email, {
        aiProviderChoice: chosenProvider,
      } as any);
    }

    const updatedKey = SecretManager.getSecret(`USER_OPENAI_KEY_${emailKey}`);
    const isConfigured = Boolean(updatedKey && updatedKey.trim());
    const maskedApiKey = isConfigured ? SecretManager.maskSecret(updatedKey) : 'NOT_CONFIGURED';

    return NextResponse.json({
      success: true,
      message: 'AI Settings saved successfully.',
      providerChoice: chosenProvider,
      openaiConfigured: isConfigured,
      maskedApiKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
