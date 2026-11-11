import { FrameHeader } from './components/frame-header';
import { useCallback, useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ArrowLeftRight, ArrowRight, Armchair, BedDouble, CalendarDays, CarFront, Check, ChevronDown, Minus, Plane, Plus, UsersRound, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { Money } from '@/components/money';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { httpStatus } from '@/services/api';
import { bookingService, type BookingTraveler } from '@/services/bookingService';
import { flightService, type FlightOption, type TicketClass } from '@/services/flightService';
import { tripService } from '@/services/tripService';
import { logout, useAuth } from '@/store/authStore';
import { useDemoState } from '@/store/demoStore';
import CarRentalStep, { type CarPlan } from './components/car-rental-step';
import ConfirmationPopup, { type TripLeg } from './components/confirmation-popup';
import { HoldTimer } from './components/hold-timer';
import HotelStayStep, { type HotelPlan } from './components/hotel-stay-step';
import { PassengerShell } from './components/passenger-shell';
import SeatSelectionStep, { type ChosenSeat } from './components/seat-selection-step';
import Sidebar from './components/passenger-sidebar';
import TravelerDetailsStep from './components/traveler-details-step';
import TripReady, { type TripItem } from './components/trip-ready';
import { addDays, AIRPORT, cityLabel, DRAFT_KEY, durationMinutes, errorKey, riyadhDay, riyadhTime, riyadhToday, TRIP_CITIES, type TripCity } from './trip';

type Stage = 'flight' | 'seat' | 'travelers' | 'hotel' | 'car' | 'complete';
type TripType = 'oneWay' | 'roundTrip' | 'multiCity';
type Search = { from: TripCity; to: TripCity; departure: string; returnDate: string | null; passengers: number; cabinClass: TicketClass };
type Results = { status: 'loading' } | { status: 'error'; message: TranslationKey } | { status: 'ready'; outbound: FlightOption[]; back: FlightOption[] | null };
/** What survives the trip to the login page and back (sessionStorage). */
type Draft = { search: Search; flight: FlightOption; returnFlight: FlightOption | null; seatIds: string[]; returnSeatIds: string[]; seatLeg: 0 | 1 };

const modes: { id: 'flight' | 'seat' | 'hotel' | 'car'; icon: typeof Plane; label: TranslationKey; badge?: TranslationKey }[] = [
  { id: 'flight', icon: Plane, label: 'tpModeFlight' },
  { id: 'seat', icon: Armchair, label: 'tpModeSeat', badge: 'tpNext' },
  { id: 'hotel', icon: BedDouble, label: 'tpModeHotel', badge: 'tpLater' },
  { id: 'car', icon: CarFront, label: 'tpModeCar', badge: 'tpLater' },
];
// The database has these three ticket classes ("Premium economy" does not exist). Multi-city has no API.
const TRIP_TYPES: { id: TripType; label: TranslationKey; soon: boolean }[] = [
  { id: 'oneWay', label: 'tpOneWay', soon: false },
  { id: 'roundTrip', label: 'tpRoundTrip', soon: false },
  { id: 'multiCity', label: 'tpMultiCity', soon: true },
];
const CABINS: { id: TicketClass; label: TranslationKey }[] = [
  { id: 'ECONOMY', label: 'ticketECONOMY' }, { id: 'BUSINESS', label: 'ticketBUSINESS' }, { id: 'FIRST', label: 'ticketFIRST' },
];
const sameAirport = (a: TripCity, b: TripCity) => a === b || (AIRPORT[a] !== null && AIRPORT[a] === AIRPORT[b]);
const nightsBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

function readDraft(): Draft | null {
  try { const raw = sessionStorage.getItem(DRAFT_KEY); return raw ? (JSON.parse(raw) as Draft) : null; } catch { return null; }
}
function saveDraft(draft: Draft | null) {
  try { if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); else sessionStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable: the traveler searches again after logging in */ }
}

/**
 * Tariq's booking page on the real API:
 * search (GET /api/flights/search, one way or round trip, for N passengers) -> seats for each flight (GET /api/flights/:id,
 * hold with POST /api/flights/:id/hold) -> travelers -> hotel and car in the destination city -> confirm
 * (POST /api/bookings per flight, /api/hotel-bookings, /api/car-rentals) -> Ready: simulated payment and boarding passes.
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
  // His defaults: Riyadh to Dammam, a week from today, back a week later.
  const [from, setFrom] = useState<TripCity>('Riyadh');
  const [to, setTo] = useState<TripCity>('Dammam');
  const [openCityPicker, setOpenCityPicker] = useState<'' | 'from' | 'to'>('');
  const [departure, setDeparture] = useState(() => addDays(riyadhToday(), 7));
  const [returnDate, setReturnDate] = useState(() => addDays(riyadhToday(), 14));
  const [openPopover, setOpenPopover] = useState<'' | 'trip' | 'passengers' | 'class'>('');
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [search, setSearch] = useState<Search | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [resultsPhase, setResultsPhase] = useState<'outbound' | 'return'>('outbound');
  const [flight, setFlight] = useState<FlightOption | null>(null);
  const [returnFlight, setReturnFlight] = useState<FlightOption | null>(null);
  /** Which flight's seat map is open: 0 = outbound, 1 = return. */
  const [seatLeg, setSeatLeg] = useState<0 | 1>(0);
  const [seatIds, setSeatIds] = useState<[string[], string[]]>([[], []]);
  const [seats, setSeats] = useState<[ChosenSeat[], ChosenSeat[]]>([[], []]);
  const [travelers, setTravelers] = useState<BookingTraveler[]>([]);
  const [hotel, setHotel] = useState<HotelPlan | null>(null);
  const [car, setCar] = useState<CarPlan | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [items, setItems] = useState<TripItem[]>([]);
  /** End of each flight's seat hold from the API, and the message the seat map shows when the traveler has to pick again. */
  const [heldUntil, setHeldUntil] = useState<[string | null, string | null]>([null, null]);
  const [seatNotice, setSeatNotice] = useState<TranslationKey | null>(null);
  const today = riyadhToday();
  const roundTrip = Boolean(search?.returnDate && returnFlight);
  const firstHoldEnd = [heldUntil[0], roundTrip ? heldUntil[1] : null].filter((x): x is string => Boolean(x)).sort()[0] ?? null;

  // A hold runs out during the steps that follow the seat maps: back to the seats, with the same seats chosen, to hold them again.
  useEffect(() => {
    if (!firstHoldEnd || !['travelers', 'hotel', 'car'].includes(stage)) return undefined;
    const id = window.setTimeout(() => {
      setShowConfirmation(false);
      setHeldUntil([null, null]);
      setSeatNotice('tpHoldExpired');
      setSeatLeg(0);
      setStage('seat');
    }, Math.max(0, Date.parse(firstHoldEnd) - Date.now()));
    return () => window.clearTimeout(id);
  }, [firstHoldEnd, stage]);

  // Back from the login page: pick up the flights and seats where the traveler left them.
  useEffect(() => {
    const draft = user ? readDraft() : null;
    if (!draft) return;
    saveDraft(null);
    setSearch(draft.search);
    setFrom(draft.search.from); setTo(draft.search.to); setDeparture(draft.search.departure);
    if (draft.search.returnDate) { setReturnDate(draft.search.returnDate); setTripType('roundTrip'); }
    setPassengers(draft.search.passengers); setCabinClass(draft.search.cabinClass);
    setFlight(draft.flight);
    setReturnFlight(draft.returnFlight);
    setSeatIds([draft.seatIds, draft.returnSeatIds]);
    setSeatLeg(draft.seatLeg);
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
      const found = await flightService.search({
        from: AIRPORT[details.from] ?? '', to: AIRPORT[details.to] ?? '', date: details.departure,
        returnDate: details.returnDate ?? undefined, passengers: details.passengers,
      });
      const byTime = (list: FlightOption[]) => list.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
      setResults({ status: 'ready', outbound: byTime(found.outbound), back: found.returnFlights ? byTime(found.returnFlights) : null });
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
    if (tripType === 'roundTrip' && !returnDate) { setMessage('tpErrNoReturnDate'); return; }
    if (tripType === 'roundTrip' && returnDate < departure) { setMessage('tpErrReturnBeforeDeparture'); return; }
    const details: Search = { from, to, departure, returnDate: tripType === 'roundTrip' ? returnDate : null, passengers, cabinClass };
    setSearch(details);
    setResultsPhase('outbound');
    setReturnFlight(null);
    setShowResults(true);
    setOpenCityPicker(''); setOpenPopover(''); setMessage(null);
    void runSearch(details);
  };

  // Keyboard and screen readers: the results dialog takes focus when it opens, and each new step's heading when the step changes.
  const resultsClose = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (showResults) resultsClose.current?.focus(); }, [showResults, resultsPhase]);
  const firstStage = useRef(true);
  useEffect(() => {
    if (firstStage.current) { firstStage.current = false; return; }
    const heading = document.querySelector<HTMLElement>('.passenger-app .step-panel h2, .passenger-app .complete-panel h2, .passenger-app #welcome-title');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: false }); }
  }, [stage, seatLeg]);

  useEffect(() => {
    if (!showResults) return undefined;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowResults(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showResults]);

  const resetLater = () => { setSeatIds([[], []]); setSeats([[], []]); setTravelers([]); setHeldUntil([null, null]); setSeatLeg(0); };
  const chooseFlight = (option: FlightOption) => {
    if (resultsPhase === 'outbound') {
      setFlight(option);
      resetLater();
      // Round trip: the same dialog now lists the flights back.
      if (search?.returnDate) { setResultsPhase('return'); return; }
      setReturnFlight(null);
    } else {
      setReturnFlight(option);
      resetLater();
    }
    setShowResults(false);
    setStage('seat');
  };

  const goToLogin = (chosen: ChosenSeat[]) => {
    if (!flight || !search) return;
    const ids: [string[], string[]] = seatLeg === 0 ? [chosen.map((s) => s.id), seatIds[1]] : [seatIds[0], chosen.map((s) => s.id)];
    saveDraft({ search, flight, returnFlight: roundTrip ? returnFlight : null, seatIds: ids[0], returnSeatIds: ids[1], seatLeg });
    setLocation(`${routes.login}?next=${encodeURIComponent(routes.passenger.flights)}`);
  };

  /** Seats picked: signed-out travelers log in first (and come back here); others hold the seats for 10 minutes. */
  const completeSeats = async (chosen: ChosenSeat[]): Promise<TranslationKey | null> => {
    const legFlight = seatLeg === 0 ? flight : returnFlight;
    if (!legFlight || !search) return null;
    if (!user) { goToLogin(chosen); return null; }
    try {
      const hold = await flightService.hold(legFlight.id, chosen.map((seat) => seat.id));
      setHeldUntil((current) => (seatLeg === 0 ? [hold.heldUntil || null, current[1]] : [current[0], hold.heldUntil || null]));
      setSeatNotice(null);
      setSeats((current) => (seatLeg === 0 ? [chosen, current[1]] : [current[0], chosen]));
      setSeatIds((current) => (seatLeg === 0 ? [chosen.map((s) => s.id), current[1]] : [current[0], chosen.map((s) => s.id)]));
      if (seatLeg === 0 && roundTrip) setSeatLeg(1);
      else setStage('travelers');
      return null;
    } catch (error) {
      if (httpStatus(error) === 401) { logout(); goToLogin(chosen); return null; }
      return errorKey(error, 'tpErrSeatTaken');
    }
  };

  const legs: TripLeg[] = flight ? [{ flight, seats: seats[0] }, ...(roundTrip && returnFlight ? [{ flight: returnFlight, seats: seats[1] }] : [])] : [];

  /** Books the flight(s), then the hotel and the car. The outbound flight must succeed; a later part that fails is shown on the Ready step. */
  const book = async (): Promise<TranslationKey | null> => {
    if (!flight) return null;
    const booked: TripItem[] = [];
    try {
      for (const [index, leg] of legs.entries()) {
        // The traveler entered names once; on the return flight each person keeps their place in the list.
        const list = travelers.map((traveler, i) => ({ ...traveler, seatId: leg.seats[i]?.id ?? traveler.seatId }));
        try {
          const result = await bookingService.create({ flightId: leg.flight.id, travelers: list });
          booked.push({ kind: 'flight', id: result.id, total: result.totalPrice, paid: false, leg: legs.length > 1 ? (index === 0 ? 'outbound' : 'return') : null, flight: leg.flight, seats: leg.seats, travelers: list });
        } catch (error) {
          if (index === 0) throw error;
          booked.push({ kind: 'flight', id: '', total: 0, paid: false, leg: 'return', flight: leg.flight, seats: leg.seats, travelers: list, problem: errorKey(error, 'tpErrSeatTaken') });
        }
      }
    } catch (error) {
      if (httpStatus(error) === 401) { logout(); goToLogin(seats[seatLeg]); return null; }
      if (httpStatus(error) === 409) {
        // A seat was taken since it was held: back to the seat map, which reloads and says why.
        setShowConfirmation(false);
        setHeldUntil([null, null]);
        setSeatNotice('tpErrSeatTaken');
        setSeatLeg(0);
        setStage('seat');
      }
      return errorKey(error, 'tpErrSeatTaken');
    }
    if (hotel) {
      try {
        const result = await tripService.bookHotel({ hotelId: hotel.hotelId, checkIn: hotel.checkIn, checkOut: hotel.checkOut, guests: hotel.guests });
        booked.push({ kind: 'hotel', id: result.id, total: result.totalPrice, paid: false, hotel });
      } catch (error) { booked.push({ kind: 'hotel', id: '', total: 0, paid: false, hotel, problem: errorKey(error) }); }
    }
    if (car) {
      try {
        const result = await tripService.rentCar({ carId: car.carId, pickupDate: car.pickup, returnDate: car.returnDate, withInsurance: false });
        booked.push({ kind: 'car', id: result.id, total: result.totalPrice, paid: false, car });
      } catch (error) { booked.push({ kind: 'car', id: '', total: 0, paid: false, car, problem: errorKey(error, 'tpErrCarTaken') }); }
    }
    setItems(booked);
    setShowConfirmation(false);
    setStage('complete');
    return null;
  };

  /** Simulated payment of every booked, unpaid part of the trip (POST /api/payments). No card details anywhere. */
  const payAll = async (): Promise<TranslationKey | null> => {
    let problem: TranslationKey | null = null;
    const next = [...items];
    for (const [index, item] of next.entries()) {
      if (!item.id || item.paid) continue;
      try {
        await tripService.pay(item.kind, item.id);
        next[index] = { ...item, paid: true };
      } catch (error) {
        if (httpStatus(error) === 409) next[index] = { ...item, paid: true }; // already paid in another tab
        else problem = errorKey(error);
      }
    }
    setItems(next);
    return problem;
  };

  const startOver = () => {
    setStage('flight'); setSearch(null); setResults(null); setShowResults(false); setFlight(null); setReturnFlight(null); setResultsPhase('outbound');
    resetLater(); setCar(null); setHotel(null); setShowConfirmation(false); setItems([]); setMessage(null); setSeatNotice(null);
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
  const legFlight = seatLeg === 0 ? flight : returnFlight;
  const arrivalDay = flight ? riyadhDay(flight.arrivalTime) || search?.departure || departure : departure;
  const homeDay = roundTrip && returnFlight ? riyadhDay(returnFlight.departureTime) : null;
  // Round trip: the travelers form shows both seats of each person ("12A / 14C").
  const travelerSeats = seats[0].map((seat, i) => (roundTrip && seats[1][i] ? { ...seat, code: `${seat.code} / ${seats[1][i].code}` } : seat));
  const resultList = results?.status === 'ready' ? (resultsPhase === 'outbound' ? results.outbound : results.back ?? []) : [];
  const resultFrom = resultsPhase === 'outbound' ? search?.from : search?.to;
  const resultTo = resultsPhase === 'outbound' ? search?.to : search?.from;

  return (
    <PassengerShell>
      <main className="tarhal-page tframe">
        <FrameHeader note="tpHeaderNote" />
        <Sidebar />
        <div className="tarhal-shell tframe-content" data-frame="content">
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

          <div className="stage-view" key={`${stage}-${seatLeg}`}>
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
                            onClick={() => { setTripType(type.id); setOpenPopover(''); setMessage(null); }} data-testid={`option-trip-${type.id}`}>
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

                  {/* His date box: one field for a one-way trip, DEPARTURE and RETURN side by side for a round trip. */}
                  <div className={`date-field${tripType === 'roundTrip' ? '' : ' date-field-single'}`}>
                    <label>
                      <span className="field-label">{t('tpDepartureLabel')}</span>
                      <span className="date-input-line">
                        <input aria-label={t('tpDepartureDate')} type="date" dir="ltr" value={departure} min={today} onChange={(event) => { setDeparture(event.target.value); setMessage(null); }} data-testid="input-departure" />
                        <CalendarDays size={17} aria-hidden="true" />
                      </span>
                    </label>
                    {tripType === 'roundTrip' && (
                      <label>
                        <span className="field-label">{t('tpReturnLabel')}</span>
                        <span className="date-input-line">
                          <input aria-label={t('tpReturnDateLabel')} type="date" dir="ltr" value={returnDate} min={departure || today} onChange={(event) => { setReturnDate(event.target.value); setMessage(null); }} data-testid="input-return" />
                          <CalendarDays size={17} aria-hidden="true" />
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-footer">
                  <p className={`form-message${message ? ' visible' : ''}`} aria-live="polite">{message ? t(message) : ' '}</p>
                  <button className="search-button" type="submit" data-testid="button-search-flights"><span>{t('tpSearchFlights')}</span><ArrowRight className="rtl:-scale-x-100" size={21} /></button>
                </div>
              </form>
            </section>
          )}

          {stage === 'seat' && legFlight && search && (
            <SeatSelectionStep key={legFlight.id} flight={legFlight} passengers={search.passengers} cabinClass={search.cabinClass} initialSeatIds={seatIds[seatLeg]}
              notice={seatLeg === 0 ? seatNotice : null} leg={roundTrip ? (seatLeg === 0 ? 'outbound' : 'return') : null}
              onBack={() => { if (seatLeg === 1) { setSeatLeg(0); return; } setStage('flight'); setResultsPhase('outbound'); setShowResults(true); }} onComplete={completeSeats} />
          )}
          {(stage === 'travelers' || stage === 'hotel' || stage === 'car') && <HoldTimer until={firstHoldEnd} />}
          {stage === 'travelers' && (
            <TravelerDetailsStep seats={travelerSeats} initial={travelers} onBack={() => { setSeatLeg(roundTrip ? 1 : 0); setStage('seat'); }} onComplete={(list) => { setTravelers(list); setStage('hotel'); }} />
          )}
          {stage === 'hotel' && flight && (
            <HotelStayStep city={search?.to ?? to} checkIn={arrivalDay} guests={search?.passengers ?? passengers} initial={hotel}
              defaultNights={homeDay ? Math.max(1, nightsBetween(arrivalDay, homeDay)) : 1}
              onBack={() => setStage('travelers')} onSkip={() => { setHotel(null); setStage('car'); }} onComplete={(plan) => { setHotel(plan); setStage('car'); }} />
          )}
          {stage === 'car' && flight && (
            <CarRentalStep city={search?.to ?? to} departure={arrivalDay} returnDay={homeDay} initial={car}
              onBack={() => setStage('hotel')} onSkip={() => { setCar(null); setShowConfirmation(true); }} onComplete={(plan) => { setCar(plan); setShowConfirmation(true); }} />
          )}

          {stage === 'complete' && items.length > 0 && <TripReady items={items} onPay={payAll} onStartOver={startOver} />}
          </div>

          <footer className="page-footer"><span>{t('tpFooter')}</span></footer>
        </div>

        {showResults && search && (
          <div className="flight-results-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowResults(false); }} data-testid="overlay-flight-results">
            <section className="flight-results-dialog" role="dialog" aria-modal="true" aria-labelledby="flight-results-title">
              <button ref={resultsClose} className="dialog-close" type="button" aria-label={t('tpCloseResults')} onClick={() => setShowResults(false)}><X size={18} /></button>
              <div className="flight-results-heading">
                <div>
                  <p className="dialog-eyebrow">{search.returnDate ? t(resultsPhase === 'outbound' ? 'tpOutboundFlight' : 'tpReturnFlight') : t('tpResultsEyebrow')}</p>
                  <h2 id="flight-results-title">{t(resultsPhase === 'outbound' ? 'tpResultsTitle' : 'tpReturnResultsTitle')}</h2>
                  <p className="flight-results-route">
                    <span>{cityLabel(t, resultFrom ?? search.from)}</span><ArrowRight className="rtl:-scale-x-100" size={14} /><span>{cityLabel(t, resultTo ?? search.to)}</span>
                    <span>{format.date(resultsPhase === 'outbound' ? search.departure : search.returnDate ?? search.departure)}</span>
                  </p>
                </div>
              </div>
              <div className="flight-results-summary">
                <span>{t(search.passengers === 1 ? 'tpTravelerCount1' : 'tpTravelerCount', { count: format.number(search.passengers) })}</span>
                <span>{t(CABINS.find((cabin) => cabin.id === search.cabinClass)!.label)}</span>
                <span>{t(search.returnDate ? 'tpRoundTrip' : 'tpOneWay')}</span>
                {resultsPhase === 'return' && flight && <span>{t('tpOutboundChosen', { number: flight.flightNumber })}</span>}
              </div>
              <div className="flight-results-list" aria-live="polite">
                {results?.status === 'loading' && <p className="passenger-state" role="status">{t('tpSearching')}</p>}
                {results?.status === 'error' && (
                  <div className="passenger-state" role="alert"><p>{t(results.message)}</p><button type="button" className="back-button" onClick={() => void runSearch(search)}>{t('retry')}</button></div>
                )}
                {results?.status === 'ready' && resultList.length === 0 && (
                  <div className="passenger-state" data-testid="text-no-flights">
                    <p>{t(resultsPhase === 'outbound' ? 'tpNoFlights' : 'tpNoReturnFlights')}</p>
                    {resultsPhase === 'return' && <button type="button" className="back-button" onClick={() => setResultsPhase('outbound')}>{t('tpBackToOutbound')}</button>}
                  </div>
                )}
                {results?.status === 'ready' && resultList.map((option) => {
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
          <ConfirmationPopup legs={legs} hotel={hotel} car={car} onBook={book} onClose={() => setShowConfirmation(false)} />
        )}
      </main>
    </PassengerShell>
  );
}

