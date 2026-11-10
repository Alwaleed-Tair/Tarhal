import { NextResponse } from 'next/server.js';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../lib/prisma.ts';
import { releaseExpiredHolds } from '../../../../lib/seats.ts';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const bad = (error: string) => NextResponse.json({ success: false, error }, { status: 400 });

/** Start and end of one Riyadh day (UTC+3), or null for a malformed or impossible date. */
function riyadhDay(day: string) {
  if (!DAY.test(day)) return null;
  const start = new Date(`${day}T00:00:00.000+03:00`);
  if (Number.isNaN(start.getTime()) || new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/**
 * Flights from -> to on one Riyadh day with at least `passengers` free seats. A hold that has run out counts as free.
 * Each result has `availableSeatsCount` and `lowestPrice` (cheapest free seat) instead of the seat list.
 */
async function findFlights(from: string, to: string, day: { start: Date; end: Date }, passengers: number, airlineId: string | null) {
  const where: Prisma.FlightWhereInput = { from, to, departureTime: { gte: day.start, lt: day.end }, ...(airlineId && { airlineId }) };
  const flights = await prisma.flight.findMany({
    where,
    include: { airline: true, seats: { where: { status: 'AVAILABLE' }, select: { priceMultiplier: true } } },
    orderBy: { departureTime: 'asc' },
  });
  return flights
    .map(({ seats, ...flight }) => ({
      ...flight,
      availableSeatsCount: seats.length,
      lowestPrice: seats.length ? Number(flight.basePrice) * Math.min(...seats.map((s) => Number(s.priceMultiplier))) : null,
    }))
    .filter((flight) => flight.availableSeatsCount >= passengers);
}

// GET /api/flights/search?from=RUH&to=JED&date=YYYY-MM-DD[&returnDate=YYYY-MM-DD][&passengers=1-9][&airline=<id>]
// `data` is the outbound list. With returnDate, `returnFlights` lists to -> from flights on that day.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get('from')?.trim().toUpperCase();
  const to = params.get('to')?.trim().toUpperCase();
  const date = params.get('date');
  const returnDate = params.get('returnDate');
  const airlineId = params.get('airline');
  const rawPassengers = params.get('passengers') ?? '1';

  if (!from || !to || !date) return bad('Missing required search parameters: from, to, or date');
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return bad('from and to must be 3-letter airport codes');
  if (from === to) return bad('from and to must be different airports');
  if (!/^[1-9]$/.test(rawPassengers)) return bad('passengers must be a whole number from 1 to 9');
  const passengers = Number(rawPassengers);

  const outbound = riyadhDay(date);
  if (!outbound) return bad('Invalid date format provided (use YYYY-MM-DD)');
  if (outbound.end < new Date()) return bad('Cannot search for past flights');
  const back = returnDate ? riyadhDay(returnDate) : null;
  if (returnDate && !back) return bad('Invalid returnDate format provided (use YYYY-MM-DD)');
  if (back && back.start < outbound.start) return bad('returnDate must be on or after date');

  try {
    await releaseExpiredHolds(prisma);
    const data = await findFlights(from, to, outbound, passengers, airlineId);
    const returnFlights = back ? await findFlights(to, from, back, passengers, airlineId) : undefined;
    return NextResponse.json({ success: true, data, ...(returnFlights && { returnFlights }), passengers }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to search flights' }, { status: 500 });
  }
}
