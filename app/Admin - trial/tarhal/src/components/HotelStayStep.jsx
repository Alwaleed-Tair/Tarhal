import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BedDouble, Check, Minus, Plus, Star } from 'lucide-react';
import { cityHotels } from '../data/cityHotels';
import './HotelStay.css';

const DAY = 86_400_000;
const MAX_NIGHTS = 90;

const addDays = (iso, days) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function HotelPhoto({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="hotel-photo hotel-photo-placeholder" aria-hidden="true">
        <BedDouble size={30} strokeWidth={1.4} />
      </span>
    );
  }
  return (
    <span className="hotel-photo">
      <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />
    </span>
  );
}

export default function HotelStayStep({ flight, onBack, onSkip, onComplete }) {
  const city = flight.to;
  const hotels = cityHotels[city] ?? [];
  const slug = city.toLowerCase().replaceAll(' ', '-');

  const suggestedNights = useMemo(() => {
    if (flight.tripType !== 'Round trip' || !flight.returnDate) return null;
    const n = Math.round(
      (new Date(`${flight.returnDate}T12:00:00`) - new Date(`${flight.departure}T12:00:00`)) / DAY,
    );
    return n >= 1 ? n : null;
  }, [flight]);

  const [nights, setNights] = useState(Math.min(suggestedNights ?? 1, MAX_NIGHTS));
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const checkIn = flight.departure;
  const checkOut = addDays(checkIn, nights);
  const chosen = selected !== null ? hotels[selected] : null;
  const total = chosen ? chosen.price * nights : 0;
  const nightsLabel = (n) => `${n} ${n === 1 ? 'night' : 'nights'}`;

  const changeNights = (value) => {
    setNights(Math.min(MAX_NIGHTS, Math.max(1, value)));
    setError('');
  };

  const onContinue = () => {
    if (!chosen) {
      setError('Choose a hotel to continue, or skip the hotel.');
      return;
    }
    onComplete({
      city,
      name: chosen.name,
      rating: chosen.rating,
      nightlyRate: chosen.price,
      nights,
      checkIn,
      checkOut,
    });
  };

  return (
    <section className="step-panel hotel-step" aria-labelledby="hotel-step-title" data-testid="panel-hotel-selection">
      <div className="step-heading">
        <div>
          <p className="step-kicker">
            <span className="step-kicker-mark"><BedDouble size={15} /></span> A PLACE TO STAY
          </p>
          <h2 id="hotel-step-title">Rest well in {city}.</h2>
          <p className="step-intro">Pick a hotel and choose how many nights you would like to stay.</p>
        </div>
        <div className="flight-chip">
          <span>{flight.from}</span><ArrowRight size={14} /><span>{flight.to}</span>
        </div>
      </div>

      <div className="hotel-nights-bar">
        <div>
          <span className="field-label">NIGHTS</span>
          <div className="hotel-stepper">
            <button type="button" aria-label="Fewer nights" disabled={nights <= 1} onClick={() => changeNights(nights - 1)}><Minus size={14} /></button>
            <strong aria-live="polite" data-testid="text-hotel-nights">{nights}</strong>
            <button type="button" aria-label="More nights" disabled={nights >= MAX_NIGHTS} onClick={() => changeNights(nights + 1)}><Plus size={14} /></button>
          </div>
        </div>
        <div className="hotel-dates">
          <span className="field-label">YOUR STAY</span>
          <strong>{formatDate(checkIn)} → {formatDate(checkOut)}</strong>
        </div>
         {suggestedNights && (
          <p className="hotel-suggestion">
            Your trip is {nightsLabel(suggestedNights)}, so we suggest staying {suggestedNights} nights at your hotel.
            {nights !== suggestedNights && (
              <button type="button" onClick={() => changeNights(suggestedNights)}>Use {suggestedNights}</button>
            )}
          </p>
        )}
      </div>

      <div className="car-choice-heading">
        <div>
          <p className="field-label">CHOOSE YOUR HOTEL</p>
          <p>Four places we like in {city}.</p>
        </div>
        <span className="sample-price-note">Sample rates · SAR per night</span>
      </div>

      {hotels.length === 0 && <p className="step-intro">No hotels are listed for {city} yet.</p>}

      <div className="hotel-grid" role="radiogroup" aria-label={`Hotels in ${city}`}>
        {hotels.map((hotel, index) => {
          const isChosen = selected === index;
          return (
            <button
              key={hotel.name}
              type="button"
              role="radio"
              aria-checked={isChosen}
              className={`hotel-card${isChosen ? ' selected' : ''}`}
              onClick={() => { setSelected(index); setError(''); }}
              data-testid={`option-hotel-${index + 1}`}
            >
              <HotelPhoto src={`/hotels/${slug}-${index + 1}.jpg`} name={hotel.name} />
              <span className="hotel-body">
                <span className="hotel-name-row">
                  <strong>{hotel.name}</strong>
                  <span className="hotel-rating"><Star size={11} /> {hotel.rating.toFixed(1)}</span>
                </span>
                <span className="hotel-price"><strong>SAR {hotel.price.toLocaleString('en')}</strong> / night</span>
                <small>SAR {(hotel.price * nights).toLocaleString('en')} for {nightsLabel(nights)}</small>
              </span>
              {isChosen && <span className="hotel-check"><Check size={13} /></span>}
            </button>
          );
        })}
      </div>

      <div className="hotel-total">
        <div>
          <span className="field-label">SAMPLE HOTEL TOTAL</span>
          <strong data-testid="text-hotel-total">{chosen ? `SAR ${total.toLocaleString('en')}` : '—'}</strong>
          <small>{chosen ? `${chosen.name} · ${nightsLabel(nights)}` : 'Select a hotel to see the total'}</small>
        </div>
      </div>

      <p className={`form-message hotel-error${error ? ' visible' : ''}`} role={error ? 'alert' : 'status'}>
        {error || ' '}
      </p>

      <div className="step-actions">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={17} /> Back to seats</button>
        <div className="hotel-actions-right">
          <button className="back-button" type="button" onClick={onSkip} data-testid="button-skip-hotel">Skip hotel</button>
          <button className="search-button car-continue" type="button" onClick={onContinue} data-testid="button-continue-to-car-from-hotel">
            <span>Continue to car</span><ArrowRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}