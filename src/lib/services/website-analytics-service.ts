import crypto from 'crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

export type AnalyticsEventType = 'pageview' | 'heartbeat';

export interface WebsiteAnalyticsEvent {
  visitorId: string;
  sessionId: string;
  path: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  device: string;
  browser: string;
  eventType: AnalyticsEventType;
  engagementMs: number;
  country?: string;
}

export interface WebsiteAnalyticsMetrics {
  totalVisitors: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  pageViews: number;
  averageSessionDurationMs: number;
  bounceRate: number;
}

export interface TrendPoint {
  date: string;
  visitors: number;
  uniqueVisitors: number;
  pageViews: number;
}

export interface CountryAnalytics {
  country: string;
  visitors: number;
  uniqueVisitors: number;
  percentage: number;
}

export interface SourceAnalytics {
  source: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  percentage: number;
}

export interface TopPageAnalytics {
  path: string;
  pageViews: number;
  uniqueVisitors: number;
  averageTimeMs: number;
}

export interface DimensionAnalytics {
  name: string;
  visitors: number;
  percentage: number;
}

export interface RealtimeAnalytics {
  activeVisitors: number;
  countries: string[];
  pages: string[];
}

export interface VisitorSessionDetail {
  id: string;
  visitorIdMasked: string;
  startedAt: string;
  lastSeenAt: string;
  country: string;
  device: string;
  browser: string;
  source: string;
  pageViewsCount: number;
  entryPath: string;
}

export interface WebsiteAnalyticsResult {
  hasData: boolean;
  metrics: WebsiteAnalyticsMetrics | null;
  trend: TrendPoint[];
  countries: CountryAnalytics[];
  sources: SourceAnalytics[];
  topPages: TopPageAnalytics[];
  devices: DimensionAnalytics[];
  browsers: DimensionAnalytics[];
  realtime: RealtimeAnalytics;
  recentSessions: VisitorSessionDetail[];
  storageMode: 'supabase' | 'in-memory';
}

interface VisitorRow { id: string; first_seen_at: string; last_seen_at: string }
interface SessionRow {
  id: string;
  visitor_id: string;
  started_at: string;
  last_seen_at: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source: string;
  country: string | null;
  device: string;
  browser: string;
}
interface PageViewRow { id: string; session_id: string; path: string; viewed_at: string; engagement_ms: number }

const analyticsGlobal = globalThis as typeof globalThis & {
  __contactreachoutAnalytics?: {
    visitors: Map<string, VisitorRow>;
    sessions: Map<string, SessionRow>;
    pageViews: Map<string, PageViewRow>;
  };
};

analyticsGlobal.__contactreachoutAnalytics ||= {
  visitors: new Map<string, VisitorRow>(),
  sessions: new Map<string, SessionRow>(),
  pageViews: new Map<string, PageViewRow>(),
};

const visitors = analyticsGlobal.__contactreachoutAnalytics.visitors;
const sessions = analyticsGlobal.__contactreachoutAnalytics.sessions;
const pageViews = analyticsGlobal.__contactreachoutAnalytics.pageViews;

const validDevice = new Set(['Desktop', 'Mobile', 'Tablet', 'Unknown']);
const validBrowser = new Set(['Chrome', 'Safari', 'Edge', 'Firefox', 'Other']);
const searchHosts = ['google', 'bing', 'yahoo', 'duckduckgo', 'brave'];
const socialHosts = ['linkedin', 'facebook', 'reddit', 'twitter', 'x.com', 'instagram'];

function hashIdentifier(value: string): string {
  const secret = process.env.ANALYTICS_HASH_SECRET || process.env.SESSION_SECRET || 'contactreachout-analytics';
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function cleanText(value: string | undefined, maxLength = 255): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function cleanPath(value: string): string {
  try {
    const url = new URL(value, 'https://contactreachout.local');
    return url.pathname.slice(0, 255) || '/';
  } catch {
    return '/';
  }
}

function classifySource(referrer?: string, utmSource?: string): string {
  if (utmSource) return 'Campaign/UTM';
  if (!referrer) return 'Direct';

  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (searchHosts.some((host) => hostname.includes(host))) {
      return hostname.includes('google') ? 'Google' : 'Other Search';
    }
    if (socialHosts.some((host) => hostname.includes(host))) {
      if (hostname.includes('linkedin')) return 'LinkedIn';
      if (hostname.includes('facebook')) return 'Facebook';
      if (hostname.includes('reddit')) return 'Reddit';
      return 'Referral';
    }
    if (hostname.includes('contactreachout')) return 'Direct';
    return 'Referral';
  } catch {
    return 'Other Search';
  }
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 1000) / 10;
}

function bucketDate(value: string, start: Date, end: Date): string {
  const date = new Date(value);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  if (days > 180) return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  if (days > 60) {
    const week = Math.ceil((((date.getTime() - start.getTime()) / 86400000) + 1) / 7);
    return `Week ${week}`;
  }
  return date.toISOString().slice(0, 10);
}

function aggregate(
  visitorRows: VisitorRow[],
  sessionRows: SessionRow[],
  pageViewRows: PageViewRow[],
  start: Date,
  end: Date,
  storageMode: 'supabase' | 'in-memory'
): WebsiteAnalyticsResult {
  const hasData = pageViewRows.length > 0;
  const uniqueVisitorIds = new Set(sessionRows.map((session) => session.visitor_id));
  const newVisitorIds = new Set(
    visitorRows.filter((visitor) => new Date(visitor.first_seen_at) >= start).map((visitor) => visitor.id)
  );
  const returningVisitorIds = new Set([...uniqueVisitorIds].filter((id) => !newVisitorIds.has(id)));
  const sessionDurations = sessionRows.map((session) =>
    Math.max(0, new Date(session.last_seen_at).getTime() - new Date(session.started_at).getTime())
  );
  const viewsBySession = new Map<string, number>();
  for (const view of pageViewRows) {
    viewsBySession.set(view.session_id, (viewsBySession.get(view.session_id) || 0) + 1);
  }
  const bouncedSessions = sessionRows.filter((session) => (viewsBySession.get(session.id) || 0) <= 1).length;

  const trendMap = new Map<string, TrendPoint>();
  for (const view of pageViewRows) {
    const bucket = bucketDate(view.viewed_at, start, end);
    const point = trendMap.get(bucket) || { date: bucket, visitors: 0, uniqueVisitors: 0, pageViews: 0 };
    point.pageViews += 1;
    trendMap.set(bucket, point);
  }
  const sessionBucketVisitors = new Map<string, Set<string>>();
  for (const session of sessionRows) {
    const bucket = bucketDate(session.started_at, start, end);
    const point = trendMap.get(bucket) || { date: bucket, visitors: 0, uniqueVisitors: 0, pageViews: 0 };
    point.visitors += 1;
    const bucketVisitors = sessionBucketVisitors.get(bucket) || new Set<string>();
    bucketVisitors.add(session.visitor_id);
    sessionBucketVisitors.set(bucket, bucketVisitors);
    trendMap.set(bucket, point);
  }
  for (const [bucket, visitorIds] of sessionBucketVisitors) {
    const point = trendMap.get(bucket);
    if (point) point.uniqueVisitors = visitorIds.size;
  }

  const countryMap = new Map<string, { visitors: number; unique: Set<string> }>();
  for (const session of sessionRows) {
    const country = session.country || 'Unknown';
    const item = countryMap.get(country) || { visitors: 0, unique: new Set<string>() };
    item.visitors += 1;
    item.unique.add(session.visitor_id);
    countryMap.set(country, item);
  }

  const sourceMap = new Map<string, { sessions: number; visitors: Set<string>; pageViews: number }>();
  for (const session of sessionRows) {
    const item = sourceMap.get(session.source) || { sessions: 0, visitors: new Set<string>(), pageViews: 0 };
    item.sessions += 1;
    item.visitors.add(session.visitor_id);
    const sViews = pageViewRows.filter((pv) => pv.session_id === session.id);
    item.pageViews += Math.max(1, sViews.length);
    sourceMap.set(session.source, item);
  }

  const pageMap = new Map<string, { views: number; visitors: Set<string>; engagement: number }>();
  for (const view of pageViewRows) {
    const session = sessions.get(view.session_id) || sessionRows.find((item) => item.id === view.session_id);
    const visitorId = session?.visitor_id || 'unknown';
    const item = pageMap.get(view.path) || { views: 0, visitors: new Set<string>(), engagement: 0 };
    item.views += 1;
    item.visitors.add(visitorId);
    item.engagement += view.engagement_ms;
    pageMap.set(view.path, item);
  }

  const dimension = (values: string[], total: number): DimensionAnalytics[] => {
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, visitors: count, percentage: percentage(count, total) }))
      .sort((a, b) => b.visitors - a.visitors);
  };

  const realtimeCutoff = Date.now() - 5 * 60 * 1000;
  const activeSessions = [...sessions.values()].filter(
    (session) => new Date(session.last_seen_at).getTime() >= realtimeCutoff
  );

  const recentSessions: VisitorSessionDetail[] = sessionRows
    .slice()
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 100)
    .map((session) => {
      const sViews = pageViewRows.filter((pv) => pv.session_id === session.id);
      return {
        id: session.id,
        visitorIdMasked: `vst_${session.visitor_id.slice(0, 8)}`,
        startedAt: session.started_at,
        lastSeenAt: session.last_seen_at,
        country: session.country || 'Unknown',
        device: session.device || 'Unknown',
        browser: session.browser || 'Other',
        source: session.source || 'Direct',
        pageViewsCount: Math.max(1, sViews.length),
        entryPath: sViews[0]?.path || '/',
      };
    });

  return {
    hasData,
    metrics: hasData ? {
      totalVisitors: sessionRows.length,
      uniqueVisitors: uniqueVisitorIds.size,
      newVisitors: newVisitorIds.size,
      returningVisitors: returningVisitorIds.size,
      pageViews: pageViewRows.length,
      averageSessionDurationMs: sessionDurations.length
        ? Math.round(sessionDurations.reduce((sum, value) => sum + value, 0) / sessionDurations.length)
        : 0,
      bounceRate: percentage(bouncedSessions, sessionRows.length),
    } : null,
    trend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    countries: [...countryMap.entries()]
      .map(([country, item]) => ({
        country,
        visitors: item.visitors,
        uniqueVisitors: item.unique.size,
        percentage: percentage(item.visitors, sessionRows.length),
      }))
      .sort((a, b) => b.visitors - a.visitors),
    sources: [...sourceMap.entries()]
      .map(([source, item]) => ({
        source,
        visitors: item.visitors.size,
        sessions: item.sessions,
        pageViews: item.pageViews,
        percentage: percentage(item.sessions, sessionRows.length),
      }))
      .sort((a, b) => b.sessions - a.sessions),
    topPages: [...pageMap.entries()]
      .map(([path, item]) => ({
        path,
        pageViews: item.views,
        uniqueVisitors: item.visitors.size,
        averageTimeMs: Math.round(item.engagement / item.views),
      }))
      .sort((a, b) => b.pageViews - a.pageViews),
    devices: dimension(sessionRows.map((session) => session.device), sessionRows.length),
    browsers: dimension(sessionRows.map((session) => session.browser), sessionRows.length),
    realtime: {
      activeVisitors: activeSessions.length,
      countries: [...new Set(activeSessions.map((session) => session.country).filter(Boolean) as string[])].slice(0, 5),
      pages: [...new Set(activeSessions.flatMap((session) =>
        pageViewRows.filter((view) => view.session_id === session.id).map((view) => view.path)
      ))].slice(0, 5),
    },
    recentSessions,
    storageMode,
  };
}

export class WebsiteAnalyticsService {
  public static async recordEvent(event: WebsiteAnalyticsEvent): Promise<void> {
    const visitorId = hashIdentifier(event.visitorId);
    const sessionId = hashIdentifier(event.sessionId);
    const now = new Date().toISOString();
    const path = cleanPath(event.path);
    const referrer = cleanText(event.referrer, 512);
    const utmSource = cleanText(event.utmSource, 100);
    const utmMedium = cleanText(event.utmMedium, 100);
    const utmCampaign = cleanText(event.utmCampaign, 100);
    const country = cleanText(event.country, 2)?.toUpperCase();
    const device = validDevice.has(event.device) ? event.device : 'Unknown';
    const browser = validBrowser.has(event.browser) ? event.browser : 'Other';
    const engagementMs = Math.max(0, Math.min(30 * 60 * 1000, Math.round(event.engagementMs)));
    const source = classifySource(referrer, utmSource);

    const client = getSupabaseAdminClient();
    if (client) {
      const visitorResult = await client
        .from('website_analytics_visitors')
        .upsert({ id: visitorId, last_seen_at: now }, { onConflict: 'id' });
      if (visitorResult.error) throw visitorResult.error;

      const sessionResult = await client
        .from('website_analytics_sessions')
        .upsert({
          id: sessionId,
          visitor_id: visitorId,
          last_seen_at: now,
          referrer,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          source,
          country,
          device,
          browser,
        }, { onConflict: 'id' });
      if (sessionResult.error) throw sessionResult.error;

      if (event.eventType === 'pageview') {
        const viewResult = await client.from('website_analytics_page_views').insert({
          session_id: sessionId,
          path,
          viewed_at: now,
          engagement_ms: engagementMs,
        });
        if (viewResult.error) throw viewResult.error;
      } else {
        const latest = await client
          .from('website_analytics_page_views')
          .select('id, engagement_ms')
          .eq('session_id', sessionId)
          .eq('path', path)
          .order('viewed_at', { ascending: false })
          .limit(1);
        if (latest.error) throw latest.error;
        const current = latest.data?.[0];
        if (current) {
          const update = await client
            .from('website_analytics_page_views')
            .update({ engagement_ms: Math.max(current.engagement_ms, engagementMs) })
            .eq('id', current.id);
          if (update.error) throw update.error;
        }
      }
      return;
    }

    const visitor = visitors.get(visitorId) || { id: visitorId, first_seen_at: now, last_seen_at: now };
    visitor.last_seen_at = now;
    visitors.set(visitorId, visitor);

    const session = sessions.get(sessionId) || {
      id: sessionId,
      visitor_id: visitorId,
      started_at: now,
      last_seen_at: now,
      referrer: referrer || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      source,
      country: country || null,
      device,
      browser,
    };
    session.last_seen_at = now;
    sessions.set(sessionId, session);

    if (event.eventType === 'pageview') {
      pageViews.set(`${sessionId}:${pageViews.size}`, {
        id: crypto.randomUUID(),
        session_id: sessionId,
        path,
        viewed_at: now,
        engagement_ms: engagementMs,
      });
    } else {
      const current = [...pageViews.values()]
        .filter((view) => view.session_id === sessionId && view.path === path)
        .sort((a, b) => b.viewed_at.localeCompare(a.viewed_at))[0];
      if (current) current.engagement_ms = Math.max(current.engagement_ms, engagementMs);
    }
  }

  public static async getAnalytics(start: Date, end: Date): Promise<WebsiteAnalyticsResult> {
    const client = getSupabaseAdminClient();
    if (client) {
      const sessionResult = await client
        .from('website_analytics_sessions')
        .select('*')
        .gte('started_at', start.toISOString())
        .lt('started_at', end.toISOString())
        .order('started_at', { ascending: true });
      if (sessionResult.error) throw sessionResult.error;
      const sessionRows = sessionResult.data as SessionRow[];
      const sessionIds = sessionRows.map((session) => session.id);
      const visitorIds = [...new Set(sessionRows.map((session) => session.visitor_id))];

      const [visitorResult, pageResult] = await Promise.all([
        visitorIds.length ? client.from('website_analytics_visitors').select('*').in('id', visitorIds) : Promise.resolve({ data: [], error: null }),
        sessionIds.length ? client
          .from('website_analytics_page_views')
          .select('*')
          .in('session_id', sessionIds)
          .gte('viewed_at', start.toISOString())
          .lt('viewed_at', end.toISOString()) : Promise.resolve({ data: [], error: null }),
      ]);
      if (visitorResult.error) throw visitorResult.error;
      if (pageResult.error) throw pageResult.error;

      sessions.clear();
      for (const session of sessionRows) sessions.set(session.id, session);
      return aggregate(
        visitorResult.data as VisitorRow[],
        sessionRows,
        pageResult.data as PageViewRow[],
        start,
        end,
        'supabase'
      );
    }

    const sessionRows = [...sessions.values()].filter((session) => {
      const startedAt = new Date(session.started_at);
      return startedAt >= start && startedAt < end;
    });
    const sessionIds = new Set(sessionRows.map((session) => session.id));
    const visitorIds = new Set(sessionRows.map((session) => session.visitor_id));
    const visitorRows = [...visitors.values()].filter((visitor) => visitorIds.has(visitor.id));
    const pageRows = [...pageViews.values()].filter(
      (view) => sessionIds.has(view.session_id) && new Date(view.viewed_at) >= start && new Date(view.viewed_at) < end
    );
    return aggregate(visitorRows, sessionRows, pageRows, start, end, 'in-memory');
  }

  public static clearLocalStoreForTests(): void {
    visitors.clear();
    sessions.clear();
    pageViews.clear();
  }
}
