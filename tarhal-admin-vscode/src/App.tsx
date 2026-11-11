import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react';
import { Redirect, Route, Switch, useLocation, useSearch, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import ChatAssistant from '@/components/chat-assistant';
import { ChatIntro } from '@/components/chat-intro';
import { Layout } from '@/components/layout';
import ToastViewport from '@/components/toast-viewport';
import { useDocumentSettings } from '@/hooks/use-document-settings';
import { useSessionCheck } from '@/hooks/use-session-check';
import Dashboard from '@/pages/dashboard';
import AdminResource from '@/pages/admin-resource';
import Bookings from '@/pages/bookings';
import Revenue from '@/pages/revenue';
import Users from '@/pages/users';
import Settings from '@/pages/settings';
import { routes } from '@/config/routes';
import { canUseAdmin, useAuth } from '@/store/authStore';

// Tariq's passenger pages (src/pages/passenger). Loaded on demand: their photos and styles stay out of the admin bundle.
/**
 * A lazily loaded page. React.lazy suspends once even when the code is already downloaded, which shows the empty
 * fallback for a moment; so once the module is here (prefetched or visited), the page renders straight away.
 */
function page(load: () => Promise<{ default: ComponentType }>) {
  let loaded: ComponentType | null = null;
  let promise: Promise<{ default: ComponentType }> | null = null;
  const get = () => (promise ??= load().then((m) => { loaded = m.default; return m; }));
  const Lazy = lazy(get);
  const Page = () => { const Ready = loaded; return Ready ? <Ready /> : <Lazy />; };
  return Object.assign(Page, { preload: get });
}

// Every page loader once: lazy() uses them, and usePrefetchPages() loads them all when the browser is idle,
// so moving between pages later never waits for code (no empty screen).
const pages = {
  TravelHome: () => import('@/pages/passenger/travel-home'),
  FlightBooking: () => import('@/pages/passenger/flight-booking'),
  MyBookings: () => import('@/pages/passenger/my-bookings'),
  Profile: () => import('@/pages/passenger/profile'),
  TravelGuide: () => import('@/pages/passenger/travel-guide'),
  CityGuide: () => import('@/pages/passenger/city-guide'),
  NotFound: () => import('@/pages/passenger/not-found'),
  Login: () => import('@/pages/login'),
  Register: () => import('@/pages/register'),
} as const;
const TravelHome = page(pages.TravelHome);
const FlightBooking = page(pages.FlightBooking);
const MyBookings = page(pages.MyBookings);
const Profile = page(pages.Profile);
const TravelGuide = page(pages.TravelGuide);
const CityGuide = page(pages.CityGuide);
const NotFound = page(pages.NotFound);
const Login = page(pages.Login);
const Register = page(pages.Register);
// While a page's code loads (normally only the very first visit): a quiet empty page in the current theme's
// background (.route-fallback in index.css), never a white or navy flash.
const Passenger = ({ children }: { children: ReactNode }) => <Suspense fallback={<div className="route-fallback" role="status" aria-busy="true" aria-label="Loading" />}>{children}</Suspense>;

/** Loads the code of every traveler page in the background once the first page has settled. */
function usePrefetchPages() {
  useEffect(() => {
    const run = () => { for (const Page of [TravelHome, FlightBooking, MyBookings, Profile, TravelGuide, CityGuide, NotFound, Login, Register]) void Page.preload().catch(() => undefined); };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = idle ? idle(run, { timeout: 2500 }) : window.setTimeout(run, 1200);
    return () => { if (!idle) window.clearTimeout(id); };
  }, []);
}

/** A redirect that keeps the query string (?next=, ?to=). */
function KeepSearch({ to }: { to: string }) {
  const search = useSearch();
  return <Redirect to={search ? `${to}?${search}` : to} replace />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

/**
 * Signed-out visitors (or a session that just expired) go to the login page and come back; travelers go to the home page.
 * The admin Layout (sidebar, top bar) is rendered here once, so it stays in place while only the page content changes.
 */
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  if (!user) return <Redirect to={`${routes.login}?next=${encodeURIComponent(location)}`} replace />;
  if (!canUseAdmin(user)) return <Redirect to={routes.home} replace />;
  return <Layout>{children}</Layout>;
}

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Traveler site: Tariq's design (src/pages/passenger). My bookings sends signed-out visitors to /login and back. */}
        <Route path={routes.passenger.home}><Passenger><TravelHome /></Passenger></Route>
        <Route path={routes.passenger.flights}><Passenger><FlightBooking /></Passenger></Route>
        <Route path={routes.passenger.bookings}><Passenger><MyBookings /></Passenger></Route>
        <Route path={routes.passenger.profile}><Passenger><Profile /></Passenger></Route>
        <Route path={routes.passenger.guide}><Passenger><TravelGuide /></Passenger></Route>
        <Route path="/travel-guide/:slug"><Passenger><CityGuide /></Passenger></Route>
        <Route path={routes.login}><Passenger><Login /></Passenger></Route>
        <Route path={routes.register}><Passenger><Register /></Passenger></Route>
        {/* Old traveler URLs (the first combined site and Tariq's own app) keep working. */}
        <Route path="/travel"><Redirect to={routes.passenger.home} replace /></Route>
        <Route path="/travel/flights"><KeepSearch to={routes.passenger.flights} /></Route>
        <Route path="/travel/bookings"><Redirect to={routes.passenger.bookings} replace /></Route>
        <Route path="/travel/guide"><Redirect to={routes.passenger.guide} replace /></Route>
        <Route path="/travel/guide/:slug">{(params) => <Redirect to={routes.passenger.city(params.slug)} replace />}</Route>
        {/* Hotels and cars are chosen inside the flight booking (his Hotel and Car steps), not on pages of their own. */}
        <Route path="/stays"><Redirect to={routes.passenger.flights} replace /></Route>
        <Route path="/rentals"><Redirect to={routes.passenger.flights} replace /></Route>
        <Route path="/hotel-stays"><Redirect to={routes.passenger.flights} replace /></Route>
        <Route path="/car-rentals"><Redirect to={routes.passenger.flights} replace /></Route>
        <Route path="/flightbooking"><Redirect to={routes.passenger.flights} replace /></Route>
        <Route path="/travelguide"><Redirect to={routes.passenger.guide} replace /></Route>
        <Route path="/city/:slug">{(params) => <Redirect to={routes.passenger.city(params.slug)} replace />}</Route>
        <Route path="/signup"><KeepSearch to={routes.register} /></Route>
        {/* Admin (see routes.admin in config/routes.ts) */}
        <Route path="/dashboard"><AdminOnly><Dashboard /></AdminOnly></Route>
        <Route path="/flights"><AdminOnly><AdminResource kind="flight" /></AdminOnly></Route>
        <Route path="/hotels"><AdminOnly><AdminResource kind="hotel" /></AdminOnly></Route>
        <Route path="/cars"><AdminOnly><AdminResource kind="car" /></AdminOnly></Route>
        <Route path="/bookings"><AdminOnly><Bookings /></AdminOnly></Route>
        <Route path="/revenue"><AdminOnly><Revenue /></AdminOnly></Route>
        <Route path="/users"><AdminOnly><Users /></AdminOnly></Route>
        <Route path="/settings"><AdminOnly><Settings /></AdminOnly></Route>
        <Route><Passenger><NotFound /></Passenger></Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

export default function App() {
  useDocumentSettings();
  useSessionCheck();
  usePrefetchPages();
  return (
    <WouterRouter>
      <Routes />
      <ChatAssistant />
      <ChatIntro />
      <ToastViewport />
    </WouterRouter>
  );
}