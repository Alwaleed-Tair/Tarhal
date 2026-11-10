import type { CSSProperties } from 'react';
import { BedDouble, CarFront } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { routes } from '@/config/routes';
import { useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import booking from '../assets/icons/booking.png';
import home from '../assets/icons/home.png';
import plane from '../assets/icons/plane.png';
import travelguide from '../assets/icons/travelguide.png';
import { TravelerControls } from './traveler-controls';

// Tariq's icon rail, the main navigation of the traveler site. Hotels and Car Rentals are new; their icons are drawn
// in the same colour and size as his. On screens up to 1100px the rail becomes a bar at the bottom (passenger-additions.css).
type Item = { label: TranslationKey; to: string; icon: string | typeof BedDouble };
const items: Item[] = [
  { icon: home, label: 'tpNavHome', to: routes.passenger.home },
  { icon: BedDouble, label: 'hotels', to: routes.passenger.hotels },
  { icon: CarFront, label: 'cars', to: routes.passenger.cars },
  { icon: plane, label: 'tpNavFlights', to: routes.passenger.flights },
  { icon: booking, label: 'tpNavBookings', to: routes.passenger.bookings },
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
          const Icon = item.icon;
          return (
            <Link key={item.to} href={item.to} className={`sidebar-link${active ? ' active' : ''}`} aria-label={t(item.label)} title={t(item.label)} aria-current={active ? 'page' : undefined}
              data-testid={`rail-${item.to.replace(/\W/g, '') || 'home'}`}>
              {typeof Icon === 'string'
                ? <span className="sidebar-icon" style={{ '--icon-image': `url(${Icon})` } as CSSProperties} aria-hidden="true" />
                : <Icon className="sidebar-lucide" size={20} strokeWidth={2.4} aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
      <div className="sidebar-bottom">
        <TravelerControls />
        {/* The site's chat button (components/chat-assistant.tsx) is placed over this spot, like his camel button. */}
        <span className="sidebar-chat-slot" aria-hidden="true" />
      </div>
    </nav>
  );
}
