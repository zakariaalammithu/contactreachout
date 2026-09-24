/**
 * Bulk Contact Form Outreach System — AI Personalization Service
 * Provider registry supporting OpenAI, Anthropic, and deterministic fallback (None).
 * Strictly enforces truthfulness guardrails (no false claims, no invented facts).
 */

import {
  AIProvider,
  AIPersonalizationContext,
  AIPersonalizationResponse,
} from './ai-provider.interface';

// Truthfulness system prompt guidelines
export const ETHICAL_AI_SYSTEM_PROMPT = `
You are a professional B2B outreach assistant.
Your task is to write a concise, respectful, and highly relevant contact form inquiry.

STRICT COMPLIANCE DIRECTIVES:
1. Do NOT generate deceptive claims or false urgency.
2. Do NOT pretend to have personally used or tested the recipient company's products/services if not verified.
3. Do NOT invent fake customer testimonials or untrue facts.
4. Keep the tone courteous, direct, and concise (under the requested word count).
5. Only reference the provided public company information (company name, industry, location, website).
`;

/**
 * None / Local Fallback Provider (Used when AI_PROVIDER=none or no API keys are present)
 */
export class NoneProvider implements AIProvider {
  public readonly providerName = 'none';

  public async generatePersonalizedMessage(
    context: AIPersonalizationContext
  ): Promise<AIPersonalizationResponse> {
    const hasPerson = Boolean(
      context.contactPersonName &&
      context.contactPersonName !== 'Not available' &&
      context.contactPersonName !== 'there' &&
      !/^(http|www\.)/i.test(context.contactPersonName)
    );
    const hasCompany = Boolean(
      context.companyName &&
      context.companyName !== 'Not available' &&
      !/^(http|www\.)/i.test(context.companyName) &&
      !/\.(com|org|net|io|co)$/i.test(context.companyName)
    );

    const greeting = hasPerson
      ? `Hi ${context.contactPersonName},`
      : hasCompany
      ? `Hello ${context.companyName} Team,`
      : `Hello there,`;

    const industryNote = context.industry && context.industry !== 'Not available'
      ? ` regarding your work in the ${context.industry} space`
      : '';

    const subject = hasCompany
      ? `Partnership inquiry regarding ${context.companyName}`
      : `Partnership inquiry`;

    const body = hasCompany
      ? `${greeting}\n\nI came across ${context.companyName}${industryNote} and wanted to reach out regarding potential B2B collaboration opportunities.\n\nWe offer specialized software services tailored for growing organizations.\n\nWould you be open to a brief intro conversation next week?\n\nBest regards,\nContactReachout\nhello@contactreachout.com\nAustin, TX 73301, USA`
      : `${greeting}\n\nI came across your business${industryNote} and wanted to reach out regarding potential B2B collaboration opportunities.\n\nWe offer specialized software services tailored for growing organizations.\n\nWould you be open to a brief intro conversation next week?\n\nBest regards,\nContactReachout\nhello@contactreachout.com\nAustin, TX 73301, USA`;

    return {
      subject,
      body,
      provider: 'deterministic_fallback',
      model: 'template_interpolator',
      generatedAt: new Date().toISOString(),
      isAiGenerated: false,
    };
  }
}

/**
 * OpenAI Provider Adapter
 */
export class OpenAIProvider implements AIProvider {
  public readonly providerName = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model;
  }

  public async generatePersonalizedMessage(
    context: AIPersonalizationContext
  ): Promise<AIPersonalizationResponse> {
    if (!this.apiKey) {
      // Graceful fallback to deterministic generator if API key is omitted
      return new NoneProvider().generatePersonalizedMessage(context);
    }

    try {
      const userPrompt = `
Company: ${context.companyName}
Website: ${context.websiteUrl || 'N/A'}
Industry: ${context.industry || 'B2B'}
Location: ${context.location || 'N/A'}
Contact Person: ${context.contactPersonName || 'Team'}
Max Words: ${context.maxWords || 120}
Campaign Guidance: ${context.campaignInstructions || 'Professional B2B partnership introduction.'}

Generate a personalized outreach subject line and message body. Format response as JSON with "subject" and "body" keys.
`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: ETHICAL_AI_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        return new NoneProvider().generatePersonalizedMessage(context);
      }

      const data = await res.json();
      const content = JSON.parse(data.choices[0].message.content);

      return {
        subject: content.subject,
        body: content.body,
        provider: 'openai',
        model: this.model,
        tokensUsed: data.usage?.total_tokens,
        generatedAt: new Date().toISOString(),
        isAiGenerated: true,
      };
    } catch {
      return new NoneProvider().generatePersonalizedMessage(context);
    }
  }
}

/**
 * Anthropic Provider Adapter
 */
export class AnthropicProvider implements AIProvider {
  public readonly providerName = 'anthropic';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'claude-3-haiku-20240307') {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = model;
  }

  public async generatePersonalizedMessage(
    context: AIPersonalizationContext
  ): Promise<AIPersonalizationResponse> {
    if (!this.apiKey) {
      return new NoneProvider().generatePersonalizedMessage(context);
    }

    try {
      const userPrompt = `
Company: ${context.companyName}
Industry: ${context.industry || 'B2B'}
Location: ${context.location || 'N/A'}
Contact Person: ${context.contactPersonName || 'Team'}
Max Words: ${context.maxWords || 120}
Campaign Guidance: ${context.campaignInstructions || 'Professional B2B partnership introduction.'}

Write a short outreach inquiry. Output valid JSON: {"subject": "...", "body": "..."}
`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          system: ETHICAL_AI_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        return new NoneProvider().generatePersonalizedMessage(context);
      }

      const data = await res.json();
      const rawText = data.content[0].text;
      const parsed = JSON.parse(rawText.match(/\{[\s\S]*\}/)[0]);

      return {
        subject: parsed.subject,
        body: parsed.body,
        provider: 'anthropic',
        model: this.model,
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
        generatedAt: new Date().toISOString(),
        isAiGenerated: true,
      };
    } catch {
      return new NoneProvider().generatePersonalizedMessage(context);
    }
  }
}

/**
 * Central AI Service Factory
 */
import { SecretManager } from '@/lib/security/secret-manager';

export class AIService {
  private static providerInstance: AIProvider | null = null;

  public static resetCache(): void {
    this.providerInstance = null;
  }

  public static getProvider(overrideProviderType?: string): AIProvider {
    const providerType = (
      overrideProviderType ||
      SecretManager.getSecret('AI_PROVIDER') ||
      process.env.AI_PROVIDER ||
      'none'
    ).toLowerCase().trim();

    const openaiKey = SecretManager.getSecret('OPENAI_API_KEY') || process.env.OPENAI_API_KEY || undefined;
    const anthropicKey = SecretManager.getSecret('ANTHROPIC_API_KEY') || process.env.ANTHROPIC_API_KEY || undefined;

    switch (providerType) {
      case 'openai':
        return new OpenAIProvider(openaiKey);
      case 'anthropic':
        return new AnthropicProvider(anthropicKey);
      default:
        return new NoneProvider();
    }
  }

  /**
   * Generates a personalized outreach draft.
   */
  public static async personalizeMessage(
    context: AIPersonalizationContext,
    customProvider?: AIProvider
  ): Promise<AIPersonalizationResponse> {
    const provider = customProvider || this.getProvider();
    return provider.generatePersonalizedMessage(context);
  }
}
