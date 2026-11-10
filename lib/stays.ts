/**
 * Date and price rules for hotel bookings and car rentals. Pure functions, so they are easy to test.
 * Days are "YYYY-MM-DD" in Riyadh time and are stored as midnight UTC of that day. Prices are SAR.
 */

export const MAX_NIGHTS = 30;
export const MAX_DAYS_AHEAD = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export class StayError extends Error {
  constructor(message: string, readonly field?: string) { super(message); }
}

/** Today in Riyadh (UTC+3) as "YYYY-MM-DD". */
export const riyadhToday = (now = new Date()) => new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** "YYYY-MM-DD" -> Date at midnight UTC, or a StayError naming the field. */
export function parseDay(value: unknown, field: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new StayError(`${field} must be a date (YYYY-MM-DD)`, field);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new StayError(`${field} is not a real date`, field);
  return date;
}

/**
 * Checks a start/end pair: start from today (Riyadh) and at most a year ahead, end after start, at most 30 nights.
 * Returns the two dates and the number of nights (hotel) or days (car).
 */
export function stayRange(startValue: unknown, endValue: unknown, names: [string, string], now = new Date()) {
  const start = parseDay(startValue, names[0]);
  const end = parseDay(endValue, names[1]);
  const today = parseDay(riyadhToday(now), 'today');
  if (start < today) throw new StayError(`${names[0]} cannot be in the past`, names[0]);
  if (start.getTime() - today.getTime() > MAX_DAYS_AHEAD * DAY_MS) throw new StayError(`${names[0]} must be within ${MAX_DAYS_AHEAD} days`, names[0]);
  if (end <= start) throw new StayError(`${names[1]} must be after ${names[0]}`, names[1]);
  const nights = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (nights > MAX_NIGHTS) throw new StayError(`A stay can be at most ${MAX_NIGHTS} nights`, names[1]);
  return { start, end, nights };
}

const money = (value: number) => Math.round(value * 100) / 100;

/** Hotel total: nights x price per night. Guests do not change the price (the Hotel model prices a room). */
export const hotelTotal = (pricePerNight: number, nights: number) => money(pricePerNight * nights);

/** Car total: days x (price per day + insurance per day when chosen). */
export const carTotal = (pricePerDay: number, insurancePerDay: number, days: number, withInsurance: boolean) =>
  money(days * (pricePerDay + (withInsurance ? insurancePerDay : 0)));

/** Guests on a hotel booking: whole number 1-10 (default 1). */
export function guestCount(value: unknown): number {
  if (value === undefined) return 1;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) throw new StayError('guests must be a whole number from 1 to 10', 'guests');
  return value;
}
