/**
 * Bulk Contact Form Outreach System — Form Field Mapping Engine
 * Maps CSV lead data and rendered outreach messages to detected HTML form fields.
 */

import { DetectedFormField, NormalizedFieldType } from './form-detector';
import { convertHtmlToPlainText } from './template-engine';

export interface LeadMappingContext {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsApp?: string | null;
  company_name?: string | null;
  website?: string | null;
  job_title?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  custom_fields?: Record<string, any>;
  user_contact_identity?: {
    fullName?: string | null;
    replyEmail?: string | null;
    phone?: string | null;
    whatsApp?: string | null;
    companyName?: string | null;
    website?: string | null;
    jobTitle?: string | null;
    country?: string | null;
  };
  [key: string]: any;
}

export interface RenderedOutreachMessage {
  subject: string;
  body: string;
}

export type MappingStrategy =
  | 'direct_first_name'
  | 'direct_last_name'
  | 'composite_full_name'
  | 'direct_email'
  | 'direct_phone'
  | 'direct_company'
  | 'direct_website'
  | 'direct_job_title'
  | 'direct_subject'
  | 'rendered_message'
  | 'select_matching_option'
  | 'check_consent'
  | 'check_radio'
  | 'custom_field'
  | 'honeypot_skip'
  | 'unmapped';

export interface FieldMappingAssignment {
  fieldSelector: string;
  fieldName?: string;
  fieldId?: string;
  fieldLabel?: string;
  tag: 'input' | 'textarea' | 'select' | 'button';
  htmlType: string;
  normalizedType: NormalizedFieldType;
  valueToFill: string;
  confidenceScore: number;
  isRequired: boolean;
  isHoneypot: boolean;
  strategy: MappingStrategy;
  sourceLeadField?: string;
}

export interface FieldMappingResult {
  status:
    | 'READY_FOR_SUBMISSION'
    | 'REVIEW_REQUIRED'
    | 'MISSING_MANDATORY_FIELDS'
    | 'EMAIL_REQUIREMENT_NOT_MET'
    | 'PHONE_REQUIREMENT_NOT_MET'
    | 'MESSAGE_VALIDATION_REQUIRED'
    | 'FIELD_MAPPING_REQUIRED';
  overallConfidenceScore: number;
  mappedFields: FieldMappingAssignment[];
  unmappedRequiredCount: number;
  honeypotsDetectedCount: number;
  reason?: string;
  mappedAt: string;
}

/**
 * Builds a composite full name from first and last name.
 */
export function constructFullName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.join(' ');
}

/**
 * Helper to match best dropdown option dynamically across any target website.
 */
export function matchSelectOption(options: string[], leadValue?: string | null): string | null {
  if (!options || options.length === 0) return null;

  // 1. Filter out placeholder choices like "-- Select --", "Select Option", "Choose..."
  const candidates = options.filter((opt) => {
    const lower = opt.toLowerCase().trim();
    return lower.length > 0 && !lower.startsWith('--') && !lower.includes('select') && !lower.includes('choose');
  });

  const pool = candidates.length > 0 ? candidates : options;

  if (leadValue && typeof leadValue === 'string') {
    const cleanLead = leadValue.toLowerCase().trim();

    // 2. Exact match
    const exact = pool.find((opt) => opt.toLowerCase().trim() === cleanLead);
    if (exact) return exact;

    // 3. Partial keyword match (e.g. "Services", "Website", "Outreach", "Lead")
    const substring = pool.find((opt) => opt.toLowerCase().includes(cleanLead) || cleanLead.includes(opt.toLowerCase()));
    if (substring) return substring;
  }

  // 4. Intelligent keyword affinity fallback
  const generalKeywords = ['general', 'inquiry', 'service', 'website', 'sales', 'other', 'quote', 'info', 'partnership', 'support'];
  for (const kw of generalKeywords) {
    const match = pool.find((opt) => opt.toLowerCase().includes(kw));
    if (match) return match;
  }

  // 5. Safe fallback: Select first valid non-placeholder option
  return pool[0] || options[0] || null;
}

/**
 * Strict dropdown match: exact or substring only, no keyword guess and
 * no first-option fallback. Used by the select/country/state case so a
 * failed match can fall through to the site's own 'Other' instead of
 * silently picking a wrong option (e.g. 'Service and repairs' for a
 * partnership inquiry just because the lead happens to carry a country).
 */
export function findSelectOptionMatch(options: string[], value?: string | null): string | null {
  if (!options || options.length === 0 || !value) return null;
  const candidates = options.filter((opt) => {
    const lower = opt.toLowerCase().trim();
    return lower.length > 0 && !lower.startsWith('--') && !lower.includes('select') && !lower.includes('choose');
  });
  const pool = candidates.length > 0 ? candidates : options;
  const clean = value.toLowerCase().trim();
  if (!clean) return null;
  const exact = pool.find((opt) => opt.toLowerCase().trim() === clean);
  if (exact) return exact;
  return pool.find((opt) => opt.toLowerCase().includes(clean) || clean.includes(opt.toLowerCase())) || null;
}

/**
 * Maps lead data and message template to detected form fields.
 */
export function mapLeadToFormFields(
  detectedFields: DetectedFormField[],
  lead: LeadMappingContext,
  message: RenderedOutreachMessage,
  options: {
    minConfidenceThreshold?: number;
    fallbackSubject?: string;
  } = {}
): FieldMappingResult {
  const { minConfidenceThreshold = 0.70, fallbackSubject = 'Partnership Inquiry' } = options;

  const assignments: FieldMappingAssignment[] = [];
  let totalConfidence = 0;
  let scoreableFieldsCount = 0;
  let unmappedRequiredCount = 0;
  let honeypotsDetectedCount = 0;
  // Radio groups share one name: only the first option may be checked.
  const seenRadioGroups = new Set<string>();

  for (const field of detectedFields) {
    let valueToFill = '';
    let strategy: MappingStrategy = 'unmapped';
    let sourceLeadField: string | undefined;
    let confidence = field.confidence;

    // 1. Honeypot traps: MUST NEVER BE FILLED (keep empty)
    if (field.isHoneypot) {
      honeypotsDetectedCount++;
      assignments.push({
        fieldSelector: field.selector,
        fieldName: field.name,
        fieldId: field.id,
        fieldLabel: field.label,
        tag: field.tag,
        htmlType: field.htmlType,
        normalizedType: field.normalizedType,
        valueToFill: '',
        confidenceScore: 1.0,
        isRequired: false,
        isHoneypot: true,
        strategy: 'honeypot_skip',
      });
      continue;
    }

    // 2. Ignore hidden and submit fields
    if (field.htmlType === 'hidden' || field.htmlType === 'submit') {
      continue;
    }

    // 3. Map based on normalized field type. A contact form's identity
    // fields (name, email, phone, company, website) ask about the SENDER,
    // so they fill from the account identity first — never from the lead.
    // The lead's (prospect's) values belong only in the message template
    // (subject/body interpolation), where they address the prospect. A
    // sender field with no identity value stays blank and the mapping
    // gate holds the lead for review, instead of submitting the
    // prospect's own details as if they were the sender's.
    switch (field.normalizedType) {
      case 'first_name':
        if (lead.user_contact_identity?.fullName) {
          valueToFill = String(lead.user_contact_identity.fullName).trim().split(' ')[0] || '';
          strategy = 'direct_first_name';
          sourceLeadField = 'user_contact_identity.fullName';
        } else if ((lead as any).sender_name) {
          valueToFill = String((lead as any).sender_name).split(' ')[0] || '';
          strategy = 'direct_first_name';
          sourceLeadField = 'sender_name';
        } else {
          valueToFill = '';
        }
        break;

      case 'last_name':
        if (lead.user_contact_identity?.fullName) {
          const parts = String(lead.user_contact_identity.fullName).trim().split(' ');
          valueToFill = parts.slice(1).join(' ') || '';
          strategy = 'direct_last_name';
          sourceLeadField = 'user_contact_identity.fullName';
        } else {
          valueToFill = '';
        }
        break;

      case 'full_name':
        const identityFullName = lead.user_contact_identity?.fullName || (lead as any).sender_name;
        if (identityFullName) {
          valueToFill = String(identityFullName).trim();
          strategy = 'composite_full_name';
          sourceLeadField = lead.user_contact_identity?.fullName ? 'user_contact_identity.fullName' : 'sender_name';
        } else {
          valueToFill = '';
        }
        break;

      case 'email':
        if (lead.user_contact_identity?.replyEmail) {
          valueToFill = String(lead.user_contact_identity.replyEmail).trim();
          strategy = 'direct_email';
          sourceLeadField = 'user_contact_identity.replyEmail';
        } else if ((lead as any).sender_email) {
          valueToFill = String((lead as any).sender_email).trim();
          strategy = 'direct_email';
          sourceLeadField = 'sender_email';
        } else {
          valueToFill = '';
        }
        break;

      case 'phone':
        if (lead.user_contact_identity?.phone) {
          valueToFill = String(lead.user_contact_identity.phone).trim();
          strategy = 'direct_phone';
          sourceLeadField = 'user_contact_identity.phone';
        } else {
          valueToFill = '';
        }
        break;

      case 'whatsApp':
        if (lead.user_contact_identity?.whatsApp) {
          valueToFill = String(lead.user_contact_identity.whatsApp).trim();
          strategy = 'direct_phone';
          sourceLeadField = 'user_contact_identity.whatsApp';
        } else if (lead.user_contact_identity?.phone) {
          valueToFill = String(lead.user_contact_identity.phone).trim();
          strategy = 'direct_phone';
          sourceLeadField = 'user_contact_identity.phone';
        } else {
          valueToFill = '';
        }
        break;

      case 'company':
        if (lead.user_contact_identity?.companyName) {
          valueToFill = String(lead.user_contact_identity.companyName).trim();
          strategy = 'direct_company';
          sourceLeadField = 'user_contact_identity.companyName';
        } else {
          valueToFill = '';
        }
        break;

      case 'website':
        if (lead.user_contact_identity?.website) {
          valueToFill = String(lead.user_contact_identity.website).trim();
          strategy = 'direct_website';
          sourceLeadField = 'user_contact_identity.website';
        } else {
          valueToFill = '';
        }
        break;

      case 'job_title':
        if (lead.user_contact_identity?.jobTitle) {
          valueToFill = String(lead.user_contact_identity.jobTitle).trim();
          strategy = 'direct_job_title';
          sourceLeadField = 'user_contact_identity.jobTitle';
        } else {
          valueToFill = '';
        }
        break;

      case 'subject': {
        const renderedSubject = convertHtmlToPlainText(message.subject || fallbackSubject || 'Partnership Inquiry & Growth Solution').trim();
        if (field.options && field.options.length > 0) {
          // Subject DROPDOWN: the site offers fixed options, so the
          // campaign's subject text is only submittable if it matches
          // one of them. Sending it raw makes the worker's selectOption
          // fail silently, leaving a placeholder (or nothing) selected
          // — and a required subject then blocks the submission. Match
          // against the site's own options instead: exact/partial match
          // on the campaign subject first, then the same keyword and
          // first-valid fallbacks the generic select case uses, so the
          // website's subject requirement is always satisfied.
          valueToFill = matchSelectOption(field.options, renderedSubject) || renderedSubject;
          strategy = 'select_matching_option';
        } else {
          valueToFill = renderedSubject;
          strategy = 'direct_subject';
        }
        sourceLeadField = 'rendered_message.subject';
        break;
      }

      case 'message':
        let msgText = convertHtmlToPlainText(message.body || '').trim();
        if (!msgText) {
          msgText = 'Hi, I build modern high-quality websites and AI automation systems tailored for businesses to generate more leads and growth.';
        }
        // Ensure message meets 100+ character minimum required by strict target websites
        if (msgText.length < 100) {
          msgText += '\n\nReaching out regarding a quick partnership inquiry. I build modern high-quality web systems tailored for businesses to scale operations and generate more opportunities.';
        }
        valueToFill = msgText;
        strategy = 'rendered_message';
        sourceLeadField = 'rendered_message.body';
        break;

      case 'select':
      case 'country':
      case 'state': {
        if (field.options && field.options.length > 0) {
          // Only the sender's country can drive a choice. A generic
          // select has no data source, and the prospect's country must
          // never pick the sender's answer.
          const matchValue = field.normalizedType === 'country'
            ? (lead.user_contact_identity?.country || null)
            : null;
          const strictMatch = findSelectOptionMatch(field.options, matchValue);
          if (strictMatch) {
            valueToFill = strictMatch;
            strategy = 'select_matching_option';
            sourceLeadField = field.normalizedType;
          } else {
            // No match (or no data at all): the site's own 'Other'
            // states nothing false. Only when the site offers no
            // 'Other' do we fall back to the old keyword/first-option
            // guess — a wrong choice is worse than no choice, but a
            // blank required select blocks the submission entirely.
            const otherOpt = field.options.find((o) => o.trim().toLowerCase() === 'other');
            if (otherOpt) {
              valueToFill = otherOpt;
              strategy = 'select_matching_option';
              sourceLeadField = 'default_other';
            } else {
              const fallbackOpt = matchSelectOption(field.options, matchValue);
              if (fallbackOpt) {
                valueToFill = fallbackOpt;
                strategy = 'select_matching_option';
                sourceLeadField = field.normalizedType;
              }
            }
          }
        }
        break;
      }

      case 'radio': {
        // A radio group shares one name and the detector reports each
        // button as its own field with no options. Check only the
        // first button: it is the same first-valid-option fallback the
        // select case uses, and checking more than one would just
        // uncheck the earlier ones (radios are mutually exclusive).
        // The worker checks a radio only when its value is 'true'.
        const groupKey = field.name || field.selector;
        if (!seenRadioGroups.has(groupKey)) {
          seenRadioGroups.add(groupKey);
          valueToFill = 'true';
          strategy = 'check_radio';
          sourceLeadField = 'default_first_option';
        } else {
          valueToFill = '';
        }
        break;
      }

      case 'checkbox':
        // Check if terms/privacy consent checkbox (required)
        const labelLower = (field.label || '').toLowerCase();
        if (field.isRequired || labelLower.includes('privacy') || labelLower.includes('terms') || labelLower.includes('agree')) {
          valueToFill = 'true';
          strategy = 'check_consent';
        }
        break;

      default:
        if (lead.custom_fields && field.name && lead.custom_fields[field.name]) {
          valueToFill = String(lead.custom_fields[field.name]);
          strategy = 'custom_field';
          sourceLeadField = `custom_fields.${field.name}`;
          confidence = 0.8;
        } else {
          const fieldRefText = `${field.name || ''} ${field.id || ''} ${field.label || ''}`.toLowerCase();
          if (/\bname\b/i.test(fieldRefText)) {
            // An unclassified name field still asks for the sender, not
            // the prospect's contact person.
            const identityFullName = lead.user_contact_identity?.fullName || (lead as any).sender_name;
            if (identityFullName) {
              valueToFill = String(identityFullName).trim();
              strategy = 'composite_full_name';
              sourceLeadField = lead.user_contact_identity?.fullName ? 'user_contact_identity.fullName' : 'sender_name';
              confidence = 0.85;
            }
          }
        }
        break;
    }

    // Check if required field has missing value. A radio group counts
    // once: its first button carries the check, so later buttons in the
    // same group are not missing data when the group is satisfied.
    if (field.isRequired && !valueToFill) {
      const radioGroupSatisfied = field.normalizedType === 'radio'
        && seenRadioGroups.has(field.name || field.selector);
      if (!radioGroupSatisfied) unmappedRequiredCount++;
    }

    if (strategy !== 'unmapped') {
      totalConfidence += confidence;
      scoreableFieldsCount++;
    }

    assignments.push({
      fieldSelector: field.selector,
      fieldName: field.name,
      fieldId: field.id,
      fieldLabel: field.label,
      tag: field.tag,
      htmlType: field.htmlType,
      normalizedType: field.normalizedType,
      valueToFill,
      confidenceScore: Math.round(confidence * 100) / 100,
      isRequired: field.isRequired,
      isHoneypot: false,
      strategy,
      sourceLeadField,
    });
  }

  // Calculate aggregate confidence
  const overallConfidenceScore =
    scoreableFieldsCount > 0
      ? Math.round((totalConfidence / scoreableFieldsCount) * 100)
      : 0;

  // Determine Mapping Status
  let status: FieldMappingResult['status'] = 'READY_FOR_SUBMISSION';
  let reason: string | undefined;

  // 1. Mandatory requirements check (Must have email and message mapped)
  const hasMappedEmail = assignments.some((a) => a.normalizedType === 'email' && a.valueToFill);
  const hasMappedMessage = assignments.some((a) => a.normalizedType === 'message' && a.valueToFill);

  if (!hasMappedEmail) {
    status = 'EMAIL_REQUIREMENT_NOT_MET';
    reason = 'Required email field could not be mapped to lead data.';
  } else if (!hasMappedMessage) {
    status = 'MESSAGE_VALIDATION_REQUIRED';
    reason = 'Outreach message body could not be mapped to form textarea.';
  } else if (unmappedRequiredCount > 0) {
    status = 'FIELD_MAPPING_REQUIRED';
    reason = `${unmappedRequiredCount} mandatory field(s) on the form lack matching data.`;
  } else if (overallConfidenceScore < Math.round(minConfidenceThreshold * 100)) {
    status = 'REVIEW_REQUIRED';
    reason = `Overall mapping confidence (${overallConfidenceScore}%) is below minimum threshold (${Math.round(minConfidenceThreshold * 100)}%).`;
  }

  return {
    status,
    overallConfidenceScore,
    mappedFields: assignments,
    unmappedRequiredCount,
    honeypotsDetectedCount,
    reason,
    mappedAt: new Date().toISOString(),
  };
}
