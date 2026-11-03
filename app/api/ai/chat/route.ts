import { NextResponse } from 'next/server.js';
import { generateText, isStepCount } from 'ai';
import { AiConfigError, chatModel } from '../../../../lib/ai/model.ts';
import { MAX_OUTPUT_TOKENS, systemPrompt } from '../../../../lib/ai/prompt.ts';
import { parseMessages } from '../../../../lib/ai/messages.ts';
import { flightTool, type FlightCard } from '../../../../lib/ai/flights.ts';
import { catalogTools, type CarCard, type HotelCard } from '../../../../lib/ai/catalog.ts';
import { webSearchEnabled, webTool, type WebSource } from '../../../../lib/ai/web.ts';

const headers = { 'Cache-Control': 'no-store' };

function fail(code: string, error: string, status: number) {
  return NextResponse.json({ success: false, error, code }, { status, headers });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const messages = parseMessages(body);
  if (typeof messages === 'string') return fail('INVALID_MESSAGE', messages, 400);

  const flights: FlightCard[] = [], hotels: HotelCard[] = [], cars: CarCard[] = [], sources: WebSource[] = [];
  try {
    const result = await generateText({
      model: chatModel(),
      system: systemPrompt(new Date().toISOString().slice(0, 10)),
      messages,
      tools: { ...flightTool(flights), ...catalogTools(hotels, cars), ...(webSearchEnabled() ? webTool(sources) : {}) },
      stopWhen: isStepCount(4),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.5, // fewer odd word choices than the default
      // The provider enables DeepSeek 'thinking' by default for V4 models: slower, costlier, and it ignores temperature.
      // Off for a fast chat; set TARHAL_THINKING=true to turn it on.
      providerOptions: { deepseek: { thinking: { type: process.env.TARHAL_THINKING === 'true' ? 'enabled' : 'disabled' } } },
    });
    // A reply cut by the token limit must say so instead of ending mid-sentence.
    const cut = result.finishReason === 'length';
    const toolsUsed = (result.steps ?? []).flatMap((st: any) => (st.toolCalls ?? []).map((c: any) => c.toolName));
    const reply = (result.text || '…') + (cut ? '\n\n[انقطع الرد بسبب الطول — اكتب «كمّل» وأكمله / reply cut off — type "continue"]' : '');
    return NextResponse.json({ success: true, reply, truncated: cut, toolsUsed, flights, hotels, cars, searchedWeb: sources.length > 0, usage: result.totalUsage ?? result.usage }, { headers });
  } catch (e) {
    if (e instanceof AiConfigError) return fail('AI_NOT_CONFIGURED', 'The assistant is not configured yet.', 503);
    return fail('AI_UNAVAILABLE', 'The assistant could not answer right now. Please try again.', 502);
  }
}
