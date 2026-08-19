/**
 * Bulk Contact Form Outreach System — Pipeline Orchestrator
 * Connects Lead Ingestion, Contact Discovery, Form Detection, Template Interpolation,
 * Field Mapping, and Form Submission into a unified, deterministic workflow.
 */

import { ContactPageFinder, ContactDiscoveryResult } from './contact-page-finder';
import { ContactFormDetector, FormDetectionResult } from './form-detector';
import { interpolateTemplate, extractVariables } from './template-engine';
import { mapLeadToFormFields, FieldMappingResult, LeadMappingContext } from './field-mapper';
import { FormSubmitter, SubmissionExecutionResult } from './form-submitter';

export interface PipelineExecutionInput {
  lead: {
    id: string;
    company_name: string;
    website: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    industry?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    custom_fields?: Record<string, any>;
  };
  template: {
    id: string;
    subjectTemplate: string;
    bodyTemplate: string;
    complianceFooter?: string;
    isSpintaxEnabled?: boolean;
  };
  options?: {
    dryRun?: boolean;
    suppressionList?: string[];
    minConfidenceThreshold?: number;
    timeoutMs?: number;
  };
}

export type PipelineStage =
  | 'SUPPRESSION_CHECK'
  | 'CONTACT_PAGE_DISCOVERY'
  | 'FORM_DETECTION'
  | 'TEMPLATE_RENDERING'
  | 'FIELD_MAPPING'
  | 'FORM_SUBMISSION'
  | 'COMPLETED';

export interface PipelineExecutionResult {
  leadId: string;
  targetWebsite: string;
  finalStatus:
    | 'SUCCESS'
    | 'DRY_RUN_COMPLETED'
    | 'BLOCKED_SUPPRESSED'
    | 'REVIEW_REQUIRED'
    | 'NO_CONTACT_PAGE'
    | 'NO_FORM_DETECTED'
    | 'CAPTCHA_DETECTED'
    | 'FAILED';
  currentStage: PipelineStage;
  discovery?: ContactDiscoveryResult;
  detection?: FormDetectionResult;
  renderedSubject: string;
  renderedBody: string;
  mapping?: FieldMappingResult;
  submission?: SubmissionExecutionResult;
  totalDurationMs: number;
  completedAt: string;
  logs: Array<{ stage: PipelineStage; message: string; timestamp: string }>;
}

export class OutreachPipelineOrchestrator {
  /**
   * Executes the full outreach lifecycle for a single lead.
   */
  public static async processLead(
    input: PipelineExecutionInput
  ): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const logs: Array<{ stage: PipelineStage; message: string; timestamp: string }> = [];

    const addLog = (stage: PipelineStage, message: string) => {
      logs.push({ stage, message, timestamp: new Date().toISOString() });
    };

    const { lead, template, options = {} } = input;
    const { dryRun = false, suppressionList = [], minConfidenceThreshold = 0.7 } = options;

    addLog('SUPPRESSION_CHECK', `Initiating outreach pipeline for ${lead.company_name} (${lead.website})`);

    // 1. Check Global Suppression List
    const parsedDomain = lead.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (suppressionList.includes(parsedDomain)) {
      addLog('SUPPRESSION_CHECK', `Domain "${parsedDomain}" matched suppression blocklist. Pipeline halted.`);
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'BLOCKED_SUPPRESSED',
        currentStage: 'SUPPRESSION_CHECK',
        renderedSubject: '',
        renderedBody: '',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    // 2. Stage 1: Contact Page Discovery
    addLog('CONTACT_PAGE_DISCOVERY', `Discovering public contact page on ${lead.website}`);
    const discovery = await ContactPageFinder.findContactPage({
      websiteUrl: lead.website,
      navigationTimeoutMs: options.timeoutMs || 20000,
    });

    if (discovery.status === 'BOT_BLOCKED') {
      addLog('CONTACT_PAGE_DISCOVERY', `Bot access restriction detected on ${lead.website}`);
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'REVIEW_REQUIRED',
        currentStage: 'CONTACT_PAGE_DISCOVERY',
        discovery,
        renderedSubject: '',
        renderedBody: '',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    if (discovery.status !== 'FOUND' || !discovery.contactPageUrl) {
      addLog('CONTACT_PAGE_DISCOVERY', `No public contact page found on ${lead.website}`);
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'NO_CONTACT_PAGE',
        currentStage: 'CONTACT_PAGE_DISCOVERY',
        discovery,
        renderedSubject: '',
        renderedBody: '',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    addLog('CONTACT_PAGE_DISCOVERY', `Discovered contact page: ${discovery.contactPageUrl} via ${discovery.discoveryMethod}`);

    // 3. Stage 2: Form Detection
    addLog('FORM_DETECTION', `Analyzing HTML DOM on ${discovery.contactPageUrl}`);
    const detection = await ContactFormDetector.detectFormOnPage(discovery.contactPageUrl);

    if (detection.status === 'CAPTCHA_DETECTED') {
      addLog('FORM_DETECTION', 'CAPTCHA / Bot challenge detected on contact form. Routing to REVIEW_REQUIRED.');
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'CAPTCHA_DETECTED',
        currentStage: 'FORM_DETECTION',
        discovery,
        detection,
        renderedSubject: '',
        renderedBody: '',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    if (!detection.hasContactForm || !detection.selectedForm) {
      addLog('FORM_DETECTION', 'No valid public contact form identified on page.');
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'NO_FORM_DETECTED',
        currentStage: 'FORM_DETECTION',
        discovery,
        detection,
        renderedSubject: '',
        renderedBody: '',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    addLog(
      'FORM_DETECTION',
      `Identified contact form (${detection.selectedForm.formSelector}) with ${detection.selectedForm.detectedFields.length} fields.`
    );

    // 4. Stage 3: Message Template Rendering
    addLog('TEMPLATE_RENDERING', 'Interpolating lead variables and Spintax.');
    const leadContext: LeadMappingContext = {
      first_name: lead.first_name,
      last_name: lead.last_name,
      company_name: lead.company_name,
      website: lead.website,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      custom_fields: lead.custom_fields,
    };

    const renderedSubject = interpolateTemplate(template.subjectTemplate, leadContext);
    let renderedBody = interpolateTemplate(template.bodyTemplate, leadContext);

    if (template.complianceFooter) {
      renderedBody = `${renderedBody}\n\n---\n${template.complianceFooter}`;
    }

    // 5. Stage 4: Form Field Mapping
    addLog('FIELD_MAPPING', 'Computing field mapping matrix.');
    const mapping = mapLeadToFormFields(
      detection.selectedForm.detectedFields,
      leadContext,
      { subject: renderedSubject, body: renderedBody },
      { minConfidenceThreshold }
    );

    if (mapping.status === 'REVIEW_REQUIRED' || mapping.status === 'MISSING_MANDATORY_FIELDS') {
      addLog('FIELD_MAPPING', `Mapping requires review: ${mapping.reason}`);
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'REVIEW_REQUIRED',
        currentStage: 'FIELD_MAPPING',
        discovery,
        detection,
        renderedSubject,
        renderedBody,
        mapping,
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    addLog(
      'FIELD_MAPPING',
      `Mapped ${mapping.mappedFields.length} fields with overall confidence score ${mapping.overallConfidenceScore}%.`
    );

    // 6. Stage 5: Form Submission (Dry Run or Live)
    addLog('FORM_SUBMISSION', `Executing form action (Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}).`);
    const submission = await FormSubmitter.executeSubmission({
      contactPageUrl: discovery.contactPageUrl,
      formSelector: detection.selectedForm.formSelector,
      mappedFields: mapping.mappedFields,
      dryRun,
    });

    addLog('FORM_SUBMISSION', `Execution completed with outcome status: ${submission.status}`);

    const finalStatus =
      submission.status === 'DRY_RUN_COMPLETED'
        ? 'DRY_RUN_COMPLETED'
        : submission.status === 'SUCCESS'
        ? 'SUCCESS'
        : submission.status === 'CAPTCHA_DETECTED'
        ? 'CAPTCHA_DETECTED'
        : 'FAILED';

    return {
      leadId: lead.id,
      targetWebsite: lead.website,
      finalStatus,
      currentStage: 'COMPLETED',
      discovery,
      detection,
      renderedSubject,
      renderedBody,
      mapping,
      submission,
      totalDurationMs: Date.now() - startTime,
      completedAt: new Date().toISOString(),
      logs,
    };
  }
}
