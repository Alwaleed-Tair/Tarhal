import { getCurrentUser } from '../../../lib/auth.ts';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max && !/[\u0000-\u001f\u007f]/.test(v);

/** Reason the travelers list is unusable, or null. One seat per traveler, 1 to 9 travelers. */
function travelersError(travelers: unknown): string | null {
  if (!Array.isArray(travelers) || travelers.length === 0) return 'Missing required booking fields';
  if (travelers.length > 9) return 'A booking can have at most 9 travelers';
  for (const t of travelers) {
    if (!t || typeof t !== 'object' || !t.seatId || !t.fullName || !t.passportNumber || !t.dateOfBirth) {
      return 'Missing traveler details (seatId, fullName, passportNumber, dateOfBirth are required)';
    }
    if (typeof t.seatId !== 'string' || !text(t.fullName, 100) || !text(t.passportNumber, 20)) return 'Traveler details are not valid';
    const dob = new Date(t.dateOfBirth);
    if (typeof t.dateOfBirth !== 'string' || !DAY.test(t.dateOfBirth) || Number.isNaN(dob.getTime()) || dob > new Date() || dob.getUTCFullYear() < 1900) {
      return 'dateOfBirth must be a past date (YYYY-MM-DD)';
    }
  }
  if (new Set(travelers.map((t) => t.seatId)).size !== travelers.length) return 'Each traveler needs a different seat';
  return null;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
    const userId = user.id;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Send a valid JSON object' }, { status: 400 });
    const { flightId, travelers } = body;

    if (!flightId || typeof flightId !== 'string') {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
    }
    const invalid = travelersError(travelers);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const requestedSeatIds: string[] = travelers.map((t: any) => t.seatId);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch flight to securely get the real basePrice on the server
      const flight = await tx.flight.findUnique({
        where: { id: flightId }
      });
      if (!flight) throw new Error("FLIGHT_NOT_FOUND");

      // 2. Fetch all requested seats
      const seats = await tx.seat.findMany({
        where: { id: { in: requestedSeatIds } }
      });
      if (seats.length !== requestedSeatIds.length) throw new Error("SEAT_NOT_FOUND");

      // 3. Check all seats belong to the requested flight
      const allBelongToFlight = seats.every(s => s.flightId === flightId);
      if (!allBelongToFlight) throw new Error("SEAT_FLIGHT_MISMATCH");

      // 4. Calculate the total price securely on the server
      let calculatedTotal = 0;
      for (const seat of seats) {
        calculatedTotal += Number(flight.basePrice) * Number(seat.priceMultiplier);
      }

      // 5. ATOMIC LOCK & HOLD LOGIC: 
      // Update seats ONLY if AVAILABLE, or if HELD but EXPIRED, or currently HELD by THIS user
      const lockedSeats = await tx.seat.updateMany({
        where: { 
          id: { in: requestedSeatIds },
          OR: [
            { status: 'AVAILABLE' },
            { status: 'HELD', heldUntil: { lt: now } },
            { status: 'HELD', heldByUserId: userId }
          ]
        },
        data: { 
          status: 'BOOKED',
          heldUntil: null,     // Clear the hold timer
          heldByUserId: null   // Clear the hold ownership
        }
      });

      // CONCURRENCY CHECK: If another user locked or holds the seat and it hasn't expired
      if (lockedSeats.count !== requestedSeatIds.length) {
        throw new Error("CONCURRENCY_CONFLICT");
      }

      // 6. CREATE BOOKING: Safe to proceed
      const booking = await tx.booking.create({
        data: {
          userId: userId, 
          flightId: flightId,
          basePrice: flight.basePrice, 
          totalPrice: calculatedTotal,
          travelers: {
            create: travelers.map((t: any) => ({
              seatId: t.seatId,
              fullName: t.fullName.trim(),
              passportNumber: t.passportNumber.trim(),
              dateOfBirth: new Date(t.dateOfBirth),
            }))
          }
        }
      });

      return booking;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });

  } catch (error) {
    const err = error as Error;
    if (err.message === "CONCURRENCY_CONFLICT") {
      return NextResponse.json({ error: "One or more seats are unavailable or held by another user" }, { status: 409 });
    }
    if (err.message === "FLIGHT_NOT_FOUND") {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }
    if (err.message === "SEAT_NOT_FOUND") {
      return NextResponse.json({ error: "One or more seats do not exist" }, { status: 404 });
    }
    if (err.message === "SEAT_FLIGHT_MISMATCH") {
      return NextResponse.json({ error: "One or more seats do not belong to the requested flight" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process booking" }, { status: 500 });
  }
}

export async function GET() {
  try {
    // My bookings: always the logged-in user's own bookings (any userId in the URL is ignored).
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      // A seat of a cancelled booking may be held by someone else now, so only the seat's own details are sent.
      include: { flight: { include: { airline: true } }, travelers: { include: { seat: { select: { id: true, seatCode: true, ticketClass: true, priceMultiplier: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: bookings }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
