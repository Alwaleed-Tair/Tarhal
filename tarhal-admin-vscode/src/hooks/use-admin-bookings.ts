import type { Booking } from '@/data/demoData';
import { useLiveData } from '@/hooks/use-live-data';
import { bookingService } from '@/services/bookingService';
import { useDemoState } from '@/store/demoStore';

/** GET /api/admin/bookings. If it fails (server offline, no admin session) `offline` is true and the rows are the demo bookings. */
export function useAdminBookings() {
  const { bookings: demoBookings } = useDemoState();
  const live = useLiveData<Booking[]>(() => bookingService.list() as Promise<Booking[]>, () => demoBookings, 'bookings');
  return { ...live, bookings: live.offline ? demoBookings : live.data };
}
