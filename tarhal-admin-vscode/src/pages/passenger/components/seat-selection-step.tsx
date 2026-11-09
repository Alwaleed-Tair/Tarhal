import { useCallback, useEffect, useMemo, useState } from 'react';
import { Armchair, ArrowLeft, ArrowRight, Check, Plane } from 'lucide-react';
import { Money } from '@/components/money';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { flightService, type FlightDetails, type FlightOption, type Seat, type TicketClass } from '@/services/flightService';
import { cityLabel, errorKey } from '../trip';

const CLASS_KEY: Record<TicketClass, TranslationKey> = { ECONOMY: 'ticketECONOMY', BUSINESS: 'ticketBUSINESS', FIRST: 'ticketFIRST' };

/** "12C" -> row 12, letter C. Seats are drawn row by row, with the aisle in the middle of each row. */
function seatRows(seats: Seat[]) {
  const rows = new Map<number, Seat[]>();
  for (const seat of seats) {
    const match = seat.code.match(/^(\d+)([A-Z]+)$/i);
    const row = match ? Number(match[1]) : 0;
    rows.set(row, [...(rows.get(row) ?? []), seat]);
  }
  return [...rows.entries()].sort(([a], [b]) => a - b).map(([row, list]) => ({ row, seats: list.sort((a, b) => a.code.localeCompare(b.code)) }));
}

export type ChosenSeat = { id: string; code: string; ticketClass: TicketClass; price: number };

type Props = {
  flight: FlightOption;
  passengers: number;
  cabinClass: TicketClass;
  initialSeatIds: string[];
  onBack: () => void;
  /** Called with the seats the traveler picked. The parent holds them (POST /api/flights/:id/hold) or sends them to log in first. */
  onComplete: (seats: ChosenSeat[]) => Promise<TranslationKey | null>;
};

/** Tariq's seat step, on the real seat map of GET /api/flights/:id. Only free seats of the chosen class can be picked. */
export default function SeatSelectionStep({ flight, passengers, cabinClass, initialSeatIds, onBack, onComplete }: Props) {
  const t = useT();
  const format = useFormat();
  const [details, setDetails] = useState<FlightDetails | null>(null);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [selected, setSelected] = useState<string[]>(initialSeatIds);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await flightService.getById(flight.id);
      setDetails(next);
      // Seats that were taken meanwhile drop out of the selection.
      setSelected((current) => current.filter((id) => next.seats.some((seat) => seat.id === id && seat.free)));
    } catch (error) {
      setLoadError(errorKey(error));
    }
  }, [flight.id]);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => seatRows(details?.seats ?? []), [details]);
  const seatById = useMemo(() => new Map((details?.seats ?? []).map((seat) => [seat.id, seat])), [details]);
  const chosen: ChosenSeat[] = selected.map((id) => seatById.get(id)).filter((seat): seat is Seat => Boolean(seat))
    .map((seat) => ({ id: seat.id, code: seat.code, ticketClass: seat.ticketClass, price: flight.basePrice * seat.priceMultiplier }));
  const total = chosen.reduce((sum, seat) => sum + seat.price, 0);
  const freeInClass = (details?.seats ?? []).filter((seat) => seat.free && seat.ticketClass === cabinClass).length;

  const toggleSeat = (seat: Seat) => {
    setMessage(null);
    if (selected.includes(seat.id)) { setSelected(selected.filter((id) => id !== seat.id)); return; }
    if (selected.length >= passengers) { setMessage(passengers === 1 ? 'tpSeatLimit1' : 'tpSeatLimit'); return; }
    setSelected([...selected, seat.id]);
  };

  const continueNext = async () => {
    if (chosen.length !== passengers) { setMessage(passengers === 1 ? 'tpSeatNeed1' : 'tpSeatNeed'); return; }
    setBusy(true);
    const problem = await onComplete(chosen);
    setBusy(false);
    if (problem) { setMessage(problem); void load(); }
  };

  const seatButton = (seat: Seat) => {
    const isSelected = selected.includes(seat.id);
    const otherClass = seat.ticketClass !== cabinClass;
    const usable = seat.free && !otherClass;
    const state = isSelected ? t('tpSeatSelected') : !seat.free ? t('tpSeatTaken') : otherClass ? t(CLASS_KEY[seat.ticketClass]) : t('tpSeatAvailable');
    return (
      <button
        className={`seat-button${usable ? ' available' : ' occupied'}${isSelected ? ' selected' : ''}${otherClass && seat.free ? ' other-class' : ''}`}
        key={seat.id}
        type="button"
        disabled={!usable && !isSelected}
        aria-label={`${t('seat')} ${seat.code}, ${state}`}
        aria-pressed={isSelected}
        title={`${seat.code} · ${state}`}
        onClick={() => toggleSeat(seat)}
        data-testid={`seat-${seat.code}`}
      >
        <Armchair size={17} aria-hidden="true" />
      </button>
    );
  };

  const needText = t(passengers === 1 ? 'tpSeatPrompt1' : 'tpSeatPrompt', { count: format.number(passengers) });

  return (
    <section className="step-panel seat-step" aria-labelledby="seat-step-title" data-testid="panel-seat-selection">
      <div className="step-heading">
        <div>
          <p className="step-kicker"><span className="step-kicker-mark"><Armchair size={15} /></span>{t('tpSeatKicker')}</p>
          <h2 id="seat-step-title">{t('tpSeatTitle')}</h2>
          <p className="step-intro">{t('tpSeatIntro', { cabin: t(CLASS_KEY[cabinClass]) })}</p>
        </div>
        <div className="flight-chip">
          <span><bdi dir="ltr">{flight.flightNumber}</bdi></span>
          <ArrowRight className="rtl:-scale-x-100" size={14} />
          <span>{cityLabel(t, flight.from)} → {cityLabel(t, flight.to)}</span>
        </div>
      </div>

      {loadError ? (
        <div className="passenger-state" role="alert">
          <p>{t(loadError)}</p>
          <button type="button" className="back-button" onClick={() => void load()}>{t('retry')}</button>
        </div>
      ) : !details ? (
        <p className="passenger-state" role="status">{t('tpLoadingSeats')}</p>
      ) : (
        <div className="seat-map-layout">
          <div className="seat-map-card">
            <div className="seat-map-topline">
              <span><Plane size={14} /> {t('tpFrontOfCabin')}</span>
              <div className="seat-legend" aria-label={t('tpSeatLegend')}>
                <span><i className="seat-legend-dot available" /> {t('tpSeatAvailable')}</span>
                <span><i className="seat-legend-dot occupied" /> {t('tpSeatTakenOrOther')}</span>
                <span><i className="seat-legend-dot selected" /> {t('tpSeatSelected')}</span>
              </div>
            </div>

            <div className="seat-grid" role="group" aria-label={t('tpChooseSeats')} dir="ltr">
              {rows.map(({ row, seats }) => {
                const half = Math.ceil(seats.length / 2);
                return (
                  <div className="seat-grid-row" key={row}>
                    <span className="seat-row-label">{row}</span>
                    {seats.slice(0, half).map(seatButton)}
                    <span className="seat-aisle" aria-hidden="true" />
                    {seats.slice(half).map(seatButton)}
                  </div>
                );
              })}
            </div>
            {freeInClass < passengers && <p className="passenger-note" role="status">{t('tpNotEnoughInClass', { cabin: t(CLASS_KEY[cabinClass]) })}</p>}
          </div>

          <aside className="seat-selection-summary" aria-live="polite">
            <span className="field-label">{t('tpYourSeats')}</span>
            <strong>{format.number(chosen.length)} <span>{t('tpOf')}</span> {format.number(passengers)}</strong>
            <p>{needText}</p>
            <div className="seat-selected-list">
              {chosen.length > 0 ? chosen.map((seat) => (
                <span className="seat-selected-chip" key={seat.id}><Check size={12} /> <bdi dir="ltr">{seat.code}</bdi> · <Money sar={seat.price} /></span>
              )) : <span className="seat-none-selected">{t('tpNoSeatsYet')}</span>}
            </div>
            {chosen.length > 0 && <p className="passenger-seat-total">{t('tpSeatsTotal')}: <strong><Money sar={total} /></strong></p>}
          </aside>
        </div>
      )}

      <p className={`form-message seat-message${message ? ' visible' : ''}`} role={message ? 'alert' : 'status'}>
        {message ? t(message, { count: format.number(passengers) }) : needText}
      </p>

      <div className="step-actions">
        <button className="back-button" type="button" onClick={onBack}><ArrowLeft className="rtl:-scale-x-100" size={17} /> {t('tpBackToFlights')}</button>
        <button className="search-button car-continue" type="button" disabled={chosen.length !== passengers || busy} onClick={() => void continueNext()} data-testid="button-continue-to-travelers">
          <span>{busy ? t('pleaseWait') : t('tpContinueTravelers')}</span><ArrowRight className="rtl:-scale-x-100" size={20} />
        </button>
      </div>
    </section>
  );
}
