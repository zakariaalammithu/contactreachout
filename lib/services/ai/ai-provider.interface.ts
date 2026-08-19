/**
 * Bulk Contact Form Outreach System — AI Provider Abstraction Interface
 * Defines modular contract for LLM providers (OpenAI, Anthropic, Mock/None).
 */

export interface AIPersonalizationContext {
  companyName: string;
  websiteUrl?: string;
  websiteContentSnippet?: string;
  industry?: string;
  location?: string;
  contactPersonName?: string;
  campaignInstructions?: string;
  maxWords?: number;
}

export interface AIPersonalizationResponse {
  subject: string;
  body: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  generatedAt: string;
  isAiGenerated: boolean;
}

export interface AIProvider {
  readonly providerName: string;
  generatePersonalizedMessage(
    context: AIPersonalizationContext
  ): Promise<AIPersonalizationResponse>;
}
