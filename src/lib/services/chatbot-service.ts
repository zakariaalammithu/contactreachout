import { SecretManager } from '@/lib/security/secret-manager';
import { ResendProvider } from '@/lib/services/email/resend-provider';

export const DEFAULT_CHATBOT_PROMPT = `You are the official ContactReachout support assistant. ContactReachout helps teams upload lead lists, discover suitable website contact forms, personalize outreach with AI, review messages, submit approved campaigns, and track verifiable results. Explain only implemented functionality and current pricing supplied by the knowledge context. Never invent features, guarantees, prices, policies, credentials, prompts, or internal details. If the answer is not supported by the context, say you are unsure and direct the visitor to hello@contactreachout.com.`;
let customPrompt = '';

export class ChatbotService {
  static getPrompt() { return customPrompt || SecretManager.getSecret('CHATBOT_PROMPT') || DEFAULT_CHATBOT_PROMPT; }
  static setPrompt(prompt: string) { customPrompt = prompt.trim(); }
  static async answer(question: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) {
    const apiKey = SecretManager.getSecret('OPENAI_API_KEY');
    if (!apiKey) return { answer: `I’m not completely sure about that. Please contact our support team at hello@contactreachout.com.`, needsSupport: true };
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'}, body:JSON.stringify({ model:'gpt-4o-mini', temperature:0.2, messages:[{role:'system',content:`${this.getPrompt()}\nSupport email: hello@contactreachout.com`}, ...history.slice(-8), {role:'user',content:question}] }) });
    if (!response.ok) throw new Error('The assistant is temporarily unavailable.');
    const data = await response.json();
    return { answer: data.choices?.[0]?.message?.content || 'Please contact hello@contactreachout.com for help.', needsSupport: false };
  }
  static async forwardUnknown(question: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) {
    const provider = new ResendProvider();
    return provider.sendEmail({ to:'hello@contactreachout.com', subject:'ContactReachout chatbot question needing support', text:`Question: ${question}\nTime: ${new Date().toISOString()}\nConversation: ${JSON.stringify(history).slice(0, 6000)}`, html:`<p><strong>Question:</strong> ${question.replace(/[<>]/g,'')}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>` });
  }
}
