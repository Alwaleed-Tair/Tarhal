import { DirArrow } from '@/components/dir-arrow';
import { useState } from 'react';
import { ArrowRight, Armchair, BedDouble, CarFront, Check, CreditCard, Plane, RotateCcw } from 'lucide-react';
import { Link } from 'wouter';
import { Money } from '@/components/money';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import type { BookingTraveler } from '@/services/bookingService';
import type { FlightOption } from '@/services/flightService';
import { useDemoState } from '@/store/demoStore';
import { cityLabel } from '../trip';
import { BoardingPass, bookingReference } from './boarding-pass';
import { carDays } from './confirmation-popup';
import type { CarPlan } from './car-rental-step';
import type { HotelPlan } from './hotel-stay-step';
import type { ChosenSeat } from './seat-selection-step';

/** One booked part of the trip. `id` is empty and `problem` set when that part could not be booked. */
export type TripItem =
  | { kind: 'flight'; id: string; total: number; paid: boolean; problem?: TranslationKey; leg: 'outbound' | 'return' | null; flight: FlightOption; seats: ChosenSeat[]; travelers: BookingTraveler[] }
  | { kind: 'hotel'; id: string; total: number; paid: boolean; problem?: TranslationKey; hotel: HotelPlan }
  | { kind: 'car'; id: string; total: number; paid: boolean; problem?: TranslationKey; car: CarPlan };

type Props = { items: TripItem[]; onPay: () => Promise<TranslationKey | null>; onStartOver: () => void };

/**
 * Tariq's Ready step (his complete panel): every part of the trip with its real booking reference and status,
 * then the simulated payment, then a boarding pass for each paid flight.
 */
export default function TripReady({ items, onPay, onStartOver }: Props) {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const booked = items.filter((item) => item.id);
  const due = booked.filter((item) => !item.paid).reduce((sum, item) => sum + item.total, 0);
  const allPaid = booked.length > 0 && booked.every((item) => item.paid);
  const total = booked.reduce((sum, item) => sum + item.total, 0);

  const pay = async () => {
    setBusy(true);
    setError(null);
    setError(await onPay());
    setBusy(false);
  };

  const status = (item: TripItem) => (item.problem ? <span className="trip-status trip-status-problem">{t('tpNotBooked')}</span>
    : item.paid ? <span className="trip-status trip-status-paid"><Check size={12} aria-hidden="true" /> {t('tpPaid')}</span>
      : <span className="trip-status">{t('tpAwaitingPayment')}</span>);
  const reference = (item: TripItem) => (item.id ? <> · {t('tpReference')} <bdi dir="ltr">{bookingReference(item.id)}</bdi></> : null);

  return (
    <section className="complete-panel" aria-labelledby="complete-title" data-testid="panel-complete">
      <div className="complete-icon"><Check size={23} /></div>
      <div className="complete-heading">
        <p className="step-kicker">{t(allPaid ? 'tpTripPaidKicker' : 'tpBookingConfirmedKicker')}</p>
        <h2 id="complete-title">{t(allPaid ? 'tpTripPaidTitle' : 'tpBookingConfirmedTitle')}</h2>
        <p className="complete-reference" data-testid="text-booking-reference">{t('tpTripTotal')}: <Money sar={total} /></p>
      </div>

      <div className="complete-itinerary">
        {items.map((item, index) => (
          <div key={`${item.kind}-${index}`} data-testid={`ready-item-${item.kind}${item.kind === 'flight' && item.leg === 'return' ? '-return' : ''}`}>
            <span className="complete-icon-small">{item.kind === 'flight' ? <Plane size={16} /> : item.kind === 'hotel' ? <BedDouble size={16} /> : <CarFront size={16} />}</span>
            {item.kind === 'flight' && (
              <div>
                <small>{t(item.leg === 'return' ? 'tpReturnFlight' : item.leg === 'outbound' ? 'tpOutboundFlight' : 'tpFlight')}{reference(item)}</small>
                <strong>{cityLabel(t, item.flight.from)} <ArrowRight className="rtl:-scale-x-100" size={13} /> {cityLabel(t, item.flight.to)}</strong>
                <span>{(language === 'ar' ? item.flight.airline.nameAr : item.flight.airline.name) || t('tpAirlineUnknown')} · <bdi dir="ltr">{item.flight.flightNumber}</bdi> · <Armchair size={12} aria-hidden="true" /> <bdi dir="ltr">{item.seats.map((s) => s.code).join(', ')}</bdi></span>
                {item.problem && <span className="trip-problem" role="alert">{t(item.problem)}</span>}
              </div>
            )}
            {item.kind === 'hotel' && (
              <div>
                <small>{t('tpHotel')}{reference(item)}</small>
                <strong>{item.hotel.name}</strong>
                <span>{cityLabel(t, item.hotel.city)} · {format.dayMonth(item.hotel.checkIn)} <DirArrow /> {format.dayMonth(item.hotel.checkOut)} · {t(item.hotel.nights === 1 ? 'tpNight1' : 'tpNights', { count: format.number(item.hotel.nights) })}</span>
                {item.problem && <span className="trip-problem" role="alert">{t(item.problem)}</span>}
              </div>
            )}
            {item.kind === 'car' && (
              <div>
                <small>{t('tpCar')}{reference(item)}</small>
                <strong>{item.car.car}</strong>
                <span>{cityLabel(t, item.car.location)} · {format.dayMonth(item.car.pickup)} <DirArrow /> {format.dayMonth(item.car.returnDate)} · {t(carDays(item.car) === 1 ? 'tpDay1' : 'tpDays', { count: format.number(carDays(item.car)) })}</span>
                {item.problem && <span className="trip-problem" role="alert">{t(item.problem)}</span>}
              </div>
            )}
            <div className="trip-item-end">{item.id && <b><Money sar={item.total} /></b>}{status(item)}</div>
          </div>
        ))}
      </div>

      {!allPaid && booked.length > 0 && (
        <div className="trip-payment" data-testid="panel-payment">
          <div>
            <span className="field-label"><CreditCard size={14} aria-hidden="true" /> {t('tpPayment')}</span>
            <strong data-testid="text-amount-due"><Money sar={due} /></strong>
            <small>{t('tpSimulatedPaymentNote')}</small>
          </div>
          <button className="finish-button" type="button" onClick={() => void pay()} disabled={busy} data-testid="button-pay">
            {busy ? t('pleaseWait') : t('tpPayNowSimulated')} <Check size={17} />
          </button>
          {error && <p className="summary-error" role="alert">{t(error)}</p>}
        </div>
      )}

      {items.map((item) => (item.kind === 'flight' && item.id && item.paid ? (
        <BoardingPass key={`pass-${item.id}`} booking={{
          id: item.id,
          flight: { flightNumber: item.flight.flightNumber, from: item.flight.from, to: item.flight.to, departureTime: item.flight.departureTime, arrivalTime: item.flight.arrivalTime, airline: item.flight.airline.name, airlineAr: item.flight.airline.nameAr },
          travelers: item.travelers.map((traveler, i) => ({ fullName: traveler.fullName, seatCode: item.seats[i]?.code ?? '', ticketClass: item.seats[i]?.ticketClass ?? '' })),
        }} />
      ) : null))}

      <div className="complete-actions">
        <Link className="restart-button" href={routes.passenger.bookings} data-testid="link-my-bookings">{t('tpViewMyBookings')}</Link>
        <button className="restart-button" type="button" onClick={onStartOver}><RotateCcw size={15} /> {t('tpPlanAnother')}</button>
      </div>
    </section>
  );
}
