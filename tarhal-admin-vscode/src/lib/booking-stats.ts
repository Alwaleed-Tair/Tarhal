import type { Booking, MonthlyRevenue, RevenueKey, Service, ServiceFilter, User } from '@/data/demoData';
import { isoToRiyadhLocal } from '@/i18n/format';

// Every number on the dashboard, revenue and users pages is computed here from the bookings list
// (GET /api/admin/bookings, or the demo bookings with the Demo data badge when that request fails).

/** Cancelled bookings and failed or refunded payments bring in no money. Pending payments count: the app has no payment step yet. */
const earnsRevenue = (booking: Booking) => booking.status !== 'Cancelled' && booking.paymentStatus !== 'FAILED' && booking.paymentStatus !== 'REFUNDED';

/** Bookings count, revenue (SAR) and number of different customers with a booking that counts as revenue. */
export function bookingMetrics(bookings: Booking[], service: ServiceFilter = 'all') {
  const scoped = service === 'all' ? bookings : bookings.filter((booking) => booking.type === service);
  const earning = scoped.filter(earnsRevenue);
  return {
    bookings: scoped.length,
    revenue: earning.reduce((sum, booking) => sum + booking.price, 0),
    users: new Set(earning.map((booking) => booking.userId ?? booking.customer)).size,
  };
}

/** Bookings, revenue and customers of each month of `year` so far (Riyadh time), for the dashboard's trend lines. */
export function monthlyMetrics(bookings: Booking[], year: number, service: ServiceFilter = 'all') {
  const scoped = service === 'all' ? bookings : bookings.filter((booking) => booking.type === service);
  const months = Array.from({ length: new Date().getMonth() + 1 }, () => ({ bookings: 0, revenue: 0, users: new Set<string>() }));
  for (const booking of scoped) {
    const local = isoToRiyadhLocal(booking.date);
    const month = months[Number(local.slice(5, 7)) - 1];
    if (Number(local.slice(0, 4)) !== year || !month) continue;
    month.bookings += 1;
    if (earnsRevenue(booking)) { month.revenue += booking.price; month.users.add(booking.userId ?? booking.customer); }
  }
  return { bookings: months.map((m) => m.bookings), revenue: months.map((m) => m.revenue), users: months.map((m) => m.users.size) };
}

/** Whole-number change from last month to this month, or null when last month is empty or there is no last month. */
export function monthChange(series: number[]): number | null {
  const previous = series[series.length - 2];
  if (!previous) return null;
  return Math.round(((series[series.length - 1] - previous) / previous) * 100);
}

const SERIES: Record<Service, RevenueKey> = { flight: 'flights', hotel: 'hotels', car: 'cars' };

/** Revenue (SAR) of each month of `year`, by service, in Riyadh time. Always returns 12 rows. */
export function monthlyRevenue(bookings: Booking[], year: number): MonthlyRevenue[] {
  const months: MonthlyRevenue[] = Array.from({ length: 12 }, (_, monthIndex) => ({ monthIndex, cars: 0, flights: 0, hotels: 0 }));
  for (const booking of bookings.filter(earnsRevenue)) {
    const local = isoToRiyadhLocal(booking.date); // "2026-11-08T14:30"
    if (Number(local.slice(0, 4)) === year) months[Number(local.slice(5, 7)) - 1][SERIES[booking.type]] += booking.price;
  }
  return months;
}

/** API booking ids are 36-character UUIDs: tables show the start (with the full id as a tooltip). Demo ids are short and stay as they are. */
export const shortId = (id: string) => (id.length > 12 ? `${id.slice(0, 8)}…` : id);

/** One row per customer found in the bookings (the API has no users endpoint yet). */
export function customersFromBookings(bookings: Booking[]): User[] {
  const customers = new Map<string, User>();
  for (const booking of bookings) {
    const id = booking.userId ?? booking.customer;
    const known = customers.get(id);
    if (known) known.bookings += 1;
    else customers.set(id, { id, name: booking.customer, email: booking.email ?? '', phone: booking.phone, date: '', bookings: 1, status: 'Active' });
  }
  return [...customers.values()];
}
