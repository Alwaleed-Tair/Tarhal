import { useCallback, useState } from 'react';
import { ArrowRight, CarFront, Check, Plane, RotateCcw } from 'lucide-react';
import './TarhalBooking.css';
import FlightBooking from './FlightBooking';
import CarRentalStep from './CarRentalStep';
import ConfirmationPopup from './ConfirmationPopup';

const prettyDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export default function BookingFlow() {
  const [stage, setStage] = useState('flight');
  const [flight, setFlight] = useState(null);
  const [car, setCar] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const beginCarStep = (details) => {
    setFlight(details);
    setStage('car');
  };

  const finishCarStep = (details) => {
    setCar(details);
    setShowConfirmation(true);
  };

  const closeConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setStage('complete');
  }, []);

  const startOver = () => {
    setFlight(null);
    setCar(null);
    setShowConfirmation(false);
    setStage('flight');
  };

  return (
    <main className="tarhal-page">
      <div className="tarhal-shell">
        <header className="site-header">
          <a className="brand-slot" href="/" aria-label="Tarhal home">
            <span className="brand-symbol" aria-hidden="true"><span /></span>
            <span className="brand-fallback">TARHAL</span>
          </a>
          <span className="header-note">
            <span className="header-dot" /> A gentler way to get there
          </span>
        </header>

        <section className="welcome" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="eyebrow">
              {stage === 'flight'
                ? 'YOUR NEXT JOURNEY STARTS HERE'
                : stage === 'car'
                  ? 'THE NEXT PART OF YOUR JOURNEY'
                  : 'A LITTLE TRIP, ALL TOGETHER'}
            </p>
            <h1 id="welcome-title">
              {stage === 'flight'
                ? <>Where will the journey<br className="desktop-break" /> take you?</>
                : stage === 'car'
                  ? <>The road is part<br className="desktop-break" /> of the story.</>
                  : <>Your journey is<br className="desktop-break" /> ready to go.</>}
            </h1>
            <p className="welcome-note">
              {stage === 'flight'
                ? 'Start with a flight. Add the little details as you go.'
                : stage === 'car'
                  ? 'A simple ride to make your time there feel easy.'
                  : 'Flight and car, gathered in one thoughtful plan.'}
            </p>
          </div>

          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit-ring orbit-one" />
            <div className="orbit-ring orbit-two" />
            <div className="orbit-sun" />
            <div className="orbit-route"><span /><span /><span /></div>
            <div className="orbit-plane"><Plane size={26} strokeWidth={1.4} /></div>
            <div className="orbit-ground" />
          </div>
        </section>

        <div className="journey-progress" aria-label="Booking progress">
          <div className={`progress-item${stage !== 'flight' ? ' done' : ' current'}`}>
            <span className="progress-number">
              {stage === 'flight' ? '01' : <Check size={13} />}
            </span>
            <span>Flight</span>
          </div>
          <span className={`progress-line${stage === 'complete' ? ' passed' : ''}`} />
          <div className={`progress-item${stage === 'car' ? ' current' : stage === 'complete' ? ' done' : ''}`}>
            <span className="progress-number">
              {stage === 'complete' ? <Check size={13} /> : '02'}
            </span>
            <span>Car</span>
          </div>
          <span className={`progress-line${stage === 'complete' ? ' passed' : ''}`} />
          <div className={`progress-item${stage === 'complete' ? ' current' : ' upcoming'}`}>
            <span className="progress-number">
              {stage === 'complete' ? <Check size={13} /> : '03'}
            </span>
            <span>Ready</span>
          </div>
        </div>

        {stage === 'flight' && <FlightBooking onContinue={beginCarStep} />}

        {stage === 'car' && flight && (
          <CarRentalStep
            flight={flight}
            onBack={() => setStage('flight')}
            onComplete={finishCarStep}
          />
        )}

        {stage === 'complete' && flight && car && (
          <section className="complete-panel" aria-labelledby="complete-title">
            <div className="complete-icon"><Check size={22} /></div>
            <div className="complete-heading">
              <p className="step-kicker">YOUR TARHAL PLAN</p>
              <h2 id="complete-title">A good start to somewhere.</h2>
              <p>Your demo itinerary is saved here for this visit.</p>
            </div>

            <div className="complete-itinerary">
              <div>
                <span className="complete-icon-small"><Plane size={16} /></span>
                <div>
                  <small>FLIGHT</small>
                  <strong>{flight.from} <ArrowRight size={13} /> {flight.to}</strong>
                  <span>
                    {prettyDate(flight.departure)}
                    {flight.tripType === 'Round trip' ? ` — ${prettyDate(flight.returnDate)}` : ''}
                  </span>
                </div>
              </div>
              <div>
                <span className="complete-icon-small"><CarFront size={17} /></span>
                <div>
                  <small>YOUR CAR</small>
                  <strong>{car.car} · {car.location}</strong>
                  <span>{prettyDate(car.pickup)} — {prettyDate(car.returnDate)}</span>
                </div>
              </div>
            </div>

            <div className="complete-note" role="note">
              This was a sample booking flow. No real payment was taken or car reserved.
            </div>
            <button className="restart-button" type="button" onClick={startOver}>
              <RotateCcw size={15} /> Plan another journey
            </button>
          </section>
        )}

        <footer className="page-footer">
          <span>Make room for the journey.</span>
          <span>FLIGHT <i /> CAR <i /> MORE SOON</span>
        </footer>
      </div>

      {showConfirmation && flight && car && (
        <ConfirmationPopup flight={flight} car={car} onClose={closeConfirmation} />
      )}
    </main>
  );
}