import { flights as demoFlights, initialResources, type Booking, type ResourceRow } from '@/data/demoData';
import { useAdminData } from '@/hooks/use-admin-data';
import { bookingService } from '@/services/bookingService';
import { carService } from '@/services/carService';
import { flightService } from '@/services/flightService';
import { hotelService } from '@/services/hotelService';
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

export type CatalogSummary = { total: number; averagePrice: number };
const NO_SUMMARY: CatalogSummary = { total: 0, averagePrice: 0 };
/** The most rows GET /api/hotels and GET /api/cars return per page (lib/catalog-filters.ts). */
const API_MAX_PAGE_SIZE = 100;

const averagePrice = (rows: ResourceRow[]) => (rows.length ? rows.reduce((sum, row) => sum + row.price, 0) / rows.length : 0);

/**
 * Number of hotels or available cars, and their average price, from every page of the API.
 * If the rows do not add up to the API's total, the load fails: a partial average would be a wrong number.
 */
async function loadCatalogSummary(kind: 'hotel' | 'car'): Promise<CatalogSummary> {
  const list = (page: number) => (kind === 'hotel' ? hotelService : carService).list({ page, pageSize: API_MAX_PAGE_SIZE });
  const first = await list(1);
  const rest = await Promise.all(Array.from({ length: Math.max(0, (first.pagination?.totalPages ?? 1) - 1) }, (_, index) => list(index + 2)));
  const rows = [first, ...rest].flatMap((page) => page.rows);
  const total = first.pagination?.total ?? rows.length;
  if (rows.length !== total) throw new Error('The catalog changed while it was loading.');
  return { total, averagePrice: averagePrice(rows) };
}

/** GET /api/hotels or GET /api/cars, for the Dashboard. The API only lists available cars. */
export function useCatalogSummary(kind: 'hotel' | 'car') {
  const demo = () => ({ total: initialResources[kind].length, averagePrice: averagePrice(initialResources[kind]) });
  return useAdminData<CatalogSummary>(() => loadCatalogSummary(kind), demo, NO_SUMMARY, `catalog-${kind}`);
}
