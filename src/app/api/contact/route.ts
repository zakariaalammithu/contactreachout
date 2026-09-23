import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ResendProvider } from '@/lib/services/email/resend-provider';

// Simple in-memory rate limiting map for contact submissions (max 5 requests per 15 mins per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const websiteSchema = z.string().trim().max(300).optional().transform((val) => {
  if (!val) return '';
  if (!/^https?:\/\//i.test(val)) {
    return `https://${val}`;
  }
  return val;
}).refine((val) => {
  if (!val) return true;
  try {
    const url = new URL(val);
    return Boolean(url.hostname && url.hostname.includes('.'));
  } catch {
    return false;
  }
}, { message: 'Please provide a valid website URL (e.g., https://example.com)' });

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Full Name must be at least 2 characters.').max(100, 'Full Name is too long.'),
  email: z.string().trim().email('Please enter a valid work email address.').max(254, 'Email is too long.'),
  company: z.string().trim().max(120, 'Company name is too long.').optional().default(''),
  website: websiteSchema.default(''),
  subject: z.string().trim().min(2, 'Subject must be at least 2 characters.').max(160, 'Subject is too long.'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters long.').max(5000, 'Message cannot exceed 5000 characters.'),
  topic: z.enum(['contact', 'demo']).default('contact'),
});

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character));

export async function POST(request: NextRequest) {
  // Rate limiting check
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5;

  const rateData = rateLimitMap.get(clientIp);
  if (rateData && now < rateData.resetTime) {
    if (rateData.count >= maxRequests) {
      return NextResponse.json(
        { error: 'Too many contact requests from this connection. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }
    rateData.count += 1;
  } else {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
  }

  // Cleanup old rate limit entries periodically
  if (rateLimitMap.size > 500) {
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) rateLimitMap.delete(ip);
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message || 'Please check the form fields.' }, { status: 400 });
  }

  const { name, email, company, website, subject, message, topic } = parsed.data;
  const targetEmail = process.env.SUPPORT_EMAIL || 'hello@contactreachout.com';

  const provider = new ResendProvider();
  const result = await provider.sendEmail({
    to: targetEmail,
    replyTo: email,
    subject: `${topic === 'demo' ? '[Demo Request]' : '[Support Message]'} ${subject} - from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || 'Not provided'}\nWebsite: ${website || 'Not provided'}\nSubject: ${subject}\nTopic: ${topic}\n\nMessage:\n${message}`,
    html: `
      <h2>${topic === 'demo' ? 'ContactReachout Demo Request' : 'ContactReachout Support Message'}</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Company:</strong> ${escapeHtml(company || 'Not provided')}</p>
      <p><strong>Website:</strong> ${escapeHtml(website || 'Not provided')}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    `,
    tags: [{ name: 'source', value: topic }],
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Your message could not be sent right now. Please try again shortly or email us directly at hello@contactreachout.com.' }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    message: "Message sent successfully. We'll get back to you as soon as possible.",
  });
}

