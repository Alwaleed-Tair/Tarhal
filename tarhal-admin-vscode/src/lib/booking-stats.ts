import type { Booking, MonthlyRevenue, ResourceRow, RevenueKey, Service, ServiceFilter, User } from '@/data/demoData';
import { isoToRiyadhLocal } from '@/i18n/format';

// Every number on the dashboard, revenue and users pages is computed here from the lists the API returns:
// GET /api/admin/bookings (flight, hotel and car bookings, each with its type) and GET /api/admin/flights (or the demo lists, with the Demo data badge, when the server cannot be reached).

/**
 * Booked value: cancelled bookings and failed or refunded payments bring in no money; pending ones count, because they are still owed.
 * What was really paid (paymentStatus PAID, after the simulated payment or "Mark paid") is shown next to it as "Paid so far".
 */
const earnsRevenue = (booking: Booking) => booking.status !== 'Cancelled' && booking.paymentStatus !== 'FAILED' && booking.paymentStatus !== 'REFUNDED';

/**
 * Bookings count (all of them) and how many are cancelled; booked value (SAR) and the part of it that is paid, without cancelled, failed or refunded bookings;
 * customers with at least one such booking, and all customers. Two accounts can share a name, so customers are counted by account.
 */
export function bookingMetrics(bookings: Booking[], service: ServiceFilter = 'all') {
  const scoped = service === 'all' ? bookings : bookings.filter((booking) => booking.type === service);
  const earning = scoped.filter(earnsRevenue);
  return {
    bookings: scoped.length,
    cancelled: scoped.filter((booking) => booking.status === 'Cancelled').length,
    revenue: earning.reduce((sum, booking) => sum + booking.price, 0),
    paid: earning.filter((booking) => booking.paymentStatus === 'PAID').reduce((sum, booking) => sum + booking.price, 0),
    users: new Set(earning.map((booking) => booking.userId ?? booking.customer)).size,
    allCustomers: new Set(scoped.map((booking) => booking.userId ?? booking.customer)).size,
  };
}


/** Number of flights, how many have not left yet, and the average base price (SAR). */
export function flightMetrics(flights: ResourceRow[], now = Date.now()) {
  return {
    flights: flights.length,
    upcoming: flights.filter((flight) => Date.parse(flight.departureTime ?? '') > now).length,
    averagePrice: flights.length ? flights.reduce((sum, flight) => sum + flight.price, 0) / flights.length : 0,
  };
}

/** Days in a dashboard trend line, and on how many of them bookings must fall before a line is worth drawing. */
export const TREND_DAYS = 14;
export const MIN_ACTIVE_DAYS = 7;

/**
 * Bookings, booked value and customers of each of the last `days` days (Riyadh time, oldest first, today last), for the
 * dashboard's trend lines, and on how many of those days there were bookings.
 */
export function dailyMetrics(bookings: Booking[], service: ServiceFilter = 'all', now = Date.now(), days = TREND_DAYS) {
  const today = Date.parse(`${isoToRiyadhLocal(new Date(now).toISOString()).slice(0, 10)}T00:00:00Z`);
  const keys = Array.from({ length: days }, (_, i) => new Date(today - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
  const index = new Map(keys.map((key, i) => [key, i]));
  const rows = keys.map(() => ({ bookings: 0, revenue: 0, users: new Set<string>() }));
  for (const booking of service === 'all' ? bookings : bookings.filter((row) => row.type === service)) {
    const i = index.get(isoToRiyadhLocal(booking.date).slice(0, 10));
    if (i === undefined) continue;
    rows[i].bookings += 1;
    if (earnsRevenue(booking)) { rows[i].revenue += booking.price; rows[i].users.add(booking.userId ?? booking.customer); }
  }
  return {
    bookings: rows.map((r) => r.bookings), revenue: rows.map((r) => r.revenue), users: rows.map((r) => r.users.size),
    activeDays: rows.filter((r) => r.bookings > 0).length,
  };
}

/** The line only when it means something: bookings on at least MIN_ACTIVE_DAYS of the days, and values that really change. */
export const meaningfulTrend = (series: number[], activeDays: number) => (activeDays >= MIN_ACTIVE_DAYS && new Set(series).size > 1 ? series : undefined);

/** Whole-number change of the last 7 days against the 7 days before, or null when there is nothing to compare with. */
export function weekChange(series: number[]): number | null {
  if (series.length < 14) return null;
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const previous = sum(series.slice(-14, -7));
  if (!previous) return null;
  return Math.round(((sum(series.slice(-7)) - previous) / previous) * 100);
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

export type RevenueBucket = { key: string } & Record<RevenueKey, number>;

/**
 * Revenue (SAR) between two Riyadh days, inclusive ("YYYY-MM-DD"). The bucket size follows the length of the range,
 * so the chart stays readable: days up to a month, months up to two years, then years.
 */
export function revenueBetween(bookings: Booking[], from: string, to: string): { unit: 'day' | 'month' | 'year'; buckets: RevenueBucket[] } {
  const DAY = 86_400_000;
  const start = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`);
  const days = Math.round((end - start) / DAY) + 1;
  const unit = days <= 31 ? 'day' : days <= 731 ? 'month' : 'year';
  const length = unit === 'day' ? 10 : unit === 'month' ? 7 : 4;
  const buckets = new Map<string, RevenueBucket>();
  for (let time = start; time <= end; time += DAY) {
    const key = new Date(time).toISOString().slice(0, length);
    if (!buckets.has(key)) buckets.set(key, { key, cars: 0, flights: 0, hotels: 0 });
  }
  for (const booking of bookings.filter(earnsRevenue)) {
    const day = isoToRiyadhLocal(booking.date).slice(0, 10);
    if (day && day >= from && day <= to) buckets.get(day.slice(0, length))![SERIES[booking.type]] += booking.price;
  }
  return { unit, buckets: [...buckets.values()] };
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
