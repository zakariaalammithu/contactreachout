import { NextResponse } from 'next/server';

interface ServerTemplate {
  id: string;
  ownerEmail: string;
  name: string;
  subject: string;
  body: string;
  category: 'initial' | 'followup' | 'general';
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory server store for API routes (per user isolation)
const inMemoryTemplatesStore: Map<string, ServerTemplate[]> = new Map();

function getOwnerTemplates(ownerEmail: string): ServerTemplate[] {
  const normalized = (ownerEmail || '').trim().toLowerCase();
  if (!normalized) return [];
  return inMemoryTemplatesStore.get(normalized) || [];
}

function setOwnerTemplates(ownerEmail: string, list: ServerTemplate[]): void {
  const normalized = (ownerEmail || '').trim().toLowerCase();
  if (!normalized) return;
  inMemoryTemplatesStore.set(normalized, list);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerEmail = searchParams.get('ownerEmail') || request.headers.get('x-user-email') || '';

    if (!ownerEmail) {
      return NextResponse.json({ error: 'Unauthorized: missing user identifier' }, { status: 401 });
    }

    const templates = getOwnerTemplates(ownerEmail);
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ownerEmail = body.ownerEmail || request.headers.get('x-user-email') || '';

    if (!ownerEmail) {
      return NextResponse.json({ error: 'Unauthorized: missing user identifier' }, { status: 401 });
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Template Name is required' }, { status: 400 });
    }

    if (!body.body || !body.body.trim()) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newTemplate: ServerTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ownerEmail: ownerEmail.trim().toLowerCase(),
      name: body.name.trim(),
      subject: (body.subject || '').trim(),
      body: body.body.trim(),
      category: body.category || 'general',
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const currentList = getOwnerTemplates(ownerEmail);
    currentList.unshift(newTemplate);
    setOwnerTemplates(ownerEmail, currentList);

    return NextResponse.json({ template: newTemplate }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const ownerEmail = body.ownerEmail || request.headers.get('x-user-email') || '';

    if (!ownerEmail || !body.id) {
      return NextResponse.json({ error: 'Unauthorized or missing template ID' }, { status: 400 });
    }

    const normalizedEmail = ownerEmail.trim().toLowerCase();
    const currentList = getOwnerTemplates(normalizedEmail);
    let updatedTemplate: ServerTemplate | null = null;

    const newList = currentList.map((tpl) => {
      if (tpl.id === body.id && tpl.ownerEmail === normalizedEmail) {
        updatedTemplate = {
          ...tpl,
          name: body.name !== undefined ? body.name.trim() : tpl.name,
          subject: body.subject !== undefined ? body.subject.trim() : tpl.subject,
          body: body.body !== undefined ? body.body : tpl.body,
          category: body.category || tpl.category,
          usageCount: body.usageCount !== undefined ? body.usageCount : tpl.usageCount,
          lastUsedAt: body.lastUsedAt || tpl.lastUsedAt,
          updatedAt: new Date().toISOString(),
        };
        return updatedTemplate;
      }
      return tpl;
    });

    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 404 });
    }

    setOwnerTemplates(normalizedEmail, newList);
    return NextResponse.json({ template: updatedTemplate });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ownerEmail = searchParams.get('ownerEmail') || request.headers.get('x-user-email') || '';

    if (!ownerEmail || !id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const normalizedEmail = ownerEmail.trim().toLowerCase();
    const currentList = getOwnerTemplates(normalizedEmail);
    const newList = currentList.filter((tpl) => !(tpl.id === id && tpl.ownerEmail === normalizedEmail));

    if (newList.length === currentList.length) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 404 });
    }

    setOwnerTemplates(normalizedEmail, newList);
    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
