import { NextRequest, NextResponse } from 'next/server';
import { ChatbotService } from '@/lib/services/chatbot-service';
export async function POST(request: NextRequest) {
  try { const body = await request.json(); const question = typeof body.question === 'string' ? body.question.trim().slice(0, 4000) : ''; if (!question) return NextResponse.json({ error:'Enter a question.' }, {status:400}); const result=await ChatbotService.answer(question, Array.isArray(body.history)?body.history:[]); if(result.needsSupport) await ChatbotService.forwardUnknown(question, Array.isArray(body.history)?body.history:[]); return NextResponse.json(result); } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'Assistant unavailable.'},{status:503}); }
}
