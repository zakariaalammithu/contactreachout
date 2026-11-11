import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { SessionManager } from '@/lib/auth/session';
import { normalizePhoneNumber } from '@/lib/services/phone-normalization';
import {
  readDurableContact,
  writeDurableContact,
} from '@/lib/services/profile-contact-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const user = AuthStore.getUserByEmail(session.email);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const replyEmailVerified = user.replyEmailVerified ?? user.isEmailVerified;

  // Durable merge: AuthStore first (freshest on this instance), durable
  // app_users row second (the value that survives instance changes).
  const durable = await readDurableContact(session.email);
  const activeReplyEmail = user.replyEmail || durable?.replyEmail || '';
  const name = user.name || durable?.displayName || '';
  const phone = user.phone || durable?.phone || '';
  const whatsApp = user.whatsApp || durable?.whatsapp || '';
  const companyName = user.company || durable?.companyName || '';
  const website = user.website || durable?.website || '';
  const jobTitle = user.jobTitle || durable?.jobTitle || '';
  const country = user.country || durable?.country || '';

  return NextResponse.json({
    user: {
      name,
      email: user.email,
      phone,
      whatsApp,
      companyName,
      website,
      jobTitle,
      country,
      avatarUrl: user.avatarUrl || '',
      replyEmail: activeReplyEmail,
      replyEmailVerified,
      unverifiedReplyEmail: user.unverifiedReplyEmail || '',
      createdAt: user.createdAt,
    },
    contactDurable: durable !== null,
  });
}

const profileSchema = z.object({
  name: z.string().trim().max(100).optional().default(''),
  phone: z.string().trim().max(50).optional().default(''),
  whatsApp: z.string().trim().max(50).optional().default(''),
  phoneCountry: z.string().trim().max(10).optional().default(''),
  whatsAppCountry: z.string().trim().max(10).optional().default(''),
  companyName: z.string().trim().max(100).optional().default(''),
  website: z.string().trim().max(255).optional().default(''),
  jobTitle: z.string().trim().max(100).optional().default(''),
  country: z.string().trim().max(100).optional().default(''),
  avatarUrl: z.string().max(1_500_000).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid profile.' }, { status: 400 });

  // Server-side normalization (the client normalizes too, but the API
  // must not trust it): wa.me links, local trunk-0 numbers and +numbers
  // all become E.164; an unparseable non-empty value is rejected.
  const normalizedPhone = normalizePhoneNumber(parsed.data.phone, parsed.data.phoneCountry);
  const normalizedWhatsApp = normalizePhoneNumber(parsed.data.whatsApp, parsed.data.whatsAppCountry);
  if (normalizedPhone === null) {
    return NextResponse.json({ error: 'Phone number is not valid. Use a full number with its country code, e.g. +8801725592014.' }, { status: 400 });
  }
  if (normalizedWhatsApp === null) {
    return NextResponse.json({ error: 'WhatsApp number is not valid. Use a full number with its country code, e.g. +8801725592014.' }, { status: 400 });
  }

  // Sender website: bare domains become full URLs so target forms that
  // validate a URL accept the fill (contactreachout.com → https://…).
  const rawWebsite = parsed.data.website.trim();
  const normalizedWebsite = !rawWebsite
    ? ''
    : /^https?:\/\//i.test(rawWebsite)
      ? rawWebsite
      : `https://${rawWebsite}`;

  const user = AuthStore.updateUser(session.email, {
    name: parsed.data.name,
    phone: normalizedPhone,
    whatsApp: normalizedWhatsApp,
    company: parsed.data.companyName.trim(),
    website: normalizedWebsite,
    jobTitle: parsed.data.jobTitle.trim(),
    country: parsed.data.country.trim(),
    // Preserve the stored avatar: ContactReply saves never send avatarUrl,
    // and the old zod default ('') used to wipe it on every contact save.
    ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {}),
  });
  // Durable write (best-effort; false until the identity migration is
  // applied). The display name is only written when non-empty: the zod
  // default ('') would otherwise let a phone-only save wipe a stored
  // name. Reply email is NOT written here — it has its own verified
  // endpoint (/api/user/reply-email) and only verified values go durable.
  // Company/website/job title/country follow the same non-empty-only rule.
  const contactDurable = await writeDurableContact(user.id, session.email, {
    ...(parsed.data.name.trim() ? { displayName: parsed.data.name.trim() } : {}),
    phone: normalizedPhone,
    whatsapp: normalizedWhatsApp,
    ...(parsed.data.companyName.trim() ? { companyName: parsed.data.companyName.trim() } : {}),
    ...(normalizedWebsite ? { website: normalizedWebsite } : {}),
    ...(parsed.data.jobTitle.trim() ? { jobTitle: parsed.data.jobTitle.trim() } : {}),
    ...(parsed.data.country.trim() ? { country: parsed.data.country.trim() } : {}),
  });
  const activeReplyEmail = user.replyEmail || '';
  const replyEmailVerified = user.replyEmailVerified ?? user.isEmailVerified;

  return NextResponse.json({
    success: true,
    contactDurable,
    user: {
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      whatsApp: user.whatsApp || '',
      companyName: user.company || '',
      website: user.website || '',
      jobTitle: user.jobTitle || '',
      country: user.country || '',
      avatarUrl: user.avatarUrl || '',
      replyEmail: activeReplyEmail,
      replyEmailVerified,
      unverifiedReplyEmail: user.unverifiedReplyEmail || '',
    },
  });
}
