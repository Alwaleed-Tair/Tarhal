export type Service = 'flight' | 'hotel' | 'car';
export type ServiceFilter = 'all' | Service;
export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled';
export type UserStatus = 'Active' | 'Inactive' | 'Deleted';

// INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
// Dashboard totals come from the bookings API (see `@/lib/booking-stats`). Amounts in this file are SAR, like the API.

/** One row of the Flights / Hotels / Cars tables. `id` is what the table shows first: flight number, hotel name, or "make model year". */
export type ResourceRow = {
  id: string;
  /** Backend id when the row came from the API. */
  apiId?: string | number;
  /** SAR: basePrice, pricePerNight or pricePerDay. */
  price: number;
  // Flights: what the form sends, plus the Arabic name and the UTC times from the API.
  airline?: string;
  airlineId?: string;
  airlineAr?: string;
  departureTime?: string;
  arrivalTime?: string;
  route?: string;
  // Hotels and cars.
  city?: string;
  imageUrl?: string;
  // Hotels.
  address?: string;
  roomType?: string;
  rating?: number;
  // Cars.
  make?: string;
  model?: string;
  year?: number;
  seats?: number;
  category?: string;
  transmission?: string;
  insurancePricePerDay?: number;
  isAvailable?: boolean;
};

export const flights: ResourceRow[] = [
  { id: 'SV-102', airline: 'Saudia', airlineId: 'Saudia', departureTime: '2027-01-10T08:00:00.000Z', arrivalTime: '2027-01-10T09:30:00.000Z', route: 'DDM → RUH', price: 100 },
  { id: 'SV-202', airline: 'Flynas', airlineId: 'Flynas', departureTime: '2027-01-12T14:00:00.000Z', arrivalTime: '2027-01-12T16:30:00.000Z', route: 'AMM → DOH', price: 267 },
  { id: 'SV-327', airline: 'Emirates', airlineId: 'Emirates', departureTime: '2027-01-15T06:00:00.000Z', arrivalTime: '2027-01-15T08:00:00.000Z', route: 'RUH → DXB', price: 300 },
];
export const hotels: ResourceRow[] = [
  { id: 'Hilton Garden', city: 'Riyadh', roomType: 'King Suite', rating: 4.5, price: 100 },
  { id: 'The Boulevard', city: 'Dubai', roomType: 'Deluxe', rating: 4.2, price: 267 },
  { id: 'Mövenpick', city: 'Amman', roomType: 'Twin Room', rating: 4, price: 300 },
];
export const cars: ResourceRow[] = [
  { id: 'Toyota Camry 2024', make: 'Toyota', model: 'Camry', year: 2024, seats: 5, category: 'Sedan', transmission: 'AUTOMATIC', city: 'Riyadh', price: 100, insurancePricePerDay: 20, isAvailable: true },
  { id: 'Kia Carnival 2023', make: 'Kia', model: 'Carnival', year: 2023, seats: 7, category: 'Van', transmission: 'AUTOMATIC', city: 'Dubai', price: 267, insurancePricePerDay: 30, isAvailable: true },
  { id: 'BMW 3 Series 2024', make: 'BMW', model: '3 Series', year: 2024, seats: 5, category: 'Luxury', transmission: 'MANUAL', city: 'Doha', price: 300, insurancePricePerDay: 40, isAvailable: true },
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
  /** Only on rows from GET /api/admin/bookings. */
  userId?: string;
  email?: string;
  phone?: string;
  paymentStatus?: string;
};

// INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
export const bookings: Booking[] = [
  { id: 'BK-1001', type: 'flight', customer: 'Sara Al-Otaibi', date: '2026-09-12T08:30', price: 267, status: 'Cancelled' },
  { id: 'BK-1002', type: 'car', customer: 'Khalid Al-Ghamdi', date: '2026-09-21T19:10', price: 300, status: 'Pending' },
  { id: 'BK-1003', type: 'hotel', customer: 'Zayn Malik', date: '2026-09-12T15:30', price: 1250, status: 'Confirmed' },
  { id: 'BK-1004', type: 'flight', customer: 'Omar Faraj', date: '2026-10-11T23:55', price: 123, status: 'Confirmed' },
];

export type User = {
  id: string;
  name: string;
  email: string;
  /** ISO date, e.g. "2026-09-12". */
  date: string;
  bookings: number;
  status: UserStatus;
  /** Only on rows built from GET /api/admin/bookings. */
  phone?: string;
};

// INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
// Users belong to the auth service.
export const users: User[] = [
  { id: '6738', name: 'Sara Al-Otaibi', email: 'sara@tarhal.com', date: '2026-09-12', bookings: 7, status: 'Inactive' },
  { id: '26252', name: 'Khalid Al-Ghamdi', email: 'khalid@tarhal.com', date: '2026-09-21', bookings: 3, status: 'Deleted' },
  { id: '2637', name: 'Zayn Malik', email: 'zayn@tarhal.com', date: '2026-09-12', bookings: 5, status: 'Active' },
  { id: '26372', name: 'Omar Faraj', email: 'omar@tarhal.com', date: '2026-10-11', bookings: 9, status: 'Active' },
];

export type RevenueKey = 'cars' | 'flights' | 'hotels';
export type MonthlyRevenue = { monthIndex: number } & Record<RevenueKey, number>;

// INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
// Monthly revenue is an aggregate of bookings (see `monthlyRevenue` in `@/lib/booking-stats`).
