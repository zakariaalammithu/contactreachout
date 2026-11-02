import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { SecretManager } from '@/lib/security/secret-manager';
import { ResendProvider } from '@/lib/services/email/resend-provider';
import { NotificationService } from '@/lib/services/notification-service';
import {
  getExpiringSubscriptions,
  getRenewalPreference,
  hasReminderBeenSent,
  recordReminder,
  subscriptionsTablesAvailable,
} from '@/lib/services/subscription-service';
import {
  getDaysRemaining,
  reminderIdempotencyKey,
} from '@/lib/services/subscription-policy';

export const dynamic = 'force-dynamic';

const REMINDER_DAYS = 5;

/**
 * Daily subscription renewal reminders.
 *
 * Vercel Cron invokes this via GET; manual runs may POST. Auth is a
 * Bearer CRON_SECRET (set in Vercel env; Vercel Cron sends its own
 * secret the same way). Without a configured secret the job refuses to
 * run — an unauthenticated reminder run must never exist.
 *
 * Safety rules (from the brief):
 *  - Only subscriptions expiring within 5 days, still active.
 *  - One reminder per (subscription x period end): the UNIQUE
 *    idempotency key is the dedupe, checked before sending.
 *  - If the reminders table is missing (migration unapplied), the whole
 *    run skips: sending without a dedupe record would repeat daily.
 *  - Opted-out users (notification_preferences.renewal_reminders = false)
 *    are skipped, never emailed.
 *  - Per-user failures never fail the whole run; a failed user simply
 *    has no reminder row and is retried the next day while still in
 *    the window.
 */
async function runReminders(request: NextRequest) {
  const configuredSecret =
    SecretManager.getSecret('CRON_SECRET') || process.env.CRON_SECRET || '';
  if (!configuredSecret) {
    return NextResponse.json({ error: 'Reminder job is not configured.' }, { status: 500 });
  }
  const presented = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const presentedHash = createHash('sha256').update(presented).digest();
  const expectedHash = createHash('sha256').update(configuredSecret).digest();
  if (
    presented.length === 0 ||
    presentedHash.length !== expectedHash.length ||
    !timingSafeEqual(presentedHash, expectedHash)
  ) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!(await subscriptionsTablesAvailable())) {
    console.warn('[subscription-reminders] skipped: subscription tables missing (migration not applied).');
    return NextResponse.json({
      skipped: true,
      reason: 'Subscription tables are not available; no reminders sent.',
      sent: 0,
    });
  }

  const origin = new URL(request.url).origin;
  const expiring = await getExpiringSubscriptions(REMINDER_DAYS);
  const provider = new ResendProvider();
  let sent = 0;
  let skippedDuplicate = 0;
  let skippedOptout = 0;
  const failed: Array<{ email: string; error: string }> = [];

  for (const sub of expiring) {
    const email = sub.userEmail;
    try {
      const daysLeft = getDaysRemaining(sub.currentPeriodEnd);
      if (daysLeft === null || daysLeft <= 0 || daysLeft > REMINDER_DAYS) continue;
      if (!(await getRenewalPreference(email))) {
        skippedOptout++;
        continue;
      }
      const key = reminderIdempotencyKey(sub.id, sub.currentPeriodEnd as string, 'expiry_5d');
      if (await hasReminderBeenSent(key)) {
        skippedDuplicate++;
        continue;
      }
      const daysText = daysLeft === 1 ? '1 day' : `${daysLeft} days`;
      const subject = `Your ContactReachout subscription expires in ${daysText}`;
      const message =
        daysLeft === 5
          ? 'Your subscription will expire in 5 days. Please renew your plan to continue enjoying ContactReachout without interruption.'
          : `Your subscription will expire in ${daysText}. Please renew your plan to continue enjoying ContactReachout without interruption.`;
      const result = await provider.sendEmail({
        to: email,
        subject,
        text: `${message}\n\nRenew here: ${origin}/pricing`,
        html: `<p>${message}</p><p><a href="${origin}/pricing">Renew your plan</a></p>`,
      });
      if (!result.success) {
        throw new Error(result.errorMessage || 'Email send failed.');
      }
      const recorded = await recordReminder({
        subscriptionId: sub.id,
        periodEnd: sub.currentPeriodEnd as string,
        reminderType: 'expiry_5d',
        daysLeft,
        channel: 'email',
      });
      if (!recorded) {
        // A concurrent run recorded it first: the email above may have
        // duplicated once in that exact race. Log it; the key bounds any
        // repeat to this single race, never daily.
        console.warn('[subscription-reminders] reminder raced with a concurrent run.', { email, key });
      }
      // In-app copy is best-effort: the recipient may not exist in this
      // instance's in-memory registry, and that must never fail the email.
      try {
        NotificationService.dispatchNotification({
          recipientScope: 'SPECIFIC_USER',
          recipientUserId: email,
          title: 'Subscription expiring soon',
          message,
          sentBy: { id: 'system', email: 'system@contactreachout.com', name: 'ContactReachout' },
        });
      } catch (inAppError) {
        console.warn('[subscription-reminders] in-app copy skipped.', {
          email,
          error: inAppError instanceof Error ? inAppError.message : String(inAppError),
        });
      }
      sent++;
    } catch (error) {
      // No reminder row was written, so the next daily run retries while
      // the subscription is still inside the window.
      failed.push({ email, error: error instanceof Error ? error.message : String(error) });
      console.error('[subscription-reminders] failed for user, continuing.', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    sent,
    skippedDuplicate,
    skippedOptout,
    failed,
    checked: expiring.length,
  });
}

export async function GET(request: NextRequest) {
  return runReminders(request);
}

export async function POST(request: NextRequest) {
  return runReminders(request);
}
