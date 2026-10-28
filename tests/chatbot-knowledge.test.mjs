import { describe, expect, it } from 'vitest';

const { findKnowledgeAnswer, findTopKnowledge, CHATBOT_KNOWLEDGE } = await import(
  '@/lib/services/chatbot-knowledge'
);

describe('chatbot website knowledge', () => {
  it('has entries with answers and sources', () => {
    expect(CHATBOT_KNOWLEDGE.length).toBeGreaterThan(10);
    for (const entry of CHATBOT_KNOWLEDGE) {
      expect(entry.answer.length).toBeGreaterThan(20);
      expect(entry.source.startsWith('/')).toBe(true);
      expect(entry.keywords.length).toBeGreaterThan(0);
    }
  });

  it('answers pricing questions with real plan prices', () => {
    const hit = findKnowledgeAnswer('How much does it cost? What are the plans?');
    expect(hit).not.toBeNull();
    expect(hit.answer).toContain('$50');
    expect(hit.answer).toContain('$99');
    expect(hit.source).toBe('/pricing');
  });

  it('answers credit questions with the 1-credit rule', () => {
    const hit = findKnowledgeAnswer('How are credits used?');
    expect(hit).not.toBeNull();
    expect(hit.answer).toContain('1 credit');
    expect(hit.answer).toContain('0 credits');
  });

  it('answers Gmail connect questions', () => {
    const hit = findKnowledgeAnswer('How do I connect a Gmail mailbox?');
    expect(hit).not.toBeNull();
    expect(hit.answer).toContain('Connect Gmail');
  });

  it('answers referral questions with 100/50 bonuses', () => {
    const hit = findKnowledgeAnswer('How does the referral program work?');
    expect(hit).not.toBeNull();
    expect(hit.answer).toContain('100');
    expect(hit.answer).toContain('50');
  });

  it('corrects the email-campaign misunderstanding', () => {
    const hit = findKnowledgeAnswer('Do you send bulk email campaigns?');
    expect(hit).not.toBeNull();
    expect(hit.answer).toContain('does not send email campaigns');
  });

  it('answers support questions with the public support email', () => {
    const hit = findKnowledgeAnswer('How do I contact support?');
    expect(hit).not.toBeNull();
    expect(hit.answer).toContain('hello@contactreachout.com');
  });

  it('returns null for unrelated gibberish so the fallback applies', () => {
    expect(findKnowledgeAnswer('asdfgh qwerty zzz')).toBeNull();
    expect(findKnowledgeAnswer('what is the weather on mars')).toBeNull();
  });

  it('never exposes internal addresses or secrets in answers', () => {
    for (const entry of CHATBOT_KNOWLEDGE) {
      expect(entry.answer).not.toContain('contactreachoutai@gmail.com');
      expect(entry.answer).not.toContain('api key');
      expect(entry.answer.toLowerCase()).not.toContain('secret');
    }
  });

  it('finds top knowledge for AI context', () => {
    const top = findTopKnowledge('What is the pricing for agency plan?', 3);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].id).toBe('pricing');
  });
});
