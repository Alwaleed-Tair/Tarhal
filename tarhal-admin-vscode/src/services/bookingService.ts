import { api, assertSuccess, num, pick, str, toList, type Envelope, type Raw } from '@/services/api';

export type BookingTraveler = { seatId: string; fullName: string; passportNumber: string; dateOfBirth: string };
export type CreateBookingPayload = { userId: string; flightId: string | number; travelers: BookingTraveler[] };

export type BookingRow = { id: string; type: string; customer: string; date: string; price: number; status: string; userId?: string; email?: string; phone?: string; paymentStatus?: string };

const asRaw = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});

// Real shape from GET /api/admin/bookings: { id, isActive, paymentStatus: PENDING|PAID|FAILED|REFUNDED, totalPrice,
// createdAt, user: { name, email }, flight: { flightNumber, airline: { name } } }. Flat demo-style fields still work.
function bookingStatus(r: Raw): string {
  const explicit = pick(r, 'status');
  if (explicit !== undefined) return str(explicit);
  if (r.isActive === false) return 'Cancelled';
  return str(r.paymentStatus).toUpperCase() === 'PAID' ? 'Confirmed' : 'Pending';
}

const toBookingRow = (r: Raw): BookingRow => ({
  id: str(pick(r, 'id', 'bookingId', 'reference')),
  type: str(pick(r, 'type'), 'flight'),
  customer: str(pick(r, 'customer', 'customerName', 'userName')) || str(asRaw(r.user).name) || str(asRaw(r.user).email) || str(r.userId),
  date: str(pick(r, 'date', 'createdAt')),
  price: num(pick(r, 'totalPrice', 'price', 'amount')),
  status: bookingStatus(r),
  userId: str(pick(asRaw(r.user), 'id')) || str(r.userId) || undefined,
  email: str(asRaw(r.user).email) || undefined,
  phone: str(asRaw(r.user).phoneNumber) || undefined,
  paymentStatus: str(r.paymentStatus) || undefined,
});

export const bookingService = {
  /**
   * GET /api/admin/bookings (admin session required). Used by pages/bookings.tsx (useLiveData + demo fallback).
   */
  async list(): Promise<BookingRow[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/admin/bookings');
    assertSuccess(data);
    return toList(data).map(toBookingRow);
  },

  /** A 409 means a seat was taken: callers check `httpStatus(err) === 409`. */
  async create(payload: CreateBookingPayload): Promise<{ id?: string }> {
    const { data } = await api.post<Envelope<Raw>>('/bookings', payload);
    assertSuccess(data);
    return { id: str(pick(data.data ?? {}, 'id', 'bookingId', 'reference')) || undefined };
  },
};
