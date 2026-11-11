import { Link } from 'wouter';
import { routes } from '@/config/routes';
import { useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import Tarhallogo from '../assets/Tarhallogo.webp';
import TarhallogoLight from '../assets/Tarhallogo-light.webp';
import { HeaderControls } from './traveler-controls';

/**
 * The one header of every traveler page, exactly as on Tariq's home page (his Navbar.jsx logo, .tarhallogo, and the
 * controls group, .home-controls): the logo at the same place and size, the controls group at the same place, and the
 * page's short tagline (if it has one) just before the controls. It is laid over the top of the page (position: absolute
 * inside the page's .tframe root), so every page's content starts at the same line below it. See "Shared page frame"
 * in styles/passenger-additions.css.
 */
export function FrameHeader({ note, auth = false }: { note?: TranslationKey; auth?: boolean }) {
  const t = useT();
  return (
    <>
      <Link href={routes.passenger.home} aria-label="Tarhal" className="tframe-logo-link">
        <img className="tarhallogo tarhal-logo-light" src={TarhallogoLight} alt="Tarhal" width={480} height={480} />
        <img className="tarhallogo tarhal-logo-dark" src={Tarhallogo} alt="" aria-hidden="true" width={480} height={480} />
      </Link>
      <div className="home-controls tframe-end">
        {note && <span className="tframe-note" data-frame="tagline"><span className="tframe-dot" aria-hidden="true" />{t(note)}</span>}
        <HeaderControls auth={auth} />
      </div>
    </>
  );
}
