import { useCallback, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { routes } from '@/config/routes';
import { useDismiss } from '@/hooks/use-dismiss';
import { useSignOut } from '@/hooks/use-sign-out';
import { useT } from '@/i18n/use-i18n';
import { withNext } from '@/lib/next-path';
import { canUseAdmin, useAuth } from '@/store/authStore';
import { setCurrency, useCurrency } from '@/store/currencyStore';
import { setSeniorMode, updateSettings, useDemoState } from '@/store/demoStore';
import settingsIcon from '../assets/icons/settings.png';

/**
 * The settings gear of Tariq's rail (his design has it at the bottom). It opens one small panel in his popover style with the
 * site controls: language, theme, currency, Senior Mode and the account (log in / register, or my bookings, admin, log out).
 */
export function TravelerControls() {
  const t = useT();
  const { settings } = useDemoState();
  const currency = useCurrency();
  const { user } = useAuth();
  const signOut = useSignOut();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const senior = settings.largerText && settings.highContrast;
  const next = location === routes.login || location === routes.register ? null : location;

  const pair = (label: string, options: { key: string; text: string; active: boolean; onClick: () => void; lang?: string }[]) => (
    <div className="tc-row" role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      <div className="tc-switch">
        {options.map((option) => (
          <button key={option.key} type="button" className={option.active ? 'chosen' : ''} aria-pressed={option.active} onClick={option.onClick} lang={option.lang}
            data-testid={`tc-${option.key}`}>{option.text}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="tc" ref={ref}>
      <button type="button" className={`sidebar-link tc-trigger${open ? ' active' : ''}`} aria-expanded={open} aria-haspopup="dialog" aria-label={t('tpSettings')} title={t('tpSettings')}
        onClick={() => setOpen((current) => !current)} data-testid="button-traveler-settings">
        <img src={settingsIcon} alt="" className="sidebar-settingicon" />
      </button>
      {open && (
        <div className="tc-panel" role="dialog" aria-label={t('tpSettings')} data-testid="panel-traveler-settings">
          {pair(t('language'), [
            { key: 'en', text: 'English', active: settings.language === 'en', onClick: () => updateSettings({ language: 'en' }), lang: 'en' },
            { key: 'ar', text: 'العربية', active: settings.language === 'ar', onClick: () => updateSettings({ language: 'ar' }), lang: 'ar' },
          ])}
          {pair(t('theme'), [
            { key: 'light', text: t('light'), active: settings.theme === 'light', onClick: () => updateSettings({ theme: 'light' }) },
            { key: 'dark', text: t('dark'), active: settings.theme === 'dark', onClick: () => updateSettings({ theme: 'dark' }) },
          ])}
          {pair(t('currency'), [
            { key: 'sar', text: 'SAR', active: currency === 'SAR', onClick: () => setCurrency('SAR') },
            { key: 'usd', text: 'USD ($)', active: currency === 'USD', onClick: () => setCurrency('USD') },
          ])}
          {pair(t('seniorMode'), [
            { key: 'senior-off', text: t('tpOff'), active: !senior, onClick: () => setSeniorMode(false) },
            { key: 'senior-on', text: t('tpOn'), active: senior, onClick: () => setSeniorMode(true) },
          ])}
          <div className="tc-account">
            <span className="field-label">{t('tpAccount')}</span>
            {user ? (
              <>
                <p className="tc-user"><strong>{user.name}</strong><span dir="ltr">{user.email}</span></p>
                <Link href={routes.passenger.bookings} className="tc-link" onClick={close} data-testid="tc-my-bookings">{t('tpNavBookings')}</Link>
                {canUseAdmin(user) && <Link href={routes.admin.dashboard} className="tc-link" onClick={close} data-testid="tc-admin">{t('adminDashboard')}</Link>}
                <button type="button" className="tc-link tc-logout" onClick={() => { close(); signOut(); }} data-testid="tc-logout">{t('logout')}</button>
              </>
            ) : (
              <div className="tc-auth">
                <Link href={withNext(routes.login, next)} className="tc-link tc-primary" onClick={close} data-testid="tc-login">{t('login')}</Link>
                <Link href={withNext(routes.register, next)} className="tc-link" onClick={close} data-testid="tc-register">{t('register')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
