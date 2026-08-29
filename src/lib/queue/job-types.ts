/**
 * Bulk Contact Form Outreach System — Background Job Definitions & Standard Status Codes
 * Defines BullMQ job types, payload schemas, 23 standard status codes, and lifecycle states.
 */

import { FieldMappingAssignment } from '../services/field-mapper';
import { FormSubmissionPreviewResult } from '../services/contact-form-submitter';

export type OutreachStatusCode =
  | 'PENDING'
  | 'SCANNING'
  | 'CONTACT_PAGE_FOUND'
  | 'NO_CONTACT_PAGE'
  | 'FORM_FOUND'
  | 'NO_CONTACT_FORM'
  | 'FORM_INACCESSIBLE'
  | 'READY_TO_SUBMIT'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'VALIDATION_ERROR'
  | 'FIELD_MAPPING_REQUIRED'
  | 'EMAIL_REQUIREMENT_NOT_MET'
  | 'PHONE_REQUIREMENT_NOT_MET'
  | 'MESSAGE_VALIDATION_REQUIRED'
  | 'FILE_REQUIRED'
  | 'CAPTCHA_DETECTED'
  | 'BOT_PROTECTION'
  | 'AUTHENTICATION_REQUIRED'
  | 'BLOCKED'
  | 'TIMEOUT'
  | 'DUPLICATE_PREVENTED'
  | 'REVIEW_REQUIRED';

export type OutreachJobType =
  | 'discover_contact_page'
  | 'detect_contact_form'
  | 'map_form_fields'
  | 'generate_preview'
  | 'submit_contact_form'
  | 'verify_submission';

export interface BaseJobData {
  campaignId: string;
  leadId: string;
  website: string;
  companyName: string;
  jobType: OutreachJobType;
  retryCount?: number;
  maxRetries?: number;
}

export interface DiscoverContactPageJobData extends BaseJobData {
  jobType: 'discover_contact_page';
  navigationTimeoutMs?: number;
}

export interface DetectContactFormJobData extends BaseJobData {
  jobType: 'detect_contact_form';
  contactPageUrl: string;
}

export interface MapFormFieldsJobData extends BaseJobData {
  jobType: 'map_form_fields';
  contactPageUrl: string;
  formSelector: string;
  leadData: Record<string, any>;
  renderedMessage: {
    subject: string;
    body: string;
  };
}

export interface GeneratePreviewJobData extends BaseJobData {
  jobType: 'generate_preview';
  contactPageUrl: string;
  formSelector: string;
  mappedFields: FieldMappingAssignment[];
}

export interface SubmitContactFormJobData extends BaseJobData {
  jobType: 'submit_contact_form';
  contactPageUrl: string;
  formSelector: string;
  mappedFields: FieldMappingAssignment[];
  message: {
    subject: string;
    body: string;
  };
  mode: 'test' | 'live';
}

export interface VerifySubmissionJobData extends BaseJobData {
  jobType: 'verify_submission';
  submissionResult: FormSubmissionPreviewResult;
}

export type OutreachJobPayload =
  | DiscoverContactPageJobData
  | DetectContactFormJobData
  | MapFormFieldsJobData
  | GeneratePreviewJobData
  | SubmitContactFormJobData
  | VerifySubmissionJobData;

export interface QueueStatistics {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  reviewRequired: number;
  activeWorkers: number;
  concurrency: number;
  isPaused: boolean;
}
