import { Languages, Moon, Sun, UserRound } from 'lucide-react';
import { useLocation } from 'wouter';
import { routes } from '@/config/routes';
import { MenuButton } from '@/components/dropdown';
import { useSignOut } from '@/hooks/use-sign-out';
import { useT } from '@/i18n/use-i18n';
import { withNext } from '@/lib/next-path';
import { canUseAdmin, useAuth } from '@/store/authStore';
import { CurrencySelect } from '@/components/currency-select';
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
  const { user } = useAuth();
  const signOut = useSignOut();
  const [location] = useLocation();
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
      {!auth && <CurrencySelect variant="traveler" />}
      {!auth && <MenuButton variant="traveler" testId="hc-account" menuTestId="hc-menu" icon={<UserRound size={14} aria-hidden="true" />}
        label={user ? user.name : t('login')} buttonLabel={`${t('accountMenu')}: ${user ? user.name : t('login')}`}
        header={user ? <p className="hc-user"><strong>{user.name}</strong><span dir="ltr">{user.email}</span></p> : undefined}
        items={user ? [
          { key: 'profile', label: t('tpProfile'), href: routes.passenger.profile, testId: 'hc-profile' },
          { key: 'bookings', label: t('tpNavBookings'), href: routes.passenger.bookings, testId: 'hc-my-bookings' },
          ...(canUseAdmin(user) ? [{ key: 'admin', label: t('adminDashboard'), href: routes.admin.dashboard, testId: 'hc-admin' }] : []),
          { key: 'logout', label: t('logout'), onSelect: signOut, testId: 'hc-logout' },
        ] : [
          { key: 'login', label: t('login'), href: withNext(routes.login, next), testId: 'hc-login' },
          { key: 'register', label: t('register'), href: withNext(routes.register, next), testId: 'hc-register' },
        ]} />}
    </div>
  );
}
