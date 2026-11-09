import { flights as demoFlights, type Booking, type ResourceRow } from '@/data/demoData';
import { useAdminData } from '@/hooks/use-admin-data';
import { bookingService } from '@/services/bookingService';
import { flightService } from '@/services/flightService';
import { useDemoState } from '@/store/demoStore';

const NO_BOOKINGS: Booking[] = [];
const NO_FLIGHTS: ResourceRow[] = [];

/** GET /api/admin/bookings. The demo bookings stay reactive, because the demo status dropdown edits them. */
export function useAdminBookings() {
  const { bookings: demoBookings } = useDemoState();
  const live = useAdminData<Booking[]>(() => bookingService.list() as Promise<Booking[]>, () => demoBookings, NO_BOOKINGS, 'bookings');
  return { ...live, bookings: live.offline ? demoBookings : live.data };
}

/** GET /api/admin/flights. */
export function useAdminFlights() {
  const live = useAdminData<ResourceRow[]>(() => flightService.adminList(), () => demoFlights, NO_FLIGHTS, 'flights');
  return { ...live, flights: live.data };
}
