import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AdminLeadStore } from '@/lib/services/admin-lead-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const leadId = resolvedParams.id;

  const lead = AdminLeadStore.getLeadById(leadId);
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  // Authorization check
  if (session.role === 'ADMIN') {
    if (lead.ownerEmail.toLowerCase().trim() !== session.email.toLowerCase().trim()) {
      // Unless granted multi-tenant permission
    }
  }

  return NextResponse.json({ lead });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const leadId = resolvedParams.id;

  const lead = AdminLeadStore.getLeadById(leadId);
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const deleted = AdminLeadStore.deleteLead(leadId);
  return NextResponse.json({ success: deleted, message: `Lead ${leadId} deleted.` });
}
