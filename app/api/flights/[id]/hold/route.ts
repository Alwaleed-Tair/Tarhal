import { NextResponse } from 'next/server.js';
import { getCurrentUser } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { HOLD_MINUTES, releaseExpiredHolds } from '../../../../../lib/seats.ts';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Login required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const flightId = (await params).id;
    const body = await request.json().catch(() => null);
    const seatIds = body?.seatIds;

    if (!Array.isArray(seatIds) || seatIds.length === 0 || seatIds.length > 9 || !seatIds.every((id) => typeof id === 'string' && id.length <= 64) || new Set(seatIds).size !== seatIds.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid seat selection', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 0. Holds that have run out are free again for everyone.
      await releaseExpiredHolds(tx, [flightId]);

      // 1. Fetch the requested seats
      const seats = await tx.seat.findMany({
        where: { id: { in: seatIds }, flightId },
      });

      if (seats.length !== seatIds.length) {
        throw new Error('SEAT_NOT_FOUND');
      }

      const now = new Date();

      // 2. Check if any seat is already taken by someone else
      for (const seat of seats) {
        const isAvailable = seat.status === 'AVAILABLE';
        const isExpiredHold = seat.status === 'HELD' && seat.heldUntil && seat.heldUntil < now;
        const isMyHold = seat.status === 'HELD' && seat.heldByUserId === user.id;

        if (!isAvailable && !isExpiredHold && !isMyHold) {
          throw new Error('SEAT_UNAVAILABLE');
        }
      }

      // 3. Release the user's OTHER holds on this specific flight
      await tx.seat.updateMany({
        where: {
          flightId,
          heldByUserId: user.id,
          status: 'HELD',
          id: { notIn: seatIds },
        },
        data: {
          status: 'AVAILABLE',
          heldUntil: null,
          heldByUserId: null,
        },
      });

      // 4. Hold the newly requested seats for 10 minutes
      const heldUntil = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);
      // Only seats that are still free (or already this traveler's) are taken, so two travelers racing for a seat cannot both win.
      const held = await tx.seat.updateMany({
        where: {
          id: { in: seatIds }, flightId,
          OR: [{ status: 'AVAILABLE' }, { status: 'HELD', heldByUserId: user.id }, { status: 'HELD', heldUntil: { lt: now } }],
        },
        data: {
          status: 'HELD',
          heldUntil,
          heldByUserId: user.id,
        },
      });
      if (held.count !== seatIds.length) throw new Error('SEAT_UNAVAILABLE');

      return { heldUntil };
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    const err = error as Error;
    if (err.message === 'SEAT_UNAVAILABLE') {
      return NextResponse.json(
        { success: false, error: 'One or more seats are already taken', code: 'SEAT_UNAVAILABLE' },
        { status: 409 }
      );
    }
    if (err.message === 'SEAT_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: 'Invalid seat selection for this flight', code: 'SEAT_NOT_FOUND' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to hold seats', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}