import type { Prisma, Seat } from '@prisma/client';

type SeatClient = Pick<Prisma.TransactionClient, 'seat'>;

/** Holds last 10 minutes (POST /api/flights/:id/hold). */
export const HOLD_MINUTES = 10;

/**
 * Turns holds whose time has run out back into AVAILABLE seats, so every route (search counts, seat map, hold, booking)
 * sees the same thing. Pass flight ids to limit the update to those flights.
 */
export async function releaseExpiredHolds(db: SeatClient, flightIds?: string[], now = new Date()) {
  return db.seat.updateMany({
    where: { status: 'HELD', heldUntil: { lt: now }, ...(flightIds && { flightId: { in: flightIds } }) },
    data: { status: 'AVAILABLE', heldUntil: null, heldByUserId: null },
  });
}

/** A seat is free when nobody has it, or when its hold has run out. */
export function seatIsFree(seat: Pick<Seat, 'status' | 'heldUntil'>, now = new Date()) {
  return seat.status === 'AVAILABLE' || (seat.status === 'HELD' && (!seat.heldUntil || seat.heldUntil < now));
}

/**
 * The seat as shown to travelers: never who holds it. `heldByMe` tells the logged-in traveler their own holds apart,
 * and only they see when their hold ends. An expired hold is shown as AVAILABLE.
 */
export function publicSeat(seat: Seat, userId: string | null, now = new Date()) {
  const free = seatIsFree(seat, now);
  const heldByMe = !free && seat.status === 'HELD' && !!userId && seat.heldByUserId === userId;
  return {
    id: seat.id, flightId: seat.flightId, seatCode: seat.seatCode, ticketClass: seat.ticketClass, priceMultiplier: seat.priceMultiplier,
    status: free ? 'AVAILABLE' as const : seat.status,
    free, heldByMe, heldUntil: heldByMe ? seat.heldUntil : null,
  };
}
