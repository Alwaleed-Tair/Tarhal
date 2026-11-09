import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Link } from 'wouter';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { cities } from './data/cities';
import { cityLabel } from './trip';
import './styles/TravelGuide.css';

function OrbitArtwork() {
  return (
    <div className="orbit-art" aria-hidden="true">
      <div className="orbit-ring" />
      <div className="orbit-ring orbit-ring-small" />
      <div className="orbit-sun" />
      <div className="orbit-route" />
      <div className="orbit-ground" />
    </div>
  );
}

/** Tariq's travel guide. The layout around it was in his App.jsx; it is here now so the route needs nothing else. */
export default function TravelGuide() {
  const t = useT();
  const format = useFormat();
  return (
    <PassengerShell>
      <div className="tarhal-page">
        <div className="travel-layout">
          <Sidebar />
          <main className="travel-main">
            <header className="site-header">
              <div className="brand">
                <span className="brand-mark" aria-hidden="true" />
                <span className="brand-name">TARHAL</span>
              </div>
              <div className="header-note">
                <span className="header-dot" />
                {t('tpGuideHeaderNote')}
              </div>
            </header>

            <section className="intro" aria-labelledby="welcome-title">
              <div className="intro-copy">
                <p className="eyebrow">{t('tpGuideEyebrow')}</p>
                <h1 id="welcome-title">{t('tpGuideTitle1')}<br />{t('tpGuideTitle2')}</h1>
                <p className="intro-note">{t('tpGuideNote')}</p>
              </div>
              <OrbitArtwork />
            </section>

            <section aria-labelledby="cities-heading">
              <div className="section-heading">
                <div>
                  <h2 id="cities-heading">{t('tpGuideCitiesTitle')}</h2>
                  <p>{t('tpGuideCitiesNote')}</p>
                </div>
                <span className="city-count">{t('tpGuideCount', { count: format.number(cities.length).padStart(2, '0') })}</span>
              </div>

              <div className="city-grid">
                {cities.map((city) => (
                  <Link key={city.slug} href={routes.passenger.city(city.slug)} className="city-card" aria-label={t('tpDiscoverCity', { city: cityLabel(t, city.name) })} data-testid={`card-city-${city.slug}`}>
                    <span className="card-visual" aria-hidden="true">
                      {city.selectionPhoto ? (
                        <img className="card-photo" src={city.selectionPhoto} alt="" loading="lazy" />
                      ) : (
                        <span className="card-photo-prompt"><ImageIcon size={15} strokeWidth={1.5} /><span>{t('tpAddCityPhoto')}</span></span>
                      )}
                    </span>
                    <span className="card-copy">
                      <span>{t('tpDiscoverCity', { city: cityLabel(t, city.name) })}</span>
                      <span className="card-arrow" aria-hidden="true"><ArrowRight className="rtl:-scale-x-100" size={18} strokeWidth={1.7} /></span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </PassengerShell>
  );
}
