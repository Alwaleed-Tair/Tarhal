import { NextResponse } from 'next/server.js';
import { getCurrentUser } from '../auth.ts';
import { jsonObject } from '../auth-http.ts';
import { AiConfigError, chatModel } from './model.ts';
import { GuideInputError, GuideOutputError } from './guides.ts';
import { aiRequester, aiTimeoutMs, isTimeout, logAiUsage, takeAiRequest, tooManyRequests } from './limits.ts';

const headers = { 'Cache-Control': 'no-store' };
const fail = (status: number, code: string, error: string, field?: string) => NextResponse.json({ success: false, code, error, ...(field && { field }) }, { status, headers });

type Usage = { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;

/**
 * POST handler for a structured AI answer (destination guide, itinerary): checks the body, applies the per-user limit (429),
 * runs the model with a time limit and maps every failure to a friendly JSON error. Answers are labelled aiGenerated.
 * `cacheKey` lets identical requests (same city and language) reuse a recent answer for an hour without calling the model.
 */
export function structuredAiRoute<I, O>(opts: {
  route: string;
  parse: (body: Record<string, unknown> | null) => I;
  run: (input: I, ctx: { model: ReturnType<typeof chatModel>; abortSignal: AbortSignal }) => Promise<{ data: O; usage: Usage }>;
  cacheKey?: (input: I) => string;
}) {
  const cache = new Map<string, { at: number; data: O }>();
  return async function POST(request: Request) {
    const started = Date.now();
    let input: I;
    try { input = opts.parse(await jsonObject(request)); }
    catch (e) { return e instanceof GuideInputError ? fail(400, 'INVALID_FIELD', e.message, e.field) : fail(400, 'INVALID_BODY', 'Send a valid JSON object'); }

    const user = await getCurrentUser().catch(() => null);
    const who = aiRequester(request, user?.id);
    const wait = takeAiRequest(who.key, who.kind);
    if (wait !== null) return tooManyRequests(wait);

    const key = opts.cacheKey?.(input);
    const hit = key ? cache.get(key) : undefined;
    if (hit && Date.now() - hit.at < 60 * 60 * 1000) return NextResponse.json({ success: true, aiGenerated: true, cached: true, data: hit.data }, { headers });

    try {
      const { data, usage } = await opts.run(input, { model: chatModel(), abortSignal: AbortSignal.timeout(aiTimeoutMs()) });
      logAiUsage(opts.route, who.kind, usage, started);
      if (key) { cache.set(key, { at: Date.now(), data }); if (cache.size > 200) cache.delete(cache.keys().next().value as string); }
      return NextResponse.json({ success: true, aiGenerated: true, data }, { headers });
    } catch (e) {
      logAiUsage(opts.route, who.kind, undefined, started, { failed: e instanceof Error ? e.name : 'unknown' });
      if (e instanceof AiConfigError) return fail(503, 'AI_NOT_CONFIGURED', 'The assistant is not configured yet.');
      if (isTimeout(e)) return fail(504, 'AI_TIMEOUT', 'The assistant took too long to answer. Please try again.');
      if (e instanceof GuideOutputError || (e as { name?: string })?.name === 'AI_NoObjectGeneratedError') return fail(502, 'AI_BAD_OUTPUT', 'The assistant could not prepare this right now. Please try again.');
      return fail(502, 'AI_UNAVAILABLE', 'The assistant could not answer right now. Please try again.');
    }
  };
}
