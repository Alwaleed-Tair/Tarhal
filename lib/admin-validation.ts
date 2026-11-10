import type { Prisma, TicketClass, Transmission } from '@prisma/client';

/**
 * Checks for the admin write routes (app/api/admin/[...slug]/route.ts). Every field is a real column of prisma/schema.prisma,
 * and the limits follow the column types: Decimal(10,2) prices, Decimal(4,2) seat multipliers. Pure functions, easy to test.
 */
export class ValidationError extends Error {
  constructor(readonly field: string, message: string) { super(message); }
}

type Body = Record<string, unknown>;
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;
const fail = (field: string, message: string): never => { throw new ValidationError(field, message); };
const CONTROL = /[\u0000-\u001f\u007f]/;

function text(body: Body, field: string, max: number, optional = false): string | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === '') return optional ? undefined : fail(field, `${field} is required`);
  if (typeof value !== 'string' || !value.trim()) return fail(field, `${field} must be text`);
  if (value.trim().length > max || CONTROL.test(value)) return fail(field, `${field} must be at most ${max} characters`);
  return value.trim();
}

/** Positive SAR amount with at most 2 decimals, below 100,000,000 (Decimal(10,2)). `allowZero` for insurance. */
function money(body: Body, field: string, allowZero = false): number {
  const value = body[field];
  if (value === undefined || value === null || value === '') return fail(field, `${field} is required`);
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n >= 100_000_000 || !TWO_DECIMALS.test(String(n))) {
    return fail(field, `${field} must be ${allowZero ? 'zero or more' : 'more than zero'} with at most 2 decimals`);
  }
  return n;
}

function whole(body: Body, field: string, min: number, max: number): number {
  const value = body[field];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return fail(field, `${field} must be a whole number from ${min} to ${max}`);
  return value;
}

function imageUrl(body: Body): string | null | undefined {
  if (!('imageUrl' in body)) return undefined;
  const value = body.imageUrl;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048 || CONTROL.test(value) || !(/^https?:\/\/[^\s]+$/i.test(value) || /^\/[^\s]*$/.test(value))) {
    return fail('imageUrl', 'imageUrl must be an http(s) link or a site path starting with /');
  }
  return value;
}

function time(body: Body, field: string): Date {
  const value = body[field];
  const date = typeof value === 'string' ? new Date(value) : new Date(NaN);
  if (Number.isNaN(date.getTime())) return fail(field, `${field} must be a date and time (ISO 8601)`);
  return date;
}

const keysOnly = (body: Body, allowed: string[]) => {
  const unknown = Object.keys(body).find((key) => !allowed.includes(key));
  if (unknown) fail(unknown, `Unknown field: ${unknown}`);
};

/** Only the given fields, each checked; for PATCH every field is optional but at least one must be sent. */
function pickPartial<T>(body: Body, allowed: string[], read: (field: string) => unknown): Partial<T> {
  keysOnly(body, allowed);
  const out: Record<string, unknown> = {};
  for (const field of allowed) if (field in body) out[field] = read(field);
  if (!Object.keys(out).length) fail(allowed[0], 'Send at least one field to change');
  return out as Partial<T>;
}

// ─── Flights ─────────────────────────────────────────────

const TICKET_CLASSES: TicketClass[] = ['ECONOMY', 'BUSINESS', 'FIRST'];
const airport = (body: Body, field: string) => {
  const value = typeof body[field] === 'string' ? (body[field] as string).trim().toUpperCase() : '';
  if (!/^[A-Z]{3}$/.test(value)) fail(field, `${field} must be a 3-letter airport code`);
  return value;
};

export type FlightCreate = {
  flightNumber: string; airlineId: string; from: string; to: string; departureTime: Date; arrivalTime: Date; basePrice: number;
  seats: { seatCode: string; ticketClass: TicketClass; priceMultiplier: number }[];
};

/** Body of POST /api/admin/flights. Departure must be in the future and before arrival; 1-500 seats with unique codes. */
export function flightCreate(body: Body, now = new Date()): FlightCreate {
  keysOnly(body, ['flightNumber', 'airlineId', 'from', 'to', 'departureTime', 'arrivalTime', 'basePrice', 'seats']);
  const flightNumber = (text(body, 'flightNumber', 20) as string).toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(flightNumber)) fail('flightNumber', 'flightNumber may use letters, numbers and dashes only');
  const airlineId = text(body, 'airlineId', 64) as string;
  const from = airport(body, 'from'), to = airport(body, 'to');
  if (from === to) fail('to', 'from and to must be different airports');
  const departureTime = time(body, 'departureTime'), arrivalTime = time(body, 'arrivalTime');
  if (departureTime <= now) fail('departureTime', 'departureTime must be in the future');
  if (arrivalTime <= departureTime) fail('arrivalTime', 'arrivalTime must be after departureTime');
  const basePrice = money(body, 'basePrice');
  if (!Array.isArray(body.seats) || body.seats.length === 0 || body.seats.length > 500) fail('seats', 'seats must list 1 to 500 seats');
  const seen = new Set<string>();
  const seats = (body.seats as unknown[]).map((raw, index) => {
    const seat = (raw && typeof raw === 'object' ? raw : {}) as Body;
    const seatCode = typeof seat.seatCode === 'string' ? seat.seatCode.trim().toUpperCase() : '';
    if (!/^[A-Z0-9-]{1,10}$/.test(seatCode)) fail(`seats[${index}].seatCode`, 'seatCode must be 1-10 letters, numbers or dashes');
    if (seen.has(seatCode)) fail(`seats[${index}].seatCode`, `Seat ${seatCode} is listed twice`);
    seen.add(seatCode);
    const ticketClass = (seat.ticketClass ?? 'ECONOMY') as TicketClass;
    if (!TICKET_CLASSES.includes(ticketClass)) fail(`seats[${index}].ticketClass`, 'ticketClass must be ECONOMY, BUSINESS or FIRST');
    const m = seat.priceMultiplier ?? 1;
    if (typeof m !== 'number' || !Number.isFinite(m) || m <= 0 || m >= 100 || !TWO_DECIMALS.test(String(m))) {
      fail(`seats[${index}].priceMultiplier`, 'priceMultiplier must be more than 0 and below 100, with at most 2 decimals');
    }
    return { seatCode, ticketClass, priceMultiplier: m as number };
  });
  return { flightNumber, airlineId, from, to, departureTime, arrivalTime, basePrice, seats };
}

/** Body of PATCH /api/admin/flights/:id: basePrice, departureTime and/or arrivalTime. Order of times is checked by the route. */
export function flightUpdate(body: Body): { basePrice?: number; departureTime?: Date; arrivalTime?: Date } {
  return pickPartial(body, ['basePrice', 'departureTime', 'arrivalTime'], (field) => (field === 'basePrice' ? money(body, field) : time(body, field)));
}

// ─── Hotels ──────────────────────────────────────────────

function rating(body: Body) {
  const value = typeof body.rating === 'string' ? Number(body.rating) : body.rating;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 5) fail('rating', 'rating must be from 1 to 5');
  return value as number;
}

const HOTEL_FIELDS = ['name', 'city', 'address', 'pricePerNight', 'rating', 'roomType', 'imageUrl'];
function hotelField(body: Body, field: string): unknown {
  switch (field) {
    case 'name': return text(body, field, 120);
    case 'city': return text(body, field, 60);
    case 'roomType': return text(body, field, 60);
    case 'address': return text(body, field, 200, true) ?? null;
    case 'pricePerNight': return money(body, field);
    case 'rating': return rating(body);
    default: return imageUrl(body);
  }
}

/** Body of POST /api/admin/hotels: name, city, pricePerNight, rating (1-5), roomType; address and imageUrl optional. */
export function hotelCreate(body: Body): Prisma.HotelCreateInput {
  keysOnly(body, HOTEL_FIELDS);
  const out: Record<string, unknown> = {};
  for (const field of HOTEL_FIELDS) { const v = hotelField(body, field); if (v !== undefined) out[field] = v; }
  return out as Prisma.HotelCreateInput;
}
export const hotelUpdate = (body: Body) => pickPartial<Prisma.HotelUpdateInput>(body, HOTEL_FIELDS, (field) => hotelField(body, field));

// ─── Cars ────────────────────────────────────────────────

const TRANSMISSIONS: Transmission[] = ['AUTOMATIC', 'MANUAL'];
const CAR_FIELDS = ['make', 'model', 'year', 'seats', 'category', 'transmission', 'city', 'pricePerDay', 'insurancePricePerDay', 'isAvailable', 'imageUrl'];
function carField(body: Body, field: string, now: Date): unknown {
  switch (field) {
    case 'make': case 'model': case 'category': return text(body, field, 60);
    case 'city': return text(body, field, 60);
    case 'year': return whole(body, field, 1900, now.getFullYear() + 1);
    case 'seats': return whole(body, field, 1, 100);
    case 'transmission':
      if (!TRANSMISSIONS.includes(body.transmission as Transmission)) fail(field, 'transmission must be AUTOMATIC or MANUAL');
      return body.transmission;
    case 'pricePerDay': return money(body, field);
    case 'insurancePricePerDay': return money(body, field, true);
    case 'isAvailable':
      if (typeof body.isAvailable !== 'boolean') fail(field, 'isAvailable must be true or false');
      return body.isAvailable;
    default: return imageUrl(body);
  }
}

/** Body of POST /api/admin/cars. transmission, insurancePricePerDay and isAvailable fall back to the schema defaults. */
export function carCreate(body: Body, now = new Date()): Prisma.CarCreateInput {
  keysOnly(body, CAR_FIELDS);
  const out: Record<string, unknown> = {};
  for (const field of CAR_FIELDS) {
    if (['transmission', 'insurancePricePerDay', 'isAvailable', 'imageUrl'].includes(field) && !(field in body)) continue;
    const v = carField(body, field, now); if (v !== undefined) out[field] = v;
  }
  return out as Prisma.CarCreateInput;
}
export const carUpdate = (body: Body, now = new Date()) => pickPartial<Prisma.CarUpdateInput>(body, CAR_FIELDS, (field) => carField(body, field, now));

/** ?page & ?pageSize for admin lists: page >= 1, pageSize 1-100 (default 20). */
export function adminPage(params: URLSearchParams) {
  const read = (key: string, fallback: number, max: number) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (!/^[1-9]\d{0,8}$/.test(raw) || Number(raw) > max) fail(key, `${key} must be a whole number from 1 to ${max}`);
    return Number(raw);
  };
  const page = read('page', 1, 1_000_000), pageSize = read('pageSize', 20, 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
