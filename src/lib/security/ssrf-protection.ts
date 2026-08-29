/**
 * Bulk Contact Form Outreach System — SSRF & Network Security Engine
 * Comprehensive validation blocking private IPs, cloud metadata endpoints,
 * loopbacks, non-HTTP protocols, and dangerous internal network ports.
 */

export interface UrlSecurityValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  domain: string;
  error?: string;
  blockedReason?: string;
}

// Blocklist of forbidden hosts and domains
const BLOCKED_HOSTS_AND_DOMAINS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  'instance-data',
  'kubernetes.default.svc',
]);

// Cloud metadata IP endpoints (AWS, GCP, Azure, Oracle, DigitalOcean)
const CLOUD_METADATA_IPS = [
  '169.254.169.254', // AWS/GCP/Azure IMDS
  '169.254.170.2',   // AWS ECS Task Metadata
  '100.100.100.200', // Alibaba Cloud Metadata
];

// Dangerous internal service ports
const FORBIDDEN_PORTS = new Set([
  21, 22, 23, 25, 53, 110, 111, 135, 139, 143, 445, 1433, 1521, 2049,
  3306, 3389, 5432, 5900, 6379, 8080, 8443, 9000, 9200, 11211, 27017, 28017
]);

/**
 * Checks whether an IPv4 address belongs to private or link-local ranges:
 * - 10.0.0.0/8
 * - 172.16.0.0/12
 * - 192.168.0.0/16
 * - 127.0.0.0/8 (Loopback)
 * - 169.254.0.0/16 (Link-local & Metadata)
 * - 0.0.0.0/8
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [b0, b1] = parts;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (Private network)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private network)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private network)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local & Cloud Metadata)
  if (b0 === 169 && b1 === 254) return true;

  // 0.0.0.0/8
  if (b0 === 0) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Validates a target URL against comprehensive SSRF and network security rules.
 */
export function validateUrlSafetyStrict(rawUrl: string): UrlSecurityValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      normalizedUrl: '',
      domain: '',
      error: 'Empty or invalid URL input.',
      blockedReason: 'EMPTY_URL',
    };
  }

  const trimmed = rawUrl.trim();

  // Ensure standard protocol prefix
  let urlToParse = trimmed;
  if (!/^https?:\/\//i.test(urlToParse)) {
    urlToParse = `https://${urlToParse}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlToParse);
  } catch {
    return {
      isValid: false,
      normalizedUrl: '',
      domain: '',
      error: `Malformed URL structure: ${trimmed}`,
      blockedReason: 'MALFORMED_URL',
    };
  }

  // 1. Protocol Verification (Strictly HTTP/HTTPS only)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      normalizedUrl: '',
      domain: '',
      error: `Forbidden protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
      blockedReason: 'FORBIDDEN_PROTOCOL',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Block direct localhost and cloud metadata domains
  if (BLOCKED_HOSTS_AND_DOMAINS.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return {
      isValid: false,
      normalizedUrl: '',
      domain: hostname,
      error: `Access to local or reserved hostname "${hostname}" is blocked (SSRF defense).`,
      blockedReason: 'RESERVED_HOSTNAME',
    };
  }

  // 3. Block Cloud Metadata Endpoints
  if (CLOUD_METADATA_IPS.includes(hostname)) {
    return {
      isValid: false,
      normalizedUrl: '',
      domain: hostname,
      error: `Access to cloud instance metadata endpoint "${hostname}" is strictly forbidden.`,
      blockedReason: 'CLOUD_METADATA_ENDPOINT',
    };
  }

  // 4. Block Private IPv4 Addresses
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        isValid: false,
        normalizedUrl: '',
        domain: hostname,
        error: `Access to private or link-local IP "${hostname}" is blocked (SSRF defense).`,
        blockedReason: 'PRIVATE_IP_RANGE',
      };
    }
  }

  // 5. Block IPv6 Loopback / Local addresses
  if (hostname.startsWith('[') || hostname.includes(':')) {
    if (hostname === '::1' || hostname === '[::1]' || hostname.startsWith('fe80:') || hostname.startsWith('fc00:')) {
      return {
        isValid: false,
        normalizedUrl: '',
        domain: hostname,
        error: `Access to private IPv6 address "${hostname}" is blocked.`,
        blockedReason: 'PRIVATE_IPV6_RANGE',
      };
    }
  }

  // 6. Block Dangerous Service Ports
  if (parsed.port) {
    const portNum = Number(parsed.port);
    if (FORBIDDEN_PORTS.has(portNum)) {
      return {
        isValid: false,
        normalizedUrl: '',
        domain: hostname,
        error: `Access to internal port ${portNum} is blocked for security.`,
        blockedReason: 'FORBIDDEN_PORT',
      };
    }
  }

  // Normalize path and query
  const cleanPath = parsed.pathname.replace(/\/+/g, '/');
  const normalizedUrl = `${parsed.protocol}//${hostname}${parsed.port ? `:${parsed.port}` : ''}${cleanPath}${parsed.search}`;

  return {
    isValid: true,
    normalizedUrl,
    domain: hostname.replace(/^www\./, ''),
  };
}
