import { NextResponse } from 'next/server.js';
import { generateText } from 'ai';
import { AiConfigError, chatModel } from '../../../../lib/ai/model.ts';

// Day 1 (2/11): minimal endpoint. Day 2 adds the Saudi-context system prompt,
// history in the request and the message/token limits.
const headers = { 'Cache-Control': 'no-store' };

function fail(code: string, error: string, status: number) {
  return NextResponse.json({ success: false, error, code }, { status, headers });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const message = body && typeof body === 'object' ? (body as Record<string, unknown>).message : undefined;
  if (typeof message !== 'string' || !message.trim()) {
    return fail('INVALID_MESSAGE', 'Send a JSON body like {"message": "..."}.', 400);
  }
  try {
    const result = await generateText({ model: chatModel(), prompt: message.trim(), maxOutputTokens: 700 });
    return NextResponse.json({ success: true, reply: result.text, usage: result.usage }, { headers });
  } catch (e) {
    if (e instanceof AiConfigError) return fail('AI_NOT_CONFIGURED', 'The assistant is not configured yet.', 503);
    return fail('AI_UNAVAILABLE', 'The assistant could not answer right now. Please try again.', 502);
  }
}
