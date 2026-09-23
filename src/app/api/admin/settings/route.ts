import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { SystemSettingsService } from '@/lib/services/system-settings-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const settings = SystemSettingsService.getSettings();
  return NextResponse.json({
    settings,
    userRole: session.role,
  });
}

export async function POST(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
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

    return NextResponse.json({
      message: 'System settings saved successfully.',
      settings: result.settings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error while saving settings.' },
      { status: 500 }
    );
  }
}
