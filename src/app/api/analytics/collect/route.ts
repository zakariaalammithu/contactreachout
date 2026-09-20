import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthStore } from '@/lib/auth/auth-store';
import { WebsiteAnalyticsService } from '@/lib/services/website-analytics-service';

const eventSchema = z.object({
  visitorId: z.string().min(8).max(128),
  sessionId: z.string().min(8).max(128),
  path: z.string().min(1).max(2048),
  referrer: z.string().max(2048).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  device: z.enum(['Desktop', 'Mobile', 'Tablet', 'Unknown']),
  browser: z.enum(['Chrome', 'Safari', 'Edge', 'Firefox', 'Other']),
  eventType: z.enum(['pageview', 'heartbeat']),
  engagementMs: z.number().int().min(0).max(1_800_000),
});

const blockedPrefixes = ['/_next', '/api', '/admin', '/dashboard', '/campaigns', '/leads', '/results', '/logs', '/settings', '/profile', '/credits', '/checkout'];

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  if (!AuthStore.checkRateLimit(`analytics_${ip}`, 120, 60_000).allowed) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const parsed = eventSchema.safeParse(await req.json());
    if (!parsed.success) return new NextResponse(null, { status: 400 });

    const path = new URL(parsed.data.path, req.url).pathname;
    if (blockedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return new NextResponse(null, { status: 204 });
    }

    const country =
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('cf-ipcountry') ||
      undefined;

    await WebsiteAnalyticsService.recordEvent({ ...parsed.data, path, country });
    return new NextResponse(null, { status: 204 });
  } catch {
    // Analytics must never break or visibly disrupt the public website.
    return new NextResponse(null, { status: 204 });
  }
}
