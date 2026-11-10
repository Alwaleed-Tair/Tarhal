import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';

/**
 * Destination guide and day-by-day itinerary from the existing chat model (lib/ai/model.ts).
 * The model must answer with JSON matching the schemas below; the SDK validates it, and the extra checks here make sure
 * the plan has exactly the requested days. The model can be passed in, so tests use the SDK's mock model.
 */

/** Saudi cities the guide and itinerary accept (English names; Arabic and other spellings map to them). */
export const SAUDI_CITIES = ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Al Khobar', 'Abha', 'Taif', 'AlUla', 'Al Baha', 'Umluj', 'Tabuk', 'Hail', 'Jazan', 'Najran', 'Yanbu', 'Al Ahsa'] as const;
const ALIASES: Record<string, string> = {
  'al-dammam': 'Dammam', 'khobar': 'Al Khobar', 'al-khobar': 'Al Khobar', 'al-taif': 'Taif', 'al-bahah': 'Al Baha', 'al bahah': 'Al Baha', 'albaha': 'Al Baha',
  'al ula': 'AlUla', 'al-ula': 'AlUla', 'mecca': 'Makkah', 'makkah al-mukarramah': 'Makkah', 'medina': 'Madinah', 'al madinah': 'Madinah', 'hofuf': 'Al Ahsa', 'al-ahsa': 'Al Ahsa', 'jizan': 'Jazan',
  'الرياض': 'Riyadh', 'جدة': 'Jeddah', 'جده': 'Jeddah', 'مكة': 'Makkah', 'مكة المكرمة': 'Makkah', 'المدينة': 'Madinah', 'المدينة المنورة': 'Madinah', 'الدمام': 'Dammam', 'الخبر': 'Al Khobar',
  'أبها': 'Abha', 'ابها': 'Abha', 'الطائف': 'Taif', 'العلا': 'AlUla', 'الباحة': 'Al Baha', 'أملج': 'Umluj', 'املج': 'Umluj', 'تبوك': 'Tabuk', 'حائل': 'Hail', 'جازان': 'Jazan', 'نجران': 'Najran', 'ينبع': 'Yanbu', 'الأحساء': 'Al Ahsa', 'الاحساء': 'Al Ahsa',
};

/** The city's English name, or null when it is not a Saudi city we know. */
export function saudiCity(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > 60) return null;
  const found = SAUDI_CITIES.find((c) => c.toLowerCase() === clean.toLowerCase());
  return found ?? ALIASES[clean.toLowerCase()] ?? null;
}

export const INTERESTS = ['culture', 'history', 'nature', 'food', 'shopping', 'beach', 'adventure', 'family', 'religious'] as const;
export type Language = 'en' | 'ar';

const line = (min: number, max: number) => z.string().trim().min(min).max(max);

export const guideSchema = z.object({
  summary: line(20, 600).describe('Two or three sentences about the city'),
  bestTime: line(5, 300).describe('Best months to visit and why'),
  places: z.array(z.object({ name: line(2, 80), description: line(10, 300) })).min(3).max(6).describe('Real, well-known places to visit'),
  tips: z.array(line(5, 200)).min(2).max(5).describe('Practical tips for visitors'),
});
export type Guide = z.infer<typeof guideSchema>;

const slot = line(5, 300);
export const itinerarySchema = z.object({
  days: z.array(z.object({ day: z.number().int().min(1).max(7), title: line(3, 80), morning: slot, afternoon: slot, evening: slot, tip: line(5, 200).optional() })).min(1).max(7),
});
export type Itinerary = z.infer<typeof itinerarySchema>;

export class GuideInputError extends Error {
  readonly field: string;
  constructor(field: string, message: string) { super(message); this.field = field; }
}
export class GuideOutputError extends Error {}

const language = (value: unknown): Language => (value === 'ar' ? 'ar' : value === undefined || value === 'en' ? 'en' : (() => { throw new GuideInputError('language', 'language must be en or ar'); })());

/** Body of POST /api/ai/guide: { city, language? }. */
export function guideRequest(body: Record<string, unknown> | null) {
  if (!body) throw new GuideInputError('body', 'Send a valid JSON object');
  const city = saudiCity(body.city);
  if (!city) throw new GuideInputError('city', `city must be a Saudi city, for example: ${SAUDI_CITIES.slice(0, 6).join(', ')}`);
  return { city, language: language(body.language) };
}

/** Body of POST /api/ai/itinerary: { city, days: 1-7, interests?: up to 5 of INTERESTS, language? }. */
export function itineraryRequest(body: Record<string, unknown> | null) {
  const { city, language: lang } = guideRequest(body);
  const days = body!.days;
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 7) throw new GuideInputError('days', 'days must be a whole number from 1 to 7');
  const raw = body!.interests ?? [];
  if (!Array.isArray(raw) || raw.length > 5 || !raw.every((i) => (INTERESTS as readonly string[]).includes(i))) {
    throw new GuideInputError('interests', `interests must be up to 5 of: ${INTERESTS.join(', ')}`);
  }
  return { city, days, interests: [...new Set(raw as string[])], language: lang };
}

const SYSTEM = `You are Tarhal's travel writer for Saudi Arabia. Write accurate, practical, family-friendly content.
Only name real, well-known places that exist in the requested city; never invent places, prices, phone numbers or opening hours.
Respect local customs (prayer times, Friday timing, Ramadan). Keep each field short. Plain text only, no markdown.`;
const languageLine = (lang: Language) => (lang === 'ar' ? 'Write every text field in simple Modern Standard Arabic.' : 'Write every text field in English.');

export const MAX_GUIDE_TOKENS = 900;
export const MAX_ITINERARY_TOKENS = 1600;

type Run = { model: LanguageModel; abortSignal?: AbortSignal };

export async function generateGuide(input: { city: string; language: Language }, { model, abortSignal }: Run) {
  const result = await generateText({
    model, abortSignal, temperature: 0.4, maxOutputTokens: MAX_GUIDE_TOKENS,
    system: SYSTEM,
    prompt: `Destination guide for ${input.city}, Saudi Arabia: a short summary, the best time to visit, 3 to 6 places to visit with one-line descriptions, and 2 to 5 tips. ${languageLine(input.language)}`,
    output: Output.object({ schema: guideSchema }),
  });
  const parsed = guideSchema.safeParse(result.output);
  if (!parsed.success) throw new GuideOutputError('guide did not match the schema');
  return { guide: parsed.data, usage: result.totalUsage ?? result.usage };
}

export async function generateItinerary(input: { city: string; days: number; interests: string[]; language: Language }, { model, abortSignal }: Run) {
  const interests = input.interests.length ? `Interests: ${input.interests.join(', ')}.` : 'Mix culture, food and sights.';
  const result = await generateText({
    model, abortSignal, temperature: 0.5, maxOutputTokens: MAX_ITINERARY_TOKENS,
    system: SYSTEM,
    prompt: `A ${input.days}-day itinerary for ${input.city}, Saudi Arabia. ${interests} Exactly ${input.days} days numbered 1 to ${input.days}; each day has a short title and a morning, afternoon and evening plan, and an optional tip. ${languageLine(input.language)}`,
    output: Output.object({ schema: itinerarySchema }),
  });
  return { itinerary: checkItinerary(result.output, input.days), usage: result.totalUsage ?? result.usage };
}

/** The plan must have exactly `days` days, numbered 1..days in order. */
export function checkItinerary(output: unknown, days: number): Itinerary {
  const parsed = itinerarySchema.safeParse(output);
  if (!parsed.success) throw new GuideOutputError('itinerary did not match the schema');
  const list = parsed.data.days;
  if (list.length !== days || list.some((d, i) => d.day !== i + 1)) throw new GuideOutputError('itinerary has the wrong days');
  return parsed.data;
}
