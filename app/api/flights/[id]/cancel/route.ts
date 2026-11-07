import { cancelBookingForCurrentUser } from '../../../../../lib/bookings.ts';

// Older path kept for compatibility: the :id here is a BOOKING id, not a flight id.
// Prefer POST /api/bookings/:id/cancel.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return cancelBookingForCurrentUser((await params).id);
}
