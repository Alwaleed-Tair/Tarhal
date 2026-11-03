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
    });
    return NextResponse.json({ success: true, reply: result.text || '…', flights, hotels, cars, searchedWeb: sources.length > 0, usage: result.totalUsage ?? result.usage }, { headers });
  } catch (e) {
    if (e instanceof AiConfigError) return fail('AI_NOT_CONFIGURED', 'The assistant is not configured yet.', 503);
    return fail('AI_UNAVAILABLE', 'The assistant could not answer right now. Please try again.', 502);
  }
}
