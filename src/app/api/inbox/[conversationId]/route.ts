import { NextRequest, NextResponse } from 'next/server';
import { isDurableInboxEnabled } from '@/lib/services/durable-inbox-feature';
import { PersistenceAuthorizationError, resolvePersistenceContext } from '@/lib/persistence/identity';
import { getInboxConversation, setInboxConversationState } from '@/lib/persistence/inbox-conversation-repository';

const actions = new Set(['mark_read', 'mark_unread', 'archive', 'unarchive']);
const unavailable = () => NextResponse.json({ error: 'Durable Inbox is disabled.' }, { status: 404 });
const failure = (error: unknown) => NextResponse.json({ error: error instanceof PersistenceAuthorizationError ? 'Authentication is required.' : 'Inbox is unavailable.' }, { status: error instanceof PersistenceAuthorizationError ? 401 : 503 });

export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  if (!isDurableInboxEnabled()) return unavailable();
  try { const data = await getInboxConversation(await resolvePersistenceContext(request), params.conversationId); return data ? NextResponse.json(data) : NextResponse.json({ error: 'Conversation was not found.' }, { status: 404 }); } catch (error) { return failure(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: { conversationId: string } }) {
  if (!isDurableInboxEnabled()) return unavailable();
  try { const body = await request.json(); if (!body || typeof body.action !== 'string' || !actions.has(body.action)) return NextResponse.json({ error: 'Invalid Inbox action.' }, { status: 400 }); const state = await setInboxConversationState(await resolvePersistenceContext(request), params.conversationId, body.action); return state ? NextResponse.json({ state }) : NextResponse.json({ error: 'Conversation was not found.' }, { status: 404 }); } catch (error) { return failure(error); }
}
