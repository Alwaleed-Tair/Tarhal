import { NextResponse } from 'next/server.js';
import { getCurrentUser } from '../../../../lib/auth.ts';
import { prisma } from '../../../../lib/prisma.ts';

// GET /api/hotel-bookings/:id — one of the logged-in traveler's hotel bookings; anyone else's answers 404.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  try {
    const booking = await prisma.hotelBooking.findUnique({ where: { id: (await params).id }, include: { hotel: true } });
    if (!booking || booking.userId !== user.id) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...booking, type: 'hotel' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch booking' }, { status: 500 });
  }
}
