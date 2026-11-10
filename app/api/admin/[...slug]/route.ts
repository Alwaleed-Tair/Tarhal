import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Role } from '@prisma/client';
import { getFlights, createFlightWithSeats, getAirlines, getBookings } from '../../../../lib/db/queries.ts';
import { getCurrentUser } from '../../../../lib/auth.ts';
import { prisma } from '../../../../lib/prisma.ts';
import { ValidationError, carCreate, carUpdate, flightCreate, flightUpdate, hotelCreate, hotelUpdate } from '../../../../lib/admin-validation.ts';
import { bookingErrorResponse, cancelBooking, isBookingType, payBooking, BOOKING_TYPES } from '../../../../lib/bookings.ts';

/**
 * Admin API. Each path has its own handler; anything else under /api/admin answers 404.
 *
 *   GET    /api/admin/airlines | flights | bookings
 *   POST   /api/admin/flights | hotels | cars
 *   PATCH  /api/admin/flights/:id | hotels/:id | cars/:id | bookings/:id
 *   DELETE /api/admin/flights/:id            (409 while the flight has bookings)
 *
 * Errors are JSON { success: false, error, code?, field? }: 400 bad input, 401 not logged in, 403 not an admin,
 * 404 unknown path or record, 409 conflict. Database messages are never sent to the client.
 */

type Params = { params: Promise<{ slug: string[] }> };
type Handler = (req: NextRequest, id: string | undefined) => Promise<NextResponse>;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status: number, error: string, extra: Record<string, string> = {}) => json({ success: false, error, ...extra }, status);
const notFound = () => fail(404, 'Not found', { code: 'NOT_FOUND' });

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { return null; }
}

/** Turns thrown errors into safe JSON answers. */
function failure(error: unknown, what: string) {
  if (error instanceof ValidationError) return fail(400, error.message, { code: 'INVALID_FIELD', field: error.field });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return fail(409, `A ${what} with these details already exists`, { code: 'DUPLICATE' });
    if (error.code === 'P2025') return fail(404, `${what[0].toUpperCase()}${what.slice(1)} not found`, { code: 'NOT_FOUND' });
    if (error.code === 'P2003') return fail(409, `This ${what} is still used by other records`, { code: 'IN_USE' });
  }
  return fail(500, `Could not save the ${what}`, { code: 'INTERNAL_ERROR' });
}

/** Wraps a write: reads a JSON object body (400 otherwise) and maps errors. */
const write = (what: string, run: (body: Record<string, unknown>, id: string | undefined) => Promise<NextResponse>): Handler =>
  async (req, id) => {
    const body = await readBody(req);
    if (!body) return fail(400, 'Send a valid JSON object', { code: 'INVALID_BODY' });
    try { return await run(body, id); } catch (error) { return failure(error, what); }
  };

const list = (load: () => Promise<unknown>, what: string): Handler => async () => {
  try { return json(await load()); } catch { return fail(500, `Could not load ${what}`); }
};

// ─── Flights ─────────────────────────────────────────────

const createFlight = write('flight', async (body) => {
  const data = flightCreate(body);
  if (!await prisma.airline.findUnique({ where: { id: data.airlineId }, select: { id: true } })) {
    return fail(400, 'airlineId does not match an airline', { code: 'INVALID_FIELD', field: 'airlineId' });
  }
  if (await prisma.flight.findUnique({ where: { flightNumber: data.flightNumber }, select: { id: true } })) {
    return fail(409, `Flight number ${data.flightNumber} already exists`, { code: 'DUPLICATE', field: 'flightNumber' });
  }
  return json({ success: true, data: await createFlightWithSeats(data) }, 201);
});

const updateFlight = write('flight', async (body, id) => {
  const changes = flightUpdate(body);
  const flight = await prisma.flight.findUnique({ where: { id }, select: { departureTime: true, arrivalTime: true } });
  if (!flight) return fail(404, 'Flight not found', { code: 'NOT_FOUND' });
  const departure = changes.departureTime ?? flight.departureTime, arrival = changes.arrivalTime ?? flight.arrivalTime;
  if (changes.departureTime && changes.departureTime <= new Date()) return fail(400, 'departureTime must be in the future', { code: 'INVALID_FIELD', field: 'departureTime' });
  if (arrival <= departure) return fail(400, 'arrivalTime must be after departureTime', { code: 'INVALID_FIELD', field: changes.arrivalTime ? 'arrivalTime' : 'departureTime' });
  return json({ success: true, data: await prisma.flight.update({ where: { id }, data: changes }) });
});

const deleteFlight: Handler = async (_req, id) => {
  try {
    const flight = await prisma.flight.findUnique({ where: { id }, select: { id: true, _count: { select: { bookings: true } } } });
    if (!flight) return fail(404, 'Flight not found', { code: 'NOT_FOUND' });
    // Deleting would also delete its bookings (onDelete: Cascade), including cancelled ones kept for records.
    if (flight._count.bookings > 0) return fail(409, 'This flight has bookings and cannot be deleted', { code: 'HAS_BOOKINGS' });
    await prisma.flight.delete({ where: { id } });
    return json({ success: true, data: { id } });
  } catch (error) { return failure(error, 'flight'); }
};

// ─── Hotels and cars ─────────────────────────────────────

const createHotel = write('hotel', async (body) => json({ success: true, data: await prisma.hotel.create({ data: hotelCreate(body) }) }, 201));
const updateHotel = write('hotel', async (body, id) => json({ success: true, data: await prisma.hotel.update({ where: { id }, data: hotelUpdate(body) }) }));
const createCar = write('car', async (body) => json({ success: true, data: await prisma.car.create({ data: carCreate(body) }) }, 201));
const updateCar = write('car', async (body, id) => json({ success: true, data: await prisma.car.update({ where: { id }, data: carUpdate(body) }) }));

// ─── Bookings ────────────────────────────────────────────

// PATCH /api/admin/bookings/:id { type: "flight" | "hotel" | "car", action: "cancel" | "markPaid" }
// cancel: the booking becomes inactive, a paid one REFUNDED, and flight seats AVAILABLE again. markPaid: PENDING -> PAID.
const updateBooking: Handler = async (req, id) => {
  const body = await readBody(req);
  if (!body) return fail(400, 'Send a valid JSON object', { code: 'INVALID_BODY' });
  if (!isBookingType(body.type)) return fail(400, `type must be one of: ${BOOKING_TYPES.join(', ')}`, { code: 'INVALID_FIELD', field: 'type' });
  if (body.action !== 'cancel' && body.action !== 'markPaid') return fail(400, 'action must be cancel or markPaid', { code: 'INVALID_FIELD', field: 'action' });
  try {
    const data = body.action === 'cancel' ? await cancelBooking(body.type, id as string) : await payBooking(body.type, id as string);
    return json({ success: true, data: { ...data, type: body.type } });
  } catch (error) {
    return bookingErrorResponse(error, 'Could not update the booking');
  }
};

// ─── Routing ─────────────────────────────────────────────

/** [method][resource] for collections, and [method][resource/:id] for single records. */
const ROUTES: Record<string, Record<string, Handler>> = {
  GET: {
    airlines: list(getAirlines, 'airlines'),
    flights: list(getFlights, 'flights'),
    bookings: list(getBookings, 'bookings'),
  },
  POST: { flights: createFlight, hotels: createHotel, cars: createCar },
  PATCH: { 'flights/:id': updateFlight, 'hotels/:id': updateHotel, 'cars/:id': updateCar, 'bookings/:id': updateBooking },
  DELETE: { 'flights/:id': deleteFlight },
};

async function route(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) return fail(401, 'Login required', { code: 'UNAUTHORIZED' });
  if (user.role !== Role.ADMIN) return fail(403, 'Admin access required', { code: 'FORBIDDEN' });
  const slug = (await params).slug ?? [];
  if (slug.length > 2) return notFound();
  const [resource, id] = slug;
  const handler = ROUTES[req.method]?.[id === undefined ? resource : `${resource}/:id`];
  if (!handler) return notFound();
  if (id !== undefined && (!id || id.length > 64)) return notFound();
  return handler(req, id);
}

export const GET = route;
export const POST = route;
export const PATCH = route;
export const DELETE = route;
