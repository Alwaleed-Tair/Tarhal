import { NextResponse } from 'next/server.js';
import { generateText, isStepCount } from 'ai';
import { AiConfigError, chatModel } from '../../../../lib/ai/model.ts';
import { MAX_OUTPUT_TOKENS, systemPrompt } from '../../../../lib/ai/prompt.ts';
import { parseMessages } from '../../../../lib/ai/messages.ts';
import { flightTool, type FlightCard } from '../../../../lib/ai/flights.ts';
import { catalogTools, type CarCard, type HotelCard } from '../../../../lib/ai/catalog.ts';
import { isArabicOrEnglish, LANGUAGE_FALLBACK } from '../../../../lib/ai/language.ts';
import { forceWebSearch } from '../../../../lib/ai/policy.ts';
import { webSearchEnabled, webTool, type WebSource } from '../../../../lib/ai/web.ts';
import { aiRequester, aiTimeoutMs, isTimeout, logAiUsage, takeAiRequest, tooManyRequests } from '../../../../lib/ai/limits.ts';
import { getCurrentUser } from '../../../../lib/auth.ts';

const headers = { 'Cache-Control': 'no-store' };

function fail(code: string, error: string, status: number) {
  return NextResponse.json({ success: false, error, code }, { status, headers });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const messages = parseMessages(body);
  if (typeof messages === 'string') return fail('INVALID_MESSAGE', messages, 400);

  // Guests can chat too (general travel questions); everyone is limited per user or per IP (429).
  const started = Date.now();
  const user = await getCurrentUser().catch(() => null);
  const who = aiRequester(request, user?.id);
  const wait = takeAiRequest(who.key, who.kind);
  if (wait !== null) return tooManyRequests(wait);
  const abortSignal = AbortSignal.timeout(aiTimeoutMs());

  const flights: FlightCard[] = [], hotels: HotelCard[] = [], cars: CarCard[] = [], sources: WebSource[] = [];
  const run = (force: boolean) => generateText({
      model: chatModel(),
      abortSignal,
      system: systemPrompt(new Date().toISOString().slice(0, 10)),
      messages,
      tools: { ...flightTool(flights), ...catalogTools(hotels, cars), ...(webSearchEnabled() ? webTool(sources) : {}) },
      stopWhen: isStepCount(4),
      // The route (not only the prompt) makes sure live-info questions and empty Tarhal results reach the web.
      prepareStep: force ? (({ stepNumber, steps }: any) => forceWebSearch({ stepNumber, steps, userText: messages.at(-1)!.content, enabled: webSearchEnabled() }) as any) : undefined,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.5, // fewer odd word choices than the default
      // The provider enables DeepSeek 'thinking' by default for V4 models: slower, costlier, and it ignores temperature.
      // Off for a fast chat; set TARHAL_THINKING=true to turn it on.
      providerOptions: { deepseek: { thinking: { type: process.env.TARHAL_THINKING === 'true' ? 'enabled' : 'disabled' } } },
    });
  try {
    let result;
    try { result = await run(true); }
    catch (e: any) {
      // If the provider ignores a forced tool call, answer without forcing instead of failing the user.
      if (e?.name !== 'AI_ToolChoiceViolationError') throw e;
      console.warn('[ai] forced webSearch was ignored by the model; retrying without forcing');
      flights.length = hotels.length = cars.length = sources.length = 0;
      result = await run(false);
    }
    // A reply cut by the token limit must say so instead of ending mid-sentence.
    const cut = result.finishReason === 'length';
    const toolsUsed = (result.steps ?? []).flatMap((st: any) => (st.toolCalls ?? []).map((c: any) => c.toolName));
    const blocked = !isArabicOrEnglish(result.text);
    const reply = blocked ? LANGUAGE_FALLBACK : (result.text || '…') + (cut ? '\n\n[انقطع الرد بسبب الطول — اكتب «كمّل» وأكمله / reply cut off — type "continue"]' : '');
    logAiUsage('chat', who.kind, result.totalUsage ?? result.usage, started, { tools: toolsUsed.length, truncated: cut });
    return NextResponse.json({ success: true, reply, truncated: cut && !blocked, toolsUsed, languageBlocked: blocked, flights, hotels, cars, searchedWeb: sources.length > 0, usage: result.totalUsage ?? result.usage }, { headers });
  } catch (e) {
    // Only the error name: provider messages can echo the user's text.
    console.error('[ai] chat failed:', e instanceof Error ? e.name : 'unknown');
    logAiUsage('chat', who.kind, undefined, started, { failed: e instanceof Error ? e.name : 'unknown' });
    if (isTimeout(e)) return fail('AI_TIMEOUT', 'The assistant took too long to answer. Please try again.', 504);
    if (e instanceof AiConfigError) return fail('AI_NOT_CONFIGURED', 'The assistant is not configured yet.', 503);
    return fail('AI_UNAVAILABLE', 'The assistant could not answer right now. Please try again.', 502);
  }
}
