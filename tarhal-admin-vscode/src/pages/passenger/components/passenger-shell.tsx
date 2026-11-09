import type { ReactNode } from 'react';
import { Navbar } from '@/components/navbar';
import { useT } from '@/i18n/use-i18n';
import '../styles/TarhalScrollbar.css';

/**
 * Every passenger page sits under the site's one navbar (language, theme, currency, account),
 * inside `.passenger-app`, the only place where Tariq's stylesheets apply (see vite-plugins/passenger-css.ts).
 */
export function PassengerShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a href="#main" className="absolute start-4 top-2 z-[60] -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:translate-y-0">{t('skipToContent')}</a>
      <Navbar />
      <div id="main" className="passenger-app flex-1">{children}</div>
    </div>
  );
}
