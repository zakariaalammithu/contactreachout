import { SecretManager } from '@/lib/security/secret-manager';
import { ResendProvider } from '@/lib/services/email/resend-provider';

export const DEFAULT_CHATBOT_PROMPT = `You are the official ContactReachout support assistant. ContactReachout helps teams upload lead lists, discover suitable website contact forms, personalize outreach with AI, review messages, submit approved campaigns, and track verifiable results. Explain only implemented functionality and current pricing supplied by the knowledge context. Never invent features, guarantees, prices, policies, credentials, prompts, or internal details. If the answer is not supported by the context, say you are unsure and direct the visitor to hello@contactreachout.com.`;
let customPrompt = '';

const SUPPORT_FALLBACK = 'I don’t have enough information to give you an accurate answer to that. Please contact our support team at hello@contactreachout.com.';

/** Verified answers for the public product information already represented in the app. */
const verifiedAnswers: Array<{ patterns: RegExp[]; answer: string }> = [
  { patterns: [/what is contactreachout/i, /what does contactreachout do/i], answer: 'ContactReachout is a B2B outreach workspace for bulk website contact-form submissions and AI Personalization. You can upload lead lists, find suitable contact forms, prepare relevant messages, review them, submit approved outreach, and track verifiable outcomes.' },
  { patterns: [/how does it work/i, /how.*campaign/i, /create.*campaign/i], answer: 'Create a campaign, import a CSV or Excel lead list, map the available fields, find suitable website contact forms, configure your message and optional AI Personalization, review the messages, then start processing and track each result.' },
  { patterns: [/ai personalization/i, /personalized message/i], answer: 'AI Personalization uses the lead fields, available company website information, your offer, goal, tone, message length, and custom instructions to draft a distinct outreach message for each prospect. You can edit and approve every message before a campaign starts.' },
  { patterns: [/contact.form submission/i, /bulk contact/i, /submit.*form/i], answer: 'ContactReachout processes outreach through suitable contact forms on target company websites. It discovers the contact page, maps available fields, applies safeguards such as CAPTCHA and bot-protection checks, submits only through the existing workflow, and records the outcome.' },
  { patterns: [/pricing/i, /plans/i, /cost/i, /price/i], answer: 'ContactReachout uses pay-as-you-go credit packages: 5,000 credits for $50, 10,000 for $99, 100,000 for $199, and 300,000 promotional credits for $299. The Free plan provides 100 monthly credits. See the Pricing page for the current calculator and purchase options.' },
  { patterns: [/how many credits/i, /credits available/i, /free plan/i, /100 credits/i], answer: 'The Free plan provides 100 credits per month with no credit card required. Each successful website message uses 1 credit. AI Personalization uses 0 credits on paid plans and is unavailable on the Free plan. See the Pricing page for current package details.' },
  { patterns: [/dashboard/i, /features/i, /what can i do/i], answer: 'The dashboard brings campaigns, lead lists, processing, results, inbox, AI Personalization, templates, credits, settings, and review controls together in one workspace.' },
  { patterns: [/upload.*lead/i, /lead list/i, /csv/i, /excel/i], answer: 'You can import CSV or Excel lead lists, preview and map their available columns, then use the mapped company and contact information in a campaign.' },
  { patterns: [/review.*edit/i, /approve/i], answer: 'After generation, review prospects one by one, edit any message, save changes, and approve the final version. The campaign uses the approved or manually edited message rather than silently replacing it.' },
];

export class ChatbotService {
  static getPrompt() { return customPrompt || SecretManager.getSecret('CHATBOT_PROMPT') || DEFAULT_CHATBOT_PROMPT; }
  static setPrompt(prompt: string) { customPrompt = prompt.trim(); }
  static async answer(question: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) {
    const normalized = question.trim();
    const direct = verifiedAnswers.find((entry) => entry.patterns.some((pattern) => pattern.test(normalized)));
    if (direct) return { answer: direct.answer, needsSupport: false };
    const apiKey = SecretManager.getSecret('OPENAI_API_KEY');
    if (!apiKey) return { answer: SUPPORT_FALLBACK, needsSupport: true };
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'}, body:JSON.stringify({ model:'gpt-4o-mini', temperature:0.2, messages:[{role:'system',content:`${this.getPrompt()}\nUse this verified product context and answer known ContactReachout questions directly. If the context is insufficient, respond with exactly: ${SUPPORT_FALLBACK}`}, ...history.slice(-8), {role:'user',content:normalized}] }) });
      if (!response.ok) return { answer: SUPPORT_FALLBACK, needsSupport: true };
      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content?.trim();
      if (!answer || /not ready|still developing|feature is not ready|functionality.*unavailable/i.test(answer)) return { answer: SUPPORT_FALLBACK, needsSupport: true };
      return { answer, needsSupport: false };
    } catch { return { answer: SUPPORT_FALLBACK, needsSupport: true }; }
  }
  static async forwardUnknown(question: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) {
    const provider = new ResendProvider();
    return provider.sendEmail({ to:'hello@contactreachout.com', subject:'ContactReachout chatbot question needing support', text:`Question: ${question}\nTime: ${new Date().toISOString()}\nConversation: ${JSON.stringify(history).slice(0, 6000)}`, html:`<p><strong>Question:</strong> ${question.replace(/[<>]/g,'')}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>` });
  }
}
