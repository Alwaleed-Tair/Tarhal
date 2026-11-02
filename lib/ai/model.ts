import { createDeepSeek } from '@ai-sdk/deepseek';

// The key is read from the environment only (.env locally, Netlify env vars when deployed).
// Never hard-code it and never expose it to the browser.
export class AiConfigError extends Error {}

export function chatModel() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new AiConfigError('DEEPSEEK_API_KEY is not set');
  const deepseek = createDeepSeek({ apiKey, baseURL: process.env.DEEPSEEK_BASE_URL?.trim() || undefined });
  return deepseek(process.env.TARHAL_MODEL_FLASH?.trim() || 'deepseek-flash');
}
