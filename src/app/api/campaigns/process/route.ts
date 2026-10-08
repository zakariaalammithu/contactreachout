import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';
import { OutreachPipelineOrchestrator } from '@/lib/services/outreach-orchestrator';
import { validateSendingSchedule } from '@/lib/services/processing-controls-service';

import { AuthStore } from '@/lib/auth/auth-store';

export async function POST(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    const userId = session?.email || 'usr_guest';

    const body = await req.json();
    const { campaignId, lead, template, options = {} } = body;

    if (!lead || !lead.website || !lead.company_name) {
      return NextResponse.json(
        { error: 'Missing required lead details (website, company_name)' },
        { status: 400 }
      );
    }

    if (!template || !template.bodyTemplate) {
      return NextResponse.json(
        { error: 'Missing required template details (bodyTemplate)' },
        { status: 400 }
      );
    }

    const hasExplicitDryRun = typeof options.dryRun === 'boolean';
    const dryRunDefault = process.env.ENFORCE_DRY_RUN_DEFAULT === 'true';
    const envMode = process.env.CONTACT_FORM_MODE ? process.env.CONTACT_FORM_MODE.toLowerCase() : undefined;
    
    // Explicit campaign configuration takes precedence unless globally disabled via environment
    const campaignDryRun = hasExplicitDryRun ? options.dryRun : dryRunDefault;
    const isDryRun = envMode === 'disabled' ? true : campaignDryRun;
    const runtimeMode: 'live' | 'test' | 'disabled' = envMode === 'disabled' ? 'disabled' : (isDryRun ? 'test' : 'live');

    // 1. Server-Side Sending Schedule Enforcement
    const scheduleCheck = validateSendingSchedule(options.schedule, lead.location || lead.country || lead.city);
    if (!scheduleCheck.isWithinWindow) {
      return NextResponse.json({
        success: true,
        status: 'SCHEDULED',
        isOutsideSendingWindow: true,
        reason: scheduleCheck.reason,
        telemetry: {
          leadId: lead.id,
          companyName: lead.company_name,
          domain: lead.website.replace(/^https?:\/\//, '').split('/')[0],
          url: lead.website,
          status: 'SCHEDULED',
          code: scheduleCheck.reason || 'Scheduled — outside sending window',
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          retryAt: new Date(Date.now() + 60_000).toISOString(),
          isDryRun,
        },
      });
    }

    // 2. Server-Side Credit Pre-Check for Live Mode Submissions
    if (!isDryRun) {
      const wallet = CreditWalletService.getWallet(userId);
      if (wallet.totalCreditsAvailable < 1) {
        return NextResponse.json(
          {
            error: 'Credit balance exhausted. You have 0 credits available to process live submissions.',
            blocked: true,
            status: 'BLOCKED_NO_CREDITS',
            wallet,
          },
          { status: 402 }
        );
      }
    }

    const userAccount = AuthStore.getUserByEmail(userId);
    const userContactIdentity = userAccount
      ? {
          fullName: userAccount.name,
          replyEmail: userAccount.replyEmail || userAccount.email,
          phone: userAccount.phone,
          whatsApp: userAccount.whatsApp,
        }
      : undefined;

    // 3. Execute Real Lead Outreach Pipeline
    const startTime = Date.now();
    const result = await OutreachPipelineOrchestrator.processLead({
      lead,
      user_contact_identity: userContactIdentity,
      template,
      options: {
        dryRun: isDryRun,
        timeoutMs: options.timeoutMs || 20000,
        runtimeMode,
      },
    });

    const completedAt = result.completedAt || new Date().toISOString();
    const totalDurationMs = result.totalDurationMs || (Date.now() - startTime);

    // 3. Map pipeline finalStatus to standardized ContactReachout Statuses
    let campaignStatus: 'DELIVERED' | 'FAILED' | 'NO-FORM' | 'REVIEW' | 'DRY_RUN_COMPLETED' | 'UNREACHABLE' = 'FAILED';
    let diagnosticMessage = 'Form submission attempted';
    const discoveryError = result.discovery?.errorMessage || '';
    const isNavigationFailure =
      result.currentStage === 'CONTACT_PAGE_DISCOVERY' &&
      (result.discovery?.status === 'ERROR' ||
        /ERR_(NETWORK_ACCESS_DENIED|NAME_NOT_RESOLVED|CONNECTION|INTERNET_DISCONNECTED|TIMED_OUT)|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(discoveryError));

    if (result.finalStatus === 'SUCCESS') {
      const isVerifiedFormSubmission =
        result.discovery?.status === 'FOUND' &&
        Boolean(result.detection?.hasContactForm) &&
        (result.mapping?.status === 'READY_FOR_SUBMISSION' || (result.mapping?.status as string) === 'MAPPED') &&
        result.submission?.status === 'SUCCESS';

      if (isVerifiedFormSubmission) {
        campaignStatus = 'DELIVERED';
        diagnosticMessage = result.submission?.confirmationMessage || 'HTTP 200 - Form Submitted Successfully';
      } else {
        campaignStatus = 'FAILED';
        diagnosticMessage = result.submission?.errorMessage || 'Form verification failed — missing mandatory form fields or submission confirmation.';
      }
    } else if (result.finalStatus === 'DRY_RUN_COMPLETED') {
      campaignStatus = 'DRY_RUN_COMPLETED';
      diagnosticMessage = result.submission?.confirmationMessage || '[DRY RUN] Submission safely simulated';
    } else if (isNavigationFailure) {
      // A browser/DNS navigation failure happens before a contact page or form can
      // be inspected. It must never be reported as a form or submission failure.
      campaignStatus = 'UNREACHABLE';
      diagnosticMessage = discoveryError || 'Target website could not be reached before contact-page discovery.';
    } else if (result.finalStatus === 'NO_CONTACT_PAGE' || result.finalStatus === 'NO_FORM_DETECTED') {
      const isBrowserError =
        result.discovery?.status === 'ERROR' ||
        result.discovery?.errorCode === 'BROWSER_LAUNCH_FAILED' ||
        (result.discovery?.errorMessage && (
          result.discovery.errorMessage.includes('Executable doesn\'t exist') ||
          result.discovery.errorMessage.includes('browserType.launch') ||
          result.discovery.errorMessage.includes('playwright')
        ));

      if (isBrowserError) {
        campaignStatus = 'FAILED';
        diagnosticMessage = result.discovery?.errorMessage || 'EXECUTION_ERROR - Playwright browser executable missing or runtime error';
      } else {
        campaignStatus = 'NO-FORM';
        diagnosticMessage = result.discovery?.errorMessage || result.detection?.errorMessage || 'No usable public contact page or form detected';
      }
    } else if (
      result.finalStatus === 'CAPTCHA_DETECTED' ||
      result.finalStatus === 'REVIEW_REQUIRED' ||
      result.finalStatus === 'BLOCKED_SUPPRESSED'
    ) {
      campaignStatus = 'REVIEW';
      diagnosticMessage = 'Anti-bot protection, CAPTCHA, or uncertain field mapping detected';
    } else {
      campaignStatus = 'FAILED';
      diagnosticMessage =
        result.submission?.errorMessage ||
        result.discovery?.errorMessage ||
        result.detection?.errorMessage ||
        'Form handler request failed or timed out';
    }

    // 4. Perform Server-Side Credit Deduction ONLY on Successful Live Submission
    let creditDeduction = { success: true, cost: 0, source: 'NONE' };
    let updatedWallet = CreditWalletService.getWallet(userId);

    if (campaignStatus === 'DELIVERED' && !isDryRun) {
      const deduction = CreditWalletService.deductCredits(
        'FORM_SUBMITTED',
        campaignId,
        lead.id,
        lead.company_name,
        userId
      );
      creditDeduction = {
        success: deduction.success,
        cost: deduction.cost,
        source: deduction.source,
      };
      updatedWallet = deduction.wallet;
    }

    // 5. Construct Real Telemetry Log
    const telemetryLog = {
      leadId: lead.id,
      companyName: lead.company_name,
      domain: lead.website.replace(/^https?:\/\//, '').split('/')[0],
      // Keep the target domain separately, but never imply that a contact page
      // was reached when navigation stopped at discovery.
      url: isNavigationFailure ? 'NOT_CHECKED' : (result.discovery?.contactPageUrl || lead.website),
      websiteStatus: isNavigationFailure ? 'UNREACHABLE' : undefined,
      contactPageStatus: isNavigationFailure ? 'NOT_CHECKED' : undefined,
      formStatus: isNavigationFailure ? 'NOT_CHECKED' : result.detection?.selectedForm ? 'DETECTED' : undefined,
      fieldsDetected: isNavigationFailure ? 'NOT_CHECKED' : undefined,
      submissionStatus: isNavigationFailure ? 'NOT_ATTEMPTED' : undefined,
      successVerification: isNavigationFailure ? 'NOT_CHECKED' : undefined,
      techStack: result.detection?.selectedForm?.formSelector ? `Form (${result.detection.selectedForm.formSelector})` : 'NOT_DETECTED',
      domainAge: 'N/A',
      lastUpdated: 'N/A',
      status: campaignStatus,
      code: diagnosticMessage,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      startedAt: new Date(startTime).toISOString(),
      completedAt,
      durationMs: totalDurationMs,
      isDryRun,
    };

    return NextResponse.json({
      success: true,
      telemetry: telemetryLog,
      pipelineResult: result,
      creditDeduction,
      wallet: updatedWallet,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error processing campaign lead submission' },
      { status: 500 }
    );
  }
}
