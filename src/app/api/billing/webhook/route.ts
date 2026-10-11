import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/services/stripe-service';
import { PaymentStore } from '@/lib/services/payment-store';
import { CreditWalletService } from '@/lib/services/credit-wallet-service';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!StripeService.verifyWebhook(rawBody, request.headers.get('stripe-signature') || '')) return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  try {
    const event = JSON.parse(rawBody);
    const checkout = event.data?.object;
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const purchase = StripeService.getPurchase(Number(checkout.metadata?.credits), checkout.metadata?.period === 'yearly' ? 'yearly' : 'monthly');
      if (checkout.amount_total !== purchase.amountCents || !checkout.metadata?.user_id) throw new Error('Webhook purchase validation failed.');
      if (!PaymentStore.get(checkout.id)) PaymentStore.create({ sessionId: checkout.id, userId: checkout.metadata.user_id, credits: purchase.credits, amountCents: purchase.amountCents });
      if (checkout.payment_status === 'paid') {
        const customerEmail = String(checkout.metadata?.user_email || checkout.customer_details?.email || checkout.customer_email || '').toLowerCase().trim();
        if (!customerEmail) throw new Error('Webhook customer identity is missing.');
        await CreditWalletService.addPaidCreditsForServer(purchase.credits, checkout.id, customerEmail);
        PaymentStore.markPaid(checkout.id);
      }
    } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') PaymentStore.markFailed(checkout.id);
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: 'Webhook could not be processed.' }, { status: 400 }); }
}
