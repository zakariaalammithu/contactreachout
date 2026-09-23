import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AdminSubmissionStore } from '@/lib/services/admin-submission-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const subId = resolvedParams.id;

  const submission = AdminSubmissionStore.getSubmissionById(subId);
  if (!submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  // Authorization scope check
  if (session.role === 'ADMIN') {
    if (submission.ownerEmail.toLowerCase().trim() !== session.email.toLowerCase().trim()) {
      // Permission boundary
    }
  }

  return NextResponse.json({ submission });
}
