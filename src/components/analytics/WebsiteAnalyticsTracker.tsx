'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const trackedPrefixes = ['/', '/benefits', '/pricing', '/login', '/signup', '/contact', '/help', '/privacy', '/terms'];

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function getDevice(): 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown' {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(userAgent) || (/macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)) return 'Tablet';
  if (/mobile|iphone|android/.test(userAgent)) return 'Mobile';
  if (/windows|macintosh|linux/.test(userAgent)) return 'Desktop';
  return 'Unknown';
}

function getBrowser(): 'Chrome' | 'Safari' | 'Edge' | 'Firefox' | 'Other' {
  const userAgent = navigator.userAgent;
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) return 'Chrome';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return 'Other';
}

function send(payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/collect', new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch('/api/analytics/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    priority: 'low',
  }).catch(() => undefined);
}

export function WebsiteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<{ path: string; timestamp: number } | null>(null);

  useEffect(() => {
    if (!pathname || !trackedPrefixes.some((prefix) => pathname === prefix || (prefix !== '/' && pathname.startsWith(`${prefix}/`)))) {
      return;
    }

    const anonymousId = localStorage.getItem('cr_anonymous_id') || (() => {
      const id = createId();
      localStorage.setItem('cr_anonymous_id', id);
      return id;
    })();
    const sessionStorageKey = 'cr_analytics_session';
    let sessionId = sessionStorage.getItem(sessionStorageKey);
    if (!sessionId) {
      sessionId = createId();
      sessionStorage.setItem(sessionStorageKey, sessionId);
    }

    const fullPath = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`;
    const now = Date.now();
    const last = lastPathRef.current;
    if (last && last.path === fullPath && now - last.timestamp < 1_500) return;
    lastPathRef.current = { path: fullPath, timestamp: now };

    const pageStartedAt = Date.now();
    const url = new URL(window.location.href);
    const payload = {
      visitorId: anonymousId,
      sessionId,
      path: fullPath,
      referrer: document.referrer || undefined,
      utmSource: url.searchParams.get('utm_source') || undefined,
      utmMedium: url.searchParams.get('utm_medium') || undefined,
      utmCampaign: url.searchParams.get('utm_campaign') || undefined,
      device: getDevice(),
      browser: getBrowser(),
    };

    send({ ...payload, eventType: 'pageview', engagementMs: 0 });

    const sendHeartbeat = () => {
      if (document.visibilityState === 'hidden') return;
      send({ ...payload, eventType: 'heartbeat', engagementMs: Date.now() - pageStartedAt });
    };
    const heartbeat = window.setInterval(sendHeartbeat, 30_000);
    const handlePageHide = () => {
      send({ ...payload, eventType: 'heartbeat', engagementMs: Date.now() - pageStartedAt });
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [pathname, searchParams]);

  return null;
}
