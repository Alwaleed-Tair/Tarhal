import { NextResponse } from 'next/server.js';
import { getCurrentUser } from '../../../../lib/auth.ts';
import { prisma } from '../../../../lib/prisma.ts';

// GET /api/bookings/:id — one flight booking of the logged-in traveler, with flight, airline, travelers and seats.
// Someone else's booking answers 404, the same as a missing one, so booking ids cannot be probed.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: (await params).id },
      include: {
        flight: { include: { airline: true } },
        travelers: { include: { seat: { select: { id: true, seatCode: true, ticketClass: true, priceMultiplier: true } } } },
      },
    });
    if (!booking || booking.userId !== user.id) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...booking, type: 'flight' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch booking' }, { status: 500 });
  }
}
