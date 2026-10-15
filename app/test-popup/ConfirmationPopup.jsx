import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

const formatDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function ConfirmationPopup({ flight, car, onClose }) {
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
        new Date(`${car.pickup}T12:00:00`).getTime()) / 86400000,
    ),
  );

  const carTotal = car.dailyRate * rentalDays;
  const flightSample = flight.tripType === 'Round trip' ? 648 : 376;
  const demoTotal = flightSample * flight.passengers + carTotal;

  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
      >
        <button
          className="dialog-close"
          ref={closeRef}
          type="button"
          aria-label="Close confirmation"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="confirmation-mark" aria-hidden="true">
          <Check size={22} />
        </div>
        <p className="dialog-eyebrow">PAYMENT CONFIRMATION · DEMO</p>
        <h2 id="confirmation-title">Your sample itinerary is ready.</h2>
        <p className="dialog-intro" id="confirmation-description">
          Review the sample flight and car totals. Nothing has been charged.
        </p>

        <div className="summary-list">
          <div className="summary-entry">
            <span className="summary-icon">01</span>
            <div>
              <strong>Flight · {flight.tripType}</strong>
              <span>{flight.from} to {flight.to}</span>
              <small>
                {formatDate(flight.departure)}
                {flight.tripType === 'Round trip'
                  ? ` — ${formatDate(flight.returnDate)}`
                  : ''}
                {' · '}{flight.passengers}
                {' '}{flight.passengers === 1 ? 'traveler' : 'travelers'}
                {' · '}{flight.cabinClass}
              </small>
            </div>
            <b>SAR {(flightSample * flight.passengers).toLocaleString('en')}</b>
          </div>

          <div className="summary-entry">
            <span className="summary-icon">02</span>
            <div>
              <strong>Car · {car.car}</strong>
              <span>Pickup in {car.location}</span>
              <small>
                {formatDate(car.pickup)} — {formatDate(car.returnDate)}
                {' · '}{rentalDays} {rentalDays === 1 ? 'day' : 'days'}
              </small>
            </div>
            <b>SAR {carTotal.toLocaleString('en')}</b>
          </div>
        </div>

        <div className="demo-total-row">
          <span>Sample trip total <small> · SAR</small></span>
          <strong>SAR {demoTotal.toLocaleString('en')}</strong>
        </div>

        <div className="demo-disclaimer" role="note">
          <span>DEMO ONLY</span>
          <p>
            This is a sample estimate for demonstration. No real payment is processed,
            and no card details are collected.
          </p>
        </div>

        <button className="finish-button" type="button" onClick={onClose}>
          Close and finish <Check size={17} />
        </button>
      </section>
    </div>
  );
}