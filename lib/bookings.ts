import { NextResponse } from 'next/server';
import { getCurrentUser } from './auth.ts';
import { prisma } from './prisma.ts';

/**
 * Cancels a flight booking owned by the logged-in user and releases its seats.
 * Used by POST /api/bookings/[id]/cancel (and the older /api/flights/[id]/cancel path).
 */
export async function cancelBookingForCurrentUser(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { travelers: true },
      });

      // Another user's booking is reported as "not found" so IDs cannot be probed.
      if (!booking || booking.userId !== user.id) throw new Error('BOOKING_NOT_FOUND');
      if (!booking.isActive) throw new Error('ALREADY_CANCELED');

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { isActive: false },
      });

      // Release the seats back to AVAILABLE and clear any hold.
      await tx.seat.updateMany({
        where: { id: { in: booking.travelers.map((t) => t.seatId) } },
        data: { status: 'AVAILABLE', heldUntil: null, heldByUserId: null },
      });

      return updatedBooking;
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'BOOKING_NOT_FOUND') return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (err.message === 'ALREADY_CANCELED') return NextResponse.json({ error: 'Booking is already canceled' }, { status: 400 });
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
