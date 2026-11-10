import { generateItinerary, itineraryRequest } from '../../../../lib/ai/guides.ts';
import { structuredAiRoute } from '../../../../lib/ai/structured-route.ts';

// POST /api/ai/itinerary { city, days: 1-7, interests?: string[], language?: "en" | "ar" }
// -> { success, aiGenerated: true, data: { city, days: [{ day, title, morning, afternoon, evening, tip? }] } } with exactly `days` days.
export const POST = structuredAiRoute({
  route: 'itinerary',
  parse: itineraryRequest,
  run: async (input, ctx) => { const { itinerary, usage } = await generateItinerary(input, ctx); return { data: { city: input.city, ...itinerary }, usage }; },
});
