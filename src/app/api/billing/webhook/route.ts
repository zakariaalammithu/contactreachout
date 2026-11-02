import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/services/stripe-service';
import { PaymentStore } from '@/lib/services/payment-store';
import { CreditWalletServerService as CreditWalletService } from '@/lib/services/credit-wallet-server-service';
import {
  normalizePurchaseType,
  isRenewalGrantable,
  computeRefundCredits,
  resolveExpectedAmountCents,
  isWebhookValidationError,
  webhookValidationError,
} from '@/lib/services/billing-webhook-policy';
import { recordStripePayment } from '@/lib/services/stripe-payment-record';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!StripeService.verifyWebhook(rawBody, request.headers.get('stripe-signature') || '')) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }
  let event: any = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  try {
    const type = event.type as string;
    const obj = event.data?.object;

    if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
      const checkout = obj;
      const purchaseType = normalizePurchaseType(checkout.metadata?.purchase_type);
      const period = checkout.metadata?.period === 'yearly' ? 'yearly' : 'monthly';
      const purchase =
        purchaseType === 'one_time'
          ? StripeService.getOneTimePurchase(Number(checkout.metadata?.credits))
          : StripeService.getPurchase(Number(checkout.metadata?.credits), period);
      // A subscription created from a configured Price ID was charged
      // Stripe's Price amount, not the table amount — compare against the
      // Price, or a legitimate payment is rejected. A Price fetch failure
      // is transient (throws → 5xx → Stripe retries).
      let priceUnitAmount: number | null = null;
      if (purchaseType === 'subscription' && purchase.priceId) {
        priceUnitAmount = await StripeService.getPriceUnitAmount(purchase.priceId);
      }
      const expected = resolveExpectedAmountCents({
        purchaseType,
        tableAmountCents: purchase.amountCents,
        oneTimeAmountCents: purchase.amountCents,
        priceUnitAmountCents: priceUnitAmount,
      });
      if (checkout.amount_total !== expected || !checkout.metadata?.user_id) {
        throw webhookValidationError('purchase validation failed');
      }
      if (!PaymentStore.get(checkout.id)) {
        PaymentStore.create({ sessionId: checkout.id, userId: checkout.metadata.user_id, credits: purchase.credits, amountCents: purchase.amountCents });
      }
      await recordStripePayment({
        sessionId: checkout.id,
        userId: checkout.metadata.user_id,
        credits: purchase.credits,
        amountCents: purchase.amountCents,
        status: 'pending',
        credited: false,
        stripeCustomerId: typeof checkout.customer === 'string' ? checkout.customer : undefined,
        purchaseType,
      });
      if (checkout.payment_status === 'paid') {
        const customerEmail = String(checkout.metadata?.user_email || checkout.customer_details?.email || checkout.customer_email || '').toLowerCase().trim();
        if (!customerEmail) throw webhookValidationError('customer identity is missing');
        await CreditWalletService.addPaidCreditsForServer(purchase.credits, checkout.id, customerEmail);
        PaymentStore.markPaid(checkout.id);
        await recordStripePayment({
          sessionId: checkout.id,
          userId: checkout.metadata.user_id,
          credits: purchase.credits,
          amountCents: purchase.amountCents,
          status: 'paid',
          credited: true,
          stripeCustomerId: typeof checkout.customer === 'string' ? checkout.customer : undefined,
          purchaseType,
        });
      }
    } else if (type === 'invoice.payment_succeeded') {
      const invoice = obj;
      if (isRenewalGrantable(invoice)) {
        // Renewal: the subscription's metadata (copied from the checkout
        // session that created it) is the trusted grant quantity.
        const subscription = await StripeService.request(`subscriptions/${encodeURIComponent(invoice.subscription)}`);
        const credits = Number(subscription.metadata?.credits);
        const subPurchaseType = normalizePurchaseType(subscription.metadata?.purchase_type);
        const email = String(invoice.customer_email || subscription.metadata?.user_email || '').toLowerCase().trim();
        if (!Number.isSafeInteger(credits) || credits <= 0 || subPurchaseType !== 'subscription' || !email) {
          console.warn('[billing-webhook] renewal skipped: subscription lacks credit metadata or payer email.', {
            invoiceId: invoice.id,
            subscription: invoice.subscription,
          });
        } else {
          await CreditWalletService.addRenewalCreditsForServer(credits, invoice.id, email);
          await recordStripePayment({
            sessionId: invoice.id,
            userId: String(subscription.metadata?.user_id || email),
            credits,
            amountCents: typeof invoice.amount_paid === 'number' ? invoice.amount_paid : 0,
            status: 'paid',
            credited: true,
            stripeCustomerId: typeof invoice.customer === 'string' ? invoice.customer : undefined,
            purchaseType: 'subscription',
          });
        }
      }
      // subscription_create invoices are the already-credited first payment;
      // update/manual invoices are prorations, not new grants. Both are
      // acknowledged without credit movement.
    } else if (type === 'invoice.payment_failed') {
      console.warn('[billing-webhook] subscription invoice payment failed (no credits moved).', {
        invoiceId: obj?.id,
        subscription: obj?.subscription,
      });
    } else if (type === 'customer.subscription.deleted') {
      console.warn('[billing-webhook] subscription cancelled (no credits moved; future renewals stop automatically).', {
        subscription: obj?.id,
        customer: obj?.customer,
      });
    } else if (type === 'charge.refunded') {
      const charge = obj;
      const refunds = Array.isArray(charge.refunds?.data) ? charge.refunds.data : [];
      // Stripe lists refunds newest-first; each refund fires its own event,
      // and the per-refund idempotency key makes any reprocessing safe.
      const latestRefund = refunds[0];
      if (!latestRefund?.id) {
        console.warn('[billing-webhook] refund event without a refund record; acknowledged.', { chargeId: charge.id });
      } else {
        // Attribute the charge to its checkout session via the payment
        // intent (charges from Checkout carry no credit metadata themselves).
        let session: any = null;
        if (charge.payment_intent) {
          const list = await StripeService.request(
            `checkout/sessions?payment_intent=${encodeURIComponent(charge.payment_intent)}&limit=1`,
          );
          session = list?.data?.[0] || null;
        }
        if (!session?.id) {
          console.warn('[billing-webhook] refund unattributed (not a Checkout payment); acknowledged.', {
            chargeId: charge.id,
            refundId: latestRefund.id,
          });
        } else {
          const grant = await CreditWalletService.getPurchaseGrantBySession(session.id);
          const granted = grant?.credits || Number(session.metadata?.credits) || 0;
          const email = String(session.metadata?.user_email || charge.billing_details?.email || '').toLowerCase().trim();
          if (!granted || !email) {
            console.warn('[billing-webhook] refund unattributed (no grant or payer email); acknowledged.', {
              chargeId: charge.id,
              refundId: latestRefund.id,
              sessionId: session.id,
            });
          } else {
            const refundCredits = computeRefundCredits({
              chargeAmountCents: Number(charge.amount) || 0,
              refundedAmountCents: Number(latestRefund.amount) || 0,
              grantedCredits: granted,
            });
            if (refundCredits > 0) {
              const result = await CreditWalletService.recordRefundForServer(refundCredits, latestRefund.id, session.id, email);
              if (result.shortfall > 0) {
                console.error('[billing-webhook] refund shortfall needs admin review.', {
                  refundId: latestRefund.id,
                  sessionId: session.id,
                  shortfall: result.shortfall,
                });
              }
            }
          }
        }
      }
    } else if (type === 'checkout.session.async_payment_failed' || type === 'checkout.session.expired') {
      PaymentStore.markFailed(obj?.id);
      if (obj?.id) {
        await recordStripePayment({
          sessionId: obj.id,
          userId: String(obj.metadata?.user_id || ''),
          credits: Number(obj.metadata?.credits) || 0,
          amountCents: typeof obj.amount_total === 'number' ? obj.amount_total : 0,
          status: 'failed',
          credited: false,
          stripeCustomerId: typeof obj.customer === 'string' ? obj.customer : undefined,
          purchaseType: normalizePurchaseType(obj.metadata?.purchase_type),
        });
      }
    }
    // Unknown event types are acknowledged: Stripe may send events this app
    // does not act on, and ignoring them is correct.
    return NextResponse.json({ received: true });
  } catch (error) {
    if (isWebhookValidationError(error)) {
      return NextResponse.json({ error: 'Webhook purchase validation failed.' }, { status: 400 });
    }
    console.error('[billing-webhook] processing failed (Stripe will retry).', {
      eventType: event?.type,
      eventId: event?.id,
      objectId: event?.data?.object?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Webhook could not be processed.' }, { status: 500 });
  }
}
