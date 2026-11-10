import { NextResponse } from 'next/server.js';
import { getCurrentUser } from '../../../../lib/auth.ts';
import { prisma } from '../../../../lib/prisma.ts';

// GET /api/car-rentals/:id — one of the logged-in traveler's car rentals; anyone else's answers 404.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  try {
    const rental = await prisma.carRental.findUnique({ where: { id: (await params).id }, include: { car: true } });
    if (!rental || rental.userId !== user.id) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...rental, type: 'car' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch booking' }, { status: 500 });
  }
}
