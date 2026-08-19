import { NextRequest, NextResponse } from 'next/server';
import { mapLeadToFormFields } from '@/lib/services/field-mapper';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { detectedFields, leadData, renderedMessage, options } = body;

    if (!detectedFields || !Array.isArray(detectedFields)) {
      return NextResponse.json(
        { error: 'Missing or invalid detectedFields array' },
        { status: 400 }
      );
    }

    if (!leadData || typeof leadData !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid leadData object' },
        { status: 400 }
      );
    }

    if (!renderedMessage || typeof renderedMessage !== 'object') {
      return NextResponse.json(
        { error: 'Missing renderedMessage object (subject and body)' },
        { status: 400 }
      );
    }

    const result = mapLeadToFormFields(
      detectedFields,
      leadData,
      renderedMessage,
      options || {}
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error during field mapping' },
      { status: 500 }
    );
  }
}
