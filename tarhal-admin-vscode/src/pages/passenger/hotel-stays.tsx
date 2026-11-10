import { useEffect, useState } from 'react';
import { BedDouble, MapPin, Star, Wallet } from 'lucide-react';
import { Link } from 'wouter';
import { Money } from '@/components/money';
import { routes } from '@/config/routes';
import type { ResourceRow } from '@/data/demoData';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { hotelService } from '@/services/hotelService';
import { CatalogLayout, CatalogPager } from './components/catalog-layout';
import { AIRPORT, CATALOG_CITIES, cityLabel, errorKey, type TripCity } from './trip';

const PAGE_SIZE = 6;
type State = { status: 'loading' } | { status: 'error'; message: TranslationKey } | { status: 'ready'; rows: ResourceRow[]; total: number; totalPages: number };

/** Photo from the API when it loads; otherwise his bed placeholder (the seeded image paths do not exist yet). */
function HotelPhoto({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) return <span className="hotel-photo hotel-photo-placeholder" aria-hidden="true"><BedDouble size={30} strokeWidth={1.4} /></span>;
  return <span className="hotel-photo"><img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} /></span>;
}

/** Hotel search on GET /api/hotels: city, price and rating filters and paging go to the API. Hotel booking has no API yet. */
export default function HotelStays() {
  const t = useT();
  const format = useFormat();
  const [city, setCity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const price = useDebouncedValue(maxPrice);

  useEffect(() => { setPage(1); }, [city, price, minRating]);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    hotelService.list({ page, pageSize: PAGE_SIZE, city: city || undefined, maxPrice: /^\d+$/.test(price) ? price : undefined, minRating: minRating || undefined })
      .then(({ rows, pagination }) => { if (live) setState({ status: 'ready', rows, total: pagination?.total ?? rows.length, totalPages: pagination?.totalPages ?? 1 }); })
      .catch((error) => { if (live) setState({ status: 'error', message: errorKey(error) }); });
    return () => { live = false; };
  }, [page, city, price, minRating, attempt]);

  return (
    <CatalogLayout icon={BedDouble} eyebrow="tpEyebrowHotel" title1="tpTitleHotel1" title2="tpTitleHotel2" note="tpHotelsPageNote">
      <section className="step-panel catalog-panel" aria-labelledby="hotels-title">
        <div className="step-heading">
          <div>
            <p className="step-kicker"><span className="step-kicker-mark"><BedDouble size={15} /></span>{t('tpHotelKicker')}</p>
            <h2 id="hotels-title">{t('hotels')}</h2>
          </div>
        </div>
        <p className="passenger-note" role="note">{t('tpHotelBookingSoon')}</p>

        <div className="rental-fields catalog-filters">
          <label className="rental-field">
            <span className="field-label">{t('tpCityLabel')}</span>
            <span className="rental-input-wrap"><MapPin size={17} aria-hidden="true" />
              <select value={city} onChange={(event) => setCity(event.target.value)} data-testid="filter-hotel-city">
                <option value="">{t('tpAllCities')}</option>
                {CATALOG_CITIES.map((name) => <option key={name} value={name}>{cityLabel(t, name)}</option>)}
              </select>
            </span>
          </label>
          <label className="rental-field">
            <span className="field-label">{t('tpMaxPricePerNight')}</span>
            <span className="rental-input-wrap"><Wallet size={17} aria-hidden="true" />
              <input inputMode="numeric" dir="ltr" placeholder={t('tpAny')} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ''))} data-testid="filter-hotel-price" />
            </span>
          </label>
          <label className="rental-field">
            <span className="field-label">{t('tpMinRating')}</span>
            <span className="rental-input-wrap"><Star size={17} aria-hidden="true" />
              <select value={minRating} onChange={(event) => setMinRating(event.target.value)} data-testid="filter-hotel-rating">
                <option value="">{t('tpAny')}</option>
                {['3', '4', '4.5'].map((value) => <option key={value} value={value}>{t('tpRatingAtLeast', { rating: format.rating(Number(value)) })}</option>)}
              </select>
            </span>
          </label>
        </div>

        <div className="car-choice-heading">
          <div><p className="field-label">{t('tpResults')}</p><p>{state.status === 'ready' ? t('tpResultsCount', { count: format.number(state.total) }) : ' '}</p></div>
          <span className="sample-price-note">{t('tpPricePerNight')}</span>
        </div>

        {state.status === 'loading' && <p className="passenger-state" role="status">{t('loading')}</p>}
        {state.status === 'error' && <div className="passenger-state" role="alert"><p>{t(state.message)}</p><button type="button" className="back-button" onClick={() => setAttempt((n) => n + 1)}>{t('retry')}</button></div>}
        {state.status === 'ready' && state.rows.length === 0 && <p className="passenger-state" data-testid="text-no-hotels">{t('tpNoMatches')}</p>}
        {state.status === 'ready' && state.rows.length > 0 && (
          <ul className="hotel-grid catalog-grid" data-testid="hotel-results">
            {state.rows.map((hotel) => {
              const tripCity = hotel.city as TripCity;
              const canPlan = Boolean(AIRPORT[tripCity]);
              return (
                <li key={String(hotel.apiId ?? hotel.id)} className="hotel-card catalog-card" data-testid="hotel-card">
                  <HotelPhoto src={hotel.imageUrl} name={hotel.id} />
                  <span className="hotel-body">
                    <span className="hotel-name-row">
                      <strong>{hotel.id}</strong>
                      {hotel.rating ? <span className="hotel-rating"><Star size={11} /> {format.rating(hotel.rating)}</span> : null}
                    </span>
                    <small><MapPin size={11} aria-hidden="true" /> {hotel.address || cityLabel(t, hotel.city ?? '')}</small>
                    <span className="hotel-price"><strong><Money sar={hotel.price} /></strong> / {t('tpNightShort')}</span>
                    <span className="catalog-actions">
                      <span className="catalog-soon">{t('tpBookingSoon')}</span>
                      {canPlan && <Link className="catalog-plan" href={`${routes.passenger.flights}?to=${encodeURIComponent(tripCity)}`} data-testid="link-plan-trip">{t('tpPlanTripTo', { city: cityLabel(t, tripCity) })}</Link>}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {state.status === 'ready' && <CatalogPager page={page} totalPages={state.totalPages} onPage={setPage} />}
      </section>
    </CatalogLayout>
  );
}
