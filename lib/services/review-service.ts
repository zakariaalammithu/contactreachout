/**
 * Bulk Contact Form Outreach System — Review & Triage Service
 * Manages human-in-the-loop pre-submission verification, approval workflows,
 * and campaign submission mode policies.
 */

import { FieldMappingAssignment } from './field-mapper';

export type SubmissionMode = 'manual_approval' | 'automatic';

export type ReviewDecision =
  | 'APPROVED'
  | 'SKIPPED'
  | 'REVIEW_LATER'
  | 'EDITED_AND_APPROVED';

export interface PreSubmissionReviewItem {
  id: string;
  leadId: string;
  campaignId: string;
  companyName: string;
  website: string;
  contactPageUrl: string;
  formSelector: string;
  confidenceScore: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'SKIPPED' | 'REVIEW_LATER';
  mappedFields: FieldMappingAssignment[];
  renderedSubject: string;
  renderedBody: string;
  createdAt: string;
  reviewedAt?: string;
  reviewerDecision?: ReviewDecision;
  customNotes?: string;
}

export interface CampaignReviewPolicy {
  campaignId: string;
  submissionMode: SubmissionMode;
  requireApprovalForConfidenceBelow: number; // e.g. 90%
  autoSkipHoneypotOnly: boolean;
}

export class ReviewTriageService {
  /**
   * Evaluates if a lead item requires manual review based on campaign policy and confidence score.
   */
  public static shouldRequireManualApproval(
    item: { confidenceScore: number; hasUnmappedRequired: boolean; isCaptchaDetected: boolean },
    policy: CampaignReviewPolicy
  ): { requiresReview: boolean; reason: string } {
    // 1. If Campaign mode is Manual Approval, ALWAYS require approval
    if (policy.submissionMode === 'manual_approval') {
      return {
        requiresReview: true,
        reason: 'Campaign policy is set to Manual Approval (Human-in-the-Loop default).',
      };
    }

    // 2. If CAPTCHA was detected, always require manual triage
    if (item.isCaptchaDetected) {
      return {
        requiresReview: true,
        reason: 'CAPTCHA challenge detected on target form. Manual inspection required.',
      };
    }

    // 3. If required fields are unmapped
    if (item.hasUnmappedRequired) {
      return {
        requiresReview: true,
        reason: 'Mandatory form fields lack mapped lead data.',
      };
    }

    // 4. Low confidence threshold
    if (item.confidenceScore < policy.requireApprovalForConfidenceBelow) {
      return {
        requiresReview: true,
        reason: `Confidence score (${item.confidenceScore}%) is below automatic threshold (${policy.requireApprovalForConfidenceBelow}%).`,
      };
    }

    return { requiresReview: false, reason: 'Passed all automatic verification checks.' };
  }

  /**
   * Applies user triage decision to an item.
   */
  public static applyDecision(
    item: PreSubmissionReviewItem,
    decision: ReviewDecision,
    modifiedFields?: FieldMappingAssignment[]
  ): PreSubmissionReviewItem {
    const updated: PreSubmissionReviewItem = {
      ...item,
      reviewerDecision: decision,
      reviewedAt: new Date().toISOString(),
      mappedFields: modifiedFields || item.mappedFields,
    };

    switch (decision) {
      case 'APPROVED':
      case 'EDITED_AND_APPROVED':
        updated.status = 'APPROVED';
        break;
      case 'SKIPPED':
        updated.status = 'SKIPPED';
        break;
      case 'REVIEW_LATER':
        updated.status = 'REVIEW_LATER';
        break;
    }

    return updated;
  }
}
