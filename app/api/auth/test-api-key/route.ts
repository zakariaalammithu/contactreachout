import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, apiKey, stripeMode } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
      return NextResponse.json({ valid: false, message: 'Please enter a valid API key string.' }, { status: 400 });
    }

    const key = apiKey.trim();

    // 1. Resend API Server Verification
    if (provider === 'resend') {
      try {
        const res = await fetch('https://api.resend.com/domains', {
          headers: { 'Authorization': `Bearer ${key}` },
        });
        const data = await res.json();

        if (res.ok || res.status === 200 || Array.isArray(data?.data)) {
          return NextResponse.json({ valid: true, message: '🟢 Verified! Resend API key is 100% valid & live.' });
        } else {
          return NextResponse.json({
            valid: false,
            message: `❌ Resend Server Error: ${data.message || 'API key rejected by Resend'}`,
          });
        }
      } catch (err: any) {
        return NextResponse.json({ valid: false, message: `❌ Resend Ping Error: ${err.message}` });
      }
    }

    // 2. OpenAI API Server Verification
    if (provider === 'openai') {
      try {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
        });
        const data = await res.json();

        if (res.ok || res.status === 200) {
          return NextResponse.json({ valid: true, message: '🟢 Verified! OpenAI API key is 100% valid & live.' });
        } else {
          return NextResponse.json({
            valid: false,
            message: `❌ OpenAI Error: ${data.error?.message || 'Invalid API key'}`,
          });
        }
      } catch (err: any) {
        return NextResponse.json({ valid: false, message: `❌ OpenAI Ping Error: ${err.message}` });
      }
    }

    // 3. Stripe API Server Verification
    if (provider === 'stripe') {
      try {
        const res = await fetch('https://api.stripe.com/v1/balance', {
          headers: { 'Authorization': `Bearer ${key}` },
        });
        const data = await res.json();

        if (res.ok || res.status === 200) {
          return NextResponse.json({ valid: true, message: `🟢 Verified! Stripe API key is 100% valid & live.` });
        } else {
          return NextResponse.json({
            valid: false,
            message: `❌ Stripe Error: ${data.error?.message || 'Invalid Secret Key'}`,
          });
        }
      } catch (err: any) {
        return NextResponse.json({ valid: false, message: `❌ Stripe Ping Error: ${err.message}` });
      }
    }

    // Default Format Fallback
    if (key.length >= 15) {
      return NextResponse.json({ valid: true, message: '🟢 API Key saved & ready.' });
    }

    return NextResponse.json({ valid: false, message: 'Unrecognized provider' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ valid: false, message: `Server error: ${err.message}` }, { status: 500 });
  }
}
