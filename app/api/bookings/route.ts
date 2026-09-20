import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, flightId, travelers, basePrice } = body;

    if (!userId || !flightId || !travelers || travelers.length === 0) {
      return NextResponse.json(
        { error: "Missing required booking fields" }, 
        { status: 400 }
      );
    }

    // 1. VALIDATION: Extract the seat IDs the user is trying to book
    const requestedSeatIds = travelers.map((t: any) => t.seatId);

    // 2. VALIDATION: Check if those exact seats exist, belong to this flight, and are AVAILABLE
    const availableSeats = await prisma.seat.findMany({
      where: {
        id: { in: requestedSeatIds },
        flightId: flightId,
        status: 'AVAILABLE'
      }
    });

    // If the database returns fewer seats than requested, someone else booked them or they are invalid
    if (availableSeats.length !== requestedSeatIds.length) {
      return NextResponse.json({ 
        error: "One or more selected seats are invalid or no longer available" 
      }, { status: 400 });
    }

    const calculatedTotal = basePrice * travelers.length;

    // 3. TRANSACTION: Safely create the booking AND update the seats to BOOKED simultaneously
    const result = await prisma.$transaction(async (tx) => {
      
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

      await tx.seat.updateMany({
        where: { id: { in: requestedSeatIds } },
        data: { status: 'BOOKED' }
      });

      return booking;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: "Failed to process booking" }, { status: 500 });
  }
}