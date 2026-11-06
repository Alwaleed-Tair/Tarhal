import { useState } from 'react';
import { Armchair, ArrowLeft, ArrowRight, Check, Plane } from 'lucide-react';

const SEAT_ROWS = [
  {
    row: 'A',
    seats: [
      { id: 'A1', available: true },
      { id: 'A2', available: false },
      { id: 'A3', available: true },
      { id: 'A4', available: false },
    ],
  },
  {
    row: 'B',
    seats: [
      { id: 'B1', available: false },
      { id: 'B2', available: true },
      { id: 'B3', available: false },
      { id: 'B4', available: true },
    ],
  },
  {
    row: 'C',
    seats: [
      { id: 'C1', available: true },
      { id: 'C2', available: false },
      { id: 'C3', available: true },
      { id: 'C4', available: false },
    ],
  },
];

export default function SeatSelectionStep({
  flight,
  selectedSeats: initialSeats,
  onBack,
  onComplete,
}) {
  const [selectedSeats, setSelectedSeats] = useState(initialSeats);
  const [message, setMessage] = useState('');

  const toggleSeat = (seatId) => {
    setMessage('');

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((seat) => seat !== seatId));
      return;
    }

    if (selectedSeats.length >= flight.passengers) {
      setMessage(
        `Choose ${flight.passengers} seat${
          flight.passengers === 1 ? '' : 's'
        } for your travelers. Deselect a seat before choosing another.`,
      );
      return;
    }

    setSelectedSeats([...selectedSeats, seatId]);
  };

  const continueToCar = () => {
    if (selectedSeats.length !== flight.passengers) {
      setMessage(
        `Please choose one seat for each of your ${flight.passengers} traveler${
          flight.passengers === 1 ? '' : 's'
        }.`,
      );
      return;
    }

    onComplete(selectedSeats);
  };

  return (
    <section
      className="step-panel seat-step"
      aria-labelledby="seat-step-title"
      data-testid="panel-seat-selection"
    >
      <div className="step-heading">
        <div>
          <p className="step-kicker">
            <span className="step-kicker-mark">
              <Armchair size={15} />
            </span>
            YOUR PLACE ON THE FLIGHT
          </p>
          <h2 id="seat-step-title">Choose your seat.</h2>
          <p className="step-intro">
            Pick one seat for each traveler. Choose from the available seats
            shown.
          </p>
        </div>

        <div className="flight-chip">
          <span>
            {flight.selectedFlight.airline}{' '}
            {flight.selectedFlight.flightNumber}
          </span>
          <ArrowRight size={14} />
          <span>
            {flight.from} → {flight.to}
          </span>
        </div>
      </div>

      <div className="seat-map-layout">
        <div className="seat-map-card">
          <div className="seat-map-topline">
            <span>
              <Plane size={14} /> FRONT OF CABIN
            </span>
            <div className="seat-legend" aria-label="Seat availability legend">
              <span>
                <i className="seat-legend-dot available" /> Available
              </span>
              <span>
                <i className="seat-legend-dot occupied" /> Taken
              </span>
              <span>
                <i className="seat-legend-dot selected" /> Selected
              </span>
            </div>
          </div>

          <div className="seat-column-labels" aria-hidden="true">
            <span />
            <span>1</span>
            <span>2</span>
            <span />
            <span>3</span>
            <span>4</span>
          </div>

          <div className="seat-grid" role="group" aria-label="Choose seats">
            {SEAT_ROWS.map(({ row, seats }) => (
              <div className="seat-grid-row" key={row}>
                <span className="seat-row-label">{row}</span>

                {seats.slice(0, 2).map((seat) => {
                  const selected = selectedSeats.includes(seat.id);

                  return (
                    <button
                      className={`seat-button${
                        seat.available ? ' available' : ' occupied'
                      }${selected ? ' selected' : ''}`}
                      key={seat.id}
                      type="button"
                      disabled={!seat.available}
                      aria-label={`Seat ${seat.id}, ${
                        seat.available
                          ? selected
                            ? 'selected'
                            : 'available'
                          : 'taken'
                      }`}
                      aria-pressed={selected}
                      title={
                        seat.available
                          ? `Select seat ${seat.id}`
                          : `Seat ${seat.id} is taken`
                      }
                      onClick={() => toggleSeat(seat.id)}
                      data-testid={`seat-${seat.id}`}
                    >
                      <Armchair size={17} aria-hidden="true" />
                    </button>
                  );
                })}

                <span className="seat-aisle" aria-hidden="true" />

                {seats.slice(2).map((seat) => {
                  const selected = selectedSeats.includes(seat.id);

                  return (
                    <button
                      className={`seat-button${
                        seat.available ? ' available' : ' occupied'
                      }${selected ? ' selected' : ''}`}
                      key={seat.id}
                      type="button"
                      disabled={!seat.available}
                      aria-label={`Seat ${seat.id}, ${
                        seat.available
                          ? selected
                            ? 'selected'
                            : 'available'
                          : 'taken'
                      }`}
                      aria-pressed={selected}
                      title={
                        seat.available
                          ? `Select seat ${seat.id}`
                          : `Seat ${seat.id} is taken`
                      }
                      onClick={() => toggleSeat(seat.id)}
                      data-testid={`seat-${seat.id}`}
                    >
                      <Armchair size={17} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="seat-demo-note" role="note">
            Seat choices are not held. Availability must be confirmed with the
            airline.
          </p>
        </div>

        <aside className="seat-selection-summary" aria-live="polite">
          <span className="field-label">YOUR SEATS</span>
          <strong>
            {selectedSeats.length} <span>of</span> {flight.passengers}
          </strong>
          <p>
            {flight.passengers === 1 ? 'traveler' : 'travelers'} need{' '}
            {flight.passengers === 1 ? 'a seat' : 'seats'}
          </p>

          <div className="seat-selected-list">
            {selectedSeats.length > 0 ? (
              selectedSeats.map((seat) => (
                <span className="seat-selected-chip" key={seat}>
                  <Check size={12} /> {seat}
                </span>
              ))
            ) : (
              <span className="seat-none-selected">No seats selected yet</span>
            )}
          </div>

          <div className="seat-fare-note">
            <span>SEAT FARE</span>
            <small>Any seat charge must be confirmed with the airline.</small>
          </div>
        </aside>
      </div>

      <p
        className={`form-message seat-message${message ? ' visible' : ''}`}
        role={message ? 'alert' : 'status'}
      >
        {message ||
          `Select ${flight.passengers} seat${
            flight.passengers === 1 ? '' : 's'
          } to continue.`}
      </p>

      <div className="step-actions">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} /> Back to flights
        </button>

        <button
          className="search-button car-continue"
          type="button"
          disabled={selectedSeats.length !== flight.passengers}
          onClick={continueToCar}
          data-testid="button-continue-to-car"
        >
          <span>Continue to car</span>
          <ArrowRight size={20} />
        </button>
      </div>
    </section>
  );
}