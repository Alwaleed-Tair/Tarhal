import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  MapPin,
  UsersRound,
} from 'lucide-react';

const todayIso = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const suggestedDate = (base, days) => {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const cityOptions = ['Riyadh', 'Jeddah', 'Dammam', 'AlUla', 'Abha', 'Taif'];

const cars = [
  { name: 'Compact', model: 'Toyota Yaris or similar', rate: 149, detail: 'Easy city parking', seats: '4 seats', mark: 'C' },
  { name: 'Comfort', model: 'Hyundai Elantra or similar', rate: 219, detail: 'A little more room', seats: '5 seats', mark: 'S' },
  { name: 'Family SUV', model: 'Kia Sportage or similar', rate: 329, detail: 'Room for everyone', seats: '5 seats', mark: 'U' },
];

export default function CarRentalStep({ flight, onBack, onComplete }) {
  const [location, setLocation] = useState(
    cityOptions.includes(flight.to) ? flight.to : 'Riyadh',
  );
  const [pickup, setPickup] = useState(flight.departure);
  const [returnDate, setReturnDate] = useState(
    flight.tripType === 'Round trip'
      ? flight.returnDate
      : suggestedDate(flight.departure, 3),
  );
  const [car, setCar] = useState(cars[0].name);
  const [error, setError] = useState('');

  const selectedCar = cars.find((option) => option.name === car) || cars[0];

  const rentalDays = useMemo(() => {
    const start = new Date(`${pickup}T12:00:00`).getTime();
    const end = new Date(`${returnDate}T12:00:00`).getTime();
    return Math.max(1, Math.ceil((end - start) / 86400000));
  }, [pickup, returnDate]);

  const estimatedTotal = selectedCar.rate * rentalDays;

  const onSubmit = (event) => {
    event.preventDefault();

    if (!location) return setError('Choose a pickup location to continue.');
    if (!pickup || !returnDate) return setError('Choose both rental dates to continue.');
    if (pickup < todayIso()) return setError('Pickup date cannot be in the past.');
    if (returnDate < pickup) return setError('Return date must be the same day or after pickup.');

    setError('');
    onComplete({
      location,
      pickup,
      returnDate,
      car: selectedCar.name,
      dailyRate: selectedCar.rate,
    });
  };

  return (
    <section className="step-panel car-step" aria-labelledby="car-step-title">
      <div className="step-heading">
        <div>
          <p className="step-kicker">
            <span className="step-kicker-mark"><CarFront size={15} /></span>
            YOUR JOURNEY, IN ONE PLACE
          </p>
          <h2 id="car-step-title">Make the most of the road.</h2>
          <p className="step-intro">
            Add a car for your time in {flight.to}. Your flight is all set to review.
          </p>
        </div>
        <div className="flight-chip">
          <span>{flight.from}</span>
          <ArrowRight size={14} />
          <span>{flight.to}</span>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className="rental-fields">
          <label className="rental-field location-field">
            <span className="field-label">PICKUP LOCATION</span>
            <span className="rental-input-wrap">
              <MapPin size={17} aria-hidden="true" />
              <select
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  setError('');
                }}
                aria-label="Car pickup location"
              >
                {cityOptions.map((city) => (
                  <option value={city} key={city}>{city}</option>
                ))}
              </select>
            </span>
          </label>

          <label className="rental-field">
            <span className="field-label">PICKUP DATE</span>
            <span className="rental-input-wrap">
              <CalendarDays size={17} aria-hidden="true" />
              <input
                type="date"
                value={pickup}
                min={todayIso()}
                onChange={(event) => {
                  setPickup(event.target.value);
                  setError('');
                }}
                aria-label="Car pickup date"
              />
            </span>
          </label>

          <label className="rental-field">
            <span className="field-label">RETURN DATE</span>
            <span className="rental-input-wrap">
              <CalendarDays size={17} aria-hidden="true" />
              <input
                type="date"
                value={returnDate}
                min={pickup || todayIso()}
                onChange={(event) => {
                  setReturnDate(event.target.value);
                  setError('');
                }}
                aria-label="Car return date"
              />
            </span>
          </label>
        </div>

        <div className="car-choice-heading">
          <div>
            <p className="field-label">CHOOSE YOUR RIDE</p>
            <p>Just the essentials. Pick what fits.</p>
          </div>
          <span className="sample-price-note">Sample rates · SAR</span>
        </div>

        <div className="car-options" role="radiogroup" aria-label="Car category">
          {cars.map((option) => {
            const chosen = car === option.name;

            return (
              <button
                className={`car-option${chosen ? ' selected' : ''}`}
                key={option.name}
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => setCar(option.name)}
              >
                <span className="car-art" aria-hidden="true">
                  <CarFront size={28} strokeWidth={1.5} />
                  <span>{option.mark}</span>
                </span>
                <span className="car-copy">
                  <strong>{option.name}</strong>
                  <span>{option.model}</span>
                  <small>
                    <UsersRound size={13} />{option.seats}<i />{option.detail}
                  </small>
                </span>
                <span className="car-price">
                  <strong>SAR {option.rate}</strong>
                  <span>/ day</span>
                  {chosen && (
                    <span className="selected-check"><Check size={13} /></span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rental-total">
          <div>
            <span className="field-label">SAMPLE CAR TOTAL</span>
            <strong>SAR {estimatedTotal.toLocaleString('en')}</strong>
            <small>
              {rentalDays} {rentalDays === 1 ? 'day' : 'days'} · Demo estimate only
            </small>
          </div>
          <p>Final rental details can be reviewed before booking.</p>
        </div>

        <p className={`form-message car-error${error ? ' visible' : ''}`} role={error ? 'alert' : 'status'}>
          {error || ' '}
        </p>

        <div className="step-actions">
          <button className="back-button" type="button" onClick={onBack}>
            <ArrowLeft size={17} /> Back to flight
          </button>
          <button className="search-button car-continue" type="submit">
            <span>Review demo total</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </form>
    </section>
  );
}