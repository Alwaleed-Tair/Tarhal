import { generateGuide, guideRequest } from '../../../../lib/ai/guides.ts';
import { structuredAiRoute } from '../../../../lib/ai/structured-route.ts';

// POST /api/ai/guide { city, language?: "en" | "ar" } -> { success, aiGenerated: true, data: { summary, bestTime, places[], tips[] } }
// AI-generated destination guide for a Saudi city. 400 unknown city, 429 too many requests, 503 not configured, 504 timeout.
export const POST = structuredAiRoute({
  route: 'guide',
  parse: guideRequest,
  cacheKey: (input) => `${input.city}|${input.language}`,
  run: async (input, ctx) => { const { guide, usage } = await generateGuide(input, ctx); return { data: { city: input.city, ...guide }, usage }; },
});
