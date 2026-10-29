/**
 * Bulk Contact Form Outreach System — Pipeline Orchestrator
 * Connects Lead Ingestion, Contact Discovery, Form Detection, Template Interpolation,
 * Field Mapping, and Form Submission into a unified, deterministic workflow.
 */

import { ContactPageFinder, ContactDiscoveryResult, COMMON_CONTACT_PATHS } from './contact-page-finder';
import { ContactFormDetector, FormDetectionResult, DetectedFormField, detectFormsViaFetch, classifyFetchField } from './form-detector';
import { isBrowserWorkerConfigured, detectWithBrowserWorker, WorkerDetectionForm } from './browser-worker-client';
import { interpolateTemplate, extractVariables, convertHtmlToPlainText, prepareContactFormPlainText } from './template-engine';
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
    whatsApp?: string | null;
  };
  user_contact_identity?: {
    fullName?: string | null;
    replyEmail?: string | null;
    phone?: string | null;
    whatsApp?: string | null;
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
    runtimeMode?: 'live' | 'test' | 'disabled';
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

/** Score worker-rendered forms and pick the best contact form. Login,
 * search, and newsletter forms are never contact forms. A form only
 * counts when it has at least one mappable field. */
function pickBestWorkerForm(forms: WorkerDetectionForm[]): WorkerDetectionForm | null {
  let best: WorkerDetectionForm | null = null;
  let bestScore = 0;
  for (const form of forms) {
    const hay = `${form.selector} ${form.action}`.toLowerCase();
    if (/login|signin|sign-in|auth/.test(hay) || /search/.test(hay) || /subscribe|newsletter/.test(hay)) continue;
    let score = 0;
    for (const f of form.fields) {
      const t = classifyFetchField(f.tag, f.type, f.name, f.label);
      if (t === 'message') score += 4;
      else if (t === 'email' || t === 'full_name') score += 3;
      else if (t !== 'unknown') score += 2;
    }
    if (score > bestScore) { bestScore = score; best = form; }
  }
  return best;
}

function workerFormToDetection(targetUrl: string, form: WorkerDetectionForm): FormDetectionResult {
  const fields: DetectedFormField[] = form.fields.map((f) => ({
    id: f.selector.startsWith('#') ? f.selector.slice(1) : undefined,
    name: f.name || undefined,
    selector: f.selector,
    tag: (f.tag === 'textarea' ? 'textarea' : f.tag === 'select' ? 'select' : 'input') as 'input' | 'textarea' | 'select',
    htmlType: f.type,
    label: f.label || undefined,
    normalizedType: classifyFetchField(f.tag, f.type, f.name, f.label),
    confidence: 0.9,
    isRequired: f.required,
    isHoneypot: false,
    options: f.tag === 'select' && f.options ? f.options.map((o) => o.label || o.value).filter(Boolean) : undefined,
  }));
  return {
    targetUrl,
    hasContactForm: true,
    selectedForm: {
      formSelector: form.selector,
      action: form.action || undefined,
      method: form.method || 'post',
      formScore: 90,
      isContactForm: true,
      isLoginOrAuthForm: false,
      isSearchForm: false,
      isNewsletterForm: false,
      hasCaptcha: false,
      hasFileRequired: false,
      detectedFields: fields,
    },
    allFormsCount: 1,
    status: 'DETECTED',
    confidenceScore: 90,
    detectedAt: new Date().toISOString(),
  };
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

    if (
      discovery.status === 'ERROR' ||
      discovery.errorCode === 'BROWSER_LAUNCH_FAILED' ||
      discovery.errorCode === 'BROWSER_RUNTIME_UNAVAILABLE'
    ) {
      addLog('CONTACT_PAGE_DISCOVERY', `Infrastructure / browser runtime error on ${lead.website}: ${discovery.errorMessage}`);
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'FAILED',
        currentStage: 'CONTACT_PAGE_DISCOVERY',
        discovery,
        renderedSubject: '',
        renderedBody: '',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    // When fetch probing could not statically verify a contact page, a
    // configured remote worker can still render the site's likely contact
    // pages in a real browser — the only way to reach client-rendered
    // forms from a serverless runtime. Without a worker there is nothing
    // further to try, so report honestly instead of failing on a
    // Playwright error that never applied.
    const workerConfigured = isBrowserWorkerConfigured();
    let candidateList: string[];
    if (discovery.status === 'FOUND' && discovery.contactPageUrl) {
      addLog('CONTACT_PAGE_DISCOVERY', `Discovered contact page: ${discovery.contactPageUrl} via ${discovery.discoveryMethod}`);
      candidateList = (discovery.candidateUrls && discovery.candidateUrls.length > 0)
        ? discovery.candidateUrls.map((c) => c.url)
        : [discovery.contactPageUrl];
    } else if (workerConfigured) {
      addLog('CONTACT_PAGE_DISCOVERY', `No static contact page verified on ${lead.website}; trying likely contact paths through the remote browser worker.`);
      const base = lead.website.replace(/\/$/, '');
      candidateList = [...COMMON_CONTACT_PATHS.map((path) => `${base}${path}`), base];
    } else {
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

    // 3. Stage 2: Form Detection with Multi-Candidate Fallback Loop
    // Rather than stopping if Candidate #1 lacks a form, iterate through all discovered candidate URLs.
    // Detection order per candidate: remote worker first (renders JS
    // pages), then fetch/local detection only when the worker is
    // unavailable. A worker that rendered a page and found no form is
    // trusted — fetch cannot see more than the rendered DOM.
    let selectedDetection: FormDetectionResult | null = null;
    let selectedContactUrl: string | null = null;
    let lastNavigationError: string | null = null;
    let lastDetection: FormDetectionResult | null = null;

    for (const candidateUrl of candidateList) {
      if (!candidateUrl) continue;
      addLog('FORM_DETECTION', `Analyzing candidate page: ${candidateUrl}`);
      let detectionCandidate: FormDetectionResult | null = null;
      let workerRendered = false;

      if (workerConfigured) {
        const workerDetection = await detectWithBrowserWorker({ url: candidateUrl, timeoutMs: options.timeoutMs || 15000 });
        if (workerDetection.available && workerDetection.status === 'CAPTCHA_DETECTED') {
          addLog('FORM_DETECTION', `CAPTCHA / Bot challenge detected on candidate ${candidateUrl}. Routing to REVIEW_REQUIRED.`);
          return {
            leadId: lead.id,
            targetWebsite: lead.website,
            finalStatus: 'CAPTCHA_DETECTED',
            currentStage: 'FORM_DETECTION',
            discovery: { ...discovery, contactPageUrl: candidateUrl },
            detection: {
              targetUrl: candidateUrl,
              hasContactForm: false,
              selectedForm: null,
              allFormsCount: 0,
              status: 'CAPTCHA_DETECTED',
              confidenceScore: 0,
              detectedAt: new Date().toISOString(),
            },
            renderedSubject: '',
            renderedBody: '',
            totalDurationMs: Date.now() - startTime,
            completedAt: new Date().toISOString(),
            logs,
          };
        }
        if (workerDetection.available && workerDetection.status === 'NAVIGATION_FAILED') {
          lastNavigationError = workerDetection.errorMessage || 'Worker could not load the page.';
          continue;
        }
        if (workerDetection.available) {
          workerRendered = true;
          const bestForm = pickBestWorkerForm(workerDetection.forms);
          if (bestForm) detectionCandidate = workerFormToDetection(candidateUrl, bestForm);
        } else {
          addLog('FORM_DETECTION', `Worker detection unavailable for ${candidateUrl}; falling back to fetch detection.`);
        }
      }

      if (!detectionCandidate && !workerRendered) {
        detectionCandidate = process.env.VERCEL === '1'
          ? await detectFormsViaFetch(candidateUrl)
          : await ContactFormDetector.detectFormOnPage(candidateUrl);
      }

      if (!detectionCandidate) continue;
      lastDetection = detectionCandidate;

      if (detectionCandidate.status === 'CAPTCHA_DETECTED') {
        addLog('FORM_DETECTION', `CAPTCHA / Bot challenge detected on candidate ${candidateUrl}. Routing to REVIEW_REQUIRED.`);
        return {
          leadId: lead.id,
          targetWebsite: lead.website,
          finalStatus: 'CAPTCHA_DETECTED',
          currentStage: 'FORM_DETECTION',
          discovery: { ...discovery, contactPageUrl: candidateUrl },
          detection: detectionCandidate,
          renderedSubject: '',
          renderedBody: '',
          totalDurationMs: Date.now() - startTime,
          completedAt: new Date().toISOString(),
          logs,
        };
      }

      if (detectionCandidate.status === 'FORM_INACCESSIBLE' && detectionCandidate.selectedForm?.isInsideIframe) {
        addLog('FORM_DETECTION', `Embedded iframe contact form detected on candidate ${candidateUrl}. Routing to REVIEW_REQUIRED.`);
        return {
          leadId: lead.id,
          targetWebsite: lead.website,
          finalStatus: 'REVIEW_REQUIRED',
          currentStage: 'FORM_DETECTION',
          discovery: { ...discovery, contactPageUrl: candidateUrl },
          detection: detectionCandidate,
          renderedSubject: '',
          renderedBody: '',
          totalDurationMs: Date.now() - startTime,
          completedAt: new Date().toISOString(),
          logs,
        };
      }

      if (detectionCandidate.hasContactForm && detectionCandidate.selectedForm) {
        selectedDetection = detectionCandidate;
        selectedContactUrl = candidateUrl;
        addLog('FORM_DETECTION', `Successfully verified contact form on candidate ${candidateUrl}`);
        break;
      }
    }

    const detection = selectedDetection;
    const activeContactUrl = selectedContactUrl || discovery.contactPageUrl;

    // Every candidate failed to load in the worker (and none produced a
    // form): the site itself could not be reached, not its forms.
    if (!detection && lastNavigationError && candidateList.length > 0) {
      addLog('FORM_DETECTION', `Worker could not load any candidate page on ${lead.website}: ${lastNavigationError}`);
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'FAILED',
        currentStage: 'CONTACT_PAGE_DISCOVERY',
        discovery: { ...discovery, status: 'ERROR', errorMessage: lastNavigationError },
        detection: lastDetection || undefined,
        renderedSubject: '',
        renderedBody: '',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    if (!detection || !detection.hasContactForm || !detection.selectedForm) {
      addLog('FORM_DETECTION', 'No valid public contact form identified across all candidate contact pages.');
      return {
        leadId: lead.id,
        targetWebsite: lead.website,
        finalStatus: 'NO_FORM_DETECTED',
        currentStage: 'FORM_DETECTION',
        discovery,
        detection: detection || {
          targetUrl: activeContactUrl || lead.website,
          hasContactForm: false,
          selectedForm: null,
          allFormsCount: 0,
          status: 'NO_FORM_FOUND',
          confidenceScore: 0,
          detectedAt: new Date().toISOString(),
        },
        renderedSubject: '',
        renderedBody: '',
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
        logs,
      };
    }

    // Update discovery contactPageUrl to point to the candidate page with the verified form
    if (activeContactUrl) discovery.contactPageUrl = activeContactUrl;

    addLog(
      'FORM_DETECTION',
      `Identified contact form (${detection.selectedForm.formSelector}) with ${detection.selectedForm.detectedFields.length} fields on ${activeContactUrl}.`
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
      whatsApp: lead.whatsApp,
      industry: lead.industry,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      custom_fields: lead.custom_fields,
      user_contact_identity: input.user_contact_identity,
    };

    const renderedSubject = convertHtmlToPlainText(interpolateTemplate(template.subjectTemplate, leadContext));
    // Keep this path identical to the user-authored template's plain-text
    // representation. In particular, never use a whitespace-wide replacement
    // here: textarea values must retain paragraph and signature line breaks.
    let renderedBody = prepareContactFormPlainText(template.bodyTemplate, leadContext);

    if (template.complianceFooter) {
      renderedBody = `${renderedBody}\n\n---\n${convertHtmlToPlainText(template.complianceFooter)}`;
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
      // A selected form always implies a selected candidate URL; the
      // lead website fallback only satisfies the type checker.
      contactPageUrl: discovery.contactPageUrl || activeContactUrl || lead.website,
      formSelector: detection.selectedForm.formSelector,
      formAction: detection.selectedForm.action,
      formMethod: detection.selectedForm.method,
      mappedFields: mapping.mappedFields,
      dryRun,
      runtimeMode: options.runtimeMode || 'live',
    });

    addLog('FORM_SUBMISSION', `Execution completed with outcome status: ${submission.status}`);

    const finalStatus =
      submission.status === 'DRY_RUN_COMPLETED'
        ? 'DRY_RUN_COMPLETED'
        : submission.status === 'TEST_MODE_COMPLETED'
        ? 'DRY_RUN_COMPLETED'
        : submission.status === 'SUCCESS'
        ? 'SUCCESS'
        : submission.status === 'CAPTCHA_DETECTED'
        ? 'CAPTCHA_DETECTED'
        : submission.status === 'REVIEW_REQUIRED'
        ? 'REVIEW_REQUIRED'
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
