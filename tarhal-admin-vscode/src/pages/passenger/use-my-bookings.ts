import { useCallback, useEffect, useState } from 'react';
import type { TranslationKey } from '@/i18n/translations';
import { httpStatus } from '@/services/api';
import { bookingService, type MyBooking } from '@/services/bookingService';
import { logout, useAuth } from '@/store/authStore';
import { errorKey } from './trip';

export type MyBookingsState =
  | { status: 'signedOut' }
  | { status: 'loading' }
  | { status: 'error'; message: TranslationKey }
  | { status: 'ready'; bookings: MyBooking[] };

/** GET /api/bookings for the signed-in traveler. A 401 means the saved session ran out: it is cleared and the page asks to log in. */
export function useMyBookings() {
  const { user } = useAuth();
  const [state, setState] = useState<MyBookingsState>(user ? { status: 'loading' } : { status: 'signedOut' });

  const load = useCallback(async () => {
    if (!user) { setState({ status: 'signedOut' }); return; }
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', bookings: await bookingService.mine() });
    } catch (error) {
      if (httpStatus(error) === 401) { logout(); setState({ status: 'signedOut' }); return; }
      setState({ status: 'error', message: errorKey(error) });
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  return { state, reload: load };
}

/** Active bookings whose flight has not left yet, soonest first. */
export const upcoming = (bookings: MyBooking[], now = Date.now()) =>
  bookings.filter((b) => b.active && Date.parse(b.flight.departureTime) > now).sort((a, b) => a.flight.departureTime.localeCompare(b.flight.departureTime));
