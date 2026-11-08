import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { CreditWalletServerService as CreditWalletService } from '@/lib/services/credit-wallet-server-service';
import { OutreachPipelineOrchestrator } from '@/lib/services/outreach-orchestrator';
import { isVerifiedFormSubmission } from '@/lib/services/submission-verification';
import { validateSendingSchedule } from '@/lib/services/processing-controls-service';

import { AuthStore } from '@/lib/auth/auth-store';
import { resolvePersistenceContext } from '@/lib/persistence/identity';
import { ensureCampaignReplyLink } from '@/lib/services/campaign-reply-link';
import { getSendingAccess } from '@/lib/services/subscription-service';
import { resolveAccountIdentity } from '@/lib/services/profile-contact-service';
import { parseCampaignSenderIdentity, resolveCampaignSenderIdentity } from '@/lib/services/campaign-sender-identity';
import { isSendingPaused } from '@/lib/services/killswitch';

export async function POST(req: NextRequest) {
  try {
    const session = SessionManager.getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    // Same fix as validate-start: the session token is HMAC-signed and
    // self-contained, so its email is the authenticated identity. Requiring
    // an in-memory AuthStore record with a matching id 401'd every
    // self-registered user on any serverless instance other than the one
    // that created their account — after they had already passed
    // validate-start. The registry is consulted only for suspension (and
    // for the contact identity below, which already tolerates a missing
    // account).
    const userAccount = AuthStore.getUserByEmail(session.email);
    if (userAccount?.isSuspended) return NextResponse.json({ error: 'Account is suspended.' }, { status: 403 });
    const userId = session.email;

    const body = await req.json();
    const { campaignId, campaignName, lead, template, options = {}, senderIdentity: rawCampaignIdentity } = body;

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

    // 0. Emergency killswitch (live mode only): when an admin has paused
    // sending, defer the lead like an out-of-window schedule instead of
    // failing it — the client runner treats SCHEDULED as non-terminal
    // and retries later. Dry-run previews do not send, so they pass.
    if (!isDryRun && isSendingPaused()) {
      return NextResponse.json({
        success: true,
        status: 'SCHEDULED',
        isSendingPaused: true,
        reason: 'Sending paused by admin (emergency killswitch)',
        telemetry: {
          leadId: lead.id,
          companyName: lead.company_name,
          domain: lead.website.replace(/^https?:\/\//, '').split('/')[0],
          url: lead.website,
          status: 'SCHEDULED',
          code: 'SENDING_PAUSED',
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          retryAt: new Date(Date.now() + 60_000).toISOString(),
          isDryRun,
        },
      });
    }

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
      // Subscription-expiry gate (owner decision 2026-11-02): a user whose
      // paid subscription expired with no active subscription left cannot
      // send live. Free users (no row) and one-time buyers (no row) pass.
      // Dry runs are previews — no delivery, no credits — so they pass.
      const access = await getSendingAccess(userId);
      if (access.blocked) {
        return NextResponse.json(
          {
            error: access.reason,
            blocked: true,
            status: 'BLOCKED_SUBSCRIPTION_EXPIRED',
          },
          { status: 402 },
        );
      }
      const wallet = await CreditWalletService.getWalletForServer(userId);
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

    // Sender identity: the account default (AuthStore first, durable
    // app_users row second), layered with this campaign's own override
    // when the runner sent one. A campaign field wins only for that
    // field; an empty or unparseable campaign value falls back to the
    // account value. The campaign identity is never written back to
    // the account — editing it in the editor changes this campaign
    // only. `senderIdentitySource` is recorded in telemetry so a run
    // can always be traced to the identity it used.
    const accountIdentity = await resolveAccountIdentity(session.email, userAccount);
    const campaignIdentity = parseCampaignSenderIdentity(rawCampaignIdentity);
    const { identity: effectiveIdentity, source: senderIdentitySource } = resolveCampaignSenderIdentity(
      campaignIdentity,
      accountIdentity,
    );
    const userContactIdentity =
      effectiveIdentity.fullName || effectiveIdentity.replyEmail || effectiveIdentity.phone || effectiveIdentity.whatsApp
        ? {
            fullName: effectiveIdentity.fullName,
            replyEmail: effectiveIdentity.replyEmail,
            phone: effectiveIdentity.phone,
            whatsApp: effectiveIdentity.whatsApp,
          }
        : undefined;

    // 2b. Start-time durable lead registration (BEFORE the pipeline).
    // The worker's dynamic allow-list verifies targets against Supabase
    // app_campaign_leads/app_leads — but editor-uploaded leads live only
    // in the browser until now, so every new domain failed verification
    // with 400 (or WORKER_UNAVAILABLE at the detect stage) on its FIRST
    // run. Registering here, awaited before any worker call, makes the
    // first run pass verification. This also preserves the reply-link
    // guarantee (a live-processed prospect must be registered or its
    // reply can never match). Best-effort and never throwing: if
    // Supabase is unavailable the pipeline still runs and fails honestly.
    // Dry runs register too: dry-run detection still calls the worker,
    // so previews need the same authorization, and an unsent lead can
    // never attract a reply (the link is idempotent, so a later live
    // run to the same domain reuses it).
    try {
      const persistenceContext = await resolvePersistenceContext(req);
      await ensureCampaignReplyLink(persistenceContext, {
        clientCampaignId: campaignId,
        campaignName: typeof campaignName === 'string' ? campaignName : undefined,
        lead,
      });
    } catch {
      // Outreach result stands on its own; the worker may still refuse
      // the target, and that failure surfaces honestly downstream.
    }

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

    // (No post-pipeline registration anymore: the start-time block above
    // already registered this lead before any worker call.)

    const completedAt = result.completedAt || new Date().toISOString();
    const totalDurationMs = result.totalDurationMs || (Date.now() - startTime);

    // 3. Map pipeline finalStatus to standardized ContactReachout Statuses
    let campaignStatus: 'DELIVERED' | 'FAILED' | 'NO-FORM' | 'REVIEW' | 'DRY_RUN_COMPLETED' | 'UNREACHABLE' | 'WORKER_UNAVAILABLE' = 'FAILED';
    let diagnosticMessage = 'Form submission attempted';
    const discoveryError = result.discovery?.errorMessage || '';
    const isNavigationFailure =
      result.currentStage === 'CONTACT_PAGE_DISCOVERY' &&
      (result.discovery?.errorCode !== 'BROWSER_RUNTIME_UNAVAILABLE' &&
        (result.discovery?.status === 'ERROR' ||
          /ERR_(NETWORK_ACCESS_DENIED|NAME_NOT_RESOLVED|CONNECTION|INTERNET_DISCONNECTED|TIMED_OUT)|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(discoveryError)));

    if (result.finalStatus === 'SUCCESS') {
      const verifiedFormSubmission = isVerifiedFormSubmission({
        discovery: result.discovery,
        detection: result.detection,
        mapping: result.mapping,
        submission: result.submission,
      });

      if (verifiedFormSubmission) {
        campaignStatus = 'DELIVERED';
        diagnosticMessage = result.submission?.confirmationMessage || 'HTTP 200 - Form Submitted Successfully';
      } else {
        campaignStatus = 'FAILED';
        // The old fallback blamed missing fields for every unverified
        // submission, but verification can fail AFTER a real submit (the
        // site accepted the message yet showed no matching confirmation).
        // Only blame fields when mapping itself was not ready; otherwise
        // say plainly that verification failed and the message may still
        // have been received.
        if (result.submission?.errorMessage) {
          diagnosticMessage = result.submission.errorMessage;
        } else if (result.mapping?.status !== 'READY_FOR_SUBMISSION' && (result.mapping?.status as string) !== 'MAPPED') {
          diagnosticMessage = 'Form verification failed — missing mandatory form fields or submission confirmation.';
        } else {
          const code = (result.submission as { diagnosticCode?: string } | undefined)?.diagnosticCode;
          diagnosticMessage = `Form was submitted but delivery could not be verified from the confirmation page${code ? ` (${code})` : ''} — the message may still have been received; check the site's inbox.`;
        }
      }
    } else if (result.finalStatus === 'DRY_RUN_COMPLETED') {
      campaignStatus = 'DRY_RUN_COMPLETED';
      diagnosticMessage = result.submission?.confirmationMessage || '[DRY RUN] Submission safely simulated';
    } else if (result.finalStatus === 'WORKER_UNAVAILABLE') {
      // Terminal, NOT a missing form: the worker was configured but
      // could not check any candidate page. That includes genuine
      // outages AND allow-list refusals at the detect stage (any failed
      // worker detect counts as unavailable), so the text must not
      // claim an outage definitively. Kept out of NO-FORM so the report
      // never blames the prospect's site, and terminal so the client
      // runner does not retry it forever.
      campaignStatus = 'WORKER_UNAVAILABLE';
      diagnosticMessage = 'WORKER_UNAVAILABLE: The configured browser worker could not check any candidate page — it was unreachable, or it refused the target (allow-list). This is not a missing form on the target site.';
    } else if (isNavigationFailure) {
      // A browser/DNS navigation failure happens before a contact page or form can
      // be inspected. It must never be reported as a form or submission failure.
      campaignStatus = 'UNREACHABLE';
      diagnosticMessage = discoveryError || 'Target website could not be reached before contact-page discovery.';
    } else if (result.finalStatus === 'NO_CONTACT_PAGE' || result.finalStatus === 'NO_FORM_DETECTED') {
      const isBrowserError =
        result.discovery?.status === 'ERROR' ||
        result.discovery?.errorCode === 'BROWSER_LAUNCH_FAILED' ||
        result.discovery?.errorCode === 'BROWSER_RUNTIME_UNAVAILABLE' ||
        (result.discovery?.errorMessage && (
          result.discovery.errorMessage.includes('Executable doesn\'t exist') ||
          result.discovery.errorMessage.includes('browserType.launch') ||
          result.discovery.errorMessage.includes('playwright')
        ));

      if (isBrowserError) {
        campaignStatus = 'FAILED';
        diagnosticMessage = result.discovery?.errorCode === 'BROWSER_RUNTIME_UNAVAILABLE'
          ? `BROWSER_RUNTIME_UNAVAILABLE: ${result.discovery?.errorMessage || 'A configured remote browser worker is required for this campaign.'}`
          : result.discovery?.errorMessage || 'EXECUTION_ERROR - Playwright browser executable missing or runtime error';
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
      // Preserve the specific reason when the pipeline recorded one
      // (e.g. a duplicate-submission hold), so the report does not hide
      // an uncertain outcome behind a generic anti-bot message.
      diagnosticMessage =
        result.submission?.errorMessage ||
        result.mapping?.reason ||
        result.detection?.errorMessage ||
        'Anti-bot protection, CAPTCHA, or uncertain field mapping detected';
    } else {
      campaignStatus = 'FAILED';
      diagnosticMessage =
        result.submission?.errorMessage ||
        result.discovery?.errorMessage ||
        result.detection?.errorMessage ||
        'Form handler request failed or timed out';
    }

    // Alternative-only leads: no form exists, but a public contact
    // option was found. The lead stays NO-FORM (never Delivered) and
    // the option is flagged for manual review — the system never
    // auto-sends to an email or WhatsApp number.
    if (campaignStatus === 'NO-FORM' && result.alternativeContact) {
      const alt = result.alternativeContact;
      const parts = [
        ...alt.emails.map((e) => `email ${e}`),
        ...alt.phones.map((p) => `phone ${p}`),
        ...alt.whatsapp.map((w) => `WhatsApp ${w}`),
      ];
      if (parts.length > 0) {
        diagnosticMessage += ` Public contact found (${parts.join(', ')}) — manual review only; not auto-sent (no authorized email/WhatsApp integration).`;
      }
    }

    // 4. Perform Server-Side Credit Deduction ONLY on Successful Live Submission
    let creditDeduction = { success: true, cost: 0, source: 'NONE' };
    let creditDeductionFailed = false;
    let updatedWallet = await CreditWalletService.getWalletForServer(userId);

    if (campaignStatus === 'DELIVERED' && !isDryRun) {
      const deduction = await CreditWalletService.deductCreditsForServer(
        // PricingService only charges the canonical verified-success outcome.
        // Other terminal states (dry run, CAPTCHA, missing form, failure) never
        // enter this branch and therefore cannot consume a credit.
        'SUCCESSFUL_SUBMISSION',
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
      if (!deduction.success) {
        // DELIVERED but no credit recorded (e.g. the balance was exhausted
        // by parallel campaigns between the pre-check and this deduction).
        // The delivery is honest — it happened — but the ledger gap must be
        // visible, not silently free. Do not write a zero-amount ledger row.
        console.warn('[process] DELIVERED without a credit deduction (balance race).', {
          campaignId,
          leadId: lead.id,
          userId,
        });
        creditDeductionFailed = true;
      }
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
      discoveryMethod: result.discovery?.discoveryMethod || 'N/A',
      contactMethodType: (() => {
        const purpose = result.detection?.formPurpose;
        if (purpose === 'contact') return 'Official Business Contact Form';
        if (purpose === 'inquiry') return 'Business Inquiry Form';
        if (purpose === 'sales') return 'Sales Inquiry Form';
        if (purpose === 'quote') return 'Request a Quote Form';
        if (purpose === 'appointment') return 'Appointment / Consultation Form';
        if (result.alternativeContact?.emails.length) return 'Official Public Business Email';
        if (result.alternativeContact?.whatsapp.length) return 'WhatsApp Business Contact';
        if (result.alternativeContact?.phones.length) return 'Other Verified Business Contact';
        return result.detection?.selectedForm ? 'Contact Form' : 'N/A';
      })(),
      contactOption: (() => {
        if (result.detection?.selectedForm) return `Form (${result.detection.selectedForm.formSelector})`;
        const alt = result.alternativeContact;
        if (alt) {
          const parts = [
            ...alt.emails.map((e) => `Email: ${e}`),
            ...alt.phones.map((p) => `Phone: ${p}`),
            ...alt.whatsapp.map((w) => `WhatsApp: ${w}`),
          ];
          if (parts.length > 0) return parts.join(', ');
        }
        return 'N/A';
      })(),
      domainAge: 'N/A',
      lastUpdated: 'N/A',
      status: campaignStatus,
      // Surface a failed credit deduction in the visible telemetry code
      // (item 27): previously only a server console.warn recorded it, so
      // a DELIVERED lead looked fully settled while no credit was taken.
      code: creditDeductionFailed ? `${diagnosticMessage} [CREDIT_DEDUCTION_FAILED]` : diagnosticMessage,
      senderIdentitySource,
      workerDown: campaignStatus === 'WORKER_UNAVAILABLE' ? true : undefined,
      creditDeductionFailed: creditDeductionFailed ? true : undefined,
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
