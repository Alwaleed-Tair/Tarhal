import { useEffect, useState } from 'react';
import { CarFront, Cog, MapPin, UsersRound } from 'lucide-react';
import { Link } from 'wouter';
import { Money } from '@/components/money';
import { routes } from '@/config/routes';
import type { ResourceRow } from '@/data/demoData';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { carService } from '@/services/carService';
import { CatalogLayout, CatalogPager } from './components/catalog-layout';
import { AIRPORT, CATALOG_CITIES, cityLabel, errorKey, type TripCity } from './trip';

const PAGE_SIZE = 6;
type State = { status: 'loading' } | { status: 'error'; message: TranslationKey } | { status: 'ready'; rows: ResourceRow[]; total: number; totalPages: number };

/** Car search on GET /api/cars (available cars only): city, transmission and seats filters and paging go to the API. No rental API yet. */
export default function CarRentals() {
  const t = useT();
  const format = useFormat();
  const [city, setCity] = useState('');
  const [transmission, setTransmission] = useState('');
  const [minSeats, setMinSeats] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { setPage(1); }, [city, transmission, minSeats]);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    carService.list({ page, pageSize: PAGE_SIZE, city: city || undefined, transmission: transmission || undefined, minSeats: minSeats || undefined })
      .then(({ rows, pagination }) => { if (live) setState({ status: 'ready', rows, total: pagination?.total ?? rows.length, totalPages: pagination?.totalPages ?? 1 }); })
      .catch((error) => { if (live) setState({ status: 'error', message: errorKey(error) }); });
    return () => { live = false; };
  }, [page, city, transmission, minSeats, attempt]);

  return (
    <CatalogLayout icon={CarFront} eyebrow="tpEyebrowCar" title1="tpTitleCar1" title2="tpTitleCar2" note="tpCarsPageNote">
      <section className="step-panel catalog-panel" aria-labelledby="cars-title">
        <div className="step-heading">
          <div>
            <p className="step-kicker"><span className="step-kicker-mark"><CarFront size={15} /></span>{t('tpCarKicker')}</p>
            <h2 id="cars-title">{t('cars')}</h2>
          </div>
        </div>
        <p className="passenger-note" role="note">{t('tpCarBookingSoon')}</p>

        <div className="rental-fields catalog-filters">
          <label className="rental-field">
            <span className="field-label">{t('tpCityLabel')}</span>
            <span className="rental-input-wrap"><MapPin size={17} aria-hidden="true" />
              <select value={city} onChange={(event) => setCity(event.target.value)} data-testid="filter-car-city">
                <option value="">{t('tpAllCities')}</option>
                {CATALOG_CITIES.map((name) => <option key={name} value={name}>{cityLabel(t, name)}</option>)}
              </select>
            </span>
          </label>
          <label className="rental-field">
            <span className="field-label">{t('tpTransmission')}</span>
            <span className="rental-input-wrap"><Cog size={17} aria-hidden="true" />
              <select value={transmission} onChange={(event) => setTransmission(event.target.value)} data-testid="filter-car-transmission">
                <option value="">{t('tpAny')}</option>
                <option value="AUTOMATIC">{t('tpAutomatic')}</option>
                <option value="MANUAL">{t('tpManual')}</option>
              </select>
            </span>
          </label>
          <label className="rental-field">
            <span className="field-label">{t('tpMinSeats')}</span>
            <span className="rental-input-wrap"><UsersRound size={17} aria-hidden="true" />
              <select value={minSeats} onChange={(event) => setMinSeats(event.target.value)} data-testid="filter-car-seats">
                <option value="">{t('tpAny')}</option>
                {['4', '5', '7'].map((n) => <option key={n} value={n}>{t('tpSeatsCount', { count: format.number(Number(n)) })}+</option>)}
              </select>
            </span>
          </label>
        </div>

        <div className="car-choice-heading">
          <div><p className="field-label">{t('tpResults')}</p><p>{state.status === 'ready' ? t('tpResultsCount', { count: format.number(state.total) }) : ' '}</p></div>
          <span className="sample-price-note">{t('tpPricePerDay')}</span>
        </div>

        {state.status === 'loading' && <p className="passenger-state" role="status">{t('loading')}</p>}
        {state.status === 'error' && <div className="passenger-state" role="alert"><p>{t(state.message)}</p><button type="button" className="back-button" onClick={() => setAttempt((n) => n + 1)}>{t('retry')}</button></div>}
        {state.status === 'ready' && state.rows.length === 0 && <p className="passenger-state" data-testid="text-no-cars">{t('tpNoMatches')}</p>}
        {state.status === 'ready' && state.rows.length > 0 && (
          <ul className="car-options catalog-grid-cars" data-testid="car-results">
            {state.rows.map((car) => {
              const tripCity = car.city as TripCity;
              return (
                <li key={String(car.apiId)} className="car-option catalog-car" data-testid="car-card">
                  <span className="car-art" aria-hidden="true"><CarFront size={28} strokeWidth={1.5} /><span>{(car.make ?? '').slice(0, 1)}</span></span>
                  <span className="car-copy">
                    <strong>{car.make} {car.model}</strong>
                    <span>{car.year ? format.year(car.year) : ''}{car.category ? ` · ${car.category}` : ''} · {cityLabel(t, car.city ?? '')}</span>
                    <small><UsersRound size={13} />{t('tpSeatsCount', { count: format.number(car.seats ?? 0) })}<i />{car.transmission === 'MANUAL' ? t('tpManual') : t('tpAutomatic')}</small>
                    <span className="catalog-actions">
                      <span className="catalog-soon">{t('tpBookingSoon')}</span>
                      {AIRPORT[tripCity] && <Link className="catalog-plan" href={`${routes.passenger.flights}?to=${encodeURIComponent(tripCity)}`}>{t('tpPlanTripTo', { city: cityLabel(t, tripCity) })}</Link>}
                    </span>
                  </span>
                  <span className="car-price"><strong><Money sar={car.price} /></strong><span>/ {t('tpDayShort')}</span></span>
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
