import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Armchair,
  BedDouble,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  Minus,
  Plane,
  Plus,
  RotateCcw,
  UsersRound,
  X,
} from 'lucide-react';
import CarRentalStep from "../components/CarRentalStep";
import ConfirmationPopup from "../components/ConfirmationPopup";
import SeatSelectionStep from "../components/SeatSelectionStep";
import "../components/BookingFeatures.css";
import './FlightBooking.css';

const modes = [
  { id: 'Flight', icon: Plane },
  { id: 'Seat', icon: Armchair },
  { id: 'Hotel', icon: BedDouble },
  { id: 'Car', icon: CarFront },
];

const CITY_OPTIONS = [
  'AlUla',
  'Khobar',
  'Abha',
  'Al Baha',
  'Riyadh',
  'Dammam',
  'Umluj',
  'Taif',
  'Jeddah',
];

const SHARED_AIRPORT_GROUPS = [['Dammam', 'Khobar']];
const citiesShareAirport = (first, second) =>
  first === second ||
  SHARED_AIRPORT_GROUPS.some((group) => group.includes(first) && group.includes(second));

const FLIGHT_SCHEDULES = [
  { id: 'saudia-sv1107', airline: 'Saudia', flightNumber: 'SV 1107', departureTime: '07:20', arrivalTime: '08:35', duration: '1h 15m', stops: 'Nonstop', basePrice: 429, badge: 'Popular' },
  { id: 'flynas-xy069', airline: 'flynas', flightNumber: 'XY 069', departureTime: '10:15', arrivalTime: '11:30', duration: '1h 15m', stops: 'Nonstop', basePrice: 329, badge: 'Best value' },
  { id: 'flyadeal-f3215', airline: 'flyadeal', flightNumber: 'F3 215', departureTime: '14:40', arrivalTime: '15:55', duration: '1h 15m', stops: 'Nonstop', basePrice: 279 },
  { id: 'saudia-sv1115', airline: 'Saudia', flightNumber: 'SV 1115', departureTime: '19:05', arrivalTime: '20:20', duration: '1h 15m', stops: 'Nonstop', basePrice: 459 },
];

const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const daysFromToday = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

const createFlightOptions = (search) => {
  const cabinSurcharge = {
    Economy: 0,
    'Premium economy': 160,
    Business: 650,
    First: 1450,
  }[search.cabinClass] ?? 0;
  const tripMultiplier = search.tripType === 'Round trip' ? 1.85 : 1;

  return FLIGHT_SCHEDULES.map(({ basePrice, ...flight }) => ({
    ...flight,
    price: Math.round((basePrice + cabinSurcharge) * tripMultiplier),
  }));
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

export default function FlightBooking({ LogoComponent }) {
  const [stage, setStage] = useState('flight');
  const [tripType, setTripType] = useState('Round trip');
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState('Economy');
  const [from, setFrom] = useState('Riyadh');
  const [to, setTo] = useState('Dammam');
  const [openCityPicker, setOpenCityPicker] = useState('');
  const [departure, setDeparture] = useState(() => daysFromToday(7));
  const [returnDate, setReturnDate] = useState(() => daysFromToday(14));
  const [openPopover, setOpenPopover] = useState('');
  const [message, setMessage] = useState('');
  const [searchDetails, setSearchDetails] = useState(null);
  const [flightResults, setFlightResults] = useState([]);
  const [showFlightResults, setShowFlightResults] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [car, setCar] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const today = toISODate(new Date());

  const fromCityOptions = CITY_OPTIONS.filter((city) => !citiesShareAirport(city, to));
  const toCityOptions = CITY_OPTIONS.filter((city) => !citiesShareAirport(city, from));
  const activeFlight = searchDetails && selectedFlight
    ? { ...searchDetails, selectedFlight }
    : null;

  const togglePopover = (popover) => {
    setOpenCityPicker('');
    setOpenPopover((current) => current === popover ? '' : popover);
  };

  const toggleCityPicker = (field) => {
    setOpenPopover('');
    setOpenCityPicker((current) => current === field ? '' : field);
  };

  const chooseCity = (field, city) => {
    if (field === 'from') setFrom(city);
    else setTo(city);
    setOpenCityPicker('');
    setMessage('');
  };

  const handleCityPickerBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpenCityPicker('');
    }
  };

  const handleCityPickerKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpenCityPicker('');
      event.currentTarget.querySelector('.city-picker-trigger')?.focus();
    }
  };

  const swapCities = () => {
    setFrom(to);
    setTo(from);
    setOpenCityPicker('');
    setOpenPopover('');
    setMessage('');
  };

  const onSearch = (event) => {
    event.preventDefault();
    if (!from.trim() || !to.trim()) {
      setMessage('Add both a departure city and destination to continue.');
      return;
    }
    if (citiesShareAirport(from, to)) {
      setMessage('Choose departure and destination cities that use different airports.');
      return;
    }
    if (!departure) {
      setMessage('Choose a departure date to continue.');
      return;
    }
    if (departure < today) {
      setMessage('Departure date cannot be in the past.');
      return;
    }
    if (tripType === 'Round trip' && !returnDate) {
      setMessage('Choose a return date to continue.');
      return;
    }
    if (tripType === 'Round trip' && returnDate < departure) {
      setMessage('Your return date needs to be after your departure date.');
      return;
    }
    const details = { from, to, departure, returnDate, tripType, passengers, cabinClass };
    setSearchDetails(details);
    setFlightResults(createFlightOptions(details));
    setShowFlightResults(true);
    setOpenCityPicker('');
    setOpenPopover('');
    setMessage('');
  };

  useEffect(() => {
    if (!showFlightResults) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowFlightResults(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFlightResults]);

  const chooseFlight = (flightOption) => {
    setSelectedFlight(flightOption);
    setSelectedSeats([]);
    setShowFlightResults(false);
    setStage('seat');
  };

  const completeSeatSelection = (seats) => {
    setSelectedSeats(seats);
    setStage('car');
  };

  const completeCarSelection = (details) => {
    setCar(details);
    setShowConfirmation(true);
  };

  const closeConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setStage('complete');
  }, []);

  const startOver = () => {
    setStage('flight');
    setSearchDetails(null);
    setFlightResults([]);
    setShowFlightResults(false);
    setSelectedFlight(null);
    setSelectedSeats([]);
    setCar(null);
    setShowConfirmation(false);
    setMessage('');
  };

  const progressSteps = [
    { id: 'flight', label: 'Flight' },
    { id: 'seat', label: 'Seat' },
    { id: 'car', label: 'Car' },
    { id: 'complete', label: 'Ready' },
  ];
  const currentProgressIndex = progressSteps.findIndex((step) => step.id === stage);

  return (
    <main className="tarhal-page">
      <div className="tarhal-shell">
        <header className="site-header">
          <div className="brand-slot" aria-label="Tarhal brand">
            {LogoComponent ? <LogoComponent /> : <span className="brand-fallback">TARHAL</span>}
          </div>
          <span className="header-note"><span className="header-dot" />A gentler way to get there</span>
        </header>

        <section className="welcome" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="eyebrow">
              {stage === 'flight' ? 'YOUR NEXT JOURNEY STARTS HERE' : stage === 'seat' ? 'YOUR PLACE ON THE FLIGHT' : stage === 'car' ? 'YOUR JOURNEY, IN ONE PLACE' : 'A LITTLE TRIP, ALL TOGETHER'}
            </p>
            <h1 id="welcome-title">
              {stage === 'flight' && <>Where will the journey<br />take you?</>}
              {stage === 'seat' && <>Find your place<br />on board.</>}
              {stage === 'car' && <>Make the most<br />of the road.</>}
              {stage === 'complete' && <>Your journey is<br />ready to go.</>}
            </h1>
            <p className="welcome-note">
              {stage === 'flight'
                ? 'Start with a flight. Add the little details as you go.'
                : stage === 'seat'
                  ? 'Choose one seat for each traveler.'
                  : stage === 'car'
                    ? `Choose a car for your time in ${to}.`
                    : 'Your flight, seats, and car are gathered in one plan.'}
            </p>
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

        <div className="journey-progress" aria-label="Booking progress">
          {progressSteps.map((step, index) => {
            const isCurrent = index === currentProgressIndex;
            const isDone = index < currentProgressIndex;
            return (
              <span className="progress-step-pair" key={step.id}>
                <span className={`progress-item${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}`} aria-current={isCurrent ? 'step' : undefined}>
                  <span className="progress-number">{isDone ? <Check size={13} /> : index + 1}</span>
                  {step.label}
                </span>
                {index < progressSteps.length - 1 && (
                  <span className={`progress-line${index < currentProgressIndex ? ' passed' : ''}`} aria-hidden="true" />
                )}
              </span>
            );
          })}
        </div>

        {stage === 'flight' && <section className="booking-panel" aria-label="Plan your journey">
          <nav className="mode-tabs" aria-label="Travel services">
            {modes.map(({ id, icon: Icon }) => {
              const badge = id === 'Seat' ? 'Next' : id === 'Hotel' ? 'Soon' : id === 'Car' ? 'Later' : '';
              const isFlight = id === 'Flight';
              return (
              <button
                className={`mode-tab${isFlight ? ' active' : ''}`}
                key={id}
                type="button"
                aria-pressed={isFlight}
                disabled={!isFlight}
              >
                <Icon size={16} strokeWidth={2.1} style={id === 'Hotel' ? { transform: 'scale(1.4)' } : undefined} />
                <span>{id}</span>
                {badge && <span className="soon-tag">{badge}</span>}
              </button>
              );
            })}
          </nav>

          <form className="booking-form" onSubmit={onSearch}>
            <div className="booking-options">
              <div className="option-wrap">
                <button
                  className="option-select"
                  type="button"
                  aria-expanded={openPopover === 'trip'}
                  onClick={() => togglePopover('trip')}
                >
                  {tripType}<ChevronDown size={14} />
                </button>
                {openPopover === 'trip' && (
                  <div className="option-popover trip-popover" role="group" aria-label="Trip type">
                    {['Round trip', 'One way', 'Multi-city'].map((type) => {
                      const isSoon = type === 'Multi-city';
                      return (
                      <button
                        key={type}
                        className={tripType === type ? 'chosen' : ''}
                        type="button"
                        disabled={isSoon}
                        onClick={() => {
                          setTripType(type);
                          setOpenPopover('');
                          setMessage('');
                        }}
                      >{type}{isSoon ? ' · soon' : ''}</button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="option-wrap">
                <button
                  className="option-select"
                  type="button"
                  aria-expanded={openPopover === 'passengers'}
                  onClick={() => togglePopover('passengers')}
                >
                  <UsersRound size={14} /> {String(passengers).padStart(2, '0')} {passengers === 1 ? 'Passenger' : 'Passengers'}<ChevronDown size={14} />
                </button>
                {openPopover === 'passengers' && (
                  <div className="option-popover passenger-popover">
                    <div>
                      <span className="popover-title">Travelers</span>
                      <span className="popover-caption">Ages 2 and above · up to 6</span>
                    </div>
                    <div className="stepper">
                      <button type="button" aria-label="Remove one passenger" disabled={passengers <= 1} onClick={() => setPassengers(Math.max(1, passengers - 1))}><Minus size={14} /></button>
                      <span aria-live="polite">{passengers}</span>
                      <button type="button" aria-label="Add one passenger" disabled={passengers >= 6} onClick={() => setPassengers(Math.min(6, passengers + 1))}><Plus size={14} /></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="option-wrap">
                <button
                  className="option-select"
                  type="button"
                  aria-expanded={openPopover === 'class'}
                  onClick={() => togglePopover('class')}
                >
                  {cabinClass}<ChevronDown size={14} />
                </button>
                {openPopover === 'class' && (
                  <div className="option-popover class-popover" role="group" aria-label="Cabin class">
                    {['Economy', 'Premium economy', 'Business', 'First'].map((value) => (
                      <button
                        key={value}
                        className={cabinClass === value ? 'chosen' : ''}
                        type="button"
                        onClick={() => {
                          setCabinClass(value);
                          setOpenPopover('');
                        }}
                      >{value}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="fields-row">
              <div className="city-picker-wrap" onBlur={handleCityPickerBlur} onKeyDown={handleCityPickerKeyDown}>
                <button
                  className="city-field city-picker-trigger"
                  type="button"
                  aria-label={`Departure city, selected ${from}`}
                  aria-expanded={openCityPicker === 'from'}
                  aria-controls={openCityPicker === 'from' ? 'from-city-options' : undefined}
                  onClick={() => toggleCityPicker('from')}
                >
                  <span className="field-label">FROM</span>
                  <span className="city-picker-value">{from}</span>
                  <ChevronDown className="city-picker-chevron" size={15} aria-hidden="true" />
                </button>
                {openCityPicker === 'from' && (
                  <div className="city-popover" id="from-city-options" role="group" aria-label="Departure city options">
                    {fromCityOptions.map((city) => (
                      <button
                        className={`city-option${from === city ? ' chosen' : ''}`}
                        key={city}
                        type="button"
                        aria-pressed={from === city}
                        onClick={() => chooseCity('from', city)}
                      >{city}</button>
                    ))}
                  </div>
                )}
              </div>
              <button className="swap-button" type="button" aria-label="Swap departure and destination" onClick={swapCities}>
                <ArrowLeftRight size={19} />
              </button>
              <div className="city-picker-wrap" onBlur={handleCityPickerBlur} onKeyDown={handleCityPickerKeyDown}>
                <button
                  className="city-field city-picker-trigger"
                  type="button"
                  aria-label={`Destination city, selected ${to}`}
                  aria-expanded={openCityPicker === 'to'}
                  aria-controls={openCityPicker === 'to' ? 'to-city-options' : undefined}
                  onClick={() => toggleCityPicker('to')}
                >
                  <span className="field-label">TO</span>
                  <span className="city-picker-value">{to}</span>
                  <ChevronDown className="city-picker-chevron" size={15} aria-hidden="true" />
                </button>
                {openCityPicker === 'to' && (
                  <div className="city-popover" id="to-city-options" role="group" aria-label="Destination city options">
                    {toCityOptions.map((city) => (
                      <button
                        className={`city-option${to === city ? ' chosen' : ''}`}
                        key={city}
                        type="button"
                        aria-pressed={to === city}
                        onClick={() => chooseCity('to', city)}
                      >{city}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`date-field${tripType === 'One way' ? ' date-field-single' : ''}`}>
                <label>
                  <span className="field-label">DEPARTURE</span>
                  <span className="date-input-line">
                    <input aria-label="Departure date" type="date" value={departure} min={today} onChange={(event) => { setDeparture(event.target.value); setMessage(''); }} />
                    <CalendarDays size={17} aria-hidden="true" />
                  </span>
                </label>
                {tripType !== 'One way' && (
                  <label>
                    <span className="field-label">RETURN</span>
                    <span className="date-input-line">
                      <input aria-label="Return date" type="date" value={returnDate} min={departure} onChange={(event) => { setReturnDate(event.target.value); setMessage(''); }} />
                      <CalendarDays size={17} aria-hidden="true" />
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="form-footer">
              <p className={`form-message${message ? ' visible' : ''}`} aria-live="polite">
                {message || ' '}
              </p>
              <button className="search-button" type="submit">
                <span>Search flights</span><ArrowRight size={21} />
              </button>
            </div>
          </form>
        </section>}

        {stage === 'seat' && activeFlight && (
          <SeatSelectionStep
            flight={activeFlight}
            selectedSeats={selectedSeats}
            onBack={() => setStage('flight')}
            onComplete={completeSeatSelection}
          />
        )}

        {stage === 'car' && activeFlight && (
          <CarRentalStep
            flight={activeFlight}
            onBack={() => setStage('seat')}
            onComplete={completeCarSelection}
          />
        )}

        {stage === 'complete' && activeFlight && car && (
          <section className="complete-panel" aria-labelledby="complete-title" data-testid="panel-complete">
            <div className="complete-icon"><Check size={23} /></div>
            <div className="complete-heading">
              <p className="step-kicker">ITINERARY SUMMARY</p>
              <h2 id="complete-title">All set for the journey.</h2>
              <p>Your itinerary is ready to review. No reservation or payment has been made.</p>
            </div>
            <div className="complete-itinerary">
              <div>
                <span className="complete-icon-small"><Plane size={16} /></span>
                <div><small>FLIGHT</small><strong>{activeFlight.from} <ArrowRight size={13} /> {activeFlight.to}</strong><span>{activeFlight.selectedFlight.airline} · {activeFlight.selectedFlight.flightNumber}</span></div>
              </div>
              <div>
                <span className="complete-icon-small"><Armchair size={16} /></span>
                <div><small>SEATS</small><strong>{selectedSeats.join(', ')}</strong><span>{selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected</span></div>
              </div>
              <div>
                <span className="complete-icon-small"><CarFront size={16} /></span>
                <div><small>CAR</small><strong>{car.car}</strong><span>{car.location} · SAR {car.dailyRate}/day</span></div>
              </div>
            </div>
            <div className="complete-note">
              Live flight availability, seat inventory, car reservations, and payment are not connected yet, so this itinerary is not booked.
            </div>
            <button className="restart-button" type="button" onClick={startOver}>
              <RotateCcw size={15} /> Plan another journey
            </button>
          </section>
        )}

        <footer className="page-footer">
          <span>Make room for the journey.</span>
        </footer>
      </div>
      {showFlightResults && searchDetails && (
        <div
          className="flight-results-scrim"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setShowFlightResults(false); }}
          data-testid="overlay-flight-results"
        >
          <section className="flight-results-dialog" role="dialog" aria-modal="true" aria-labelledby="flight-results-title">
            <button className="dialog-close" type="button" aria-label="Close flight results" onClick={() => setShowFlightResults(false)}>
              <X size={18} />
            </button>
            <div className="flight-results-heading">
              <div>
                <p className="dialog-eyebrow">FLIGHT OPTIONS · SAR</p>
                <h2 id="flight-results-title">A few ways to get there.</h2>
                <p className="flight-results-route">
                  <span>{searchDetails.from}</span><ArrowRight size={14} /><span>{searchDetails.to}</span>
                  <span>{formatDate(searchDetails.departure)}{searchDetails.tripType === 'Round trip' ? ` — ${formatDate(searchDetails.returnDate)}` : ''}</span>
                </p>
              </div>
            </div>
            <div className="flight-results-summary">
              <span>{searchDetails.passengers} {searchDetails.passengers === 1 ? 'traveler' : 'travelers'}</span>
              <span>{searchDetails.cabinClass}</span>
              <span>{searchDetails.tripType}</span>
            </div>
            <div className="flight-results-list">
              {flightResults.map((flightOption) => (
                <article className="flight-result-card" key={flightOption.id}>
                  <span className="flight-airline-mark"><Plane size={19} /></span>
                  <div className="flight-result-main">
                    <div className="flight-airline-row">
                      <strong>{flightOption.airline}</strong>
                      <span>{flightOption.flightNumber}</span>
                      {flightOption.badge && <em>{flightOption.badge}</em>}
                    </div>
                    <div className="flight-time-row">
                      <div><strong>{flightOption.departureTime}</strong><span>{searchDetails.from}</span></div>
                      <div className="flight-duration"><span>{flightOption.duration}</span><span /><span>{flightOption.stops}</span></div>
                      <div className="flight-arrival"><strong>{flightOption.arrivalTime}</strong><span>{searchDetails.to}</span></div>
                    </div>
                  </div>
                  <div className="flight-result-fare">
                    <small>PER TRAVELER</small>
                    <strong>SAR {flightOption.price.toLocaleString('en')}</strong>
                    <span>Estimated fare · taxes included</span>
                    <button className="flight-select-button" type="button" onClick={() => chooseFlight(flightOption)} data-testid={`button-select-flight-${flightOption.id}`}>
                      Select <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <p className="flight-results-disclaimer">Schedules and fares are estimates. Live airline availability and ticketing are not connected, so selecting a flight does not reserve a ticket.</p>
          </section>
        </div>
      )}
      {showConfirmation && activeFlight && car && (
        <ConfirmationPopup
          flight={activeFlight}
          seats={selectedSeats}
          car={car}
          onClose={closeConfirmation}
        />
      )}
    </main>
  );
}