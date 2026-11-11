import { FrameHeader } from './components/frame-header';
import type { ReactNode } from 'react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { routes } from '@/config/routes';
import { useFormat, useT } from '@/i18n/use-i18n';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { AiCityGuide } from './components/ai-city-guide';
import { cities } from './data/cities';
import { useDemoState } from '@/store/demoStore';
import { cityDescriptionAr, isPlaceholderDescription } from './data/cities-ar';
import { cityLabel, regionLabel } from './trip';
import { PlaceGrid } from './components/place-grid';
import { cityDescriptions, cityPhotoOverrides } from './data/city-additions';
import { photoProps } from './data/photo-sizes';

function CityGuideLayout({ children }: { children: ReactNode }) {
  return (
    <PassengerShell>
      <div className="city-guide-page tframe">
        <FrameHeader note="tpGuideHeaderNote" />
        <div className="city-guide-layout">
          <Sidebar />
          <main className="city-guide-main tframe-content" data-frame="content">
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
  // His description; where he has only placeholder text, the addition for his review (data/city-additions.ts).
  const placeholder = isPlaceholderDescription(city.description);
  const added = placeholder ? cityDescriptions[city.slug] : undefined;
  const english = placeholder ? added?.en ?? '' : city.description.replace(/\s+/g, ' ').trim();
  const description = language === 'ar' ? cityDescriptionAr[city.slug] ?? added?.ar ?? english : english;
  const heroPhoto = cityPhotoOverrides[city.slug]?.hero ?? city.heroPhoto;
  return (
    <CityGuideLayout>
      <div className="city-guide-topline">
        <Link className="city-guide-back-link" href={routes.passenger.guide}><Back />{t('tpAllCities')}</Link>
        <span>{t('tpCityGuideOf', { region: regionLabel(t, city.region) })}</span>
      </div>
      <section className="city-guide-hero" data-tone={city.tone}>
        {heroPhoto ? (
          <img className="city-guide-hero-image" {...photoProps(heroPhoto, '(max-width: 760px) 100vw, 1060px')} loading="eager" alt={name} />
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
          <PlaceGrid places={places} cityName={name} />
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
