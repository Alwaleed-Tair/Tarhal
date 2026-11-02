import { NextResponse } from 'next/server';
// Switched to the shared Prisma client as required
import { prisma } from '../../../lib/prisma';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // basePrice is deliberately removed from the client destructuring
    const { userId, flightId, travelers } = body;

    if (!userId || !flightId || !travelers || !Array.isArray(travelers) || travelers.length === 0) {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
    }

    // Validate traveler fields
    for (const t of travelers) {
      if (!t.seatId || !t.fullName || !t.passportNumber || !t.dateOfBirth) {
        return NextResponse.json({ 
          error: "Missing traveler details (seatId, fullName, passportNumber, dateOfBirth are required)" 
        }, { status: 400 });
      }
    }

    const requestedSeatIds = travelers.map((t: any) => t.seatId);

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

      // 4. Calculate the total price securely on the server (flight.basePrice × seat.priceMultiplier)
      let calculatedTotal = 0;
      for (const seat of seats) {
        calculatedTotal += Number(flight.basePrice) * Number(seat.priceMultiplier);
      }

      // 5. ATOMIC LOCK: Attempt to update the seats ONLY if they are currently AVAILABLE
      const lockedSeats = await tx.seat.updateMany({
        where: { 
          id: { in: requestedSeatIds },
          status: 'AVAILABLE' 
        },
        data: { status: 'BOOKED' }
      });

      // CONCURRENCY CHECK: If another user locked the seat milliseconds before us
      if (lockedSeats.count !== requestedSeatIds.length) {
        throw new Error("CONCURRENCY_CONFLICT");
      }

      // 6. CREATE BOOKING: Safe to proceed
      const booking = await tx.booking.create({
        data: {
          userId: userId,
          flightId: flightId,
          basePrice: flight.basePrice, // Safely sourced from DB
          totalPrice: calculatedTotal,
          travelers: {
            create: travelers.map((t: any) => ({
              seatId: t.seatId,
              fullName: t.fullName,
              passportNumber: t.passportNumber,
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
      return NextResponse.json({ error: "One or more seats were just booked by another user" }, { status: 409 });
    }
    if (err.message === "FLIGHT_NOT_FOUND") {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }
    if (err.message === "SEAT_FLIGHT_MISMATCH") {
      return NextResponse.json({ error: "One or more seats do not belong to the requested flight" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process booking" }, { status: 500 });
  }
}