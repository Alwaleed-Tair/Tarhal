import { useState } from 'react';
import { ArrowRight, Armchair, BedDouble, CalendarDays, CarFront, Clock3, Plane, X } from 'lucide-react';
import { Link, Redirect } from 'wouter';
import { Money } from '@/components/money';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { httpStatus } from '@/services/api';
import { bookingService, type MyBooking } from '@/services/bookingService';
import { logout } from '@/store/authStore';
import { useDemoState } from '@/store/demoStore';
import { notify } from '@/store/notificationStore';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { cityLabel, errorKey, riyadhDay, riyadhTime } from './trip';
import { useMyBookings } from './use-my-bookings';

const Arrow = ({ size }: { size: number }) => <ArrowRight className="rtl:-scale-x-100" size={size} aria-hidden="true" />;
const CLASS_KEY: Record<string, TranslationKey> = { ECONOMY: 'ticketECONOMY', BUSINESS: 'ticketBUSINESS', FIRST: 'ticketFIRST' };

function BookingCard({ booking, index, onCancelled }: { booking: MyBooking; index: number; onCancelled: () => void }) {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const { flight } = booking;
  const seats = booking.travelers.map((traveler) => traveler.seatCode).filter(Boolean);
  const classes = [...new Set(booking.travelers.map((traveler) => traveler.ticketClass))].map((c) => (CLASS_KEY[c] ? t(CLASS_KEY[c]) : c)).join(' · ');
  const departed = Date.parse(flight.departureTime) <= Date.now();
  const canCancel = booking.active && !departed;

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await bookingService.cancel(booking.id);
      notify({ tone: 'success', titleKey: 'tpCancelledTitle', messageKey: 'tpCancelledMessage' });
      onCancelled();
    } catch (err) {
      if (httpStatus(err) === 401) { logout(); return; }
      setError(errorKey(err, 'tpErrCancel409'));
      setBusy(false);
    }
  };

  return (
    <article className="booking-card" data-testid={`booking-${booking.id}`}>
      <div className="booking-card-heading">
        <div>
          <span className="booking-kicker">{t('tpBookingNumber', { n: format.number(index + 1).padStart(2, '0') })}</span>
          <h2 className="booking-route">{cityLabel(t, flight.from)}<Arrow size={18} />{cityLabel(t, flight.to)}</h2>
          <p className="booking-date"><CalendarDays size={15} aria-hidden="true" />{format.date(riyadhDay(flight.departureTime))}</p>
        </div>
        <span className={`booking-status${booking.active ? '' : ' booking-status-cancelled'}`} data-testid="booking-status">
          {!booking.active ? t('cancelled') : departed ? t('tpDeparted') : booking.paymentStatus === 'PAID' ? t('tpPaid') : t('tpBookedUnpaid')}
        </span>
      </div>

      <section className="booking-flight">
        <div className="booking-section-title"><span className="booking-icon"><Plane size={17} /></span><span>{t('tpFlight')}</span></div>
        <div className="booking-flight-times">
          <div className="booking-time"><strong dir="ltr">{riyadhTime(flight.departureTime) || '—'}</strong><span>{cityLabel(t, flight.from)}</span></div>
          <div className="booking-flight-line" aria-hidden="true"><span /><Plane size={15} /><span /></div>
          <div className="booking-time booking-arrival-time"><strong dir="ltr">{riyadhTime(flight.arrivalTime) || '—'}</strong><span>{cityLabel(t, flight.to)}</span></div>
        </div>
        <div className="booking-flight-info">
          <span>{(language === 'ar' ? flight.airlineAr : flight.airline) || t('tpAirlineUnknown')} · <bdi dir="ltr">{flight.flightNumber}</bdi></span>
          {classes && <span>{classes}</span>}
          <span>{t(booking.travelers.length === 1 ? 'tpTravelerCount1' : 'tpTravelerCount', { count: format.number(booking.travelers.length) })}</span>
          <strong className="booking-fare">{t('tpTotalPrice')}: <Money sar={booking.totalPrice} /></strong>
        </div>
      </section>

      <div className="booking-services">
        <section className="booking-service">
          <div className="booking-section-title"><span className="booking-icon"><Armchair size={17} /></span><span>{t('tpSeats')}</span></div>
          <strong dir="ltr">{seats.length ? seats.join(', ') : t('tpNoSeat')}</strong>
        </section>
        {/* There is no hotel or car booking API yet: the traveler is told so, instead of seeing made-up bookings. */}
        <section className="booking-service">
          <div className="booking-section-title"><span className="booking-icon"><BedDouble size={17} /></span><span>{t('tpHotel')}</span></div>
          <strong className="booking-muted">{t('tpNotAvailableYet')}</strong>
        </section>
        <section className="booking-service">
          <div className="booking-section-title"><span className="booking-icon"><CarFront size={17} /></span><span>{t('tpCar')}</span></div>
          <strong className="booking-muted">{t('tpNotAvailableYet')}</strong>
        </section>
      </div>

      <footer className="booking-card-footer">
        <span><Clock3 size={14} aria-hidden="true" />{t('tpBookedOn', { date: format.date(riyadhDay(booking.createdAt)) })}</span>
        <span>{t('tpReference')}: <bdi dir="ltr" title={booking.id}>{booking.id.slice(0, 8)}</bdi></span>
      </footer>

      {canCancel && (
        <div className="booking-cancel-row">
          {error && <p className="booking-cancel-error" role="alert">{t(error)}</p>}
          {confirming ? (
            <>
              <span>{t('tpCancelConfirm')}</span>
              <button type="button" className="booking-cancel-button" onClick={() => setConfirming(false)} disabled={busy}>{t('tpKeepBooking')}</button>
              <button type="button" className="booking-cancel-button danger" onClick={cancel} disabled={busy} data-testid="button-confirm-cancel">{busy ? t('pleaseWait') : t('tpYesCancel')}</button>
            </>
          ) : (
            <button type="button" className="booking-cancel-button" onClick={() => setConfirming(true)} data-testid="button-cancel-booking"><X size={15} aria-hidden="true" />{t('tpCancelBooking')}</button>
          )}
        </div>
      )}
    </article>
  );
}

/** Tariq's bookings page, on GET /api/bookings (and POST /api/bookings/:id/cancel). Signed-out visitors log in first, then come back. */
export default function MyBookings() {
  const t = useT();
  const format = useFormat();
  const { state, reload } = useMyBookings();
  if (state.status === 'signedOut') return <Redirect to={`${routes.login}?next=${encodeURIComponent(routes.passenger.bookings)}`} replace />;
  const bookings = state.status === 'ready' ? state.bookings : [];

  return (
    <PassengerShell>
      <div className="bookings-page">
        <Sidebar />
        <main className="bookings-shell">
          <header className="bookings-header">
            <div className="bookings-brand" aria-label="Tarhal"><span className="bookings-brand-mark" aria-hidden="true" /><span>TARHAL</span></div>
            <span className="bookings-header-note"><span className="bookings-header-dot" />{t('tpBookingsHeaderNote')}</span>
          </header>

          <section className="bookings-intro">
            <div>
              <p className="bookings-eyebrow">{t('tpBookingsEyebrow')}</p>
              <h1>{t('bookings')}</h1>
              <p>{t('tpBookingsIntro')}</p>
            </div>
            {state.status === 'ready' && <span className="bookings-count">{t(bookings.length === 1 ? 'tpBookingCount1' : 'tpBookingCount', { count: format.number(bookings.length).padStart(2, '0') })}</span>}
          </section>

          {state.status === 'loading' && <p className="bookings-loading" role="status">{t('loading')}</p>}
          {state.status === 'error' && (
            <div className="bookings-error" role="alert">{t(state.message)} <button type="button" className="booking-cancel-button" onClick={() => void reload()}>{t('retry')}</button></div>
          )}

          {state.status === 'ready' && bookings.length === 0 && (
            <section className="bookings-empty">
              <span className="booking-icon bookings-empty-icon"><Plane size={22} /></span>
              <h2>{t('tpNoBookingsTitle')}</h2>
              <p>{t('tpNoBookingsNote')}</p>
              <Link className="bookings-button" href={routes.passenger.flights}>{t('tpPlanJourney')} <Arrow size={16} /></Link>
            </section>
          )}

          <div className="bookings-list">
            {bookings.map((booking, index) => <BookingCard key={booking.id} booking={booking} index={index} onCancelled={() => void reload()} />)}
          </div>

          {bookings.length > 0 && (
            <div className="bookings-bottom-link">
              <span>{t('tpPlanningAnother')}</span>
              <Link href={routes.passenger.flights}>{t('tpStartNew')} <Arrow size={15} /></Link>
            </div>
          )}
        </main>
      </div>
    </PassengerShell>
  );
}
