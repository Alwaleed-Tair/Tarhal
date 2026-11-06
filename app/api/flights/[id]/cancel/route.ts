import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma'; 

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const bookingId = resolvedParams.id;

    // TODO (5/11): Mohammed, add session check here to ensure the user owns this booking before allowing cancellation.

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { travelers: true }
      });

      if (!booking) throw new Error("BOOKING_NOT_FOUND");
      if (!booking.isActive) throw new Error("ALREADY_CANCELED");

      // Set booking to inactive
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { isActive: false }
      });

      // Release seats back to AVAILABLE
      const seatIds = booking.travelers.map((t: any) => t.seatId);
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: 'AVAILABLE' }
      });

      return updatedBooking;
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });

  } catch (error) {
    const err = error as Error;
    if (err.message === "BOOKING_NOT_FOUND") return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (err.message === "ALREADY_CANCELED") return NextResponse.json({ error: "Booking is already canceled" }, { status: 400 });
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}