import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SystemSettingsService } from '@/lib/services/system-settings-service';
import { getAdminSetting, setAdminSetting } from '@/lib/services/admin-settings-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  // Durable store wins when available; otherwise the in-memory service
  // (with an honest durable:false flag so the page can warn).
  const stored = await getAdminSetting<Record<string, unknown>>('system.settings');
  const settings = stored.available && stored.value
    ? { ...SystemSettingsService.getSettings(), ...stored.value }
    : SystemSettingsService.getSettings();
  return NextResponse.json({
    settings,
    userRole: session.role,
    durable: stored.available,
    durableError: stored.available ? undefined : stored.error,
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const previous = SystemSettingsService.getSettings();
    const result = SystemSettingsService.updateSettings(
      body,
      session.role,
      session.email
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update system settings.' },
        { status: 400 }
      );
    }

    // Fail closed: persist durably first; roll the in-memory change
    // back if the table is missing so no fake "saved" state lingers.
    const saved = await setAdminSetting('system.settings', result.settings);
    if (!saved.ok) {
      SystemSettingsService.updateSettings(previous, session.role, session.email);
      return NextResponse.json(
        { error: saved.error || 'System settings could not be saved durably.' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      message: 'System settings saved successfully.',
      settings: result.settings,
      durable: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error while saving settings.' },
      { status: 500 }
    );
  }
}
