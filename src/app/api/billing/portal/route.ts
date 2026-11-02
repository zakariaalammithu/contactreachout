import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { StripeService } from '@/lib/services/stripe-service';

export const dynamic = 'force-dynamic';

/**
 * Stripe billing portal (subscription cancellation + payment management).
 * Resolves the Stripe customer by the account's email — no customer id
 * needs to have been stored at checkout. Returns the hosted portal URL;
 * the user cancels inside Stripe, and customer.subscription.deleted
 * webhooks record the cancellation (no credits move on cancel).
 */
export async function POST(request: NextRequest) {
  const session = SessionManager.getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const customers = await StripeService.request(`customers?email=${encodeURIComponent(session.email)}&limit=1`);
    const customerId = customers?.data?.[0]?.id;
    if (!customerId) {
      return NextResponse.json({ error: 'No Stripe customer found for this account yet.' }, { status: 404 });
    }
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams({
      customer: customerId,
      return_url: `${origin}/credits`,
    });
    const portal = await StripeService.request('billing_portal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!portal?.url) throw new Error('Billing portal could not be created.');
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error('[billing-portal] creation failed.', {
      userId: session.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Billing portal could not be opened.' }, { status: 500 });
  }
}
