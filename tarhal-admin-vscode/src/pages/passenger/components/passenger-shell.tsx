import type { ReactNode } from 'react';
import { useT } from '@/i18n/use-i18n';
// Tariq's stylesheets, all of them in his order (see styles/tariq-styles.ts).
import '../styles/tariq-styles';

/**
 * Every traveler page is Tariq's design on its own: his rail is the navigation and the settings gear in it holds the site
 * controls, so there is no other navbar. `.passenger-app` is the only place where his stylesheets apply
 * (see vite-plugins/passenger-css.ts).
 */
export function PassengerShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <>
      <a href="#main" className="absolute start-4 top-2 z-[60] -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:translate-y-0">{t('skipToContent')}</a>
      <div id="main" className="passenger-app">{children}</div>
    </>
  );
}
