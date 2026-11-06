import { api, assertSuccess, num, pick, str, toList, type Envelope, type Raw } from '@/services/api';

export type BookingTraveler = { seatId: string; fullName: string; passportNumber: string; dateOfBirth: string };
export type CreateBookingPayload = { userId: string; flightId: string | number; travelers: BookingTraveler[] };

export type BookingRow = { id: string; type: string; customer: string; date: string; price: number; status: string };

const toBookingRow = (r: Raw): BookingRow => ({
  id: str(pick(r, 'id', 'bookingId', 'reference')),
  type: str(pick(r, 'type'), 'flight'),
  customer: str(pick(r, 'customer', 'customerName', 'userName', 'userId')),
  date: str(pick(r, 'date', 'createdAt')),
  price: num(pick(r, 'totalPrice', 'price', 'amount')),
  status: str(pick(r, 'status'), 'Pending'),
});

export const bookingService = {
  /**
   * INTEGRATION POINT [Saud]: GET /api/admin/bookings (admin session required). Wire it into pages/bookings.tsx
   * with the same pattern as admin-resource.tsx (useLiveData + demo fallback) once the response shape is confirmed.
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
