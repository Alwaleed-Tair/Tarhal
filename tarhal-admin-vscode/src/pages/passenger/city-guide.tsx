import type { ReactNode } from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { HeaderControls } from './components/traveler-controls';
import { cities } from './data/cities';
import { useDemoState } from '@/store/demoStore';
import { cityDescriptionAr, isPlaceholderDescription, isPlaceholderTitle, placeTitleAr } from './data/cities-ar';
import { cityLabel, regionLabel } from './trip';

function CityGuideLayout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <PassengerShell>
      <div className="city-guide-page">
        <div className="city-guide-layout">
          <Sidebar />
          <main className="city-guide-main">
            <header className="city-guide-header">
              <Link className="city-guide-brand" href={routes.passenger.guide}>
                <span className="city-guide-brand-mark" aria-hidden="true" />
                <span>TARHAL</span>
              </Link>
              <div className="header-end">
                <div className="city-guide-header-note">
                  <span className="city-guide-header-dot" />
                  {t('tpGuideHeaderNote')}
                </div>
                <HeaderControls />
              </div>
            </header>
            {children}
          </main>
        </div>
      </div>
    </PassengerShell>
  );
}

const Back = () => <ArrowLeft className="rtl:-scale-x-100" size={16} />;

/** Tariq's city page. City descriptions and places are his sample content in data/cities.ts. */
export default function CityGuide() {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const { slug } = useParams<{ slug: string }>();
  const city = cities.find((item) => item.slug === slug);
  if (!city) {
    return (
      <CityGuideLayout>
        <section className="city-guide-not-found">
          <p className="city-guide-eyebrow">{t('tpCityNotFound')}</p>
          <h1>{t('tpCityNotOnMap')}</h1>
          <Link className="city-guide-back-link" href={routes.passenger.guide}><Back />{t('tpBackToCities')}</Link>
        </section>
      </CityGuideLayout>
    );
  }
  const places = city.places ?? [];
  const name = cityLabel(t, city.name);
  const english = isPlaceholderDescription(city.description) ? '' : city.description.replace(/\s+/g, ' ').trim();
  const description = language === 'ar' ? cityDescriptionAr[city.slug] ?? english : english;
  return (
    <CityGuideLayout>
      <div className="city-guide-topline">
        <Link className="city-guide-back-link" href={routes.passenger.guide}><Back />{t('tpAllCities')}</Link>
        <span>{t('tpCityGuideOf', { region: regionLabel(t, city.region) })}</span>
      </div>
      <section className="city-guide-hero" data-tone={city.tone}>
        {city.heroPhoto ? (
          <img className="city-guide-hero-image" src={city.heroPhoto} alt={name} />
        ) : (
          <div className="city-guide-hero-placeholder"><ImageIcon size={22} /><span>{t('tpAddCityPhoto')}</span></div>
        )}
        <div className="city-guide-hero-copy">
          <p className="city-guide-eyebrow">{t('tpDiscoverSaudi')}</p>
          <h1>{t('tpCityTitle', { city: name })}</h1>
          {description && <p>{description}</p>}
        </div>
      </section>
      <section className="city-guide-recommendations">
        <div className="city-guide-section-heading">
          <div>
            <h2>{t('tpPlacesTitle')}</h2>
            <p>{t('tpPlacesNote')}</p>
          </div>
          <span>{t('tpPlacesCount', { count: format.number(places.length) })}</span>
        </div>
        {places.length > 0 ? (
          <div className="city-guide-place-grid">
            {places.map((place) => {
              const title = isPlaceholderTitle(place.title) ? '' : (language === 'ar' && placeTitleAr[place.id]) || place.title;
              return (
                <article className="city-guide-place-card" key={place.id}>
                  {place.photo ? (
                    <img className="city-guide-place-image" src={place.photo} alt={title || name} loading="lazy" />
                  ) : (
                    <div className="city-guide-place-placeholder"><ImageIcon size={20} /><span>{t('tpAddPlacePhoto')}</span></div>
                  )}
                  {title && <div className="city-guide-place-title">{title}</div>}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="city-guide-empty">{t('tpPlacesLater')}</p>
        )}
        <div className="city-guide-footer-link">
          <span>{t('tpAnotherCity')}</span>
          <Link href={routes.passenger.guide}>{t('tpBrowseCities')}</Link>
        </div>
      </section>
    </CityGuideLayout>
  );
}
