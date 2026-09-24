import { UserAccount, AuthStore } from '@/lib/auth/auth-store';

export interface AIPersonalizationAccessResult {
  allowed: boolean;
  reason?: string;
  userPlan: string;
  isPaidPlan: boolean;
  providerChoice: 'contactreachout' | 'user_openai';
  hasUserApiKey: boolean;
}

/**
 * Single Canonical Source of Truth for AI Personalization Entitlement.
 * Enforces Business Rules:
 * 1. Free User -> CANNOT use AI Personalization (allowed = false)
 * 2. Free User + Own OpenAI API Key -> STILL CANNOT use AI Personalization (allowed = false)
 * 3. Paid User (Starter, Growth, Agency, Enterprise) -> CAN use AI Personalization (allowed = true)
 * 4. Admin / Super Admin -> Allowed according to authorized admin rules
 */
export function checkAIPersonalizationAccess(
  emailOrUser: string | UserAccount | null | undefined,
  sessionRole?: string
): AIPersonalizationAccessResult {
  if (!emailOrUser) {
    return {
      allowed: false,
      reason: 'Authentication required to access AI Personalization.',
      userPlan: 'Free',
      isPaidPlan: false,
      providerChoice: 'contactreachout',
      hasUserApiKey: false,
    };
  }

  let user: UserAccount | null = null;
  if (typeof emailOrUser === 'string') {
    user = AuthStore.getUserByEmail(emailOrUser);
  } else {
    user = emailOrUser;
  }

  const role = sessionRole || user?.role || 'USER';

  // Admin and Super Admin always authorized
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return {
      allowed: true,
      userPlan: user?.plan || 'Enterprise',
      isPaidPlan: true,
      providerChoice: ((user as any)?.aiProviderChoice as 'user_openai' | 'contactreachout') || 'contactreachout',
      hasUserApiKey: Boolean((user as any)?.openaiApiKeyConfigured),
    };
  }

  if (user?.isSuspended) {
    return {
      allowed: false,
      reason: 'Account is suspended. Please contact support.',
      userPlan: user?.plan || 'Free',
      isPaidPlan: false,
      providerChoice: 'contactreachout',
      hasUserApiKey: false,
    };
  }

  const rawPlan = (user?.plan || 'Free').trim().toLowerCase();
  // Free plan check: 'free', 'plan_free', 'none', or empty
  const isFreePlan = !rawPlan || rawPlan === 'free' || rawPlan === 'plan_free' || rawPlan === 'none';

  if (isFreePlan) {
    return {
      allowed: false,
      reason: 'AI Personalization is available on paid plans. Please upgrade your plan to use AI Personalization.',
      userPlan: user?.plan || 'Free',
      isPaidPlan: false,
      providerChoice: 'contactreachout',
      hasUserApiKey: Boolean((user as any)?.openaiApiKeyConfigured),
    };
  }

  // Any active paid plan (Starter, Growth, Agency, Enterprise, etc.)
  return {
    allowed: true,
    userPlan: user?.plan || 'Paid',
    isPaidPlan: true,
    providerChoice: ((user as any)?.aiProviderChoice as 'user_openai' | 'contactreachout') || 'contactreachout',
    hasUserApiKey: Boolean((user as any)?.openaiApiKeyConfigured),
  };
}
