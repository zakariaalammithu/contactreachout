import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';
import { OutreachPipelineOrchestrator } from '@/lib/services/outreach-orchestrator';
import { validateSendingSchedule } from '@/lib/services/processing-controls-service';

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

    const isDryRun = Boolean(options.dryRun);

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
          status: 'UNCONTACTED',
          code: scheduleCheck.reason || 'Scheduled — outside sending window',
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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

    // 3. Execute Real Lead Outreach Pipeline
    const startTime = Date.now();
    const result = await OutreachPipelineOrchestrator.processLead({
      lead,
      template,
      options: {
        dryRun: isDryRun,
        timeoutMs: options.timeoutMs || 20000,
      },
    });

    const completedAt = result.completedAt || new Date().toISOString();
    const totalDurationMs = result.totalDurationMs || (Date.now() - startTime);

    // 3. Map pipeline finalStatus to standardized ContactReachout Statuses
    let campaignStatus: 'DELIVERED' | 'FAILED' | 'NO-FORM' | 'REVIEW' | 'DRY_RUN_COMPLETED' = 'FAILED';
    let diagnosticMessage = 'Form submission attempted';

    if (result.finalStatus === 'SUCCESS') {
      campaignStatus = 'DELIVERED';
      diagnosticMessage = result.submission?.confirmationMessage || 'HTTP 200 - Form Submitted Successfully';
    } else if (result.finalStatus === 'DRY_RUN_COMPLETED') {
      campaignStatus = 'DRY_RUN_COMPLETED';
      diagnosticMessage = result.submission?.confirmationMessage || '[DRY RUN] Submission safely simulated';
    } else if (result.finalStatus === 'NO_CONTACT_PAGE' || result.finalStatus === 'NO_FORM_DETECTED') {
      campaignStatus = 'NO-FORM';
      diagnosticMessage = 'No usable public contact page or form detected';
    } else if (
      result.finalStatus === 'CAPTCHA_DETECTED' ||
      result.finalStatus === 'REVIEW_REQUIRED' ||
      result.finalStatus === 'BLOCKED_SUPPRESSED'
    ) {
      campaignStatus = 'REVIEW';
      diagnosticMessage = 'Anti-bot protection, CAPTCHA, or uncertain field mapping detected';
    } else {
      campaignStatus = 'FAILED';
      diagnosticMessage = result.submission?.errorMessage || 'Form handler request failed or timed out';
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
      url: result.discovery?.contactPageUrl || lead.website,
      techStack: result.detection?.selectedForm?.formSelector ? `Form (${result.detection.selectedForm.formSelector})` : 'HTML Form',
      domainAge: 'Verified Active Domain',
      lastUpdated: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
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
