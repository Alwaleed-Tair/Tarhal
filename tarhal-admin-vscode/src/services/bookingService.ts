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

export type BookingRow = { id: string; type: string; customer: string; date: string; price: number; status: string; userId?: string; email?: string; phone?: string; paymentStatus?: string; guests?: number; detail?: string };

const asRaw = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});

// Real shape from GET /api/admin/bookings: { id, type: flight|hotel|car, isActive, paymentStatus: PENDING|PAID|FAILED|REFUNDED, totalPrice,
// createdAt, user: { name, email }, and flight { flightNumber, from, to } or hotel { name, city } (with guests) or car { make, model, city }.
// Flat demo-style fields still work.
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
  guests: r.guests === undefined ? undefined : num(r.guests),
  detail: bookingDetail(r),
});

/** "SV1020 RUH → JED", "Hotel name · Jeddah" or "Toyota Camry · Riyadh": what was booked. */
function bookingDetail(r: Raw): string | undefined {
  const f = asRaw(r.flight), h = asRaw(r.hotel), c = asRaw(r.car);
  if (f.flightNumber) return `${str(f.flightNumber)} ${str(f.from)} → ${str(f.to)}`;
  if (h.name) return `${str(h.name)} · ${str(h.city)}`;
  if (c.make) return `${str(c.make)} ${str(c.model)} · ${str(c.city)}`;
  return undefined;
}

export const bookingService = {
  /**
   * GET /api/admin/bookings (admin session required). Used by pages/bookings.tsx (useLiveData + demo fallback).
   */
  async list(): Promise<BookingRow[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/admin/bookings');
    assertSuccess(data);
    return toList(data).map(toBookingRow);
  },

  /**
   * PATCH /api/admin/bookings/:id { type, action }: cancel (seats are released, a paid booking becomes REFUNDED) or markPaid.
   * 409 when it is already cancelled or already paid.
   */
  async setStatus(id: string, type: string, action: 'cancel' | 'markPaid'): Promise<void> {
    assertWrite((await api.patch<Envelope<Raw>>(`/admin/bookings/${encodeURIComponent(id)}`, { type, action })).data);
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
