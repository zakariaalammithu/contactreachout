export type LeadStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'CONTACT_PAGE_FOUND'
  | 'FORM_DETECTED'
  | 'DRY_RUN_COMPLETED'
  | 'SUBMITTED'
  | 'REVIEW_REQUIRED'
  | 'BLOCKED'
  | 'FAILED'
  | 'SKIPPED';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'archived';

export type SubmissionStatus =
  | 'SUCCESS'
  | 'DRY_RUN_SUCCESS'
  | 'CAPTCHA_TRIGGERED'
  | 'VALIDATION_ERROR'
  | 'BLOCKED_403_429'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'AMBIGUOUS_OUTCOME';

export interface Lead {
  id: string;
  listId?: string;
  listName?: string;
  domain: string;
  website: string;
  companyName: string;
  firstName: string;
  lastName: string;
  title?: string;
  email: string;
  phone?: string;
  industry?: string;
  personLinkedinUrl?: string;
  companyLinkedinUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  personalizedOpeningLine?: string;
  problemParagraph?: string;
  pitch?: string;
  cta?: string;
  customFields?: Record<string, string>;
  status: LeadStatus;
  contactPageUrl?: string;
  formConfidence?: number;
  lastAttemptAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface LeadList {
  id: string;
  name: string;
  fileName: string;
  totalLeads: number;
  columns: string[];
  createdAt: string;
}

export interface CampaignSequenceStep {
  id: string;
  sequenceNumber: number;
  stepType: 'initial_email' | 'followup';
  subject: string;
  body: string;
  delayDays: number;
  condition: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  isDryRun: boolean;
  messageTemplateId?: string;
  messageTemplateName?: string;
  sequences?: CampaignSequenceStep[];
  autoSuppressFailedWebsites?: boolean;
  totalLeads: number;
  processedLeads: number;
  successfulCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  failedCount: number;
  rateLimitPerMinute: number;
  maxConcurrency: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  complianceFooter: string;
  isSpintaxEnabled: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingJob {
  id: string;
  campaignId: string;
  campaignName: string;
  leadId: string;
  domain: string;
  website: string;
  companyName: string;
  currentStep: string;
  progressPercent: number;
  status: 'active' | 'waiting' | 'delayed' | 'failed' | 'completed';
  isDryRun: boolean;
  startedAt: string;
  durationMs: number;
}

export interface SubmissionResult {
  id: string;
  campaignId: string;
  campaignName: string;
  leadId: string;
  companyName: string;
  domain: string;
  website: string;
  contactPageUrl: string;
  status: SubmissionStatus;
  leadStatus: LeadStatus;
  isDryRun: boolean;
  errorCode?: string;
  errorMessage?: string;
  preSubmitScreenshotUrl?: string;
  postSubmitScreenshotUrl?: string;
  httpStatus?: number;
  resolvedAt?: string;
  submittedAt: string;
}

export interface SystemLog {
  id: string;
  traceId: string;
  campaignId?: string;
  leadId?: string;
  domain?: string;
  step: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardMetrics {
  totalCampaigns: number;
  totalWebsites: number;
  pending: number;
  processing: number;
  successful: number;
  failed: number;
  reviewRequired: number;
  blocked: number;
  successRate: number;
  avgDurationSec: number;
}
