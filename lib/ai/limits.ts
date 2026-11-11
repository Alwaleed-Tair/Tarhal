import { NextResponse } from 'next/server.js';

/**
 * Per-user request limit for the AI routes (chat, destination guide, itinerary), shared by all three.
 * Logged-in users are counted by user id, guests by IP address. Defaults: 30 requests per 10 minutes for a user,
 * 10 for a guest; change with TARHAL_AI_LIMIT_USER, TARHAL_AI_LIMIT_GUEST and TARHAL_AI_LIMIT_WINDOW_MS.
 *
 * Kept in memory (no table in the schema for it): each server instance counts on its own and the count resets on restart.
 */
const windowMs = () => Number(process.env.TARHAL_AI_LIMIT_WINDOW_MS) || 10 * 60 * 1000;
const limitFor = (kind: 'user' | 'guest') =>
  kind === 'user' ? Number(process.env.TARHAL_AI_LIMIT_USER) || 30 : Number(process.env.TARHAL_AI_LIMIT_GUEST) || 10;

const hits = new Map<string, number[]>();

/** Records one request for `key`. Returns null when allowed, or the seconds to wait when over the limit. */
export function takeAiRequest(key: string, kind: 'user' | 'guest', now = Date.now()): number | null {
  const window = windowMs();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < window);
  if (recent.length >= limitFor(kind)) {
    hits.set(key, recent);
    return Math.max(1, Math.ceil((recent[0] + window - now) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, list] of hits) if (!list.some((at) => now - at < window)) hits.delete(k);
  return null;
}

/** For tests. */
export const resetAiLimits = () => hits.clear();

/** Who is asking: the user id when logged in, otherwise the client IP. */
export function aiRequester(request: Request, userId: string | null | undefined) {
  if (userId) return { key: `user:${userId}`, kind: 'user' as const };
  // Netlify sets x-nf-client-connection-ip itself, so a client cannot fake it the way it can prepend X-Forwarded-For.
  const h = request.headers;
  const ip = h.get('x-nf-client-connection-ip')?.trim() || h.get('x-real-ip')?.trim() || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  return { key: `ip:${ip}`, kind: 'guest' as const };
}

export function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { success: false, code: 'RATE_LIMITED', error: 'Too many assistant requests. Please wait a few minutes and try again.', retryAfter },
    { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) } },
  );
}

/** Time limit for one AI request (default 30 s, TARHAL_AI_TIMEOUT_MS). */
export const aiTimeoutMs = () => Number(process.env.TARHAL_AI_TIMEOUT_MS) || 30_000;

type Usage = { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;

/**
 * One log line per AI request with token counts only: no message text, no user id, no IP.
 * Example: [ai] usage {"route":"chat","who":"guest","inputTokens":939,"outputTokens":265,"totalTokens":1204,"ms":2310}
 */
export function logAiUsage(route: string, who: 'user' | 'guest', usage: Usage, startedAt: number, extra: Record<string, string | number | boolean> = {}) {
  console.info('[ai] usage', JSON.stringify({
    route, who, inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null, totalTokens: usage?.totalTokens ?? null,
    ms: Date.now() - startedAt, ...extra,
  }));
}

/** True when the error is our time limit running out. */
export const isTimeout = (error: unknown) => {
  const name = (error as { name?: string })?.name;
  return name === 'TimeoutError' || name === 'AbortError' || (error as { cause?: { name?: string } })?.cause?.name === 'TimeoutError';
};
