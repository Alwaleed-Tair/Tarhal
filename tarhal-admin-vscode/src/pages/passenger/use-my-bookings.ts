import { useCallback, useEffect, useState } from 'react';
import type { TranslationKey } from '@/i18n/translations';
import { httpStatus } from '@/services/api';
import { bookingService, type MyBooking } from '@/services/bookingService';
import { tripService, type MyCarRental, type MyHotelBooking } from '@/services/tripService';
import { logout, useAuth } from '@/store/authStore';
import { errorKey, riyadhDay } from './trip';

export type MyBookingsState =
  | { status: 'signedOut' }
  | { status: 'loading' }
  | { status: 'error'; message: TranslationKey }
  | { status: 'ready'; bookings: MyBooking[]; hotels: MyHotelBooking[]; cars: MyCarRental[] };

/**
 * The signed-in traveler's flight bookings, hotel bookings and car rentals (GET /api/bookings, /api/hotel-bookings, /api/car-rentals).
 * A 401 means the saved session ran out: it is cleared and the page asks to log in.
 */
export function useMyBookings() {
  const { user } = useAuth();
  const [state, setState] = useState<MyBookingsState>(user ? { status: 'loading' } : { status: 'signedOut' });

  const load = useCallback(async (quiet = false) => {
    if (!user) { setState({ status: 'signedOut' }); return; }
    if (!quiet) setState({ status: 'loading' });
    try {
      const [bookings, hotels, cars] = await Promise.all([bookingService.mine(), tripService.myHotels(), tripService.myCars()]);
      setState({ status: 'ready', bookings, hotels, cars });
    } catch (error) {
      if (httpStatus(error) === 401) { logout(); setState({ status: 'signedOut' }); return; }
      setState({ status: 'error', message: errorKey(error) });
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  /** Reloads without the loading state, so the list stays in place after a cancel or a payment. */
  return { state, reload: () => load(true) };
}

/** Active bookings whose flight has not left yet, soonest first. */
export const upcoming = (bookings: MyBooking[], now = Date.now()) =>
  bookings.filter((b) => b.active && Date.parse(b.flight.departureTime) > now).sort((a, b) => a.flight.departureTime.localeCompare(b.flight.departureTime));

/**
 * The hotel and car booked in the same trip as a flight: the booking flow creates them right after the flight
 * (within minutes), starting on the day the flight lands. The API has no link between them, so this is how they are paired.
 */
export function groupTrips(bookings: MyBooking[], hotels: MyHotelBooking[], cars: MyCarRental[]) {
  const usedHotels = new Set<string>(), usedCars = new Set<string>();
  const near = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) < 30 * 60 * 1000;
  // Oldest first, so the outbound flight of a round trip gets the hotel and car (they start on its arrival day).
  const byAge = [...bookings].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const trips = new Map<string, { hotel: MyHotelBooking | null; car: MyCarRental | null }>();
  for (const booking of byAge) {
    const landing = riyadhDay(booking.flight.arrivalTime);
    const hotel = hotels.find((h) => !usedHotels.has(h.id) && h.checkIn === landing && near(h.createdAt, booking.createdAt)) ?? null;
    const car = cars.find((c) => !usedCars.has(c.id) && c.pickupDate === landing && near(c.createdAt, booking.createdAt)) ?? null;
    if (hotel) usedHotels.add(hotel.id);
    if (car) usedCars.add(car.id);
    trips.set(booking.id, { hotel, car });
  }
  return { trips, otherHotels: hotels.filter((h) => !usedHotels.has(h.id)), otherCars: cars.filter((c) => !usedCars.has(c.id)) };
}
