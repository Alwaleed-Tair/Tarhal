import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth.ts';
import { jsonObject } from '../../../lib/auth-http.ts';
import { BOOKING_TYPES, bookingErrorResponse, isBookingType, payBooking } from '../../../lib/bookings.ts';

// POST /api/payments { type: "flight" | "hotel" | "car", bookingId }
// SIMULATED payment: no card details are sent, taken or stored. The owner's active, unpaid booking becomes PAID.
// 404 for a booking that is not theirs, 409 when it is already paid or cancelled.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  const body = await jsonObject(request);
  if (!body) return NextResponse.json({ success: false, error: 'Send a valid JSON object' }, { status: 400 });
  if (!isBookingType(body.type)) return NextResponse.json({ success: false, error: `type must be one of: ${BOOKING_TYPES.join(', ')}`, field: 'type' }, { status: 400 });
  if (typeof body.bookingId !== 'string' || !body.bookingId) return NextResponse.json({ success: false, error: 'bookingId is required', field: 'bookingId' }, { status: 400 });
  try {
    const booking = await payBooking(body.type, body.bookingId, user.id);
    return NextResponse.json({ success: true, simulated: true, data: { id: booking.id, type: body.type, paymentStatus: booking.paymentStatus, totalPrice: booking.totalPrice } });
  } catch (error) {
    return bookingErrorResponse(error, 'Payment failed');
  }
}
