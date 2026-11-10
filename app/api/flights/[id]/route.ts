import { NextResponse } from 'next/server.js';
import { prisma } from '../../../../lib/prisma.ts';
import { getCurrentUser } from '../../../../lib/auth.ts';
import { publicSeat, releaseExpiredHolds } from '../../../../lib/seats.ts';

// GET /api/flights/:id — the flight, its airline and the seat map. Seats never say who holds them;
// `heldByMe` marks the logged-in traveler's own holds. Expired holds are released first, so they show as AVAILABLE.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const flightId = (await params).id;
    await releaseExpiredHolds(prisma, [flightId]);
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: { airline: true, seats: { orderBy: { seatCode: 'asc' } } },
    });
    if (!flight) return NextResponse.json({ success: false, error: 'Flight not found' }, { status: 404 });

    const user = await getCurrentUser().catch(() => null);
    const now = new Date();
    return NextResponse.json({ success: true, data: { ...flight, seats: flight.seats.map((s) => publicSeat(s, user?.id ?? null, now)) } }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch flight details' }, { status: 500 });
  }
}
