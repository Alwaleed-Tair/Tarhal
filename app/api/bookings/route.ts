import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, flightId, travelers, basePrice } = body;

    // 1. Validate the incoming data payload
    if (!userId || !flightId || !travelers || travelers.length === 0) {
      return NextResponse.json(
        { error: "Missing required booking fields" }, 
        { status: 400 }
      );
    }

    // 2. Calculate the total price (simplistic logic for MVP)
    const calculatedTotal = basePrice * travelers.length;

    // 3. Create the booking and travelers in a single database transaction
    const booking = await prisma.booking.create({
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
      },
      include: {
        travelers: true // Return traveler data to confirm success
      }
    });

    return NextResponse.json({ success: true, data: booking }, { status: 201 });

  } catch (error) {
    console.error("Booking creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create booking. Ensure seats exist and are available." }, 
      { status: 500 }
    );
  }
}