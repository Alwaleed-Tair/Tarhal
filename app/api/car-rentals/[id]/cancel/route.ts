import { cancelBookingForCurrentUser } from '../../../../../lib/bookings.ts';

// POST /api/car-rentals/:id/cancel — the owner cancels a car rental (a paid one becomes REFUNDED).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return cancelBookingForCurrentUser((await params).id, 'car');
}
