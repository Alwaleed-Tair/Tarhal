import { useState, type ReactNode } from 'react';
import { ArrowLeft, ExternalLink, Image as ImageIcon, MapPin } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { routes } from '@/config/routes';
import { BrandLogo } from '@/components/brand-logo';
import { useFormat, useT } from '@/i18n/use-i18n';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { HeaderControls } from './components/traveler-controls';
import { AiCityGuide } from './components/ai-city-guide';
import { cities } from './data/cities';
import { useDemoState } from '@/store/demoStore';
import { cityDescriptionAr, isPlaceholderDescription, isPlaceholderTitle, placeTitleAr } from './data/cities-ar';
import { cityLabel, regionLabel } from './trip';
import { cityPlaces, hudhudLink } from './data/city-places';

function CityGuideLayout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <PassengerShell>
      <div className="city-guide-page">
        <div className="city-guide-layout">
          <Sidebar />
          <main className="city-guide-main">
            <header className="city-guide-header">
              <Link className="city-guide-brand" href={routes.passenger.home}><BrandLogo /></Link>
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
  const [openPlace, setOpenPlace] = useState<string | null>(null);
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
              const located = cityPlaces[place.id];
              const tariqTitle = isPlaceholderTitle(place.title) ? '' : (language === 'ar' && placeTitleAr[place.id]) || place.title;
              const title = tariqTitle || (located ? (language === 'ar' ? located.nameAr : located.name) : '');
              const photo = place.photo ? (
                <img className="city-guide-place-image" src={place.photo} alt={title || name} loading="lazy" />
              ) : (
                <div className="city-guide-place-placeholder"><ImageIcon size={20} /><span>{t('tpAddPlacePhoto')}</span></div>
              );
              if (!located) {
                return (
                  <article className="city-guide-place-card" key={place.id}>
                    {photo}
                    {title && <div className="city-guide-place-title">{title}</div>}
                  </article>
                );
              }
              const open = openPlace === place.id;
              return (
                <article className="city-guide-place-card city-guide-place-located" key={place.id} data-open={open || undefined} data-testid={`place-${place.id}`}>
                  <button className="city-guide-place-toggle" type="button" aria-expanded={open} onClick={() => setOpenPlace(open ? null : place.id)}>
                    {photo}
                    <span className="city-guide-place-title">{title}</span>
                  </button>
                  {open && (
                    <div className="city-guide-place-reveal">
                      <strong>{title}</strong>
                      <a href={hudhudLink(located)} target="_blank" rel="noopener noreferrer" data-testid={`hudhud-${place.id}`}>
                        <MapPin size={14} aria-hidden="true" /> {t('tpOpenInHudhud')}
                        <ExternalLink size={12} aria-hidden="true" />
                        <span className="sr-only"> {t('tpOpensNewTab')}</span>
                      </a>
                    </div>
                  )}
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
      <AiCityGuide city={city.name} name={name} />
    </CityGuideLayout>
  );
}
