import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, Check, Minus, Plus, Star } from 'lucide-react';
import { Money } from '@/components/money';
import type { ResourceRow } from '@/data/demoData';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { hotelService } from '@/services/hotelService';
import { addDays, cityLabel, errorKey } from '../trip';
import '../styles/HotelStay.css';

const MAX_NIGHTS = 90;

export type HotelPlan = { city: string; name: string; rating: number; nightlyRate: number; nights: number; checkIn: string; checkOut: string };

function HotelPhoto({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) return <span className="hotel-photo hotel-photo-placeholder" aria-hidden="true"><BedDouble size={30} strokeWidth={1.4} /></span>;
  return <span className="hotel-photo"><img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} /></span>;
}

type Props = { city: string; checkIn: string; onBack: () => void; onSkip: () => void; onComplete: (plan: HotelPlan) => void };

/**
 * Tariq's hotel step on the real hotels of GET /api/hotels?city=. There is no hotel booking API yet,
 * so the step says clearly that the hotel is only part of the plan and is not booked.
 */
export default function HotelStayStep({ city, checkIn, onBack, onSkip, onComplete }: Props) {
  const t = useT();
  const format = useFormat();
  const [hotels, setHotels] = useState<ResourceRow[] | null>(null);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [nights, setNights] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setHotels(null);
    setLoadError(null);
    hotelService.list({ page: 1, pageSize: 4, city })
      .then(({ rows }) => { if (live) setHotels(rows); })
      .catch((err) => { if (live) setLoadError(errorKey(err)); });
    return () => { live = false; };
  }, [city, attempt]);

  const checkOut = useMemo(() => addDays(checkIn, nights), [checkIn, nights]);
  const chosen = selected !== null && hotels ? hotels[selected] : null;
  const total = chosen ? chosen.price * nights : 0;
  const nightsLabel = (n: number) => t(n === 1 ? 'tpNight1' : 'tpNights', { count: format.number(n) });
  const changeNights = (value: number) => { setNights(Math.min(MAX_NIGHTS, Math.max(1, value))); setError(null); };
  const place = cityLabel(t, city);

  const onContinue = () => {
    if (!chosen) { setError('tpChooseHotel'); return; }
    onComplete({ city, name: chosen.id, rating: chosen.rating ?? 0, nightlyRate: chosen.price, nights, checkIn, checkOut });
  };

  return (
    <section className="step-panel hotel-step" aria-labelledby="hotel-step-title" data-testid="panel-hotel-selection">
      <div className="step-heading">
        <div>
          <p className="step-kicker"><span className="step-kicker-mark"><BedDouble size={15} /></span>{t('tpHotelKicker')}</p>
          <h2 id="hotel-step-title">{t('tpHotelTitle', { city: place })}</h2>
          <p className="step-intro">{t('tpHotelIntro')}</p>
        </div>
      </div>

      <p className="passenger-note" role="note" data-testid="note-hotel-not-bookable">{t('tpHotelNotBookable')}</p>

      <div className="hotel-nights-bar">
        <div>
          <span className="field-label">{t('tpNightsLabel')}</span>
          <div className="hotel-stepper">
            <button type="button" aria-label={t('tpFewerNights')} disabled={nights <= 1} onClick={() => changeNights(nights - 1)}><Minus size={14} /></button>
            <strong aria-live="polite" data-testid="text-hotel-nights">{format.number(nights)}</strong>
            <button type="button" aria-label={t('tpMoreNights')} disabled={nights >= MAX_NIGHTS} onClick={() => changeNights(nights + 1)}><Plus size={14} /></button>
          </div>
        </div>
        <div className="hotel-dates">
          <span className="field-label">{t('tpYourStay')}</span>
          <strong>{format.dayMonth(checkIn)} → {format.dayMonth(checkOut)}</strong>
        </div>
      </div>

      <div className="car-choice-heading">
        <div>
          <p className="field-label">{t('tpChooseYourHotel')}</p>
          <p>{t('tpHotelsIn', { city: place })}</p>
        </div>
        <span className="sample-price-note">{t('tpPricePerNight')}</span>
      </div>

      {loadError && <div className="passenger-state" role="alert"><p>{t(loadError)}</p><button type="button" className="back-button" onClick={() => setAttempt((n) => n + 1)}>{t('retry')}</button></div>}
      {!loadError && !hotels && <p className="passenger-state" role="status">{t('loading')}</p>}
      {hotels && hotels.length === 0 && <p className="step-intro" data-testid="text-no-hotels">{t('tpNoHotels', { city: place })}</p>}

      {hotels && hotels.length > 0 && (
        <div className="hotel-grid" role="radiogroup" aria-label={t('tpHotelsIn', { city: place })}>
          {hotels.map((hotel, index) => {
            const isChosen = selected === index;
            return (
              <button key={String(hotel.apiId ?? hotel.id)} type="button" role="radio" aria-checked={isChosen} className={`hotel-card${isChosen ? ' selected' : ''}`}
                onClick={() => { setSelected(index); setError(null); }} data-testid={`option-hotel-${index + 1}`}>
                <HotelPhoto src={hotel.imageUrl ?? ''} name={hotel.id} />
                <span className="hotel-body">
                  <span className="hotel-name-row">
                    <strong>{hotel.id}</strong>
                    {hotel.rating ? <span className="hotel-rating"><Star size={11} /> {format.rating(hotel.rating)}</span> : null}
                  </span>
                  <span className="hotel-price"><strong><Money sar={hotel.price} /></strong> / {t('tpNightShort')}</span>
                  <small><Money sar={hotel.price * nights} /> · {nightsLabel(nights)}</small>
                </span>
                {isChosen && <span className="hotel-check"><Check size={13} /></span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="hotel-total">
        <div>
          <span className="field-label">{t('tpHotelEstimate')}</span>
          <strong data-testid="text-hotel-total">{chosen ? <Money sar={total} /> : '—'}</strong>
          <small>{chosen ? `${chosen.id} · ${nightsLabel(nights)}` : t('tpSelectHotelTotal')}</small>
        </div>
      </div>

      <p className={`form-message hotel-error${error ? ' visible' : ''}`} role={error ? 'alert' : 'status'}>{error ? t(error) : ' '}</p>

      <div className="step-actions">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft className="rtl:-scale-x-100" size={17} /> {t('tpBackToTravelers')}</button>
        <div className="hotel-actions-right">
          <button className="back-button" type="button" onClick={onSkip} data-testid="button-skip-hotel">{t('tpSkipHotel')}</button>
          <button className="search-button car-continue" type="button" onClick={onContinue} disabled={!hotels?.length} data-testid="button-continue-to-car-from-hotel">
            <span>{t('tpContinueCar')}</span><ArrowRight className="rtl:-scale-x-100" size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
