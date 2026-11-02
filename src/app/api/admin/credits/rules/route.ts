import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { PricingService, DEFAULT_PRICING_CONFIG } from '@/lib/services/pricing-service';
import { getAdminSetting, setAdminSetting } from '@/lib/services/admin-settings-service';

export async function GET(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const stored = await getAdminSetting<Record<string, unknown>>('pricing.creditRules');
    const creditRules = stored.available && stored.value
      ? { ...PricingService.getPricingConfig().creditRules, ...stored.value }
      : PricingService.getPricingConfig().creditRules;
    return NextResponse.json({
      success: true,
      creditRules,
      durable: stored.available,
      durableError: stored.available ? undefined : stored.error,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve credit rules.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const rules = body.rules || body.creditRules;

    if (!rules || typeof rules !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: "rules" object is required.' },
        { status: 400 }
      );
    }

    const validKeys = Object.keys(DEFAULT_PRICING_CONFIG.creditRules);
    
    // Server-side strict validation
    for (const [key, rule] of Object.entries(rules as Record<string, any>)) {
      if (!validKeys.includes(key)) {
        return NextResponse.json(
          { error: `Unauthorized rule modification: Unknown outcome key "${key}".` },
          { status: 400 }
        );
      }

      const cost = Number(rule.creditCost);
      if (isNaN(cost)) {
        return NextResponse.json(
          { error: `Invalid cost value for "${key}": Must be a valid number.` },
          { status: 400 }
        );
      }

      if (cost < 0) {
        return NextResponse.json(
          { error: `Invalid cost value for "${key}": Negative values are strictly prohibited.` },
          { status: 400 }
        );
      }
    }

    const previousRules = PricingService.getPricingConfig().creditRules;
    const updatedConfig = PricingService.updateCreditRules(rules);

    // Fail closed: persist durably; if the table is missing, roll the
    // in-memory change back and report honestly instead of claiming a
    // save that will not survive.
    const saved = await setAdminSetting('pricing.creditRules', updatedConfig.creditRules);
    if (!saved.ok) {
      PricingService.updateCreditRules(previousRules);
      return NextResponse.json(
        { error: saved.error || 'Credit rules could not be saved durably.' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credit rules updated successfully. Changes apply strictly to future transactions.',
      creditRules: updatedConfig.creditRules,
      durable: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update credit rules.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
