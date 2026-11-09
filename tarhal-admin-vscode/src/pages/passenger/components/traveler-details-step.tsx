import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, IdCard, UserRound, UsersRound } from 'lucide-react';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import type { BookingTraveler } from '@/services/bookingService';
import { riyadhToday } from '../trip';
import type { ChosenSeat } from './seat-selection-step';

type Props = { seats: ChosenSeat[]; initial: BookingTraveler[]; onBack: () => void; onComplete: (travelers: BookingTraveler[]) => void };
type Errors = Partial<Record<'fullName' | 'passportNumber' | 'dateOfBirth', TranslationKey>>;

/** POST /api/bookings needs these three fields for every seat. Checked here so the server's 400 stays rare. */
function check(traveler: BookingTraveler): Errors {
  const errors: Errors = {};
  if (traveler.fullName.trim().split(/\s+/).filter(Boolean).length < 2) errors.fullName = 'tpErrFullName';
  if (!/^[A-Za-z0-9]{5,20}$/.test(traveler.passportNumber.trim())) errors.passportNumber = 'tpErrPassport';
  if (!traveler.dateOfBirth || traveler.dateOfBirth >= riyadhToday()) errors.dateOfBirth = 'tpErrBirthDate';
  return errors;
}

/**
 * New step between seats and hotel: the booking API needs each traveler's name, passport number and date of birth,
 * and Tariq's flow had no form for them. It uses his step and field styles.
 */
export default function TravelerDetailsStep({ seats, initial, onBack, onComplete }: Props) {
  const t = useT();
  const format = useFormat();
  const [travelers, setTravelers] = useState<BookingTraveler[]>(() => seats.map((seat) => initial.find((x) => x.seatId === seat.id) ?? { seatId: seat.id, fullName: '', passportNumber: '', dateOfBirth: '' }));
  const [shown, setShown] = useState(false);
  const errors = travelers.map(check);
  const valid = errors.every((e) => Object.keys(e).length === 0);

  const update = (index: number, field: keyof Omit<BookingTraveler, 'seatId'>, value: string) =>
    setTravelers((list) => list.map((traveler, i) => (i === index ? { ...traveler, [field]: value } : traveler)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setShown(true);
    if (valid) onComplete(travelers.map((x) => ({ ...x, fullName: x.fullName.trim().replace(/\s+/g, ' '), passportNumber: x.passportNumber.trim().toUpperCase() })));
  };

  return (
    <section className="step-panel traveler-step" aria-labelledby="traveler-step-title" data-testid="panel-travelers">
      <div className="step-heading">
        <div>
          <p className="step-kicker"><span className="step-kicker-mark"><UsersRound size={15} /></span>{t('tpTravelersKicker')}</p>
          <h2 id="traveler-step-title">{t('tpTravelersTitle')}</h2>
          <p className="step-intro">{t('tpTravelersIntro')}</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        {travelers.map((traveler, index) => {
          const seat = seats[index];
          const error = shown ? errors[index] : {};
          const id = (field: string) => `traveler-${index}-${field}`;
          return (
            <fieldset className="traveler-card" key={traveler.seatId}>
              <legend className="field-label">{t('tpTravelerOnSeat', { n: format.number(index + 1), seat: seat?.code ?? '' })}</legend>
              <div className="rental-fields">
                <label className="rental-field" htmlFor={id('name')}>
                  <span className="field-label">{t('tpFullName')}</span>
                  <span className="rental-input-wrap">
                    <UserRound size={17} aria-hidden="true" />
                    <input id={id('name')} value={traveler.fullName} autoComplete="name" onChange={(e) => update(index, 'fullName', e.target.value)}
                      aria-invalid={Boolean(error.fullName)} aria-describedby={error.fullName ? id('name-error') : undefined} data-testid={`input-traveler-name-${index}`} />
                  </span>
                  {error.fullName && <small className="traveler-error" id={id('name-error')}>{t(error.fullName)}</small>}
                </label>
                <label className="rental-field" htmlFor={id('passport')}>
                  <span className="field-label">{t('passportNumber')}</span>
                  <span className="rental-input-wrap">
                    <IdCard size={17} aria-hidden="true" />
                    <input id={id('passport')} dir="ltr" value={traveler.passportNumber} autoComplete="off" onChange={(e) => update(index, 'passportNumber', e.target.value)}
                      aria-invalid={Boolean(error.passportNumber)} aria-describedby={error.passportNumber ? id('passport-error') : undefined} data-testid={`input-traveler-passport-${index}`} />
                  </span>
                  {error.passportNumber && <small className="traveler-error" id={id('passport-error')}>{t(error.passportNumber)}</small>}
                </label>
                <label className="rental-field" htmlFor={id('birth')}>
                  <span className="field-label">{t('dateOfBirth')}</span>
                  <span className="rental-input-wrap">
                    <CalendarDays size={17} aria-hidden="true" />
                    <input id={id('birth')} type="date" dir="ltr" max={riyadhToday()} value={traveler.dateOfBirth} onChange={(e) => update(index, 'dateOfBirth', e.target.value)}
                      aria-invalid={Boolean(error.dateOfBirth)} aria-describedby={error.dateOfBirth ? id('birth-error') : undefined} data-testid={`input-traveler-birth-${index}`} />
                  </span>
                  {error.dateOfBirth && <small className="traveler-error" id={id('birth-error')}>{t(error.dateOfBirth)}</small>}
                </label>
              </div>
            </fieldset>
          );
        })}

        <p className={`form-message${shown && !valid ? ' visible' : ''}`} role={shown && !valid ? 'alert' : 'status'}>{shown && !valid ? t('tpFixTravelers') : ' '}</p>

        <div className="step-actions">
          <button className="back-button" type="button" onClick={onBack}><ArrowLeft className="rtl:-scale-x-100" size={17} /> {t('tpBackToSeats')}</button>
          <button className="search-button car-continue" type="submit" data-testid="button-continue-to-hotel">
            <span>{t('tpContinueHotel')}</span><ArrowRight className="rtl:-scale-x-100" size={20} />
          </button>
        </div>
      </form>
    </section>
  );
}
