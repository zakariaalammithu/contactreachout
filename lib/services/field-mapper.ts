/**
 * Bulk Contact Form Outreach System — Form Field Mapping Engine
 * Maps CSV lead data and rendered outreach messages to detected HTML form fields.
 */

import { DetectedFormField, NormalizedFieldType } from './form-detector';

export interface LeadMappingContext {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  website?: string | null;
  job_title?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  custom_fields?: Record<string, any>;
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

    // 3. Map based on normalized field type
    switch (field.normalizedType) {
      case 'first_name':
        if (lead.first_name) {
          valueToFill = String(lead.first_name).trim();
          strategy = 'direct_first_name';
          sourceLeadField = 'first_name';
        } else if (lead.name) {
          valueToFill = String(lead.name).trim().split(' ')[0] || '';
          strategy = 'direct_first_name';
          sourceLeadField = 'name';
          confidence *= 0.85;
        } else {
          valueToFill = (lead as any).sender_name?.split(' ')[0] || 'Zakaria';
          strategy = 'direct_first_name';
          sourceLeadField = 'sender_name';
        }
        break;

      case 'last_name':
        if (lead.last_name) {
          valueToFill = String(lead.last_name).trim();
          strategy = 'direct_last_name';
          sourceLeadField = 'last_name';
        } else if (lead.name) {
          const parts = String(lead.name).trim().split(' ');
          valueToFill = parts.slice(1).join(' ') || '';
          strategy = 'direct_last_name';
          sourceLeadField = 'name';
          confidence *= 0.85;
        } else {
          valueToFill = (lead as any).sender_name?.split(' ').slice(1).join(' ') || 'Mithu';
          strategy = 'direct_last_name';
          sourceLeadField = 'sender_name';
        }
        break;

      case 'full_name':
        const fullName = constructFullName(lead.first_name, lead.last_name) || lead.name || (lead as any).sender_name || 'Zakaria Alam Mithu';
        if (fullName) {
          valueToFill = String(fullName).trim();
          strategy = 'composite_full_name';
          sourceLeadField = 'first_name + last_name';
        }
        break;

      case 'email':
        if (lead.email) {
          valueToFill = String(lead.email).trim();
          strategy = 'direct_email';
          sourceLeadField = 'email';
        } else {
          valueToFill = (lead as any).sender_email || 'mithusquare@gmail.com';
          strategy = 'direct_email';
          sourceLeadField = 'sender_email';
        }
        break;

      case 'phone':
        if (lead.phone) {
          valueToFill = String(lead.phone).trim();
          strategy = 'direct_phone';
          sourceLeadField = 'phone';
        } else {
          valueToFill = '+1 (555) 234-5678';
          strategy = 'direct_phone';
          sourceLeadField = 'default_phone_fallback';
        }
        break;

      case 'company':
        if (lead.company_name) {
          valueToFill = String(lead.company_name).trim();
          strategy = 'direct_company';
          sourceLeadField = 'company_name';
        } else {
          valueToFill = 'B2B Growth Services';
          strategy = 'direct_company';
          sourceLeadField = 'default_company_fallback';
        }
        break;

      case 'website':
        if (lead.website) {
          valueToFill = String(lead.website).trim();
          strategy = 'direct_website';
          sourceLeadField = 'website';
        } else {
          valueToFill = 'https://freeoutreach.com';
          strategy = 'direct_website';
          sourceLeadField = 'default_website_fallback';
        }
        break;

      case 'job_title':
        if (lead.job_title) {
          valueToFill = String(lead.job_title).trim();
          strategy = 'direct_job_title';
          sourceLeadField = 'job_title';
        } else {
          valueToFill = 'CEO / Business Owner';
          strategy = 'direct_job_title';
          sourceLeadField = 'default_job_title_fallback';
        }
        break;

      case 'subject':
        valueToFill = message.subject || fallbackSubject || 'Partnership Inquiry & Growth Solution';
        strategy = 'direct_subject';
        sourceLeadField = 'rendered_message.subject';
        break;

      case 'message':
        let msgText = (message.body || '').trim();
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
      case 'state':
        if (field.options && field.options.length > 0) {
          const matchedOpt = matchSelectOption(field.options, lead[field.normalizedType] || lead.country || lead.state);
          if (matchedOpt) {
            valueToFill = matchedOpt;
            strategy = 'select_matching_option';
            sourceLeadField = field.normalizedType;
          }
        }
        break;

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
        }
        break;
    }

    // Check if required field has missing value
    if (field.isRequired && !valueToFill) {
      unmappedRequiredCount++;
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
