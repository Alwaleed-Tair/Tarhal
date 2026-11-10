import type { CSSProperties } from 'react';
import { Link, useLocation } from 'wouter';
import { routes } from '@/config/routes';
import { useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import booking from '../assets/icons/booking.png';
import home from '../assets/icons/home.png';
import plane from '../assets/icons/plane.png';
import travelguide from '../assets/icons/travelguide.png';

// Tariq's rail as in his Sidebar.jsx: Home, Bookings, Plane (flight booking), Travel Guide, in his order, with his icons.
// His settings link and camel chat button are not here: the site controls are in the page header (HeaderControls) and the
// site's chat has its own button. Up to 1100px the rail is a bar at the bottom of the screen (passenger-additions.css).
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
    <nav className="sidebar" aria-label={t('tpNavLabel')} data-testid="traveler-rail">
      <div className="sidebar-links">
        {items.map((item) => {
          const active = item.to === routes.passenger.home ? location === item.to : location === item.to || location.startsWith(`${item.to}/`);
          return (
            <Link key={item.to} href={item.to} className={`sidebar-link${active ? ' active' : ''}`} aria-label={t(item.label)} title={t(item.label)} aria-current={active ? 'page' : undefined}
              data-testid={`rail-${item.to.replace(/\W/g, '') || 'home'}`}>
              <span className="sidebar-icon" style={{ '--icon-image': `url(${item.icon})` } as CSSProperties} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
      <div className="sidebar-bottom" />
    </nav>
  );
}
