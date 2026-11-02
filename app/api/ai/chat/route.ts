import { NextResponse } from 'next/server';
import { generateText, stepCountIs } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { prisma } from '../../../../lib/prisma';
import { ChatInputError, MAX_OUTPUT_TOKENS, MAX_TOOL_STEPS, SYSTEM_PROMPT, validateMessages } from '../../../../lib/ai/chat-core';
import { makeFlightTool, normalizeFlight } from '../../../../lib/ai/flight-tool';

export const maxDuration = 30; // seconds; must stay above the model timeout below

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Chat is not configured' }, { status: 503 });

  let messages;
  try {
    messages = validateMessages(await request.json());
  } catch (e) {
    const msg = e instanceof ChatInputError ? e.message : 'Invalid JSON body';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const flightCards: ReturnType<typeof normalizeFlight>[] = [];
  const searchFlights = async ({ from, to, date }: { from: string; to: string; date: string }) => {
    const rows = await prisma.flight.findMany({
      where: { from, to, departureTime: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } },
      include: { seats: { where: { status: 'AVAILABLE' } } },
      take: 5,
    });
    flightCards.push(...rows.map(normalizeFlight));
    return rows;
  };

  try {
    const deepseek = createDeepSeek({ apiKey });
    const result = await generateText({
      model: deepseek('deepseek-chat'),
      system: SYSTEM_PROMPT,
      messages,
      tools: { searchFlights: makeFlightTool(searchFlights) },
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(25_000),
    });
    return NextResponse.json({ reply: result.text, flights: flightCards, usage: result.totalUsage ?? result.usage });
  } catch {
    return NextResponse.json({ error: 'The assistant is unavailable right now' }, { status: 502 });
  }
}
