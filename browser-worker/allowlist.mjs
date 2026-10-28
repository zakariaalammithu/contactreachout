/**
 * Browser worker target authorization.
 *
 * Two layers, either of which authorizes a target host:
 *
 * 1. Static allow-list (BROWSER_WORKER_ALLOWED_DOMAINS): an explicit,
 *    admin-set list. A listed domain also matches its subdomains.
 *    This is the original gate and keeps working unchanged.
 *
 * 2. Dynamic campaign-lead verification: when CONTACTREACHOUT_APP_URL is
 *    set, the worker asks the ContactReachout app whether the target host
 *    belongs to a lead attached to any campaign
 *    (GET <app>/api/worker/verify-domain, Bearer = the worker secret).
 *    This removes manual pre-registration: adding a lead to a campaign is
 *    enough, and bulk outreach to new domains needs no env edit or
 *    redeploy. Draft campaigns' leads verify too, so test campaigns work.
 *
 * Security: the worker secret remains the root credential (it gates both
 * /submit and the verify callback). The callback returns only a boolean,
 * never lead data. A callback failure or non-200 answer denies the target
 * (fail-closed), unless the static list already authorized it.
 */

export function parseAllowedDomains(value) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function hostMatches(host, domains) {
  if (!host) return false;
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isHealthy({ secret, staticDomains, appUrl }) {
  // The worker is usable when it can authorize targets: either an explicit
  // static list exists, or dynamic verification is configured. A secret is
  // always required.
  return Boolean(secret && (staticDomains.length > 0 || appUrl));
}

export async function verifyViaApp({ appUrl, secret, domain, fetchFn = fetch }) {
  try {
    const url = `${appUrl.replace(/\/$/, '')}/api/worker/verify-domain?domain=${encodeURIComponent(domain)}`;
    const response = await fetchFn(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data && data.allowed === true;
  } catch {
    return false;
  }
}

export async function isTargetAllowed({ staticDomains, appUrl, secret, url, fetchFn = fetch }) {
  const host = hostOf(url);
  if (!host) return false;
  if (hostMatches(host, staticDomains)) return true;
  if (!appUrl) return false;
  return verifyViaApp({ appUrl, secret, domain: host, fetchFn });
}
