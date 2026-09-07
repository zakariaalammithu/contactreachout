import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { StripeService } from '@/lib/services/stripe-service';
import { PaymentStore } from '@/lib/services/payment-store';

export async function POST(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { credits, period } = await request.json();
    const selectedPeriod = period === 'yearly' ? 'yearly' : 'monthly';
    const purchase = StripeService.getPurchase(Number(credits), selectedPeriod);
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams({ mode: 'payment', success_url: `${origin}/checkout?status=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/checkout?status=cancelled&credits=${purchase.credits}`, client_reference_id: session.userId, customer_email: session.email, 'metadata[user_id]': session.userId, 'metadata[credits]': String(purchase.credits), 'metadata[amount_cents]': String(purchase.amountCents), 'metadata[period]': purchase.period, 'payment_intent_data[metadata][user_id]': session.userId, 'payment_intent_data[metadata][credits]': String(purchase.credits), 'payment_intent_data[metadata][period]': purchase.period, 'line_items[0][quantity]': '1' });
    if (purchase.priceId) params.set('line_items[0][price]', purchase.priceId);
    else {
      params.set('line_items[0][price_data][currency]', 'usd');
      params.set('line_items[0][price_data][unit_amount]', String(purchase.amountCents));
      params.set('line_items[0][price_data][product_data][name]', `${purchase.credits.toLocaleString()} ContactReachout credits`);
    }
    const stripeSession = await StripeService.request('checkout/sessions', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
    PaymentStore.create({ sessionId: stripeSession.id, userId: session.userId, credits: purchase.credits, amountCents: purchase.amountCents });
    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout could not be started.' }, { status: 400 });
  }
}
