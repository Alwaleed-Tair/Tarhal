import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Money } from '@/components/money';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import type { FlightOption } from '@/services/flightService';
import { cityLabel, riyadhDay, riyadhTime } from '../trip';
import type { CarPlan } from './car-rental-step';
import type { HotelPlan } from './hotel-stay-step';
import type { ChosenSeat } from './seat-selection-step';

export type TripLeg = { flight: FlightOption; seats: ChosenSeat[] };

type Props = {
  legs: TripLeg[];
  hotel: HotelPlan | null;
  car: CarPlan | null;
  /** Books everything (flights, hotel, car). Returns a message key when the flight booking failed. */
  onBook: () => Promise<TranslationKey | null>;
  onClose: () => void;
};

export const carDays = (car: CarPlan) => Math.max(1, Math.round((Date.parse(`${car.returnDate}T12:00:00Z`) - Date.parse(`${car.pickup}T12:00:00Z`)) / 86_400_000));

/**
 * Tariq's summary dialog. "Confirm booking" books the flight(s), the hotel and the car on the API
 * (prices are calculated again on the server, with the same rules). Payment follows on the Ready step.
 */
export default function ConfirmationPopup({ legs, hotel, car, onBook, onClose }: Props) {
  const t = useT();
  const format = useFormat();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, busy]);

  const legTotal = (leg: TripLeg) => leg.seats.reduce((sum, seat) => sum + seat.price, 0);
  const flightsTotal = legs.reduce((sum, leg) => sum + legTotal(leg), 0);
  const hotelTotal = hotel ? hotel.nightlyRate * hotel.nights : 0;
  const carTotal = car ? car.dailyRate * carDays(car) : 0;
  const travelers = legs[0]?.seats.length ?? 0;
  let n = 0;
  const number = () => String(++n).padStart(2, '0');

  const book = async () => {
    setBusy(true);
    setError(null);
    const problem = await onBook();
    if (problem) { setError(problem); setBusy(false); }
  };

  return (
    <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} data-testid="overlay-confirmation">
      <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" data-testid="dialog-confirmation">
        <button className="dialog-close" ref={closeRef} type="button" aria-label={t('tpCloseSummary')} onClick={onClose} disabled={busy} data-testid="button-close-confirmation"><X size={18} /></button>
        <div className="confirmation-mark" aria-hidden="true"><Check size={22} /></div>
        <p className="dialog-eyebrow">{t('tpSummaryEyebrow')}</p>
        <h2 id="confirmation-title">{t('tpSummaryTitle')}</h2>
        <p className="dialog-intro" id="confirmation-description">{t('tpSummaryIntro')}</p>

        <div className="summary-list">
          {legs.map((leg, index) => (
            <div className="summary-entry" key={leg.flight.id}>
              <span className="summary-icon">{number()}</span>
              <div>
                <strong>{t(legs.length > 1 ? (index === 0 ? 'tpOutboundFlight' : 'tpReturnFlight') : 'tpFlight')} · <bdi dir="ltr">{leg.flight.flightNumber}</bdi></strong>
                <span>{cityLabel(t, leg.flight.from)} → {cityLabel(t, leg.flight.to)} · <bdi dir="ltr">{leg.seats.map((seat) => seat.code).join(', ')}</bdi></span>
                <small>{format.date(riyadhDay(leg.flight.departureTime))} · <bdi dir="ltr">{riyadhTime(leg.flight.departureTime)}</bdi> · {t(travelers === 1 ? 'tpTravelerCount1' : 'tpTravelerCount', { count: format.number(travelers) })}</small>
              </div>
              <b data-testid={`text-flight-total-${index}`}><Money sar={legTotal(leg)} /></b>
            </div>
          ))}
          {hotel && (
            <div className="summary-entry">
              <span className="summary-icon">{number()}</span>
              <div>
                <strong>{t('tpHotel')} · {hotel.name}</strong>
                <span>{cityLabel(t, hotel.city)} · {format.dayMonth(hotel.checkIn)} → {format.dayMonth(hotel.checkOut)}</span>
                <small>{t(hotel.nights === 1 ? 'tpNight1' : 'tpNights', { count: format.number(hotel.nights) })}</small>
              </div>
              <b data-testid="text-hotel-estimate"><Money sar={hotelTotal} /></b>
            </div>
          )}
          {car && (
            <div className="summary-entry">
              <span className="summary-icon">{number()}</span>
              <div>
                <strong>{t('tpCar')} · {car.car}</strong>
                <span>{cityLabel(t, car.location)} · {format.dayMonth(car.pickup)} → {format.dayMonth(car.returnDate)}</span>
                <small>{t(carDays(car) === 1 ? 'tpDay1' : 'tpDays', { count: format.number(carDays(car)) })}</small>
              </div>
              <b data-testid="text-car-estimate-summary"><Money sar={carTotal} /></b>
            </div>
          )}
        </div>

        <div className="demo-total-row">
          <span>{t('tpTripTotal')}</span>
          <strong data-testid="text-estimated-total"><Money sar={flightsTotal + hotelTotal + carTotal} /></strong>
        </div>
        <p className="summary-plan-note">{t('tpPayOnNextStep')}</p>

        {error && <p className="summary-error" role="alert">{t(error)}</p>}
        <button className="finish-button" type="button" onClick={() => void book()} disabled={busy} data-testid="button-confirm-booking">
          {busy ? t('pleaseWait') : t('tpConfirmBooking')} <Check size={17} />
        </button>
      </section>
    </div>
  );
}
