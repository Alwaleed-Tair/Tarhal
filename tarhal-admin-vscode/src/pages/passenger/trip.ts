import { isoToRiyadhLocal } from '@/i18n/format';
import type { TranslationKey } from '@/i18n/translations';
import { httpStatus, isServerUnreachable } from '@/services/api';

/**
 * Shared helpers for the passenger pages (Tariq's flow). Everything here is about real data:
 * the API stores flights with airport codes (RUH, JED...) and UTC times, and the pages show city names and Riyadh time.
 */

/** Tariq's city list, in his order. */
export const TRIP_CITIES = ['AlUla', 'Khobar', 'Abha', 'Al Baha', 'Riyadh', 'Dammam', 'Umluj', 'Taif', 'Jeddah'] as const;
export type TripCity = (typeof TRIP_CITIES)[number];

/**
 * Airport code of each city, as used by GET /api/flights/search. Khobar and Dammam share King Fahd airport (DMM),
 * which is why Tariq's picker never offers both. Umluj has no airport code here, so it cannot be searched yet.
 */
export const AIRPORT: Record<TripCity, string | null> = {
  AlUla: 'ULH', Khobar: 'DMM', Abha: 'AHB', 'Al Baha': 'ABT', Riyadh: 'RUH', Dammam: 'DMM', Umluj: null, Taif: 'TIF', Jeddah: 'JED',
};

const CITY_KEY: Record<string, TranslationKey> = {
  AlUla: 'tpCityAlUla', Khobar: 'tpCityKhobar', Abha: 'tpCityAbha', 'Al Baha': 'tpCityAlBaha', Riyadh: 'tpCityRiyadh',
  Dammam: 'tpCityDammam', Umluj: 'tpCityUmluj', Taif: 'tpCityTaif', Jeddah: 'tpCityJeddah', Madinah: 'tpCityMadinah',
  // Spellings used in the travel guide (data/cities.ts).
  'Al Khobar': 'tpCityKhobar', 'Al-Bahah': 'tpCityAlBaha', 'Al-Taif': 'tpCityTaif', 'Al-Dammam': 'tpCityDammam',
};

const REGION_KEY: Record<string, TranslationKey> = {
  'Red Sea coast': 'tpRegionRedSea', 'Asir highlands': 'tpRegionAsir', 'Eastern Province': 'tpRegionEastern', Highlands: 'tpRegionHighlands',
  'Mountain escape': 'tpRegionMountain', 'Central Saudi Arabia': 'tpRegionCentral', 'Northwest Saudi Arabia': 'tpRegionNorthwest',
};
/** Region of a travel-guide city in the page language. */
export const regionLabel = (t: (key: TranslationKey) => string, region: string) => (REGION_KEY[region] ? t(REGION_KEY[region]) : region);
/** Airport code -> city, for flights that come back from the API. DMM is shown as Dammam. */
const CODE_CITY: Record<string, string> = { ULH: 'AlUla', AHB: 'Abha', ABT: 'Al Baha', RUH: 'Riyadh', DMM: 'Dammam', TIF: 'Taif', JED: 'Jeddah', MED: 'Madinah' };

/** City name in the page language. Unknown names and codes are shown as they are. */
export function cityLabel(t: (key: TranslationKey) => string, nameOrCode: string): string {
  const name = CODE_CITY[nameOrCode] ?? nameOrCode;
  return CITY_KEY[name] ? t(CITY_KEY[name]) : nameOrCode;
}

/** "2027-01-10T08:00:00.000Z" -> "11:00" in Riyadh time. */
export const riyadhTime = (iso: string) => isoToRiyadhLocal(iso).slice(11, 16);
/** "2027-01-10T22:30:00.000Z" -> "2027-01-11" (the Riyadh day). */
export const riyadhDay = (iso: string) => isoToRiyadhLocal(iso).slice(0, 10);

/** Today in Riyadh, "YYYY-MM-DD". */
export const riyadhToday = () => isoToRiyadhLocal(new Date().toISOString()).slice(0, 10);
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Flight length in minutes, from the real departure and arrival times. */
export const durationMinutes = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 60000));

/**
 * A friendly, translated reason for a failed request. 401 is handled by the caller (it sends the traveler to log in),
 * but it still has a message in case a page shows it.
 */
export function errorKey(error: unknown, conflict: TranslationKey = 'tpErr409'): TranslationKey {
  if (isServerUnreachable(error)) return 'tpErrOffline';
  switch (httpStatus(error)) {
    case 400: return 'tpErr400';
    case 401: return 'tpErr401';
    case 403: return 'tpErr403';
    case 404: return 'tpErr404';
    case 409: return conflict;
    case undefined: return 'tpErrOffline';
    default: return 'tpErr500';
  }
}

/** A booking in progress, kept for the trip to the login page and back. */
export const DRAFT_KEY = 'tarhal-trip-draft';
