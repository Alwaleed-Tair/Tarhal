import type { CSSProperties } from 'react';
import { Link, useLocation } from 'wouter';
import { routes } from '@/config/routes';
import { useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import booking from '../assets/icons/booking.png';
import home from '../assets/icons/home.png';
import plane from '../assets/icons/plane.png';
import travelguide from '../assets/icons/travelguide.png';
import '../styles/SideBar.css';
// After SideBar.css, so its rail adjustments win on every passenger page.
import '../styles/passenger-additions.css';

// Tariq's icon rail. Settings and his sample chat are left out: language, theme and the account are in the site navbar,
// and the site's real assistant (POST /api/ai/chat) is on every page.
const items: { icon: string; label: TranslationKey; to: string }[] = [
  { icon: home, label: 'tpNavHome', to: routes.passenger.home },
  { icon: booking, label: 'tpNavBookings', to: routes.passenger.bookings },
  { icon: plane, label: 'tpNavFlights', to: routes.passenger.flights },
  { icon: travelguide, label: 'tpNavGuide', to: routes.passenger.guide },
];

export default function Sidebar() {
  const t = useT();
  const [location] = useLocation();
  return (
    <nav className="sidebar" aria-label={t('tpNavLabel')}>
      <div className="sidebar-links">
        {items.map((item) => {
          const active = location === item.to;
          return (
            <Link key={item.to} href={item.to} className={`sidebar-link${active ? ' active' : ''}`} aria-label={t(item.label)} title={t(item.label)} aria-current={active ? 'page' : undefined}>
              <span className="sidebar-icon" style={{ '--icon-image': `url(${item.icon})` } as CSSProperties} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
      <div className="sidebar-bottom" />
    </nav>
  );
}
