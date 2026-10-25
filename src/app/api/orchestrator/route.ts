

import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/auth/session';
import { AuthStore } from '@/lib/auth/auth-store';
import { OutreachPipelineOrchestrator } from '@/lib/services/outreach-orchestrator';

export async function POST(req: NextRequest) {
  try {
    // This endpoint can trigger live outreach, so it must never run
    // unauthenticated. Previously it accepted any caller with no session,
    // credit, or suspension check at all.
    const session = SessionManager.getSessionFromRequest(req);
    if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const userAccount = AuthStore.getUserByEmail(session.email);
    if (!userAccount || userAccount.id !== session.userId) {
      return NextResponse.json({ error: 'Authenticated account could not be verified.' }, { status: 401 });
    }
    if (userAccount.isSuspended) return NextResponse.json({ error: 'Account is suspended.' }, { status: 403 });

    const body = await req.json();
    const { lead, template, options } = body;

    if (!lead || !lead.website || !lead.company_name) {
      return NextResponse.json(
        { error: 'Missing required lead details (website, company_name)' },
        { status: 400 }
      );
    }

    if (!template || !template.bodyTemplate) {
      return NextResponse.json(
        { error: 'Missing required template details (bodyTemplate)' },
        { status: 400 }
      );
    }

    const result = await OutreachPipelineOrchestrator.processLead({
      lead,
      template,
      options: options || { dryRun: true },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error in Outreach Pipeline' },
      { status: 500 }
    );
  }
}
