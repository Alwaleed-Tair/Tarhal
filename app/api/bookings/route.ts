import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, flightId, travelers, basePrice } = body;

    if (!userId || !flightId || !travelers || travelers.length === 0) {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 });
    }

    const requestedSeatIds = travelers.map((t: any) => t.seatId);
    const calculatedTotal = basePrice * travelers.length;

    const result = await prisma.$transaction(async (tx) => {
      // 1. ATOMIC LOCK: Attempt to update the seats ONLY if they are currently AVAILABLE
      const lockedSeats = await tx.seat.updateMany({
        where: { 
          id: { in: requestedSeatIds },
          status: 'AVAILABLE' 
        },
        data: { status: 'BOOKED' }
      });

      // 2. CONCURRENCY CHECK: If another user locked the seat milliseconds before us, the count will mismatch
      if (lockedSeats.count !== requestedSeatIds.length) {
        throw new Error("CONCURRENCY_CONFLICT");
      }

      // 3. CREATE BOOKING: Safe to proceed
      const booking = await tx.booking.create({
        data: {
          userId: userId,
          flightId: flightId,
          basePrice: basePrice,
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

  } catch (error: any) {
    if (error.message === "CONCURRENCY_CONFLICT") {
      return NextResponse.json({ error: "One or more seats were just booked by another user" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to process booking" }, { status: 500 });
  }
}