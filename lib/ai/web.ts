import { tool } from 'ai';
import { z } from 'zod';

export type WebSource = { title: string; url: string };

// Same server-side web search DeepSeek offers to the Python module (Anthropic-shaped endpoint).
// Disable with TARHAL_WEB_SEARCH=false. Results are cached briefly so repeated questions stay fast.
export const webSearchEnabled = () => (process.env.TARHAL_WEB_SEARCH ?? 'true').trim().toLowerCase() !== 'false';

const cache = new Map<string, { at: number; value: { notes: string; sources: WebSource[] } }>();
const TTL_MS = 10 * 60 * 1000;

export async function webSearch(query: string) {
  const key = query.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error('no key');
  const base = (process.env.DEEPSEEK_ANTHROPIC_BASE_URL?.trim() || 'https://api.deepseek.com/anthropic').replace(/\/$/, '');
  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.TARHAL_MODEL_FLASH?.trim() || 'deepseek-flash',
      max_tokens: 700,
      system: 'Search the web and report concrete facts (names, prices, dates, rules) in at most 120 words, in the language of the query. Say so if results are unclear. No filler.',
      messages: [{ role: 'user', content: query }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: Number(process.env.TARHAL_SEARCH_MAX_USES) || 2 }],
    }),
    signal: AbortSignal.timeout(Number(process.env.TARHAL_SEARCH_TIMEOUT_MS) || 15000),
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data: any = await res.json();

  // Keep only the text written after the last search (text before it is the model guessing).
  let after: string[] = [], all: string[] = []; const sources: WebSource[] = [];
  for (const b of data.content ?? []) {
    if (b.type === 'server_tool_use') after = [];
    else if (b.type === 'text') { after.push(b.text); all.push(b.text); }
    else if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r?.url && !sources.some((s) => s.url === r.url)) sources.push({ title: String(r.title ?? r.url), url: r.url });
    }
  }
  const notes = (after.join('\n').trim() || all.join('\n').trim());
  const value = { notes, sources: sources.slice(0, 4) };
  if (notes) cache.set(key, { at: Date.now(), value });
  return value;
}

export function webTool(used: WebSource[]) {
  return {
    webSearch: tool({
      description: 'Search the internet. Use it when Tarhal data has nothing, or for restaurants, attractions, visas, events, weather, current prices/rules, or anything time-sensitive. One specific query.',
      inputSchema: z.object({ query: z.string().min(3).max(200).describe('A specific search query') }),
      execute: async ({ query }) => {
        try {
          const r = await webSearch(query);
          if (!r.notes) return { error: 'No useful results' };
          for (const s of r.sources) if (!used.some((u) => u.url === s.url)) used.push(s);
          return { notes: r.notes, sources: r.sources.map((s) => s.title) };
        } catch (e) { console.error('[ai] webSearch failed:', e instanceof Error ? e.message : e); return { error: 'Web search is unavailable right now; answer from general knowledge and say it is unverified' }; }
      },
    }),
  };
}
