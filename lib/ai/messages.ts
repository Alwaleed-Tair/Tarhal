import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS } from './prompt.ts';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// Accepts {messages:[...]} (history) or the old {message:"..."}. Returns the trimmed
// history (last N messages, must end with a user message) or an error string.
export function parseMessages(body: unknown): ChatMessage[] | string {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const raw = Array.isArray(b.messages) ? b.messages : typeof b.message === 'string' ? [{ role: 'user', content: b.message }] : null;
  if (!raw || !raw.length) return 'Send {"messages":[{"role":"user","content":"..."}]}.';
  const out: ChatMessage[] = [];
  for (const m of raw.slice(-MAX_HISTORY_MESSAGES)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return 'Each message needs a role (user/assistant) and text content.';
    const content = m.content.trim();
    if (!content) continue;
    if (content.length > MAX_MESSAGE_CHARS) return `Messages are limited to ${MAX_MESSAGE_CHARS} characters.`;
    out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return 'The last message must come from the user.';
  return out;
}
