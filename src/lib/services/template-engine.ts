/**
 * Bulk Contact Form Outreach System — Template Engine Service
 * Handles deterministic variable interpolation, unknown token validation,
 * custom CSV field mapping, and Spintax resolution.
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
  last_name?: string | null;
  company_name?: string | null;
  website?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  email?: string | null;
  custom_fields?: Record<string, string | number | boolean | null | undefined>;
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
    // Check if standard variable or starts with custom. or matches custom field
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
  // Spintax requires at least two choices separated by '|' (e.g. {Hi|Hello|Dear})
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
 * Helper to convert strings to Title Case (e.g. "alam" -> "Alam", "million verifier" -> "Million Verifier")
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
 * Replaces {{variable}} tokens with actual lead values.
 * Supports standard fields, custom JSONB fields, case-insensitive tokens, and fallback syntax.
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

  // Extract Lead Fields with Title-Case formatting and clean fallbacks
  const rawFirstName =
    context.first_name ||
    context.firstName ||
    context.contact_person ||
    context.contactPerson ||
    context.custom_fields?.first_name ||
    context.custom_fields?.firstName ||
    '';
  const firstName = rawFirstName ? toTitleCase(String(rawFirstName)) : 'there';

  const rawLastName =
    context.last_name ||
    context.lastName ||
    context.custom_fields?.last_name ||
    context.custom_fields?.lastName ||
    '';
  const lastName = rawLastName ? toTitleCase(String(rawLastName)) : '';

  const fullName = firstName && lastName && firstName !== 'there' ? `${firstName} ${lastName}` : firstName !== 'there' ? firstName : '';

  const rawCompany =
    context.company_name ||
    context.companyName ||
    context.company ||
    context.custom_fields?.company_name ||
    context.custom_fields?.companyName ||
    '';
  const company = rawCompany ? toTitleCase(String(rawCompany)) : 'your team';

  const email = context.email || context.custom_fields?.email || '';
  const website = context.website || context.custom_fields?.website || '';
  const industry = context.industry || context.custom_fields?.industry || 'B2B SaaS';
  const city = context.city || context.custom_fields?.city || '';
  const state = context.state || context.custom_fields?.state || '';
  const country = context.country || context.custom_fields?.country || '';

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

    // Direct context property check
    if (rawInner in context && context[rawInner] !== undefined && context[rawInner] !== null) {
      return String(context[rawInner]);
    }

    if (context.custom_fields && rawInner in context.custom_fields && context.custom_fields[rawInner] != null) {
      return String(context.custom_fields[rawInner]);
    }
    if (context.customFields && rawInner in context.customFields && context.customFields[rawInner] != null) {
      return String(context.customFields[rawInner]);
    }

    return options.fallbackPlaceholder !== undefined ? options.fallbackPlaceholder : '';
  });

  return resolvedText;
}

