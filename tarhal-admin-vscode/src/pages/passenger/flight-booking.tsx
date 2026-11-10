import { useCallback, useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowLeftRight, ArrowRight, Armchair, BedDouble, CalendarDays, CarFront, Check, ChevronDown, Minus, Plane, Plus, RotateCcw, UsersRound, X } from 'lucide-react';
import { Link, useLocation, useSearch } from 'wouter';
import { Money } from '@/components/money';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { httpStatus } from '@/services/api';
import { bookingService, type BookingTraveler } from '@/services/bookingService';
import { flightService, type FlightOption, type TicketClass } from '@/services/flightService';
import { logout, useAuth } from '@/store/authStore';
import { useDemoState } from '@/store/demoStore';
import CarRentalStep, { type CarPlan } from './components/car-rental-step';
import ConfirmationPopup from './components/confirmation-popup';
import { HoldTimer } from './components/hold-timer';
import HotelStayStep, { type HotelPlan } from './components/hotel-stay-step';
import { PassengerShell } from './components/passenger-shell';
import SeatSelectionStep, { type ChosenSeat } from './components/seat-selection-step';
import Sidebar from './components/passenger-sidebar';
import TravelerDetailsStep from './components/traveler-details-step';
import { addDays, AIRPORT, cityLabel, DRAFT_KEY, durationMinutes, errorKey, riyadhDay, riyadhTime, riyadhToday, TRIP_CITIES, type TripCity } from './trip';

type Stage = 'flight' | 'seat' | 'travelers' | 'hotel' | 'car' | 'complete';
type TripType = 'oneWay' | 'roundTrip' | 'multiCity';
type Search = { from: TripCity; to: TripCity; departure: string; passengers: number; cabinClass: TicketClass };
type Results = { status: 'loading' } | { status: 'error'; message: TranslationKey } | { status: 'ready'; flights: FlightOption[] };
/** What survives the trip to the login page and back (sessionStorage). */
type Draft = { search: Search; flight: FlightOption; seatIds: string[] };

const modes: { id: 'flight' | 'seat' | 'hotel' | 'car'; icon: typeof Plane; label: TranslationKey; badge?: TranslationKey }[] = [
  { id: 'flight', icon: Plane, label: 'tpModeFlight' },
  { id: 'seat', icon: Armchair, label: 'tpModeSeat', badge: 'tpNext' },
  { id: 'hotel', icon: BedDouble, label: 'tpModeHotel', badge: 'tpLater' },
  { id: 'car', icon: CarFront, label: 'tpModeCar', badge: 'tpLater' },
];
// The search API takes one date and the database has these three ticket classes ("Premium economy" does not exist).
const TRIP_TYPES: { id: TripType; label: TranslationKey; soon: boolean }[] = [
  { id: 'oneWay', label: 'tpOneWay', soon: false },
  { id: 'roundTrip', label: 'tpRoundTrip', soon: true },
  { id: 'multiCity', label: 'tpMultiCity', soon: true },
];
const CABINS: { id: TicketClass; label: TranslationKey }[] = [
  { id: 'ECONOMY', label: 'ticketECONOMY' }, { id: 'BUSINESS', label: 'ticketBUSINESS' }, { id: 'FIRST', label: 'ticketFIRST' },
];
const sameAirport = (a: TripCity, b: TripCity) => a === b || (AIRPORT[a] !== null && AIRPORT[a] === AIRPORT[b]);

function readDraft(): Draft | null {
  try { const raw = sessionStorage.getItem(DRAFT_KEY); return raw ? (JSON.parse(raw) as Draft) : null; } catch { return null; }
}
function saveDraft(draft: Draft | null) {
  try { if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); else sessionStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable: the traveler searches again after logging in */ }
}

/**
 * Tariq's booking page on the real API:
 * search (GET /api/flights/search) -> seats (GET /api/flights/:id, hold with POST /api/flights/:id/hold) -> travelers ->
 * hotel and car (real listings, not bookable yet) -> confirm (POST /api/bookings).
 */
export default function FlightBooking() {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [stage, setStage] = useState<Stage>('flight');
  const [tripType, setTripType] = useState<TripType>('oneWay');
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState<TicketClass>('ECONOMY');
  // "Plan a trip to …" on the hotels and cars pages opens this page with ?to=<city> as the destination.
  const toParam = new URLSearchParams(useSearch()).get('to');
  const linkedTo = (TRIP_CITIES as readonly string[]).includes(toParam ?? '') ? (toParam as TripCity) : null;
  const [from, setFrom] = useState<TripCity>(linkedTo === 'Riyadh' ? 'Jeddah' : 'Riyadh');
  const [to, setTo] = useState<TripCity>(linkedTo ?? 'Jeddah');
  const [openCityPicker, setOpenCityPicker] = useState<'' | 'from' | 'to'>('');
  const [departure, setDeparture] = useState(() => addDays(riyadhToday(), 7));
  const [openPopover, setOpenPopover] = useState<'' | 'trip' | 'passengers' | 'class'>('');
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [search, setSearch] = useState<Search | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [flight, setFlight] = useState<FlightOption | null>(null);
  const [seatIds, setSeatIds] = useState<string[]>([]);
  const [seats, setSeats] = useState<ChosenSeat[]>([]);
  const [travelers, setTravelers] = useState<BookingTraveler[]>([]);
  const [hotel, setHotel] = useState<HotelPlan | null>(null);
  const [car, setCar] = useState<CarPlan | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [booking, setBooking] = useState<{ id: string; totalPrice: number } | null>(null);
  /** End of the seat hold from the API, and the message the seat map shows when the traveler has to pick again. */
  const [heldUntil, setHeldUntil] = useState<string | null>(null);
  const [seatNotice, setSeatNotice] = useState<TranslationKey | null>(null);
  const today = riyadhToday();

  // The hold runs out after the steps that follow the seat map: back to the seats, with the same seats chosen, to hold them again.
  useEffect(() => {
    if (!heldUntil || !['travelers', 'hotel', 'car'].includes(stage)) return undefined;
    const id = window.setTimeout(() => {
      setShowConfirmation(false);
      setHeldUntil(null);
      setSeatNotice('tpHoldExpired');
      setStage('seat');
    }, Math.max(0, Date.parse(heldUntil) - Date.now()));
    return () => window.clearTimeout(id);
  }, [heldUntil, stage]);

  // Back from the login page: pick up the flight and seats where the traveler left them.
  useEffect(() => {
    const draft = user ? readDraft() : null;
    if (!draft) return;
    saveDraft(null);
    setSearch(draft.search);
    setFrom(draft.search.from); setTo(draft.search.to); setDeparture(draft.search.departure);
    setPassengers(draft.search.passengers); setCabinClass(draft.search.cabinClass);
    setFlight(draft.flight);
    setSeatIds(draft.seatIds);
    setStage('seat');
  }, [user]);

  const fromOptions = TRIP_CITIES.filter((city) => !sameAirport(city, to));
  const toOptions = TRIP_CITIES.filter((city) => !sameAirport(city, from));

  const togglePopover = (popover: 'trip' | 'passengers' | 'class') => { setOpenCityPicker(''); setOpenPopover((current) => (current === popover ? '' : popover)); };
  const toggleCityPicker = (field: 'from' | 'to') => { setOpenPopover(''); setOpenCityPicker((current) => (current === field ? '' : field)); };
  const chooseCity = (field: 'from' | 'to', city: TripCity) => { if (field === 'from') setFrom(city); else setTo(city); setOpenCityPicker(''); setMessage(null); };
  const handleCityPickerBlur = (event: FocusEvent<HTMLDivElement>) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenCityPicker(''); };
  const handleCityPickerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); setOpenCityPicker(''); event.currentTarget.querySelector<HTMLButtonElement>('.city-picker-trigger')?.focus(); }
  };
  const swapCities = () => { setFrom(to); setTo(from); setOpenCityPicker(''); setOpenPopover(''); setMessage(null); };

  const runSearch = useCallback(async (details: Search) => {
    setResults({ status: 'loading' });
    try {
      const flights = await flightService.search({ from: AIRPORT[details.from] ?? '', to: AIRPORT[details.to] ?? '', date: details.departure });
      setResults({ status: 'ready', flights: flights.sort((a, b) => a.departureTime.localeCompare(b.departureTime)) });
    } catch (error) {
      setResults({ status: 'error', message: errorKey(error) });
    }
  }, []);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    if (sameAirport(from, to)) { setMessage('tpErrSameAirport'); return; }
    if (!AIRPORT[from] || !AIRPORT[to]) { setMessage('tpErrNoAirport'); return; }
    if (!departure) { setMessage('tpErrNoDate'); return; }
    if (departure < today) { setMessage('tpErrPastDate'); return; }
    const details: Search = { from, to, departure, passengers, cabinClass };
    setSearch(details);
    setShowResults(true);
    setOpenCityPicker(''); setOpenPopover(''); setMessage(null);
    void runSearch(details);
  };

  // Keyboard and screen readers: the results dialog takes focus when it opens, and each new step's heading when the step changes.
  const resultsClose = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (showResults) resultsClose.current?.focus(); }, [showResults]);
  const firstStage = useRef(true);
  useEffect(() => {
    if (firstStage.current) { firstStage.current = false; return; }
    const heading = document.querySelector<HTMLElement>('.passenger-app .step-panel h2, .passenger-app .complete-panel h2, .passenger-app #welcome-title');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: false }); }
  }, [stage]);

  useEffect(() => {
    if (!showResults) return undefined;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowResults(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showResults]);

  const chooseFlight = (option: FlightOption) => { setFlight(option); setSeatIds([]); setSeats([]); setTravelers([]); setShowResults(false); setStage('seat'); };

  /** Seats picked: signed-out travelers log in first (and come back here); others hold the seats for 10 minutes. */
  const completeSeats = async (chosen: ChosenSeat[]): Promise<TranslationKey | null> => {
    if (!flight || !search) return null;
    if (!user) {
      saveDraft({ search, flight, seatIds: chosen.map((seat) => seat.id) });
      setLocation(`${routes.login}?next=${encodeURIComponent(routes.passenger.flights)}`);
      return null;
    }
    try {
      const hold = await flightService.hold(flight.id, chosen.map((seat) => seat.id));
      setHeldUntil(hold.heldUntil || null);
      setSeatNotice(null);
      setSeats(chosen);
      setSeatIds(chosen.map((seat) => seat.id));
      setStage('travelers');
      return null;
    } catch (error) {
      if (httpStatus(error) === 401) {
        logout();
        saveDraft({ search, flight, seatIds: chosen.map((seat) => seat.id) });
        setLocation(`${routes.login}?next=${encodeURIComponent(routes.passenger.flights)}`);
        return null;
      }
      return errorKey(error, 'tpErrSeatTaken');
    }
  };

  const book = async (): Promise<TranslationKey | null> => {
    if (!flight) return null;
    try {
      const result = await bookingService.create({ flightId: flight.id, travelers });
      setBooking(result);
      setShowConfirmation(false);
      setStage('complete');
      return null;
    } catch (error) {
      if (httpStatus(error) === 401) {
        logout();
        saveDraft({ search: search!, flight, seatIds });
        setLocation(`${routes.login}?next=${encodeURIComponent(routes.passenger.flights)}`);
        return null;
      }
      if (httpStatus(error) === 409) {
        // A seat was taken since it was held: back to the seat map, which reloads and says why.
        setShowConfirmation(false);
        setHeldUntil(null);
        setSeatNotice('tpErrSeatTaken');
        setStage('seat');
      }
      return errorKey(error, 'tpErrSeatTaken');
    }
  };

  const startOver = () => {
    setStage('flight'); setSearch(null); setResults(null); setShowResults(false); setFlight(null);
    setSeatIds([]); setSeats([]); setTravelers([]); setCar(null); setHotel(null); setShowConfirmation(false); setBooking(null); setMessage(null);
    setHeldUntil(null); setSeatNotice(null);
  };

  const progressSteps: { id: Stage; label: TranslationKey }[] = [
    { id: 'flight', label: 'tpModeFlight' }, { id: 'seat', label: 'tpModeSeat' }, { id: 'travelers', label: 'tpModeTravelers' },
    { id: 'hotel', label: 'tpModeHotel' }, { id: 'car', label: 'tpModeCar' }, { id: 'complete', label: 'tpModeReady' },
  ];
  const currentProgressIndex = progressSteps.findIndex((step) => step.id === stage);
  const copy: Record<Stage, [TranslationKey, TranslationKey, TranslationKey, TranslationKey]> = {
    flight: ['tpEyebrowFlight', 'tpTitleFlight1', 'tpTitleFlight2', 'tpNoteFlight'],
    seat: ['tpEyebrowSeat', 'tpTitleSeat1', 'tpTitleSeat2', 'tpNoteSeat'],
    travelers: ['tpEyebrowTravelers', 'tpTitleTravelers1', 'tpTitleTravelers2', 'tpNoteTravelers'],
    hotel: ['tpEyebrowHotel', 'tpTitleHotel1', 'tpTitleHotel2', 'tpNoteHotel'],
    car: ['tpEyebrowCar', 'tpTitleCar1', 'tpTitleCar2', 'tpNoteCar'],
    complete: ['tpEyebrowDone', 'tpTitleDone1', 'tpTitleDone2', 'tpNoteDone'],
  };
  const [eyebrow, title1, title2, note] = copy[stage];
  const airlineName = (option: FlightOption) => (language === 'ar' ? option.airline.nameAr : option.airline.name) || t('tpAirlineUnknown');
  const duration = (option: FlightOption) => {
    const minutes = durationMinutes(option.departureTime, option.arrivalTime);
    return t('tpDuration', { h: format.number(Math.floor(minutes / 60)), m: format.number(minutes % 60) });
  };

  return (
    <PassengerShell>
      <main className="tarhal-page">
        <Sidebar />
        <div className="tarhal-shell">
          <header className="site-header">
            <div className="brand-slot" aria-label="Tarhal"><span className="brand-fallback">TARHAL</span></div>
            <span className="header-note"><span className="header-dot" />{t('tpHeaderNote')}</span>
          </header>

          <section className="welcome" aria-labelledby="welcome-title">
            <div className="welcome-copy">
              <p className="eyebrow">{t(eyebrow)}</p>
              <h1 id="welcome-title">{t(title1)}<br />{t(title2)}</h1>
              <p className="welcome-note">{t(note, { city: cityLabel(t, search?.to ?? to) })}</p>
            </div>
            <div className="hero-art-reserved" aria-hidden="true">
              <span className="hero-orbit-ring hero-orbit-ring-outer" />
              <span className="hero-orbit-ring hero-orbit-ring-inner" />
              <span className="hero-orbit-dot hero-orbit-dot-one" />
              <span className="hero-orbit-dot hero-orbit-dot-two" />
              <span className="hero-orbit-dot hero-orbit-dot-three" />
              <span className="hero-orbit-dot hero-orbit-dot-four" />
              <span className="hero-orbit-globe"><Plane size={23} strokeWidth={1.5} /></span>
            </div>
          </section>

          <div className="journey-progress" aria-label={t('tpProgress')}>
            {progressSteps.map((step, index) => {
              const isCurrent = index === currentProgressIndex;
              const isDone = index < currentProgressIndex;
              return (
                <span className="progress-step-pair" key={step.id}>
                  <span className={`progress-item${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
                    <span className="progress-number">{isDone ? <Check size={13} /> : format.number(index + 1)}</span>
                    <span className="progress-label">{t(step.label)}</span>
                  </span>
                  {index < progressSteps.length - 1 && <span className={`progress-line${index < currentProgressIndex ? ' passed' : ''}`} aria-hidden="true" />}
                </span>
              );
            })}
          </div>

          {stage === 'flight' && (
            <section className="booking-panel" aria-label={t('tpPlanJourney')}>
              <nav className="mode-tabs" aria-label={t('tpServices')}>
                {modes.map(({ id, icon: Icon, label, badge }) => {
                  const isFlight = id === 'flight';
                  return (
                    <button className={`mode-tab${isFlight ? ' active' : ''}`} key={id} type="button" aria-pressed={isFlight} disabled={!isFlight}>
                      <Icon size={16} strokeWidth={2.1} style={id === 'hotel' ? { transform: 'scale(1.4)' } : undefined} />
                      <span>{t(label)}</span>
                      {badge && <span className="soon-tag">{t(badge)}</span>}
                    </button>
                  );
                })}
              </nav>

              <form className="booking-form" onSubmit={onSearch} data-testid="form-flight-search">
                <div className="booking-options">
                  <div className="option-wrap">
                    <button className="option-select" type="button" aria-expanded={openPopover === 'trip'} onClick={() => togglePopover('trip')} data-testid="button-trip-type">
                      {t(TRIP_TYPES.find((type) => type.id === tripType)!.label)}<ChevronDown size={14} />
                    </button>
                    {openPopover === 'trip' && (
                      <div className="option-popover trip-popover" role="group" aria-label={t('tpTripType')}>
                        {TRIP_TYPES.map((type) => (
                          <button key={type.id} className={tripType === type.id ? 'chosen' : ''} type="button" disabled={type.soon}
                            onClick={() => { setTripType(type.id); setOpenPopover(''); setMessage(null); }}>
                            {t(type.label)}{type.soon ? ` · ${t('tpSoon')}` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="option-wrap">
                    <button className="option-select" type="button" aria-expanded={openPopover === 'passengers'} onClick={() => togglePopover('passengers')} data-testid="button-passengers">
                      <UsersRound size={14} /> {format.number(passengers).padStart(2, '0')} {t(passengers === 1 ? 'tpPassenger' : 'tpPassengers')}<ChevronDown size={14} />
                    </button>
                    {openPopover === 'passengers' && (
                      <div className="option-popover passenger-popover">
                        <div>
                          <span className="popover-title">{t('travelers')}</span>
                          <span className="popover-caption">{t('tpPassengerCaption')}</span>
                        </div>
                        <div className="stepper">
                          <button type="button" aria-label={t('tpRemovePassenger')} disabled={passengers <= 1} onClick={() => setPassengers(Math.max(1, passengers - 1))}><Minus size={14} /></button>
                          <span aria-live="polite">{format.number(passengers)}</span>
                          <button type="button" aria-label={t('tpAddPassenger')} disabled={passengers >= 6} onClick={() => setPassengers(Math.min(6, passengers + 1))} data-testid="button-add-passenger"><Plus size={14} /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="option-wrap">
                    <button className="option-select" type="button" aria-expanded={openPopover === 'class'} onClick={() => togglePopover('class')} data-testid="button-cabin">
                      {t(CABINS.find((cabin) => cabin.id === cabinClass)!.label)}<ChevronDown size={14} />
                    </button>
                    {openPopover === 'class' && (
                      <div className="option-popover class-popover" role="group" aria-label={t('tpCabinClass')}>
                        {CABINS.map((cabin) => (
                          <button key={cabin.id} className={cabinClass === cabin.id ? 'chosen' : ''} type="button" onClick={() => { setCabinClass(cabin.id); setOpenPopover(''); }}>{t(cabin.label)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="fields-row">
                  {(['from', 'to'] as const).map((field, index) => {
                    const value = field === 'from' ? from : to;
                    const options = field === 'from' ? fromOptions : toOptions;
                    return (
                      <div key={field} className="contents">
                        {index === 1 && (
                          <button className="swap-button" type="button" aria-label={t('tpSwapCities')} onClick={swapCities}><ArrowLeftRight size={19} /></button>
                        )}
                        <div className="city-picker-wrap" onBlur={handleCityPickerBlur} onKeyDown={handleCityPickerKeyDown}>
                          <button className="city-field city-picker-trigger" type="button"
                            aria-label={t(field === 'from' ? 'tpFromSelected' : 'tpToSelected', { city: cityLabel(t, value) })}
                            aria-expanded={openCityPicker === field} aria-controls={openCityPicker === field ? `${field}-city-options` : undefined}
                            onClick={() => toggleCityPicker(field)} data-testid={`button-city-${field}`}>
                            <span className="field-label">{t(field === 'from' ? 'tpFromLabel' : 'tpToLabel')}</span>
                            <span className="city-picker-value">{cityLabel(t, value)}</span>
                            <ChevronDown className="city-picker-chevron" size={15} aria-hidden="true" />
                          </button>
                          {openCityPicker === field && (
                            <div className="city-popover" id={`${field}-city-options`} role="group" aria-label={t(field === 'from' ? 'tpFromOptions' : 'tpToOptions')}>
                              {options.map((city) => (
                                <button className={`city-option${value === city ? ' chosen' : ''}`} key={city} type="button" aria-pressed={value === city}
                                  onClick={() => chooseCity(field, city)} data-testid={`option-city-${field}-${city}`}>{cityLabel(t, city)}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="date-field date-field-single">
                    <label>
                      <span className="field-label">{t('tpDepartureLabel')}</span>
                      <span className="date-input-line">
                        <input aria-label={t('tpDepartureDate')} type="date" dir="ltr" value={departure} min={today} onChange={(event) => { setDeparture(event.target.value); setMessage(null); }} data-testid="input-departure" />
                        <CalendarDays size={17} aria-hidden="true" />
                      </span>
                    </label>
                  </div>
                </div>

                <div className="form-footer">
                  <p className={`form-message${message ? ' visible' : ''}`} aria-live="polite">{message ? t(message) : ' '}</p>
                  <button className="search-button" type="submit" data-testid="button-search-flights"><span>{t('tpSearchFlights')}</span><ArrowRight className="rtl:-scale-x-100" size={21} /></button>
                </div>
              </form>
            </section>
          )}

          {stage === 'seat' && flight && search && (
            <SeatSelectionStep flight={flight} passengers={search.passengers} cabinClass={search.cabinClass} initialSeatIds={seatIds} notice={seatNotice}
              onBack={() => { setStage('flight'); setShowResults(true); }} onComplete={completeSeats} />
          )}
          {(stage === 'travelers' || stage === 'hotel' || stage === 'car') && <HoldTimer until={heldUntil} />}
          {stage === 'travelers' && (
            <TravelerDetailsStep seats={seats} initial={travelers} onBack={() => setStage('seat')} onComplete={(list) => { setTravelers(list); setStage('hotel'); }} />
          )}
          {stage === 'hotel' && flight && (
            <HotelStayStep city={search?.to ?? to} checkIn={riyadhDay(flight.arrivalTime) || search?.departure || departure}
              onBack={() => setStage('travelers')} onSkip={() => { setHotel(null); setStage('car'); }} onComplete={(plan) => { setHotel(plan); setStage('car'); }} />
          )}
          {stage === 'car' && flight && (
            <CarRentalStep city={search?.to ?? to} departure={riyadhDay(flight.arrivalTime) || departure}
              onBack={() => setStage('hotel')} onSkip={() => { setCar(null); setShowConfirmation(true); }} onComplete={(plan) => { setCar(plan); setShowConfirmation(true); }} />
          )}

          {stage === 'complete' && flight && booking && (
            <section className="complete-panel" aria-labelledby="complete-title" data-testid="panel-complete">
              <div className="complete-icon"><Check size={23} /></div>
              <div className="complete-heading">
                <p className="step-kicker">{t('tpBookingConfirmedKicker')}</p>
                <h2 id="complete-title">{t('tpBookingConfirmedTitle')}</h2>
                <p className="complete-reference" data-testid="text-booking-reference">{t('tpReference')}: <bdi dir="ltr" title={booking.id}>{booking.id.slice(0, 8)}</bdi> · <Money sar={booking.totalPrice} /></p>
              </div>
              <div className="complete-itinerary">
                <div>
                  <span className="complete-icon-small"><Plane size={16} /></span>
                  <div><small>{t('tpFlight')}</small><strong>{cityLabel(t, flight.from)} <ArrowRight className="rtl:-scale-x-100" size={13} /> {cityLabel(t, flight.to)}</strong><span>{airlineName(flight)} · <bdi dir="ltr">{flight.flightNumber}</bdi></span></div>
                </div>
                <div>
                  <span className="complete-icon-small"><Armchair size={16} /></span>
                  <div><small>{t('tpSeats')}</small><strong dir="ltr">{seats.map((seat) => seat.code).join(', ')}</strong><span>{t(seats.length === 1 ? 'tpSeatCount1' : 'tpSeatCount', { count: format.number(seats.length) })}</span></div>
                </div>
                {hotel && (
                  <div>
                    <span className="complete-icon-small"><BedDouble size={16} /></span>
                    <div><small>{t('tpHotel')} · {t('tpNotBookedYet')}</small><strong>{hotel.name}</strong><span>{cityLabel(t, hotel.city)} · {t(hotel.nights === 1 ? 'tpNight1' : 'tpNights', { count: format.number(hotel.nights) })}</span></div>
                  </div>
                )}
                {car && (
                  <div>
                    <span className="complete-icon-small"><CarFront size={16} /></span>
                    <div><small>{t('tpCar')} · {t('tpNotBookedYet')}</small><strong>{car.car}</strong><span>{cityLabel(t, car.location)} · <Money sar={car.dailyRate} />/{t('tpDayShort')}</span></div>
                  </div>
                )}
              </div>
              <div className="complete-actions">
                <Link className="restart-button" href={routes.passenger.bookings} data-testid="link-my-bookings">{t('tpViewMyBookings')}</Link>
                <button className="restart-button" type="button" onClick={startOver}><RotateCcw size={15} /> {t('tpPlanAnother')}</button>
              </div>
            </section>
          )}

          <footer className="page-footer"><span>{t('tpFooter')}</span></footer>
        </div>

        {showResults && search && (
          <div className="flight-results-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowResults(false); }} data-testid="overlay-flight-results">
            <section className="flight-results-dialog" role="dialog" aria-modal="true" aria-labelledby="flight-results-title">
              <button ref={resultsClose} className="dialog-close" type="button" aria-label={t('tpCloseResults')} onClick={() => setShowResults(false)}><X size={18} /></button>
              <div className="flight-results-heading">
                <div>
                  <p className="dialog-eyebrow">{t('tpResultsEyebrow')}</p>
                  <h2 id="flight-results-title">{t('tpResultsTitle')}</h2>
                  <p className="flight-results-route">
                    <span>{cityLabel(t, search.from)}</span><ArrowRight className="rtl:-scale-x-100" size={14} /><span>{cityLabel(t, search.to)}</span>
                    <span>{format.date(search.departure)}</span>
                  </p>
                </div>
              </div>
              <div className="flight-results-summary">
                <span>{t(search.passengers === 1 ? 'tpTravelerCount1' : 'tpTravelerCount', { count: format.number(search.passengers) })}</span>
                <span>{t(CABINS.find((cabin) => cabin.id === search.cabinClass)!.label)}</span>
                <span>{t('tpOneWay')}</span>
              </div>
              <div className="flight-results-list" aria-live="polite">
                {results?.status === 'loading' && <p className="passenger-state" role="status">{t('tpSearching')}</p>}
                {results?.status === 'error' && (
                  <div className="passenger-state" role="alert"><p>{t(results.message)}</p><button type="button" className="back-button" onClick={() => void runSearch(search)}>{t('retry')}</button></div>
                )}
                {results?.status === 'ready' && results.flights.length === 0 && <p className="passenger-state" data-testid="text-no-flights">{t('tpNoFlights')}</p>}
                {results?.status === 'ready' && results.flights.map((option) => {
                  const enough = option.availableSeats >= search.passengers;
                  return (
                    <article className="flight-result-card" key={option.id} data-testid={`flight-${option.flightNumber}`}>
                      <span className="flight-airline-mark"><Plane size={19} /></span>
                      <div className="flight-result-main">
                        <div className="flight-airline-row"><strong>{airlineName(option)}</strong><span dir="ltr">{option.flightNumber}</span></div>
                        <div className="flight-time-row">
                          <div><strong dir="ltr">{riyadhTime(option.departureTime)}</strong><span>{cityLabel(t, option.from)}</span></div>
                          <div className="flight-duration"><span>{duration(option)}</span><span /><span>{t('tpNonstop')}</span></div>
                          <div className="flight-arrival"><strong dir="ltr">{riyadhTime(option.arrivalTime)}</strong><span>{cityLabel(t, option.to)}</span></div>
                        </div>
                      </div>
                      <div className="flight-result-fare">
                        <small>{t('tpFromPrice')}</small>
                        <strong>{option.lowestPrice === null ? '—' : <Money sar={option.lowestPrice} />}</strong>
                        <span>{t('tpSeatsLeft', { count: format.number(option.availableSeats) })}</span>
                        <button className="flight-select-button" type="button" disabled={!enough} onClick={() => chooseFlight(option)} data-testid={`button-select-flight-${option.flightNumber}`}>
                          {enough ? t('tpSelect') : t('tpNotEnoughSeats')} <ArrowRight className="rtl:-scale-x-100" size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
        {showConfirmation && flight && (
          <ConfirmationPopup flight={flight} seats={seats} hotel={hotel} car={car} onBook={book} onClose={() => setShowConfirmation(false)} />
        )}
      </main>
    </PassengerShell>
  );
}
