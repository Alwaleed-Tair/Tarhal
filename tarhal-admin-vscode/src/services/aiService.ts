import { api, httpStatus, isServerUnreachable, num, str, type Raw } from '@/services/api';
import type { TranslationKey } from '@/i18n/translations';

/** POST /api/ai/guide and /api/ai/itinerary (docs/api-documentation.md section 10). Answers are AI-generated and labelled so. */

export type CityGuideAi = { summary: string; bestTime: string; places: { name: string; description: string }[]; tips: string[] };
export type ItineraryDay = { day: number; title: string; morning: string; afternoon: string; evening: string; tip?: string };
export const INTERESTS = ['culture', 'history', 'nature', 'food', 'shopping', 'beach', 'adventure', 'family', 'religious'] as const;
export type Interest = (typeof INTERESTS)[number];

// The model can take a while; the server stops at 30 s.
const TIMEOUT = 40_000;
const list = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

export const aiService = {
  async guide(city: string, language: 'en' | 'ar'): Promise<CityGuideAi> {
    const { data } = await api.post<{ success?: boolean; data: Raw }>('/ai/guide', { city, language }, { timeout: TIMEOUT });
    const d = data.data ?? {};
    return {
      summary: str(d.summary), bestTime: str(d.bestTime),
      places: list(d.places).map((p) => ({ name: str(p.name), description: str(p.description) })),
      tips: (Array.isArray(d.tips) ? d.tips : []).map((tip) => str(tip)),
    };
  },
  async itinerary(city: string, days: number, interests: Interest[], language: 'en' | 'ar'): Promise<ItineraryDay[]> {
    const { data } = await api.post<{ success?: boolean; data: Raw }>('/ai/itinerary', { city, days, interests, language }, { timeout: TIMEOUT });
    return list(data.data?.days).map((d) => ({ day: num(d.day), title: str(d.title), morning: str(d.morning), afternoon: str(d.afternoon), evening: str(d.evening), tip: d.tip ? str(d.tip) : undefined }));
  },
};

/** A friendly message for a failed AI request. */
export function aiErrorKey(error: unknown): TranslationKey {
  if (isServerUnreachable(error)) return 'tpErrOffline';
  switch (httpStatus(error)) {
    case 503: return 'tpAiErrNotConfigured';
    case 429: return 'tpAiErrBusy';
    case 504: case undefined: return 'tpAiErrTimeout';
    case 400: return 'tpErr400';
    default: return 'tpAiErrFailed';
  }
}
