import { Link } from 'wouter';
import { routes } from '@/config/routes';
import { useT } from '@/i18n/use-i18n';
import type { MyBooking } from '@/services/bookingService';
import { useAuth } from '@/store/authStore';
import { useDemoState } from '@/store/demoStore';
import Airplane1 from './assets/Airplane1.webp';
import Alula from './assets/Alula.webp';
import Riyadh from './assets/Riyadh.webp';
import Tarhallogo from './assets/Tarhallogo.webp';
import TarhallogoLight from './assets/Tarhallogo-light.webp';
import saudi from './assets/saudi.webp';
import { PassengerShell } from './components/passenger-shell';
import Sidebar from './components/passenger-sidebar';
import { HeaderControls } from './components/traveler-controls';
import { withNext } from '@/lib/next-path';
import { cityLabel } from './trip';
import { upcoming, useMyBookings } from './use-my-bookings';

/**
 * Tariq's traveler home, the start page of the site (/). The greeting uses the signed-in name; both booking panels come from
 * GET /api/bookings. Guests see the same page with a plain greeting and links to log in or register, never sample bookings.
 */
export default function TravelHome() {
  const t = useT();
  const { user } = useAuth();
  const { language } = useDemoState().settings;
  const { state } = useMyBookings();

  const now = new Date();
  const greeting = now.getHours() >= 18 ? t('tpGoodEvening') : t('tpGoodDay');
  // Friday and Saturday are the weekend in Saudi Arabia.
  const wish = now.getDay() === 5 || now.getDay() === 6
    ? t('tpNiceWeekend')
    : t('tpNiceDay', { day: now.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en', { weekday: 'long' }) });

  const bookings = state.status === 'ready' ? state.bookings : [];
  const last = bookings[0];
  const next = upcoming(bookings).slice(0, 3);

  /** What a booking panel says when it has no booking to show. */
  const panelNote = (empty: string) => {
    if (state.status === 'signedOut') return (
      <span className="Panel-Note" data-testid="guest-note">
        {t('tpGuestBookingsNote')}{' '}
        <Link href={withNext(routes.login, routes.passenger.home)}>{t('login')}</Link>{' · '}
        <Link href={withNext(routes.register, routes.passenger.home)}>{t('register')}</Link>
      </span>
    );
    if (state.status === 'loading') return <span className="Panel-Note" role="status">{t('loading')}</span>;
    if (state.status === 'error') return <span className="Panel-Note" role="alert">{t(state.message)}</span>;
    return <span className="Panel-Note">{empty}</span>;
  };

  const route = (b: MyBooking) => (
    <>
      <span className="Route-Endpoint"><small>{t('tpFrom')}</small><strong>{cityLabel(t, b.flight.from)}</strong></span>
      <div className="Route-Track" aria-hidden="true">
        <span className="Route-Dot" /><span className="Route-Line" /><span className="Route-Plane">✈</span><span className="Route-Line" /><span className="Route-Dot" />
      </div>
      <span className="Route-Endpoint Route-Endpoint--right"><small>{t('tpTo')}</small><strong>{cityLabel(t, b.flight.to)}</strong></span>
    </>
  );

  return (
    <PassengerShell>
      <div className="Whole-Container">
        {/* His logo (his Navbar.jsx): the only brand mark on this page. */}
        <Link href={routes.passenger.home} aria-label="Tarhal"><img className="tarhallogo tarhal-logo-light" src={TarhallogoLight} alt="Tarhal" width={480} height={480} /><img className="tarhallogo tarhal-logo-dark" src={Tarhallogo} alt="" aria-hidden="true" width={480} height={480} /></Link>
        <Sidebar />
        <div className="home-controls"><HeaderControls /></div>
        <div className="Stage">
          <section className="First-Container">
            <div className="Panelfirst">
              <div className="PanelTop" />
              <h2>{user ? t('tpGreetingName', { greeting, name: user.name }) : t('tpGreeting', { greeting })}</h2>
              <p>{wish}</p>
            </div>
            <img className="Dashboard-Airplane" src={Airplane1} alt="" />
          </section>

          <Link href={routes.passenger.guide} className="Travel-Card">
            <div className="Travel-Card-Tab"><span>{t('tpTravelGuideTab')}</span></div>
            <img className="Travel-Card-Image" src={saudi} alt="" />
            <h3 className="Travel-Card-Title">{t('tpDiscoverMore')}</h3>
          </Link>

          <div className="Destination-Cards">
            <Link href={routes.passenger.city('alula')} className="Destination-Card">
              <img className="Destination-Image" src={Alula} alt="" style={{ objectPosition: '35% center' }} />
              <div className="Destination-Label"><span>{t('tpDiscoverCity', { city: cityLabel(t, 'AlUla') })}</span><span className="Destination-Arrow rtl:-scale-x-100" aria-hidden="true">→</span></div>
            </Link>
            <Link href={routes.passenger.city('riyadh')} className="Destination-Card">
              <img className="Destination-Image" src={Riyadh} alt="" style={{ objectPosition: '70% center' }} />
              <div className="Destination-Label"><span>{t('tpDiscoverCity', { city: cityLabel(t, 'Riyadh') })}</span><span className="Destination-Arrow rtl:-scale-x-100" aria-hidden="true">→</span></div>
            </Link>
          </div>

          <section className="Booking-Cards">
            <article className="Booking-Panel Last-Booking" data-testid="panel-last-booking">
              <header className="Booking-Tab"><span>{t('tpLastBooking')}</span></header>
              <div className="Last-Booking-Content">
                {last ? (
                  <Link href={routes.passenger.bookings} className="Booking-Route">{route(last)}</Link>
                ) : <div className="Booking-Route">{panelNote(t('tpNoBookingsYet'))}</div>}
                <div className="Barcode" aria-hidden="true" />
              </div>
            </article>

            <article className="Booking-Panel Upcoming-Flights" data-testid="panel-upcoming">
              <header className="Booking-Tab"><span>{t('upcomingFlights')}</span></header>
              <div className="Upcoming-Flight-List">
                {next.length ? next.map((b) => (
                  <div className="Flight-Row" key={b.id}>
                    <span className="Flight-Place"><small>{t('tpFrom')}</small><strong>{cityLabel(t, b.flight.from)}</strong></span>
                    <div className="Route-Track" aria-hidden="true">
                      <span className="Route-Dot" /><span className="Route-Line" /><span className="Route-Plane">✈</span><span className="Route-Line" /><span className="Route-Dot" />
                    </div>
                    <span className="Flight-Place Flight-Place--right"><small>{t('tpTo')}</small><strong>{cityLabel(t, b.flight.to)}</strong></span>
                  </div>
                )) : <div className="Flight-Row">{panelNote(t('tpNoUpcoming'))}</div>}
              </div>
            </article>
          </section>
        </div>
      </div>
    </PassengerShell>
  );
}
