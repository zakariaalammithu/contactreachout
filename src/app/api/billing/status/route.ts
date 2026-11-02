import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { StripeService } from '@/lib/services/stripe-service';
import { PaymentStore } from '@/lib/services/payment-store';
import { CreditWalletServerService as CreditWalletService } from '@/lib/services/credit-wallet-server-service';
import { normalizePurchaseType, resolveExpectedAmountCents } from '@/lib/services/billing-webhook-policy';
import { recordStripePayment } from '@/lib/services/stripe-payment-record';

export async function GET(request: NextRequest) {
  const user = SessionManager.getSessionFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId || !sessionId.startsWith('cs_')) return NextResponse.json({ error: 'Invalid checkout session.' }, { status: 400 });
  try {
    const checkout = await StripeService.request(`checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (checkout.client_reference_id !== user.userId || checkout.metadata?.user_id !== user.userId) return NextResponse.json({ error: 'Checkout session does not belong to this account.' }, { status: 403 });
    const purchaseType = normalizePurchaseType(checkout.metadata?.purchase_type);
    const period = checkout.metadata?.period === 'yearly' ? 'yearly' : 'monthly';
    const purchase =
      purchaseType === 'one_time'
        ? StripeService.getOneTimePurchase(Number(checkout.metadata?.credits))
        : StripeService.getPurchase(Number(checkout.metadata?.credits), period);
    // Same Price-aware rule as the webhook: a subscription created from a
    // configured Price ID was charged Stripe's Price amount.
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
    if (checkout.amount_total !== expected) return NextResponse.json({ error: 'Payment amount validation failed.' }, { status: 409 });
    let record = PaymentStore.get(sessionId) || PaymentStore.create({ sessionId, userId: user.userId, credits: purchase.credits, amountCents: purchase.amountCents });
    await recordStripePayment({
      sessionId,
      userId: user.userId,
      credits: purchase.credits,
      amountCents: purchase.amountCents,
      status: 'pending',
      credited: false,
      stripeCustomerId: typeof checkout.customer === 'string' ? checkout.customer : undefined,
      purchaseType,
    });
    if (checkout.payment_status === 'paid') {
      await CreditWalletService.addPaidCreditsForServer(purchase.credits, sessionId, user.email);
      record = PaymentStore.markPaid(sessionId) || record;
      await recordStripePayment({
        sessionId,
        userId: user.userId,
        credits: purchase.credits,
        amountCents: purchase.amountCents,
        status: 'paid',
        credited: true,
        stripeCustomerId: typeof checkout.customer === 'string' ? checkout.customer : undefined,
        purchaseType,
      });
    }
    return NextResponse.json({ status: record.status, credited: record.credited, credits: record.credits });
  } catch (error) {
    // Transient failures (Stripe fetch, DB) surface as 500 with a generic
    // message; the detail is logged server-side, never leaked to the client.
    console.error('[billing-status] verification failed.', {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Payment status could not be verified.' }, { status: 500 });
  }
}
