import { useState } from 'react';
import { ArrowRight, Armchair, BedDouble, CalendarDays, CarFront, Check, Clock3, Plane, QrCode, X } from 'lucide-react';
import { Link, Redirect } from 'wouter';
import { BrandLogo } from '@/components/brand-logo';
import { Money } from '@/components/money';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { httpStatus } from '@/services/api';
import { bookingService, type MyBooking } from '@/services/bookingService';
import { tripService, type BookingKind, type MyCarRental, type MyHotelBooking } from '@/services/tripService';
import { logout } from '@/store/authStore';
import { useDemoState } from '@/store/demoStore';
import { notify } from '@/store/notificationStore';
import { BoardingPass, bookingReference } from './components/boarding-pass';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { HeaderControls } from './components/traveler-controls';
import { cityLabel, errorKey, riyadhDay, riyadhTime } from './trip';
import { groupTrips, useMyBookings } from './use-my-bookings';

const Arrow = ({ size }: { size: number }) => <ArrowRight className="rtl:-scale-x-100" size={size} aria-hidden="true" />;
const CLASS_KEY: Record<string, TranslationKey> = { ECONOMY: 'ticketECONOMY', BUSINESS: 'ticketBUSINESS', FIRST: 'ticketFIRST' };
const nights = (a: string, b: string) => Math.max(1, Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000));

type Part = { kind: BookingKind; id: string; active: boolean; paymentStatus: string; totalPrice: number };

function statusKey(part: Part, departed = false): TranslationKey {
  if (!part.active) return part.paymentStatus === 'REFUNDED' ? 'tpRefunded' : 'cancelled';
  if (departed) return 'tpDeparted';
  return part.paymentStatus === 'PAID' ? 'tpPaid' : 'tpBookedUnpaid';
}

/** Cancel with Tariq's two-step confirmation, for one part (flight, hotel or car). */
function CancelPart({ part, label, onDone }: { part: Part; label: TranslationKey; onDone: () => void }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      if (part.kind === 'flight') await bookingService.cancel(part.id);
      else await tripService.cancel(part.kind, part.id);
      notify({ tone: 'success', titleKey: 'tpCancelledTitle', messageKey: 'tpCancelledMessage' });
      onDone();
    } catch (err) {
      if (httpStatus(err) === 401) { logout(); return; }
      setError(errorKey(err, 'tpErrCancel409'));
      setBusy(false);
    }
  };
  return (
    <div className="booking-cancel-row">
      {error && <p className="booking-cancel-error" role="alert">{t(error)}</p>}
      {confirming ? (
        <>
          <span>{t('tpCancelConfirm')}</span>
          <button type="button" className="booking-cancel-button" onClick={() => setConfirming(false)} disabled={busy}>{t('tpKeepBooking')}</button>
          <button type="button" className="booking-cancel-button danger" onClick={() => void cancel()} disabled={busy} data-testid={`button-confirm-cancel-${part.kind}`}>{busy ? t('pleaseWait') : t('tpYesCancel')}</button>
        </>
      ) : (
        <button type="button" className="booking-cancel-button" onClick={() => setConfirming(true)} data-testid={`button-cancel-${part.kind}`}><X size={15} aria-hidden="true" />{t(label)}</button>
      )}
    </div>
  );
}

/** Simulated payment of every unpaid, active part shown in one card. */
function PayParts({ parts, onDone }: { parts: Part[]; onDone: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const due = parts.filter((p) => p.active && p.paymentStatus === 'PENDING');
  if (!due.length) return null;
  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      for (const part of due) await tripService.pay(part.kind, part.id);
      onDone();
    } catch (err) {
      if (httpStatus(err) === 401) { logout(); return; }
      setError(errorKey(err));
      setBusy(false);
      onDone();
    }
  };
  return (
    <div className="booking-pay-row">
      <span>{t('tpSimulatedPaymentNote')}</span>
      <strong><Money sar={due.reduce((sum, p) => sum + p.totalPrice, 0)} /></strong>
      <button type="button" className="bookings-button" onClick={() => void pay()} disabled={busy} data-testid="button-pay-booking">{busy ? t('pleaseWait') : t('tpPayNowSimulated')}</button>
      {error && <p className="booking-cancel-error" role="alert">{t(error)}</p>}
    </div>
  );
}

function HotelSection({ hotel, onChanged }: { hotel: MyHotelBooking | null; onChanged: () => void }) {
  const t = useT();
  const format = useFormat();
  return (
    <section className="booking-service" data-testid={hotel ? `hotel-booking-${hotel.id}` : undefined}>
      <div className="booking-section-title"><span className="booking-icon"><BedDouble size={17} /></span><span>{t('tpHotel')}</span></div>
      {hotel ? (
        <>
          <strong>{hotel.hotel.name}</strong>
          <span className="booking-service-detail">{cityLabel(t, hotel.hotel.city)} · {format.dayMonth(hotel.checkIn)} → {format.dayMonth(hotel.checkOut)} · {t(nights(hotel.checkIn, hotel.checkOut) === 1 ? 'tpNight1' : 'tpNights', { count: format.number(nights(hotel.checkIn, hotel.checkOut)) })}</span>
          <span className="booking-service-detail"><Money sar={hotel.totalPrice} /> · <span className={`booking-part-status${hotel.active ? '' : ' booking-status-cancelled'}`}>{t(statusKey(hotel))}</span></span>
          {hotel.active && <CancelPart part={hotel} label="tpCancelHotel" onDone={onChanged} />}
        </>
      ) : <strong className="booking-muted">{t('tpNoHotelInTrip')}</strong>}
    </section>
  );
}

function CarSection({ car, onChanged }: { car: MyCarRental | null; onChanged: () => void }) {
  const t = useT();
  const format = useFormat();
  return (
    <section className="booking-service" data-testid={car ? `car-rental-${car.id}` : undefined}>
      <div className="booking-section-title"><span className="booking-icon"><CarFront size={17} /></span><span>{t('tpCar')}</span></div>
      {car ? (
        <>
          <strong dir="auto">{car.car.make} {car.car.model} {car.car.year ? format.year(car.car.year) : ''}</strong>
          <span className="booking-service-detail">{cityLabel(t, car.car.city)} · {format.dayMonth(car.pickupDate)} → {format.dayMonth(car.returnDate)}</span>
          <span className="booking-service-detail"><Money sar={car.totalPrice} /> · <span className={`booking-part-status${car.active ? '' : ' booking-status-cancelled'}`}>{t(statusKey(car))}</span></span>
          {car.active && <CancelPart part={car} label="tpCancelCar" onDone={onChanged} />}
        </>
      ) : <strong className="booking-muted">{t('tpNoCarInTrip')}</strong>}
    </section>
  );
}

function BookingCard({ booking, index, hotel, car, onChanged }: { booking: MyBooking; index: number; hotel: MyHotelBooking | null; car: MyCarRental | null; onChanged: () => void }) {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const [showPass, setShowPass] = useState(false);
  const { flight } = booking;
  const part: Part = { kind: 'flight', id: booking.id, active: booking.active, paymentStatus: booking.paymentStatus, totalPrice: booking.totalPrice };
  const seats = booking.travelers.map((traveler) => traveler.seatCode).filter(Boolean);
  const classes = [...new Set(booking.travelers.map((traveler) => traveler.ticketClass))].map((c) => (CLASS_KEY[c] ? t(CLASS_KEY[c]) : c)).join(' · ');
  const departed = Date.parse(flight.departureTime) <= Date.now();
  const canCancel = booking.active && !departed;
  // A boarding pass only for a paid flight that is still active.
  const hasPass = booking.active && booking.paymentStatus === 'PAID';

  return (
    <article className="booking-card" data-testid={`booking-${booking.id}`}>
      <div className="booking-card-heading">
        <div>
          <span className="booking-kicker">{t('tpBookingNumber', { n: format.number(index + 1).padStart(2, '0') })}</span>
          <h2 className="booking-route">{cityLabel(t, flight.from)}<Arrow size={18} />{cityLabel(t, flight.to)}</h2>
          <p className="booking-date"><CalendarDays size={15} aria-hidden="true" />{format.date(riyadhDay(flight.departureTime))}</p>
        </div>
        <span className={`booking-status${booking.active ? '' : ' booking-status-cancelled'}`} data-testid="booking-status">{t(statusKey(part, departed))}</span>
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
        <HotelSection hotel={hotel} onChanged={onChanged} />
        <CarSection car={car} onChanged={onChanged} />
      </div>

      <footer className="booking-card-footer">
        <span><Clock3 size={14} aria-hidden="true" />{t('tpBookedOn', { date: format.date(riyadhDay(booking.createdAt)) })}</span>
        <span>{t('tpReference')}: <bdi dir="ltr" title={booking.id}>{bookingReference(booking.id)}</bdi></span>
      </footer>

      <PayParts parts={[part, ...(hotel ? [hotel] : []), ...(car ? [car] : [])]} onDone={onChanged} />

      {hasPass && (
        <div className="booking-pass-row">
          <button type="button" className="booking-cancel-button" aria-expanded={showPass} onClick={() => setShowPass((v) => !v)} data-testid="button-show-boarding-pass">
            {showPass ? <Check size={15} aria-hidden="true" /> : <QrCode size={15} aria-hidden="true" />}{t(showPass ? 'tpHideBoardingPass' : 'tpShowBoardingPass')}
          </button>
        </div>
      )}
      {hasPass && showPass && <BoardingPass booking={booking} />}

      {canCancel && <CancelPart part={part} label="tpCancelBooking" onDone={onChanged} />}
    </article>
  );
}

/** A hotel or car booked on its own (not in the same trip as a flight), in the same card style. */
function StayCard({ hotel, car, onChanged }: { hotel?: MyHotelBooking; car?: MyCarRental; onChanged: () => void }) {
  const t = useT();
  const format = useFormat();
  const item = (hotel ?? car)!;
  const start = hotel ? hotel.checkIn : car!.pickupDate;
  return (
    <article className="booking-card" data-testid={`booking-${item.id}`}>
      <div className="booking-card-heading">
        <div>
          <span className="booking-kicker">{t(hotel ? 'tpHotelStay' : 'tpCarRental')}</span>
          <h2 className="booking-route">{cityLabel(t, hotel ? hotel.hotel.city : car!.car.city)}</h2>
          <p className="booking-date"><CalendarDays size={15} aria-hidden="true" />{format.date(start)}</p>
        </div>
        <span className={`booking-status${item.active ? '' : ' booking-status-cancelled'}`}>{t(statusKey(item))}</span>
      </div>
      <div className="booking-services">
        {hotel ? <HotelSection hotel={hotel} onChanged={onChanged} /> : <CarSection car={car!} onChanged={onChanged} />}
      </div>
      <footer className="booking-card-footer">
        <span><Clock3 size={14} aria-hidden="true" />{t('tpBookedOn', { date: format.date(riyadhDay(item.createdAt)) })}</span>
        <span>{t('tpReference')}: <bdi dir="ltr" title={item.id}>{bookingReference(item.id)}</bdi></span>
      </footer>
      <PayParts parts={[item]} onDone={onChanged} />
    </article>
  );
}

/** Tariq's bookings page: flights with the hotel and car of the same trip, plus any other hotel or car. Signed-out visitors log in first. */
export default function MyBookings() {
  const t = useT();
  const format = useFormat();
  const { state, reload } = useMyBookings();
  if (state.status === 'signedOut') return <Redirect to={`${routes.login}?next=${encodeURIComponent(routes.passenger.bookings)}`} replace />;
  const ready = state.status === 'ready' ? state : null;
  const bookings = ready?.bookings ?? [];
  const { trips, otherHotels, otherCars } = groupTrips(bookings, ready?.hotels ?? [], ready?.cars ?? []);
  const count = bookings.length + otherHotels.length + otherCars.length;

  return (
    <PassengerShell>
      <div className="bookings-page">
        <Sidebar />
        <main className="bookings-shell">
          <header className="bookings-header">
            <Link className="bookings-brand" href={routes.passenger.home}><BrandLogo /></Link>
            <div className="header-end"><span className="bookings-header-note"><span className="bookings-header-dot" />{t('tpBookingsHeaderNote')}</span><HeaderControls /></div>
          </header>

          <section className="bookings-intro">
            <div>
              <p className="bookings-eyebrow">{t('tpBookingsEyebrow')}</p>
              <h1>{t('bookings')}</h1>
              <p>{t('tpBookingsIntro')}</p>
            </div>
            {ready && <span className="bookings-count">{t(count === 1 ? 'tpBookingCount1' : 'tpBookingCount', { count: format.number(count).padStart(2, '0') })}</span>}
          </section>

          {state.status === 'loading' && (
            <div className="bookings-list" role="status" aria-label={t('loading')}>
              {[0, 1].map((i) => <div className="booking-card booking-card-skeleton" key={i} aria-hidden="true" />)}
            </div>
          )}
          {state.status === 'error' && (
            <div className="bookings-error" role="alert">{t(state.message)} <button type="button" className="booking-cancel-button" onClick={() => void reload()}>{t('retry')}</button></div>
          )}

          {ready && count === 0 && (
            <section className="bookings-empty">
              <span className="booking-icon bookings-empty-icon"><Plane size={22} /></span>
              <h2>{t('tpNoBookingsTitle')}</h2>
              <p>{t('tpNoBookingsNote')}</p>
              <Link className="bookings-button" href={routes.passenger.flights}>{t('tpPlanJourney')} <Arrow size={16} /></Link>
            </section>
          )}

          <div className="bookings-list">
            {bookings.map((booking, index) => (
              <BookingCard key={booking.id} booking={booking} index={index} hotel={trips.get(booking.id)?.hotel ?? null} car={trips.get(booking.id)?.car ?? null} onChanged={() => void reload()} />
            ))}
            {otherHotels.map((hotel) => <StayCard key={hotel.id} hotel={hotel} onChanged={() => void reload()} />)}
            {otherCars.map((car) => <StayCard key={car.id} car={car} onChanged={() => void reload()} />)}
          </div>

          {count > 0 && (
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
