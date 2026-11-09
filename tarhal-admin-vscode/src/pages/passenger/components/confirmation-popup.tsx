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

type Props = {
  flight: FlightOption;
  seats: ChosenSeat[];
  hotel: HotelPlan | null;
  car: CarPlan | null;
  /** Sends POST /api/bookings. Returns a message key when it failed. */
  onBook: () => Promise<TranslationKey | null>;
  onClose: () => void;
};

/**
 * Tariq's summary dialog. The flight is really booked here (button "Confirm flight booking");
 * the hotel and car stay estimates, marked "not booked", because their booking APIs do not exist yet.
 */
export default function ConfirmationPopup({ flight, seats, hotel, car, onBook, onClose }: Props) {
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

  const rentalDays = car ? Math.max(1, Math.ceil((Date.parse(`${car.returnDate}T12:00:00Z`) - Date.parse(`${car.pickup}T12:00:00Z`)) / 86_400_000)) : 0;
  const carTotal = car ? car.dailyRate * rentalDays : 0;
  const flightTotal = seats.reduce((sum, seat) => sum + seat.price, 0);
  const hotelTotal = hotel ? hotel.nightlyRate * hotel.nights : 0;

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
          <div className="summary-entry">
            <span className="summary-icon">01</span>
            <div>
              <strong>{t('tpFlight')} · <bdi dir="ltr">{flight.flightNumber}</bdi></strong>
              <span>{cityLabel(t, flight.from)} → {cityLabel(t, flight.to)}</span>
              <small>{format.date(riyadhDay(flight.departureTime))} · <bdi dir="ltr">{riyadhTime(flight.departureTime)}</bdi> · {t(seats.length === 1 ? 'tpTravelerCount1' : 'tpTravelerCount', { count: format.number(seats.length) })}</small>
            </div>
            <b data-testid="text-flight-total"><Money sar={flightTotal} /></b>
          </div>
          <div className="summary-entry">
            <span className="summary-icon">02</span>
            <div>
              <strong>{t('tpSeatsSelected')}</strong>
              <span dir="ltr">{seats.map((seat) => seat.code).join(', ')}</span>
              <small>{t('tpIncludedInFlight')}</small>
            </div>
            <b>—</b>
          </div>
          {hotel && (
            <div className="summary-entry summary-entry-plan">
              <span className="summary-icon">03</span>
              <div>
                <strong>{t('tpHotel')} · {hotel.name}</strong>
                <span>{cityLabel(t, hotel.city)} · {format.dayMonth(hotel.checkIn)} → {format.dayMonth(hotel.checkOut)}</span>
                <small className="summary-not-booked">{t('tpNotBookedYet')}</small>
              </div>
              <b data-testid="text-hotel-estimate"><Money sar={hotelTotal} /></b>
            </div>
          )}
          {car && (
            <div className="summary-entry summary-entry-plan">
              <span className="summary-icon">{hotel ? '04' : '03'}</span>
              <div>
                <strong>{t('tpCar')} · {car.car}</strong>
                <span>{cityLabel(t, car.location)} · {format.dayMonth(car.pickup)} → {format.dayMonth(car.returnDate)}</span>
                <small className="summary-not-booked">{t('tpNotBookedYet')}</small>
              </div>
              <b data-testid="text-car-estimate-summary"><Money sar={carTotal} /></b>
            </div>
          )}
        </div>

        <div className="demo-total-row">
          <span>{t('tpFlightToPay')}</span>
          <strong data-testid="text-estimated-total"><Money sar={flightTotal} /></strong>
        </div>
        {(hotel || car) && <p className="summary-plan-note">{t('tpPlanEstimate')} <Money sar={hotelTotal + carTotal} /></p>}

        {error && <p className="summary-error" role="alert">{t(error)}</p>}
        <button className="finish-button" type="button" onClick={() => void book()} disabled={busy} data-testid="button-confirm-booking">
          {busy ? t('pleaseWait') : t('tpConfirmBooking')} <Check size={17} />
        </button>
      </section>
    </div>
  );
}
