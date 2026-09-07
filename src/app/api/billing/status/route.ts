import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { StripeService } from '@/lib/services/stripe-service';
import { PaymentStore } from '@/lib/services/payment-store';

export async function GET(request: NextRequest) {
  const user = SessionManager.getSessionFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId || !sessionId.startsWith('cs_')) return NextResponse.json({ error: 'Invalid checkout session.' }, { status: 400 });
  try {
    const checkout = await StripeService.request(`checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (checkout.client_reference_id !== user.userId || checkout.metadata?.user_id !== user.userId) return NextResponse.json({ error: 'Checkout session does not belong to this account.' }, { status: 403 });
    const purchase = StripeService.getPurchase(Number(checkout.metadata?.credits), checkout.metadata?.period === 'yearly' ? 'yearly' : 'monthly');
    if (checkout.amount_total !== purchase.amountCents) return NextResponse.json({ error: 'Payment amount validation failed.' }, { status: 409 });
    let record = PaymentStore.get(sessionId) || PaymentStore.create({ sessionId, userId: user.userId, credits: purchase.credits, amountCents: purchase.amountCents });
    if (checkout.payment_status === 'paid') record = PaymentStore.markPaid(sessionId) || record;
    return NextResponse.json({ status: record.status, credited: record.credited, credits: record.credits });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payment status could not be verified.' }, { status: 400 });
  }
}
