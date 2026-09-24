/**
 * Bulk Contact Form Outreach System — Template Engine Service
 * Handles deterministic variable interpolation, unknown token validation,
 * custom CSV field mapping, safe missing-field fallbacks, and Spintax resolution.
 */

export const STANDARD_VARIABLES = [
  'first_name',
  'last_name',
  'company_name',
  'website',
  'industry',
  'city',
  'state',
  'country',
  'email',
] as const;

export type StandardVariable = (typeof STANDARD_VARIABLES)[number];

export interface ValidationResult {
  isValid: boolean;
  detectedVariables: string[];
  validVariables: string[];
  unknownVariables: string[];
}

export interface InterpolationContext {
  first_name?: string | null;
  firstName?: string | null;
  last_name?: string | null;
  lastName?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  company_name?: string | null;
  companyName?: string | null;
  company?: string | null;
  website?: string | null;
  domain?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  jobPosition?: string | null;
  location?: string | null;
  personLinkedinUrl?: string | null;
  companyLinkedinUrl?: string | null;
  companySize?: string | null;
  personalizedOpeningLine?: string | null;
  problemParagraph?: string | null;
  pitch?: string | null;
  cta?: string | null;
  custom_fields?: Record<string, string | number | boolean | null | undefined>;
  customFields?: Record<string, string | number | boolean | null | undefined>;
  [key: string]: any;
}

/**
 * Extracts all unique {{variable}} tokens from a string.
 */
export function extractVariables(text: string): string[] {
  if (!text) return [];
  const regex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1].trim());
  }

  return Array.from(matches);
}

/**
 * Validates template text against known standard variables and optional known custom fields.
 */
export function validateTemplate(
  text: string,
  allowedCustomFields: string[] = []
): ValidationResult {
  const detected = extractVariables(text);
  const validSet = new Set<string>([...STANDARD_VARIABLES, ...allowedCustomFields]);

  const validVariables: string[] = [];
  const unknownVariables: string[] = [];

  for (const token of detected) {
    if (
      validSet.has(token) ||
      token.startsWith('custom.') ||
      token.startsWith('custom_')
    ) {
      validVariables.push(token);
    } else {
      unknownVariables.push(token);
    }
  }

  return {
    isValid: unknownVariables.length === 0,
    detectedVariables: detected,
    validVariables,
    unknownVariables,
  };
}

/**
 * Replaces Spintax {variant1|variant2|variant3} choices.
 * In deterministic mode (default), selects the first variant.
 */
export function resolveSpintax(text: string, randomize: boolean = false): string {
  if (!text) return '';
  const spintaxRegex = /\{([^{}|]+(?:\|[^{}|]+)+)\}/g;

  return text.replace(spintaxRegex, (_, choices) => {
    const parts = choices.split('|');
    if (!parts.length) return '';
    if (randomize) {
      const idx = Math.floor(Math.random() * parts.length);
      return parts[idx];
    }
    return parts[0];
  });
}

/**
 * Helper to convert strings to Title Case (e.g. "john" -> "John", "acme corp" -> "Acme Corp")
 */
export function toTitleCase(str?: string | null): string {
  if (!str) return '';
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Checks if a string is a domain name or URL (e.g. "www.centrica.com", "centrica.com", "http://centrica.com").
 * Used to prevent raw domains from being treated as person or company names.
 */
export function isDomainOrUrl(str?: string | null): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('www.')) return true;
  // Match top-level domains or domain formats
  if (/\.(com|org|net|io|co|co\.uk|uk|us|ca|de|fr|au|app|ai|tech|dev|biz|info|gov|edu)$/i.test(s)) return true;
  if (/^[a-z0-9-]+\.[a-z]{2,}(\.[a-z]{2,})?$/i.test(s)) return true;
  return false;
}

/**
 * Extracts real first_name from context without inventing fake data or parsing domains as names.
 */
export function getRealFirstName(context: InterpolationContext): string | null {
  if (!context) return null;
  const candidates = [
    context.first_name,
    context.firstName,
    context.contact_person_name,
    context.contactPersonName,
    context.contact_person,
    context.contactPerson,
    context.custom_fields?.first_name,
    context.custom_fields?.firstName,
    context.customFields?.first_name,
    context.customFields?.firstName,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && typeof c === 'string') {
      const trimmed = c.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed &&
        lower !== 'undefined' &&
        lower !== 'null' &&
        !trimmed.startsWith('{') &&
        !isDomainOrUrl(trimmed)
      ) {
        return toTitleCase(trimmed);
      }
    }
  }

  // Check full_name / fullName if explicitly available and reliable
  const fullNameCandidates = [
    context.full_name,
    context.fullName,
    context.custom_fields?.full_name,
    context.custom_fields?.fullName,
    context.customFields?.full_name,
    context.customFields?.fullName,
  ];
  for (const fn of fullNameCandidates) {
    if (fn !== undefined && fn !== null && typeof fn === 'string') {
      const trimmed = fn.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed &&
        lower !== 'undefined' &&
        lower !== 'null' &&
        !trimmed.startsWith('{') &&
        !isDomainOrUrl(trimmed)
      ) {
        const parts = trimmed.split(/\s+/);
        if (parts[0] && parts[0].length > 1 && !isDomainOrUrl(parts[0])) {
          return toTitleCase(parts[0]);
        }
      }
    }
  }

  return null;
}

/**
 * Extracts real last_name from context without inventing fake data or domain strings.
 */
export function getRealLastName(context: InterpolationContext): string | null {
  if (!context) return null;
  const candidates = [
    context.last_name,
    context.lastName,
    context.custom_fields?.last_name,
    context.custom_fields?.lastName,
    context.customFields?.last_name,
    context.customFields?.lastName,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && typeof c === 'string') {
      const trimmed = c.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed &&
        lower !== 'undefined' &&
        lower !== 'null' &&
        !trimmed.startsWith('{') &&
        !isDomainOrUrl(trimmed)
      ) {
        return toTitleCase(trimmed);
      }
    }
  }
  return null;
}

/**
 * Extracts real company_name from context without inventing fake data,
 * domain strings (e.g. www.centrica.com), or generic placeholders.
 */
export function getRealCompanyName(context: InterpolationContext): string | null {
  if (!context) return null;
  const candidates = [
    context.company_name,
    context.companyName,
    context.company,
    context.custom_fields?.company_name,
    context.custom_fields?.companyName,
    context.customFields?.company_name,
    context.customFields?.companyName,
    context.custom_fields?.company,
    context.customFields?.company,
  ];

  const genericPlaceholders = new Set([
    'company',
    'company name',
    'unknown company',
    'target lead account',
    'target account',
    'n/a',
    'na',
    'none',
    'null',
    'undefined',
    '--',
    '-',
  ]);

  for (const c of candidates) {
    if (c !== undefined && c !== null && typeof c === 'string') {
      const trimmed = c.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed &&
        !genericPlaceholders.has(lower) &&
        !trimmed.startsWith('{') &&
        !isDomainOrUrl(trimmed)
      ) {
        return toTitleCase(trimmed);
      }
    }
  }
  return null;
}

/**
 * Extracts real website / domain from context without inventing fake data.
 */
export function getRealWebsite(context: InterpolationContext): string | null {
  if (!context) return null;
  const candidates = [
    context.website,
    context.domain,
    context.custom_fields?.website,
    context.customFields?.website,
    context.custom_fields?.domain,
    context.customFields?.domain,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && typeof c === 'string') {
      const trimmed = c.trim();
      const lower = trimmed.toLowerCase();
      if (
        trimmed &&
        lower !== 'undefined' &&
        lower !== 'null'
      ) {
        return trimmed;
      }
    }
  }
  return null;
}

/**
 * Canonical grammar and whitespace cleanup after variable replacement.
 * Fixes orphan prepositions, double spaces, orphan commas, and trailing punctuation.
 */
export function cleanInterpolatedText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Clean orphan prepositions before spaces/punctuation resulting from missing company_name or variables
  // e.g., "reaching out to  regarding" -> "reaching out regarding"
  // "reaching out to  for" -> "reaching out for"
  // "team at  is" -> "team is"
  // "solutions for  in" -> "solutions in"
  // "partner with  to" -> "partner to"
  // "website of  is" -> "website is"
  cleaned = cleaned.replace(/\b(to|at|for|with|of|on|in|from)\s{2,}(regarding|for|to|in|on|with|about|is|are|we|our|a|an|the|\n|[,.;!?])/gi, '$2');

  // 2. Clean trailing prepositions before punctuation
  // e.g. "Partnership with ." -> "Partnership."
  // "reaching out to." -> "reaching out."
  cleaned = cleaned.replace(/\b(to|at|for|with|of|on|in|from)\s*([,.;!?])/gi, '$2');

  // 3. Clean orphan trailing prepositions at line ends
  cleaned = cleaned.replace(/\b(to|at|for|with|of|on|in|from)\s*$/gim, '');

  // 4. Clean double or orphan commas / punctuation
  cleaned = cleaned.replace(/\s*,\s*,+/g, ',');
  cleaned = cleaned.replace(/,\s*([.;!?])/g, '$1');

  // 5. Clean space before punctuation
  cleaned = cleaned.replace(/\s+([,.;!?])/g, '$1');

  // 6. Clean multiple consecutive spaces on the same line
  cleaned = cleaned.split('\n').map((line) => line.replace(/[ \t]{2,}/g, ' ').trimEnd()).join('\n');

  // 7. Clean more than two consecutive empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Replaces {{variable}} tokens with actual lead values.
 * SINGLE CANONICAL RESOLVER for Preview, AI, and Campaign Submissions.
 */
export function interpolateTemplate(
  template: string,
  context: InterpolationContext,
  options: {
    randomizeSpintax?: boolean;
    fallbackPlaceholder?: string;
  } = {}
): string {
  if (!template) return '';

  const { randomizeSpintax = false } = options;

  // 1. Resolve Spintax first (e.g. {Hi|Hello|Hey})
  let resolvedText = resolveSpintax(template, randomizeSpintax);

  // Extract Real Lead Fields safely (NO fake names, NO hallucinated company names)
  const realFirstName = getRealFirstName(context);
  const realLastName = getRealLastName(context);
  const realCompanyName = getRealCompanyName(context);
  const realWebsite = getRealWebsite(context);

  // Missing first_name fallback: "there" (for neutral greeting "Hello there,")
  const firstName = realFirstName ? realFirstName : 'there';
  const lastName = realLastName ? realLastName : '';
  const fullName = realFirstName && realLastName ? `${realFirstName} ${realLastName}` : realFirstName ? realFirstName : '';
  const company = realCompanyName ? realCompanyName : '';

  const email = context.email || context.custom_fields?.email || context.customFields?.email || '';
  const website = realWebsite || '';
  const industry = context.industry || context.custom_fields?.industry || context.customFields?.industry || '';
  const city = context.city || context.custom_fields?.city || context.customFields?.city || '';
  const state = context.state || context.custom_fields?.state || context.customFields?.state || '';
  const country = context.country || context.custom_fields?.country || context.customFields?.country || '';

  // Custom Fields (CUSTOM 1 through 10 / custom_1..10)
  const getCustomVal = (num: number): string => {
    const c = (context.custom_fields || context.customFields || {}) as Record<string, any>;
    const targetKeyNorm = `custom${num}`;

    // 1. Direct check on context properties
    for (const [key, val] of Object.entries(context)) {
      if (key === 'custom_fields' || key === 'customFields') continue;
      if (val !== undefined && val !== null && String(val) !== 'undefined' && String(val) !== 'null') {
        const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (norm === targetKeyNorm) {
          return String(val);
        }
      }
    }

    // 2. Check on custom_fields / customFields object
    if (typeof c === 'object' && c !== null) {
      for (const [key, val] of Object.entries(c)) {
        if (val !== undefined && val !== null && String(val) !== 'undefined' && String(val) !== 'null') {
          const norm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (norm === targetKeyNorm) {
            return String(val);
          }
        }
      }
    }

    // 3. Fallbacks for AI fields 1..4
    if (num === 1) {
      const val = context.personalizedOpeningLine || context.icebreaker || c.personalizedOpeningLine || c.icebreaker;
      if (val) return String(val);
    }
    if (num === 2) {
      const val = context.problemParagraph || c.problemParagraph;
      if (val) return String(val);
    }
    if (num === 3) {
      const val = context.pitch || c.pitch;
      if (val) return String(val);
    }
    if (num === 4) {
      const val = context.cta || c.cta;
      if (val) return String(val);
    }

    return '';
  };

  const phone = context.phone || context.custom_fields?.phone || context.customFields?.phone || '';
  const title = context.title || context.jobPosition || context.custom_fields?.title || context.customFields?.title || '';
  const location = context.location || [city, state, country].filter(Boolean).join(', ');
  const personLinkedinUrl = context.personLinkedinUrl || context.custom_fields?.personLinkedinUrl || context.customFields?.personLinkedinUrl || '';
  const companyLinkedinUrl = context.companyLinkedinUrl || context.custom_fields?.companyLinkedinUrl || context.customFields?.companyLinkedinUrl || '';
  const companySize = context.companySize || context.custom_fields?.companySize || context.customFields?.companySize || '';

  // Map of normalized lowercase tags
  const tagMap: Record<string, string> = {
    // First Name
    firstname: firstName,
    first_name: firstName,
    'first name': firstName,

    // Last Name
    lastname: lastName,
    last_name: lastName,
    'last name': lastName,

    // Full Name
    fullname: fullName,
    full_name: fullName,
    'full name': fullName,

    // Company
    company: company,
    companyname: company,
    company_name: company,
    'company name': company,

    // Lead Standard Fields
    email: String(email),
    website: String(website),
    industry: String(industry),
    city: String(city),
    state: String(state),
    country: String(country),
    phone: String(phone),
    title: String(title),
    job_position: String(title),
    jobposition: String(title),
    'job position': String(title),
    location: String(location),
    person_linkedin_url: String(personLinkedinUrl),
    personallinkedin: String(personLinkedinUrl),
    personal_linkedin: String(personLinkedinUrl),
    'personal linkedin': String(personLinkedinUrl),
    company_linkedin_url: String(companyLinkedinUrl),
    companylinkedin: String(companyLinkedinUrl),
    company_linkedin: String(companyLinkedinUrl),
    'company linkedin': String(companyLinkedinUrl),
    company_size: String(companySize),
    companysize: String(companySize),
    'company size': String(companySize),

    // Custom Fields (Custom 1..10)
    custom1: getCustomVal(1),
    custom_1: getCustomVal(1),
    'custom 1': getCustomVal(1),
    custom2: getCustomVal(2),
    custom_2: getCustomVal(2),
    'custom 2': getCustomVal(2),
    custom3: getCustomVal(3),
    custom_3: getCustomVal(3),
    'custom 3': getCustomVal(3),
    custom4: getCustomVal(4),
    custom_4: getCustomVal(4),
    'custom 4': getCustomVal(4),
    custom5: getCustomVal(5),
    custom_5: getCustomVal(5),
    'custom 5': getCustomVal(5),
    custom6: getCustomVal(6),
    custom_6: getCustomVal(6),
    'custom 6': getCustomVal(6),
    custom7: getCustomVal(7),
    custom_7: getCustomVal(7),
    'custom 7': getCustomVal(7),
    custom8: getCustomVal(8),
    custom_8: getCustomVal(8),
    'custom 8': getCustomVal(8),
    custom9: getCustomVal(9),
    custom_9: getCustomVal(9),
    'custom 9': getCustomVal(9),
    custom10: getCustomVal(10),
    custom_10: getCustomVal(10),
    'custom 10': getCustomVal(10),

    // Icebreaker aliases
    icebreaker: getCustomVal(1),
    personalizedopeningline: getCustomVal(1),
    problemparagraph: getCustomVal(2),
    pitch: getCustomVal(3),
    cta: getCustomVal(4),
  };

  // 2. Replace {{token}} or {token}
  resolvedText = resolvedText.replace(/(\{\{[^}]+\}\}|\{[^{}]+\})/gi, (fullMatch, token) => {
    const rawInner = token.replace(/[\{\}]/g, '').trim();
    const normalizedKey = rawInner.toLowerCase();

    if (tagMap[normalizedKey] !== undefined) {
      return tagMap[normalizedKey];
    }

    if (rawInner in context && context[rawInner] !== undefined && context[rawInner] !== null) {
      const val = String(context[rawInner]);
      if (val.toLowerCase() !== 'undefined' && val.toLowerCase() !== 'null') {
        return val;
      }
    }

    if (context.custom_fields && rawInner in context.custom_fields && context.custom_fields[rawInner] != null) {
      const val = String(context.custom_fields[rawInner]);
      if (val.toLowerCase() !== 'undefined' && val.toLowerCase() !== 'null') {
        return val;
      }
    }
    if (context.customFields && rawInner in context.customFields && context.customFields[rawInner] != null) {
      const val = String(context.customFields[rawInner]);
      if (val.toLowerCase() !== 'undefined' && val.toLowerCase() !== 'null') {
        return val;
      }
    }

    return options.fallbackPlaceholder !== undefined ? options.fallbackPlaceholder : '';
  });

  // 3. Apply canonical grammar and space cleanup
  return cleanInterpolatedText(resolvedText);
}
