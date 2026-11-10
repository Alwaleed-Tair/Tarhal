import { cancelBookingForCurrentUser } from '../../../../../lib/bookings.ts';

// POST /api/hotel-bookings/:id/cancel — the owner cancels a hotel booking (a paid one becomes REFUNDED).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return cancelBookingForCurrentUser((await params).id, 'hotel');
}
