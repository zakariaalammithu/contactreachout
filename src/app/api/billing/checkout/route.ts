import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { StripeService } from '@/lib/services/stripe-service';
import { PaymentStore } from '@/lib/services/payment-store';
import { recordStripePayment } from '@/lib/services/stripe-payment-record';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const { credits, period, purchaseType, idempotencyKey } = await request.json();
    // Both models are supported. Legacy callers (no purchaseType) keep the
    // previous subscription behavior; one-time packs are opt-in.
    const type = purchaseType === 'one_time' ? 'one_time' : 'subscription';
    const selectedPeriod: 'monthly' | 'yearly' = period === 'yearly' ? 'yearly' : 'monthly';

    // Server-side single source of truth price & charge calculation.
    // One-time packs price from the monthly table and never use a
    // configured Price ID (price_data always, so the charged amount is
    // exactly the table amount).
    const purchase =
      type === 'one_time'
        ? StripeService.getOneTimePurchase(Number(credits))
        : StripeService.getPurchase(Number(credits), selectedPeriod);
    const origin = new URL(request.url).origin;

    const params = new URLSearchParams({
      mode: type === 'one_time' ? 'payment' : 'subscription',
      success_url: `${origin}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?status=cancelled&credits=${purchase.credits}&period=${purchase.period}&type=${type}`,
      client_reference_id: session.userId,
      customer_email: session.email,
      'metadata[user_id]': session.userId,
      'metadata[user_email]': session.email,
      'metadata[credits]': String(purchase.credits),
      'metadata[amount_cents]': String(purchase.amountCents),
      'metadata[period]': purchase.period,
      'metadata[purchase_type]': type,
      'line_items[0][quantity]': '1',
    });

    if (type === 'subscription') {
      params.set('metadata[interval]', purchase.interval);
      if (purchase.priceId) {
        params.set('line_items[0][price]', purchase.priceId);
      } else {
        params.set('line_items[0][price_data][currency]', 'usd');
        params.set('line_items[0][price_data][unit_amount]', String(purchase.amountCents));
        params.set('line_items[0][price_data][product_data][name]', `ContactReachout ${purchase.planName} Plan (${purchase.period === 'yearly' ? 'Annual' : 'Monthly'})`);
        params.set('line_items[0][price_data][recurring][interval]', purchase.interval);
      }
    } else {
      params.set('line_items[0][price_data][currency]', 'usd');
      params.set('line_items[0][price_data][unit_amount]', String(purchase.amountCents));
      params.set('line_items[0][price_data][product_data][name]', `ContactReachout ${purchase.planName} One-time Credit Pack`);
    }

    // Client-generated intent key (one per checkout page load): a refresh
    // or retry of the same intent reuses the same Stripe session instead
    // of creating a second chargeable session.
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (typeof idempotencyKey === 'string' && idempotencyKey.length > 0 && idempotencyKey.length <= 255) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const stripeSession = await StripeService.request('checkout/sessions', {
      method: 'POST',
      headers,
      body: params,
    });

    PaymentStore.create({
      sessionId: stripeSession.id,
      userId: session.userId,
      credits: purchase.credits,
      amountCents: purchase.amountCents,
    });
    // Durable record (best-effort; never blocks checkout).
    await recordStripePayment({
      sessionId: stripeSession.id,
      userId: session.userId,
      credits: purchase.credits,
      amountCents: purchase.amountCents,
      status: 'pending',
      credited: false,
      purchaseType: type,
    });

    return NextResponse.json({
      url: stripeSession.url,
      amount: purchase.amountCents / 100,
      period: purchase.period,
      interval: purchase.interval,
      purchaseType: type,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout could not be started.' },
      { status: 400 }
    );
  }
}
