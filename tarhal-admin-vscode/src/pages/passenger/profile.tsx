import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactElement } from 'react';
import { CalendarDays, Mail, Phone, UserRound } from 'lucide-react';
import { Link, Redirect } from 'wouter';
import { BrandLogo } from '@/components/brand-logo';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { httpStatus } from '@/services/api';
import { tripService, type Profile } from '@/services/tripService';
import { logout, saveSession, useAuth } from '@/store/authStore';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { HeaderControls } from './components/traveler-controls';
import { errorKey, riyadhDay, riyadhToday } from './trip';

type Errors = Partial<Record<'name' | 'phone' | 'dateOfBirth', TranslationKey>>;

/**
 * The traveler's own profile (GET and PATCH /api/profile), in Tariq's bookings page frame with his traveler-card fields.
 * Name, phone and date of birth can change; the email signs the traveler in and stays as it is.
 */
export default function ProfilePage() {
  const t = useT();
  const format = useFormat();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<TranslationKey | null>(null);
  const [draft, setDraft] = useState({ name: '', phone: '', dateOfBirth: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; key: TranslationKey } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return undefined;
    let live = true;
    setLoadError(null);
    tripService.profile()
      .then((p) => { if (live) { setProfile(p); setDraft({ name: p.name, phone: p.phoneNumber, dateOfBirth: p.dateOfBirth }); } })
      .catch((error) => { if (!live) return; if (httpStatus(error) === 401) { logout(); return; } setLoadError(errorKey(error)); });
    return () => { live = false; };
  }, [user, attempt]);

  if (!user) return <Redirect to={`${routes.login}?next=${encodeURIComponent(routes.passenger.profile)}`} replace />;

  const check = (): Errors => {
    const next: Errors = {};
    if (!draft.name.trim() || draft.name.trim().length > 100) next.name = 'tpErrName';
    if (!/^\+?[0-9]{8,15}$/.test(draft.phone.replace(/[\s-]/g, ''))) next.phone = 'tpErrPhone';
    if (!draft.dateOfBirth || draft.dateOfBirth >= riyadhToday()) next.dateOfBirth = 'tpErrBirthDate';
    return next;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    const found = check();
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length) return;
    const changes: { name?: string; phone?: string; dateOfBirth?: string } = {};
    if (draft.name.trim() !== profile.name) changes.name = draft.name.trim();
    if (draft.phone.replace(/[\s-]/g, '') !== profile.phoneNumber) changes.phone = draft.phone.replace(/[\s-]/g, '');
    if (draft.dateOfBirth !== profile.dateOfBirth) changes.dateOfBirth = draft.dateOfBirth;
    if (!Object.keys(changes).length) { setMessage({ tone: 'ok', key: 'tpSaved' }); return; }
    setBusy(true);
    try {
      const saved = await tripService.updateProfile(changes);
      setProfile(saved);
      setDraft({ name: saved.name, phone: saved.phoneNumber, dateOfBirth: saved.dateOfBirth });
      // The account menu shows the new name right away.
      saveSession({ ...user, name: saved.name });
      setMessage({ tone: 'ok', key: 'tpSaved' });
    } catch (error) {
      if (httpStatus(error) === 401) { logout(); return; }
      if (httpStatus(error) === 409) setErrors({ phone: 'tpErrPhoneInUse' });
      else setMessage({ tone: 'error', key: errorKey(error) });
    } finally {
      setBusy(false);
    }
  };

  const field = (name: keyof typeof draft, label: TranslationKey, icon: ReactElement, input: InputHTMLAttributes<HTMLInputElement>) => (
    <label className="rental-field" htmlFor={`profile-${name}`}>
      <span className="field-label">{t(label)}</span>
      <span className="rental-input-wrap">
        {icon}
        <input id={`profile-${name}`} value={draft[name]} onChange={(e) => { setDraft({ ...draft, [name]: e.target.value }); setMessage(null); }}
          aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `profile-${name}-error` : undefined} data-testid={`input-profile-${name}`} {...input} />
      </span>
      {errors[name] && <small className="traveler-error" id={`profile-${name}-error`}>{t(errors[name]!)}</small>}
    </label>
  );

  return (
    <PassengerShell>
      <div className="bookings-page">
        <Sidebar />
        <main className="bookings-shell">
          <header className="bookings-header">
            <Link className="bookings-brand" href={routes.passenger.home}><BrandLogo /></Link>
            <div className="header-end"><HeaderControls /></div>
          </header>

          <section className="bookings-intro">
            <div>
              <p className="bookings-eyebrow">{t('tpProfileEyebrow')}</p>
              <h1>{t('tpProfile')}</h1>
              <p>{t('tpProfileIntro')}</p>
            </div>
            {profile && <span className="bookings-count">{t('tpMemberSince', { date: format.date(riyadhDay(profile.createdAt)) })}</span>}
          </section>

          {loadError && <div className="bookings-error" role="alert">{t(loadError)} <button type="button" className="booking-cancel-button" onClick={() => setAttempt((n) => n + 1)}>{t('retry')}</button></div>}
          {!loadError && !profile && <div className="booking-card booking-card-skeleton profile-skeleton" role="status" aria-label={t('loading')} />}

          {profile && (
            <form className="booking-card profile-card" onSubmit={save} noValidate data-testid="form-profile">
              <fieldset className="traveler-card">
                <legend className="field-label">{t('tpProfile')}</legend>
                <div className="rental-fields">
                  {field('name', 'fullName', <UserRound size={17} aria-hidden="true" />, { autoComplete: 'name' })}
                  {field('phone', 'phone', <Phone size={17} aria-hidden="true" />, { dir: 'ltr', inputMode: 'tel', autoComplete: 'tel' })}
                  {field('dateOfBirth', 'dateOfBirth', <CalendarDays size={17} aria-hidden="true" />, { type: 'date', dir: 'ltr', max: riyadhToday() })}
                  <label className="rental-field" htmlFor="profile-email">
                    <span className="field-label">{t('email')}</span>
                    <span className="rental-input-wrap"><Mail size={17} aria-hidden="true" /><input id="profile-email" value={profile.email} dir="ltr" readOnly aria-describedby="profile-email-note" /></span>
                    <small className="profile-note" id="profile-email-note">{t('tpEmailFixed')}</small>
                  </label>
                </div>
              </fieldset>
              <p className={`form-message${message ? ' visible' : ''}${message?.tone === 'ok' ? ' form-message-ok' : ''}`} role={message?.tone === 'error' ? 'alert' : 'status'} data-testid="profile-message">{message ? t(message.key) : ' '}</p>
              <div className="step-actions">
                <span />
                <button className="search-button car-continue" type="submit" disabled={busy} data-testid="button-save-profile"><span>{busy ? t('saving') : t('save')}</span></button>
              </div>
            </form>
          )}
        </main>
      </div>
    </PassengerShell>
  );
}
