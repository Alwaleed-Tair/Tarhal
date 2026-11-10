import { NextResponse } from 'next/server.js';
import { getCurrentUser } from '../../../lib/auth.ts';
import { jsonObject } from '../../../lib/auth-http.ts';
import { prisma } from '../../../lib/prisma.ts';
import { StayError, guestCount, hotelTotal, stayRange } from '../../../lib/stays.ts';

const fail = (status: number, error: string, field?: string) => NextResponse.json({ success: false, error, ...(field && { field }) }, { status });

// POST /api/hotel-bookings { hotelId, checkIn: "YYYY-MM-DD", checkOut: "YYYY-MM-DD", guests? }
// The price is calculated here: nights x the hotel's pricePerNight. The booking starts PENDING (pay with POST /api/payments).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Login required');
  const body = await jsonObject(request);
  if (!body) return fail(400, 'Send a valid JSON object');
  if (typeof body.hotelId !== 'string' || !body.hotelId) return fail(400, 'hotelId is required', 'hotelId');
  try {
    const { start, end, nights } = stayRange(body.checkIn, body.checkOut, ['checkIn', 'checkOut']);
    const guests = guestCount(body.guests);
    const hotel = await prisma.hotel.findUnique({ where: { id: body.hotelId } });
    if (!hotel) return fail(404, 'Hotel not found', 'hotelId');
    const booking = await prisma.hotelBooking.create({
      data: { userId: user.id, hotelId: hotel.id, checkIn: start, checkOut: end, guests, totalPrice: hotelTotal(Number(hotel.pricePerNight), nights) },
      include: { hotel: true },
    });
    return NextResponse.json({ success: true, data: { ...booking, type: 'hotel', nights } }, { status: 201 });
  } catch (error) {
    if (error instanceof StayError) return fail(400, error.message, error.field);
    return fail(500, 'Failed to book the hotel');
  }
}

// GET /api/hotel-bookings — the logged-in traveler's own hotel bookings, newest first.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Login required');
  try {
    const data = await prisma.hotelBooking.findMany({ where: { userId: user.id }, include: { hotel: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: data.map((b) => ({ ...b, type: 'hotel' })) });
  } catch {
    return fail(500, 'Failed to fetch hotel bookings');
  }
}
