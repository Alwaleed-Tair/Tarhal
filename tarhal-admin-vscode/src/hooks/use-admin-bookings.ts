import type { Booking } from '@/data/demoData';
import { useLiveData } from '@/hooks/use-live-data';
import { bookingService } from '@/services/bookingService';
import { useDemoState } from '@/store/demoStore';

/**
 * GET /api/admin/bookings. If it fails (server offline, no admin session) `offline` is true and the rows are the demo bookings.
 * `enabled: false` skips the request, for a page that shares this hook but does not use the bookings.
 */
export function useAdminBookings(enabled = true) {
  const { bookings: demoBookings } = useDemoState();
  const live = useLiveData<Booking[]>(() => (enabled ? bookingService.list() as Promise<Booking[]> : Promise.resolve([])), () => demoBookings, `bookings-${enabled}`);
  return { ...live, bookings: live.offline ? demoBookings : live.data };
}
