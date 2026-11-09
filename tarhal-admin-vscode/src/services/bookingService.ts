import { api, assertSuccess, assertWrite, num, pick, str, toList, type Envelope, type Raw } from '@/services/api';

export type BookingTraveler = { seatId: string; fullName: string; passportNumber: string; dateOfBirth: string };
/** Body of POST /api/bookings. The server takes the user from the session cookie and calculates the price itself. */
export type CreateBookingPayload = { flightId: string; travelers: BookingTraveler[] };

/** One booking of GET /api/bookings (the logged-in traveler's own bookings, newest first). Amounts are SAR. */
export type MyBooking = {
  id: string; createdAt: string; totalPrice: number; paymentStatus: string; active: boolean;
  flight: { id: string; flightNumber: string; from: string; to: string; departureTime: string; arrivalTime: string; airline: string; airlineAr: string };
  travelers: { fullName: string; seatCode: string; ticketClass: string }[];
};

const toMyBooking = (r: Raw): MyBooking => {
  const f = asRaw(r.flight), a = asRaw(f.airline);
  return {
    id: str(r.id), createdAt: str(r.createdAt), totalPrice: num(r.totalPrice), paymentStatus: str(r.paymentStatus, 'PENDING'), active: r.isActive !== false,
    flight: { id: str(f.id), flightNumber: str(f.flightNumber), from: str(f.from), to: str(f.to), departureTime: str(f.departureTime), arrivalTime: str(f.arrivalTime), airline: str(a.name), airlineAr: str(a.nameAr) || str(a.name) },
    travelers: ((r.travelers as Raw[]) ?? []).map((t) => ({ fullName: str(t.fullName), seatCode: str(asRaw(t.seat).seatCode), ticketClass: str(asRaw(t.seat).ticketClass) })),
  };
};

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

  /** POST /api/bookings. 401 without a login, 400 for missing traveler details, 404 unknown flight, 409 when a seat was taken. */
  async create(payload: CreateBookingPayload): Promise<{ id: string; totalPrice: number }> {
    const { data } = await api.post<Envelope<Raw>>('/bookings', payload);
    assertWrite(data);
    const d = asRaw(data.data);
    return { id: str(pick(d, 'id')), totalPrice: num(d.totalPrice) };
  },

  /** GET /api/bookings: only the logged-in traveler's bookings (401 without a login). */
  async mine(): Promise<MyBooking[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/bookings');
    assertSuccess(data);
    return toList(data).map(toMyBooking);
  },

  /** POST /api/bookings/:id/cancel: releases the seats. 404 when it is not this traveler's booking, 400 when already cancelled. */
  async cancel(id: string): Promise<void> {
    assertWrite((await api.post<Envelope<Raw>>(`/bookings/${encodeURIComponent(id)}/cancel`)).data);
  },
};
