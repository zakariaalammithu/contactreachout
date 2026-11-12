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
  const url = `${appUrl.replace(/\/$/, '')}/api/worker/verify-domain?domain=${encodeURIComponent(domain)}`;
  // One retry on a thrown error (network failure or timeout) or a 503:
  // the app function is often cold after hours idle, and the first call
  // wakes it while the second lands warm. A definitive answer (200 with
  // allowed:false, or any non-503 status such as 401) is never retried.
  // Every attempt is logged: the Nov-11/12 denies recurred with zero
  // visibility because neither side logged the callback, so the log line
  // (domain + boolean + timing only, never secrets or lead data) is what
  // makes the next denial diagnosable from Cloud Run logs.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await fetchFn(url, {
        method: 'GET',
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        console.log(`[worker-verify] domain=${domain} allowed=false attempt=${attempt} status=${response.status} ms=${Date.now() - startedAt}`);
        if (response.status === 503 && attempt === 1) continue;
        return false;
      }
      const data = await response.json();
      const allowed = data && data.allowed === true;
      console.log(`[worker-verify] domain=${domain} allowed=${allowed} attempt=${attempt} ms=${Date.now() - startedAt}`);
      return allowed;
    } catch (error) {
      console.log(`[worker-verify] domain=${domain} allowed=false attempt=${attempt} error=${error instanceof Error ? error.name : 'unknown'} ms=${Date.now() - startedAt}`);
      if (attempt === 1) continue;
      return false;
    }
  }
  return false;
}

export async function isTargetAllowed({ staticDomains, appUrl, secret, url, fetchFn = fetch }) {
  const host = hostOf(url);
  if (!host) return false;
  if (hostMatches(host, staticDomains)) return true;
  if (!appUrl) {
    console.log(`[worker-verify] domain=${host} allowed=false reason=no-app-url`);
    return false;
  }
  return verifyViaApp({ appUrl, secret, domain: host, fetchFn });
}
