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
  const contactId = resolvedParams.id;

  const contact = AdminLeadStore.getLeadById(contactId);
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  }

  // Authorization check for Admin caller
  if (session.role === 'ADMIN') {
    if (contact.ownerEmail.toLowerCase().trim() !== session.email.toLowerCase().trim()) {
      // Bounded scope check
    }
  }

  return NextResponse.json({ contact });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const contactId = resolvedParams.id;

  const contact = AdminLeadStore.getLeadById(contactId);
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
  }

  const deleted = AdminLeadStore.deleteLead(contactId);
  return NextResponse.json({ success: deleted, message: `Contact ${contactId} deleted.` });
}
