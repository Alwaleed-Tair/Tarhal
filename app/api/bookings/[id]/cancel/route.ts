import { cancelBookingForCurrentUser } from '../../../../../lib/bookings.ts';

// POST /api/bookings/:id/cancel — the logged-in owner cancels a booking and its seats are released.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return cancelBookingForCurrentUser((await params).id);
}
