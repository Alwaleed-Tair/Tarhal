import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CarFront, Check, MapPin, UsersRound } from 'lucide-react';
import { Money } from '@/components/money';
import type { ResourceRow } from '@/data/demoData';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { carService } from '@/services/carService';
import { translateCarCategory } from '@/i18n/labels';
import { useDemoState } from '@/store/demoStore';
import { addDays, cityLabel, errorKey, riyadhToday, TRIP_CITIES } from '../trip';

export type CarPlan = { carId: string; location: string; pickup: string; returnDate: string; car: string; dailyRate: number };

type Props = { city: string; departure: string; returnDay?: string | null; initial?: CarPlan | null; onBack: () => void; onSkip: () => void; onComplete: (plan: CarPlan) => void };

/**
 * Tariq's car step on the real available cars of GET /api/cars?city= (the destination city by default). The car is rented with
 * POST /api/car-rentals when the traveler confirms the trip. A Skip button is new: some cities have no cars.
 */
export default function CarRentalStep({ city, departure, returnDay = null, initial = null, onBack, onSkip, onComplete }: Props) {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const [location, setLocation] = useState<string>(initial?.location ?? ((TRIP_CITIES as readonly string[]).includes(city) ? city : 'Riyadh'));
  const [pickup, setPickup] = useState(initial?.pickup ?? departure);
  // Round trip: the car goes back on the day of the flight home.
  const [returnDate, setReturnDate] = useState(initial?.returnDate ?? (returnDay && returnDay > departure ? returnDay : addDays(departure, 3)));
  const [cars, setCars] = useState<ResourceRow[] | null>(null);
  // The city has cars, but every one is booked on the chosen days (so the message can say so).
  const [allBooked, setAllBooked] = useState(false);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [carId, setCarId] = useState<string | null>(initial?.carId ?? null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setCars(null);
    setLoadError(null);
    setCarId((current) => (initial && location === initial.location ? current : null));
    // Only cars that are free for the chosen days (when the days are valid; the form explains wrong days itself).
    const days = pickup >= riyadhToday() && returnDate > pickup ? { pickupDate: pickup, returnDate } : {};
    setAllBooked(false);
    carService.list({ page: 1, pageSize: 6, city: location, ...days })
      .then(async ({ rows }) => {
        if (rows.length === 0 && 'pickupDate' in days) {
          const any = await carService.list({ page: 1, pageSize: 1, city: location }).catch(() => null);
          if (live) setAllBooked(Boolean(any && any.rows.length));
        }
        if (live) setCars(rows);
      })
      .catch((err) => { if (live) setLoadError(errorKey(err)); });
    return () => { live = false; };
  }, [location, pickup, returnDate, attempt]);

  const selectedCar = cars?.find((car) => String(car.apiId) === carId) ?? null;
  const rentalDays = useMemo(() => Math.max(1, Math.ceil((Date.parse(`${returnDate}T12:00:00Z`) - Date.parse(`${pickup}T12:00:00Z`)) / 86_400_000)), [pickup, returnDate]);
  const estimatedTotal = selectedCar ? selectedCar.price * rentalDays : 0;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!pickup || !returnDate) { setError('tpErrRentalDates'); return; }
    if (pickup < riyadhToday()) { setError('tpErrPickupPast'); return; }
    if (returnDate <= pickup) { setError('tpErrReturnBeforePickup'); return; }
    if (!selectedCar) { setError('tpChooseCar'); return; }
    setError(null);
    onComplete({ carId: String(selectedCar.apiId), location, pickup, returnDate, car: selectedCar.id, dailyRate: selectedCar.price });
  };

  return (
    <section className="step-panel car-step" aria-labelledby="car-step-title" data-testid="panel-car-rental">
      <div className="step-heading">
        <div>
          <p className="step-kicker"><span className="step-kicker-mark"><CarFront size={15} /></span>{t('tpCarKicker')}</p>
          <h2 id="car-step-title">{t('tpCarTitle')}</h2>
          <p className="step-intro">{t('tpCarIntro', { city: cityLabel(t, city) })}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className="rental-fields">
          <label className="rental-field location-field">
            <span className="field-label">{t('tpPickupLocation')}</span>
            <span className="rental-input-wrap">
              <MapPin size={17} aria-hidden="true" />
              <select value={location} onChange={(event) => { setLocation(event.target.value); setError(null); }} data-testid="select-car-location" aria-label={t('tpPickupLocation')}>
                {TRIP_CITIES.map((option) => <option value={option} key={option}>{cityLabel(t, option)}</option>)}
              </select>
            </span>
          </label>
          <label className="rental-field">
            <span className="field-label">{t('tpPickupDate')}</span>
            <span className="rental-input-wrap">
              <CalendarDays size={17} aria-hidden="true" />
              <input type="date" dir="ltr" value={pickup} min={riyadhToday()} onChange={(event) => { setPickup(event.target.value); setError(null); }} data-testid="input-car-pickup-date" aria-label={t('tpPickupDate')} />
            </span>
          </label>
          <label className="rental-field">
            <span className="field-label">{t('tpReturnDate')}</span>
            <span className="rental-input-wrap">
              <CalendarDays size={17} aria-hidden="true" />
              <input type="date" dir="ltr" value={returnDate} min={addDays(pickup || riyadhToday(), 1)} onChange={(event) => { setReturnDate(event.target.value); setError(null); }} data-testid="input-car-return-date" aria-label={t('tpReturnDate')} />
            </span>
          </label>
        </div>

        <div className="car-choice-heading">
          <div>
            <p className="field-label">{t('tpChooseRide')}</p>
            <p>{t('tpCarsIn', { city: cityLabel(t, location) })}</p>
          </div>
          <span className="sample-price-note">{t('tpPricePerDay')}</span>
        </div>

        {loadError && <div className="passenger-state" role="alert"><p>{t(loadError)}</p><button type="button" className="back-button" onClick={() => setAttempt((n) => n + 1)}>{t('retry')}</button></div>}
        {!loadError && !cars && <p className="passenger-state" role="status">{t('loading')}</p>}
        {cars && cars.length === 0 && <p className="step-intro" data-testid="text-no-cars">{t(allBooked ? 'tpNoCarsDays' : 'tpNoCars', { city: cityLabel(t, location) })}</p>}

        {cars && cars.length > 0 && (
          <div className="car-options" role="radiogroup" aria-label={t('tpChooseRide')}>
            {cars.map((car) => {
              const chosen = String(car.apiId) === carId;
              return (
                <button className={`car-option${chosen ? ' selected' : ''}`} key={String(car.apiId)} type="button" role="radio" aria-checked={chosen}
                  onClick={() => { setCarId(String(car.apiId)); setError(null); }} data-testid={`option-car-${car.apiId}`}>
                  <span className="car-art" aria-hidden="true"><CarFront size={28} strokeWidth={1.5} /><span>{(car.make ?? car.id).slice(0, 1)}</span></span>
                  <span className="car-copy">
                    <strong>{car.make} {car.model}</strong>
                    <span>{car.year ? format.year(car.year) : ''}{car.category ? ` · ${translateCarCategory(car.category, language)}` : ''}</span>
                    <small><UsersRound size={13} />{t('tpSeatsCount', { count: format.number(car.seats ?? 0) })}<i />{car.transmission === 'MANUAL' ? t('tpManual') : t('tpAutomatic')}</small>
                  </span>
                  <span className="car-price">
                    <strong><Money sar={car.price} /></strong>
                    <span>/ {t('tpDayShort')}</span>
                    {chosen && <span className="selected-check"><Check size={13} /></span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="rental-total">
          <div>
            <span className="field-label">{t('tpCarEstimate')}</span>
            <strong data-testid="text-car-estimate">{selectedCar ? <Money sar={estimatedTotal} /> : '—'}</strong>
            <small>{t(rentalDays === 1 ? 'tpDay1' : 'tpDays', { count: format.number(rentalDays) })}</small>
          </div>
        </div>

        <p className={`form-message car-error${error ? ' visible' : ''}`} role={error ? 'alert' : 'status'} data-testid="status-car-form">{error ? t(error) : ' '}</p>

        <div className="step-actions">
          <button className="back-button" type="button" onClick={onBack} data-testid="button-back-to-hotel"><ArrowLeft className="rtl:-scale-x-100" size={17} />{t('tpBackToHotel')}</button>
          <div className="hotel-actions-right">
            <button className="back-button" type="button" onClick={onSkip} data-testid="button-skip-car">{t('tpSkipCar')}</button>
            <button className="search-button car-continue" type="submit" disabled={!cars?.length} data-testid="button-review-estimate">
              <span>{t('tpReviewTrip')}</span><ArrowRight className="rtl:-scale-x-100" size={20} />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
