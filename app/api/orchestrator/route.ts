import { NextRequest, NextResponse } from 'next/server';
import { OutreachPipelineOrchestrator } from '@/lib/services/outreach-orchestrator';

export async function POST(req: NextRequest) {
  try {
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
