import { useCallback, useRef, useState } from 'react';
import { ChevronDown, Languages, Moon, Sun, UserRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { routes } from '@/config/routes';
import { useDismiss } from '@/hooks/use-dismiss';
import { useSignOut } from '@/hooks/use-sign-out';
import { useT } from '@/i18n/use-i18n';
import { withNext } from '@/lib/next-path';
import { canUseAdmin, useAuth } from '@/store/authStore';
import { setCurrency, useCurrency, type Currency } from '@/store/currencyStore';
import { updateSettings, useDemoState } from '@/store/demoStore';

/**
 * The site controls on every traveler page, in the top corner of Tariq's page header, styled like his header pills:
 * language, light/dark, larger text, currency and the account menu (log in / register, or my bookings, profile, admin and log out).
 * "Larger text" is the traveler side of Senior Mode: it only switches the larger text (his font sizes follow --text-scale).
 */
/** `auth`: the login and register pages, which show only language, theme and larger text (no account menu, no currency). */
export function HeaderControls({ auth = false }: { auth?: boolean }) {
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
  const isArabic = settings.language === 'ar';
  const isDark = settings.theme === 'dark';
  const next = location === routes.login || location === routes.register ? null : location;

  return (
    <div className="hc" role="group" aria-label={t('tpSettings')} data-testid="traveler-controls">
      <button type="button" className="hc-pill" onClick={() => updateSettings({ language: isArabic ? 'en' : 'ar' })}
        lang={isArabic ? 'en' : 'ar'} aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'} data-testid="hc-language">
        <Languages size={14} aria-hidden="true" /><span>{isArabic ? 'English' : 'العربية'}</span>
      </button>
      <button type="button" className="hc-pill hc-icon" onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
        aria-label={isDark ? t('switchToLight') : t('switchToDark')} title={isDark ? t('switchToLight') : t('switchToDark')} data-testid="hc-theme">
        {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
      </button>
      <button type="button" className={`hc-pill${settings.largerText ? ' hc-on' : ''}`} aria-pressed={settings.largerText}
        onClick={() => updateSettings({ largerText: !settings.largerText })} data-testid="hc-larger-text">
        <span aria-hidden="true" className="hc-aa">A+</span><span className="hc-label">{t('largerText')}</span>
      </button>
      {!auth && <label className="hc-pill hc-currency">
        <span className="sr-only">{t('currency')}</span>
        <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} data-testid="hc-currency">
          <option value="SAR">SAR</option>
          <option value="USD">USD ($)</option>
        </select>
      </label>}
      {!auth && <div className="hc-account" ref={ref}>
        <button type="button" className="hc-pill" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((current) => !current)} data-testid="hc-account">
          <UserRound size={14} aria-hidden="true" /><span className="hc-label">{user ? user.name : t('login')}</span><ChevronDown size={13} aria-hidden="true" />
        </button>
        {open && (
          <div className="hc-menu" role="menu" data-testid="hc-menu">
            {user ? (
              <>
                <p className="hc-user"><strong>{user.name}</strong><span dir="ltr">{user.email}</span></p>
                <Link href={routes.passenger.bookings} role="menuitem" className="hc-item" onClick={close} data-testid="hc-my-bookings">{t('tpNavBookings')}</Link>
                <Link href={routes.passenger.profile} role="menuitem" className="hc-item" onClick={close} data-testid="hc-profile">{t('tpProfile')}</Link>
                {canUseAdmin(user) && <Link href={routes.admin.dashboard} role="menuitem" className="hc-item" onClick={close} data-testid="hc-admin">{t('adminDashboard')}</Link>}
                <button type="button" role="menuitem" className="hc-item" onClick={() => { close(); signOut(); }} data-testid="hc-logout">{t('logout')}</button>
              </>
            ) : (
              <>
                <Link href={withNext(routes.login, next)} role="menuitem" className="hc-item" onClick={close} data-testid="hc-login">{t('login')}</Link>
                <Link href={withNext(routes.register, next)} role="menuitem" className="hc-item" onClick={close} data-testid="hc-register">{t('register')}</Link>
              </>
            )}
          </div>
        )}
      </div>}
    </div>
  );
}
