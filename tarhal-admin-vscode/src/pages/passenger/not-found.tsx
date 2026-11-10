import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { routes } from '@/config/routes';
import { useT } from '@/i18n/use-i18n';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { HeaderControls } from './components/traveler-controls';

/** Unknown address: his city guide's "not on the map" page, pointing home. Replaces the old developer 404. */
export default function NotFound() {
  const t = useT();
  return (
    <PassengerShell>
      <div className="city-guide-page">
        <div className="city-guide-layout">
          <Sidebar />
          <main className="city-guide-main">
            <header className="city-guide-header">
              <Link className="city-guide-brand" href={routes.passenger.home}>
                <span className="city-guide-brand-mark" aria-hidden="true" />
                <span>TARHAL</span>
              </Link>
              <div className="header-end"><HeaderControls /></div>
            </header>
            <section className="city-guide-not-found" data-testid="page-not-found">
              <p className="city-guide-eyebrow">{t('tpPageNotFound')}</p>
              <h1>{t('tpPageNotOnMap')}</h1>
              <Link className="city-guide-back-link" href={routes.passenger.home}><ArrowLeft className="rtl:-scale-x-100" size={16} />{t('tpBackHome')}</Link>
            </section>
          </main>
        </div>
      </div>
    </PassengerShell>
  );
}
