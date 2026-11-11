import { NextResponse } from 'next/server.js';
import type { PaymentStatus, Prisma } from '@prisma/client';
import { getCurrentUser } from './auth.ts';
import { prisma } from './prisma.ts';

/** The three kinds of booking: flight (Booking), hotel (HotelBooking) and car (CarRental). */
export const BOOKING_TYPES = ['flight', 'hotel', 'car'] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];
export const isBookingType = (value: unknown): value is BookingType => BOOKING_TYPES.includes(value as BookingType);

/** A booking problem with the HTTP status it should be answered with. */
export class BookingError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
const notFound = () => new BookingError(404, 'BOOKING_NOT_FOUND', 'Booking not found');

type Tx = Prisma.TransactionClient;
type Row = { id: string; userId: string; isActive: boolean; paymentStatus: PaymentStatus };

async function findRow(tx: Tx, type: BookingType, id: string): Promise<Row | null> {
  const select = { id: true, userId: true, isActive: true, paymentStatus: true } as const;
  if (type === 'flight') return tx.booking.findUnique({ where: { id }, select });
  if (type === 'hotel') return tx.hotelBooking.findUnique({ where: { id }, select });
  return tx.carRental.findUnique({ where: { id }, select });
}

async function updateRow(tx: Tx, type: BookingType, id: string, data: { isActive?: boolean; paymentStatus?: PaymentStatus }) {
  if (type === 'flight') return tx.booking.update({ where: { id }, data });
  if (type === 'hotel') return tx.hotelBooking.update({ where: { id }, data });
  return tx.carRental.update({ where: { id }, data });
}

/**
 * Cancels a booking of any type. A paid booking becomes REFUNDED (payments are simulated). Flight seats go back to AVAILABLE.
 * With `ownerId`, someone else's booking is reported as "not found" so ids cannot be probed. Without it (admin), any booking.
 */
export async function cancelBooking(type: BookingType, id: string, ownerId?: string) {
  return prisma.$transaction(async (tx) => {
    const row = await findRow(tx, type, id);
    if (!row || (ownerId && row.userId !== ownerId)) throw notFound();
    if (!row.isActive) throw new BookingError(409, 'ALREADY_CANCELED', 'Booking is already canceled');
    const updated = await updateRow(tx, type, id, { isActive: false, ...(row.paymentStatus === 'PAID' && { paymentStatus: 'REFUNDED' as const }) });
    if (type === 'flight') {
      const travelers = await tx.bookingTraveler.findMany({ where: { bookingId: id }, select: { seatId: true } });
      await tx.seat.updateMany({
        where: { id: { in: travelers.map((t) => t.seatId) }, status: 'BOOKED' },
        data: { status: 'AVAILABLE', heldUntil: null, heldByUserId: null },
      });
    }
    return updated;
  });
}

/**
 * Simulated payment: marks an active, unpaid booking as PAID. No card details are taken or stored.
 * With `ownerId`, only the owner can pay (others get 404). Already paid or cancelled bookings answer 409.
 */
export async function payBooking(type: BookingType, id: string, ownerId?: string) {
  return prisma.$transaction(async (tx) => {
    const row = await findRow(tx, type, id);
    if (!row || (ownerId && row.userId !== ownerId)) throw notFound();
    if (!row.isActive) throw new BookingError(409, 'BOOKING_CANCELED', 'A cancelled booking cannot be paid');
    if (row.paymentStatus === 'PAID') throw new BookingError(409, 'ALREADY_PAID', 'Booking is already paid');
    if (row.paymentStatus === 'REFUNDED') throw new BookingError(409, 'BOOKING_REFUNDED', 'A refunded booking cannot be paid again');
    return updateRow(tx, type, id, { paymentStatus: 'PAID' });
  });
}

/** JSON answer for a thrown BookingError; anything else is a plain 500 without details. */
export function bookingErrorResponse(error: unknown, fallback: string) {
  if (error instanceof BookingError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}

/**
 * Cancels a flight booking owned by the logged-in user and releases its seats.
 * Used by POST /api/bookings/[id]/cancel, /api/hotel-bookings/[id]/cancel and /api/car-rentals/[id]/cancel.
 */
export async function cancelBookingForCurrentUser(bookingId: string, type: BookingType = 'flight') {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await cancelBooking(type, bookingId, user.id) }, { status: 200 });
  } catch (error) {
    return bookingErrorResponse(error, 'Failed to cancel booking');
  }
}
