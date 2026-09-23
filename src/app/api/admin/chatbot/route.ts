import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { ChatbotService, DEFAULT_CHATBOT_PROMPT } from '@/lib/services/chatbot-service';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    return NextResponse.json({
      success: true,
      prompt: ChatbotService.getPrompt(),
      defaultPrompt: DEFAULT_CHATBOT_PROMPT,
      metadata: ChatbotService.getMetadata(),
      maxCharacters: 5000,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve chatbot configuration.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { prompt, action, testMessage } = body;

    // 1. Action: Test Chatbot Response
    if (action === 'test_chatbot') {
      if (!testMessage || typeof testMessage !== 'string' || !testMessage.trim()) {
        return NextResponse.json(
          { error: 'Valid test query is required.' },
          { status: 400 }
        );
      }

      const result = await ChatbotService.answer(testMessage.trim());

      AuditLogService.log({
        userId: session.userId,
        userEmail: session.email,
        action: 'chatbot_test_query_run',
        resourceType: 'integration_chatbot',
        metadata: { query: testMessage.trim(), providerUsed: result.providerUsed },
      });

      return NextResponse.json({
        success: true,
        answer: result.answer,
        needsSupport: result.needsSupport,
        providerUsed: result.providerUsed,
      });
    }

    // 2. Action: Save Chatbot System Prompt
    if (typeof prompt !== 'string' || prompt.trim().length < 50) {
      return NextResponse.json(
        { error: 'Chatbot instructions must be at least 50 characters long to ensure comprehensive knowledge.' },
        { status: 400 }
      );
    }

    if (prompt.trim().length > 5000) {
      return NextResponse.json(
        { error: 'Chatbot instructions exceed maximum allowed limit of 5,000 characters.' },
        { status: 400 }
      );
    }

    ChatbotService.setPrompt(prompt, session.email);

    AuditLogService.log({
      userId: session.userId,
      userEmail: session.email,
      action: 'chatbot_instructions_updated',
      resourceType: 'integration_chatbot',
      metadata: { promptLength: prompt.trim().length },
    });

    return NextResponse.json({
      success: true,
      message: 'Chatbot instructions saved successfully.',
      metadata: ChatbotService.getMetadata(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save chatbot instructions.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
