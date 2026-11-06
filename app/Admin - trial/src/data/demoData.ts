export type Service = 'flight' | 'hotel' | 'car';
export type ServiceFilter = 'all' | Service;
export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled';
export type UserStatus = 'Active' | 'Inactive' | 'Deleted';

export type DashboardMetrics = {
  bookings: number;
  revenue: number;
  users: number;
};

/** Raw numbers: the UI formats them per language (see `@/i18n/format`). */
// INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
// Dashboard totals come from the bookings API.
export const metricsByService: Record<ServiceFilter, DashboardMetrics> = {
  all: { bookings: 7483, revenue: 142670, users: 3280 },
  flight: { bookings: 3812, revenue: 78430, users: 1840 },
  hotel: { bookings: 2106, revenue: 42980, users: 925 },
  car: { bookings: 1565, revenue: 21260, users: 515 },
};

/** One row of the Flights / Hotels / Car Rentals management tables. */
export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First Class';
export const CABIN_CLASSES: CabinClass[] = ['Economy', 'Premium Economy', 'Business', 'First Class'];

export type ResourceRow = {
  id: string;
  /** Backend id when the row came from the API. */
  apiId?: string | number;
  airline?: string;
  cabinClass?: CabinClass;
  route?: string;
  city?: string;
  room?: string;
  location?: string;
  availability?: string;
  price: number;
  status: string;
};

// INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
export const flights: ResourceRow[] = [
  { id: 'SV-102', airline: 'Saudia', cabinClass: 'Economy', route: 'DDM → RUH', price: 100, status: 'Scheduled' },
  { id: 'SV-202', airline: 'Flynas', cabinClass: 'Business', route: 'AMM → DOH', price: 267, status: 'Boarding' },
  { id: 'SV-327', airline: 'Emirates', cabinClass: 'First Class', route: 'RUH → DXB', price: 300, status: 'Boarding' },
];
// INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
export const hotels: ResourceRow[] = [
  { id: 'Hilton Garden', city: 'Riyadh', room: 'King Suite', price: 100, status: 'Available' },
  { id: 'The Boulevard', city: 'Dubai', room: 'Deluxe', price: 267, status: 'Available' },
  { id: 'Mövenpick', city: 'Amman', room: 'Twin Room', price: 300, status: 'Limited' },
];
// INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
export const cars: ResourceRow[] = [
  { id: 'Toyota Camry', location: 'Riyadh', availability: '12 available', price: 100, status: 'Available' },
  { id: 'Kia Carnival', location: 'Dubai', availability: '6 available', price: 267, status: 'Available' },
  { id: 'BMW 3 Series', location: 'Doha', availability: '2 available', price: 300, status: 'Limited' },
];

export const initialResources: Record<Service, ResourceRow[]> = { flight: flights, hotel: hotels, car: cars };

export type Booking = {
  id: string;
  type: Service;
  customer: string;
  /** ISO local date-time, e.g. "2026-09-12T08:30". */
  date: string;
  price: number;
  status: BookingStatus;
};

// INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
export const bookings: Booking[] = [
  { id: 'BK-1001', type: 'flight', customer: 'Sara Al-Otaibi', date: '2026-09-12T08:30', price: 267, status: 'Cancelled' },
  { id: 'BK-1002', type: 'car', customer: 'Khalid Al-Ghamdi', date: '2026-09-21T19:10', price: 300, status: 'Pending' },
  { id: 'BK-1003', type: 'hotel', customer: 'Zayn Malik', date: '2026-09-12T15:30', price: 1250, status: 'Confirmed' },
  { id: 'BK-1004', type: 'flight', customer: 'Omar Faraj', date: '2027-02-11T23:55', price: 123, status: 'Confirmed' },
];

export type User = {
  id: string;
  name: string;
  email: string;
  /** ISO date, e.g. "2026-09-12". */
  date: string;
  bookings: number;
  status: UserStatus;
};

// INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
// Users belong to the auth service.
export const users: User[] = [
  { id: '6738', name: 'Sara Al-Otaibi', email: 'sara@tarhal.com', date: '2026-09-12', bookings: 7, status: 'Inactive' },
  { id: '26252', name: 'Khalid Al-Ghamdi', email: 'khalid@tarhal.com', date: '2026-09-21', bookings: 3, status: 'Deleted' },
  { id: '2637', name: 'Zayn Malik', email: 'zayn@tarhal.com', date: '2026-09-12', bookings: 5, status: 'Active' },
  { id: '26372', name: 'Omar Faraj', email: 'omar@tarhal.com', date: '2027-02-11', bookings: 9, status: 'Active' },
];

export type RevenueKey = 'cars' | 'flights' | 'hotels';
export type MonthlyRevenue = { monthIndex: number } & Record<RevenueKey, number>;

/**
 * Mock monthly revenue in USD for 2026 (Jan-Dec). `monthIndex` is 0-based; the month name is
 * localised at render time. Each series sums to the matching figure in `metricsByService`.
 */
// INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
// Monthly revenue is an aggregate of bookings.
export const monthlyRevenue: MonthlyRevenue[] = [
  { monthIndex: 0, cars: 1300, flights: 4100, hotels: 2600 },
  { monthIndex: 1, cars: 1200, flights: 3900, hotels: 2400 },
  { monthIndex: 2, cars: 1500, flights: 5200, hotels: 2900 },
  { monthIndex: 3, cars: 1600, flights: 5600, hotels: 3100 },
  { monthIndex: 4, cars: 1700, flights: 5900, hotels: 3300 },
  { monthIndex: 5, cars: 1800, flights: 6300, hotels: 3500 },
  { monthIndex: 6, cars: 2300, flights: 7800, hotels: 4600 },
  { monthIndex: 7, cars: 2700, flights: 8600, hotels: 5200 },
  { monthIndex: 8, cars: 2400, flights: 9100, hotels: 4700 },
  { monthIndex: 9, cars: 1900, flights: 7700, hotels: 3800 },
  { monthIndex: 10, cars: 1400, flights: 6400, hotels: 3400 },
  { monthIndex: 11, cars: 1460, flights: 7830, hotels: 3480 },
];
