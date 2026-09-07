import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ResendProvider } from '@/lib/services/email/resend-provider';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  company: z.string().trim().max(120).optional().default(''),
  website: z.string().trim().max(300).optional().default(''),
  subject: z.string().trim().max(160).optional().default(''),
  message: z.string().trim().min(10).max(5000),
  topic: z.enum(['contact', 'demo']).default('contact'),
});

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character));

export async function POST(request: NextRequest) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Please check the form fields.' }, { status: 400 });
  }

  const { name, email, company, website, subject, message, topic } = parsed.data;
  const provider = new ResendProvider();
  const result = await provider.sendEmail({
    to: 'contactreachoutai@gmail.com',
    replyTo: email,
    subject: `${topic === 'demo' ? 'Demo request' : subject || 'Contact message'} from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || 'Not provided'}\nWebsite: ${website || 'Not provided'}\nSubject: ${subject || 'Not provided'}\n\nMessage:\n${message}`,
    html: `<h2>${topic === 'demo' ? 'ContactReachout demo request' : 'ContactReachout contact message'}</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Company:</strong> ${escapeHtml(company || 'Not provided')}</p><p><strong>Website:</strong> ${escapeHtml(website || 'Not provided')}</p><p><strong>Subject:</strong> ${escapeHtml(subject || 'Not provided')}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>`,
    tags: [{ name: 'source', value: topic }],
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Your message could not be sent. Please try again shortly.' }, { status: 503 });
  }
  return NextResponse.json({ success: true, message: 'Thanks for reaching out. Your message has been received, and our team will get back to you as soon as possible.' });
}
