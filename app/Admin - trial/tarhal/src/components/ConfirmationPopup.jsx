import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

const formatDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function ConfirmationPopup({ flight, seats, car, hotel, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rentalDays = Math.max(
    1,
    Math.ceil(
      (new Date(`${car.returnDate}T12:00:00`).getTime() -
        new Date(`${car.pickup}T12:00:00`).getTime()) /
        86_400_000,
    ),
  );

  const carTotal = car.dailyRate * rentalDays;
  const flightTotal = flight.selectedFlight.price * flight.passengers;
    const hotelTotal = hotel ? hotel.nightlyRate * hotel.nights : 0;
  const estimatedTotal = flightTotal + hotelTotal + carTotal;

  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid="overlay-confirmation"
    >
      <section
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        data-testid="dialog-confirmation"
      >
        <button
          className="dialog-close"
          ref={closeRef}
          type="button"
          aria-label="Close confirmation"
          onClick={onClose}
          data-testid="button-close-confirmation"
        >
          <X size={18} />
        </button>

        <div className="confirmation-mark" aria-hidden="true">
          <Check size={22} />
        </div>

        <p className="dialog-eyebrow">ITINERARY SUMMARY</p>
        <h2 id="confirmation-title">Your itinerary is ready to review.</h2>
        <p className="dialog-intro" id="confirmation-description">
          Review your flight, seat, and car details. No payment has been processed.
        </p>

        <div className="summary-list">
          <div className="summary-entry">
            <span className="summary-icon">01</span>
            <div>
              <strong>
                Flight · {flight.selectedFlight.airline}{' '}
                {flight.selectedFlight.flightNumber}
              </strong>
              <span>
                {flight.from} to {flight.to}
              </span>
              <small>
                {formatDate(flight.departure)}
                {flight.tripType === 'Round trip'
                  ? ` — ${formatDate(flight.returnDate)}`
                  : ''}{' '}
                · {flight.passengers}{' '}
                {flight.passengers === 1 ? 'traveler' : 'travelers'} ·{' '}
                {flight.cabinClass}
              </small>
            </div>
            <b data-testid="text-sample-flight-total">
              SAR {flightTotal.toLocaleString('en')}
            </b>
          </div>

          <div className="summary-entry">
            <span className="summary-icon">02</span>
            <div>
              <strong>Seats selected</strong>
              <span>{seats.join(', ')}</span>
              <small>
                {seats.length} {seats.length === 1 ? 'seat' : 'seats'} selected
              </small>
            </div>
            <b>—</b>
          </div>
                    {hotel && (
            <div className="summary-entry">
              <span className="summary-icon">{hotel ? '04' : '03'}</span>
              <div>
                <strong>Hotel · {hotel.name}</strong>
                <span>{hotel.city}</span>
                <small>
                  {formatDate(hotel.checkIn)} — {formatDate(hotel.checkOut)} ·{' '}
                  {hotel.nights} {hotel.nights === 1 ? 'night' : 'nights'}
                </small>
              </div>
              <b data-testid="text-sample-hotel-total">SAR {hotelTotal.toLocaleString('en')}</b>
            </div>
          )}

          <div className="summary-entry">
            <span className="summary-icon">03</span>
            <div>
              <strong>Car · {car.car}</strong>
              <span>Pickup in {car.location}</span>
              <small>
                {formatDate(car.pickup)} — {formatDate(car.returnDate)} ·{' '}
                {rentalDays} {rentalDays === 1 ? 'day' : 'days'}
              </small>
            </div>
            <b data-testid="text-sample-car-total">
              SAR {carTotal.toLocaleString('en')}
            </b>
          </div>
        </div>

        <div className="demo-total-row">
          <span>
            Estimated trip total <small> · SAR</small>
          </span>
          <strong data-testid="text-estimated-total">
            SAR {estimatedTotal.toLocaleString('en')}
          </strong>
        </div>

       

        <button
          className="finish-button"
          type="button"
          onClick={onClose}
          data-testid="button-finish-summary"
        >
          Close and finish <Check size={17} />
        </button>
      </section>
    </div>
  );
}