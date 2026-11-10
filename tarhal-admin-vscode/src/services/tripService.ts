import { api, assertSuccess, assertWrite, num, pick, str, toList, type Envelope, type Raw } from '@/services/api';

/**
 * Hotel bookings, car rentals, the simulated payment, the profile and the session check
 * (docs/api-documentation.md sections 1, 2, 6, 7 and 8). Amounts are SAR; days are "YYYY-MM-DD".
 */

export type BookingKind = 'flight' | 'hotel' | 'car';

export type MyHotelBooking = {
  kind: 'hotel'; id: string; createdAt: string; checkIn: string; checkOut: string; guests: number; totalPrice: number; paymentStatus: string; active: boolean;
  hotel: { id: string; name: string; city: string; roomType: string; rating: number; imageUrl: string };
};
export type MyCarRental = {
  kind: 'car'; id: string; createdAt: string; pickupDate: string; returnDate: string; withInsurance: boolean; totalPrice: number; paymentStatus: string; active: boolean;
  car: { id: string; make: string; model: string; year: number; city: string; category: string; imageUrl: string };
};
export type Profile = { id: string; name: string; email: string; phoneNumber: string; dateOfBirth: string; role: string; createdAt: string };

const asRaw = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});
const day = (v: unknown) => str(v).slice(0, 10);

const toHotelBooking = (r: Raw): MyHotelBooking => {
  const h = asRaw(r.hotel);
  return {
    kind: 'hotel', id: str(r.id), createdAt: str(r.createdAt), checkIn: day(r.checkIn), checkOut: day(r.checkOut), guests: num(r.guests, 1),
    totalPrice: num(r.totalPrice), paymentStatus: str(r.paymentStatus, 'PENDING'), active: r.isActive !== false,
    hotel: { id: str(h.id), name: str(h.name), city: str(h.city), roomType: str(h.roomType), rating: num(h.rating), imageUrl: str(h.imageUrl) },
  };
};
const toCarRental = (r: Raw): MyCarRental => {
  const c = asRaw(r.car);
  return {
    kind: 'car', id: str(r.id), createdAt: str(r.createdAt), pickupDate: day(r.pickupDate), returnDate: day(r.returnDate), withInsurance: r.withInsurance === true,
    totalPrice: num(r.totalPrice), paymentStatus: str(r.paymentStatus, 'PENDING'), active: r.isActive !== false,
    car: { id: str(c.id), make: str(c.make), model: str(c.model), year: num(c.year), city: str(c.city), category: str(c.category), imageUrl: str(c.imageUrl) },
  };
};
const toProfile = (r: Raw): Profile => ({
  id: str(r.id), name: str(r.name), email: str(r.email), phoneNumber: str(r.phoneNumber), dateOfBirth: day(r.dateOfBirth), role: str(r.role), createdAt: str(r.createdAt),
});

export const tripService = {
  /** POST /api/hotel-bookings. The server prices it (nights x price per night). 400 bad dates, 404 unknown hotel. */
  async bookHotel(input: { hotelId: string; checkIn: string; checkOut: string; guests: number }): Promise<MyHotelBooking> {
    const { data } = await api.post<Envelope<Raw>>('/hotel-bookings', input);
    assertWrite(data);
    return toHotelBooking(data.data);
  },
  /** POST /api/car-rentals. 409 when the car is taken on those days or switched off. */
  async rentCar(input: { carId: string; pickupDate: string; returnDate: string; withInsurance: boolean }): Promise<MyCarRental> {
    const { data } = await api.post<Envelope<Raw>>('/car-rentals', input);
    assertWrite(data);
    return toCarRental(data.data);
  },
  async myHotels(): Promise<MyHotelBooking[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/hotel-bookings');
    assertSuccess(data);
    return toList(data).map(toHotelBooking);
  },
  async myCars(): Promise<MyCarRental[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/car-rentals');
    assertSuccess(data);
    return toList(data).map(toCarRental);
  },
  async cancel(kind: 'hotel' | 'car', id: string): Promise<void> {
    assertWrite((await api.post<Envelope<Raw>>(`/${kind === 'hotel' ? 'hotel-bookings' : 'car-rentals'}/${encodeURIComponent(id)}/cancel`)).data);
  },
  /** POST /api/payments: SIMULATED, no card details. 409 when already paid or cancelled. */
  async pay(kind: BookingKind, bookingId: string): Promise<{ paymentStatus: string }> {
    const { data } = await api.post<Envelope<Raw>>('/payments', { type: kind, bookingId });
    assertWrite(data);
    return { paymentStatus: str(pick(asRaw(data.data), 'paymentStatus')) };
  },
  async profile(): Promise<Profile> {
    const { data } = await api.get<{ success?: boolean; user: Raw }>('/profile');
    assertSuccess(data);
    return toProfile(data.user);
  },
  async updateProfile(changes: { name?: string; phone?: string; dateOfBirth?: string }): Promise<Profile> {
    const { data } = await api.patch<{ success?: boolean; user: Raw }>('/profile', changes);
    assertWrite(data);
    return toProfile(data.user);
  },
  /** GET /api/auth/me: the session's user, or a 401 when the cookie is missing or no longer valid. */
  async me(): Promise<{ name: string; email: string; role: string }> {
    const { data } = await api.get<{ success?: boolean; user: Raw }>('/auth/me');
    assertSuccess(data);
    return { name: str(data.user?.name), email: str(data.user?.email), role: str(data.user?.role) };
  },
};
