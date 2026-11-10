import { lazy, Suspense, type ReactNode } from 'react';
import { Redirect, Route, Switch, useLocation, useSearch, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import ChatAssistant from '@/components/chat-assistant';
import ToastViewport from '@/components/toast-viewport';
import { useDocumentSettings } from '@/hooks/use-document-settings';
import Dashboard from '@/pages/dashboard';
import AdminResource from '@/pages/admin-resource';
import Bookings from '@/pages/bookings';
import Revenue from '@/pages/revenue';
import Users from '@/pages/users';
import Settings from '@/pages/settings';
import { routes } from '@/config/routes';
import { canUseAdmin, useAuth } from '@/store/authStore';

// Tariq's passenger pages (src/pages/passenger). Loaded on demand: their photos and styles stay out of the admin bundle.
const TravelHome = lazy(() => import('@/pages/passenger/travel-home'));
const FlightBooking = lazy(() => import('@/pages/passenger/flight-booking'));
const MyBookings = lazy(() => import('@/pages/passenger/my-bookings'));
const TravelGuide = lazy(() => import('@/pages/passenger/travel-guide'));
const CityGuide = lazy(() => import('@/pages/passenger/city-guide'));
const NotFound = lazy(() => import('@/pages/passenger/not-found'));
const Login = lazy(() => import('@/pages/login'));
const Register = lazy(() => import('@/pages/register'));
// While a page loads: his dark blue page colour, so there is no white flash between pages.
const Passenger = ({ children }: { children: ReactNode }) => <Suspense fallback={<div className="min-h-dvh" style={{ background: '#142c43' }} role="status" aria-busy="true" />}>{children}</Suspense>;

/** A redirect that keeps the query string (?next=, ?to=). */
function KeepSearch({ to }: { to: string }) {
  const search = useSearch();
  return <Redirect to={search ? `${to}?${search}` : to} replace />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

/** Signed-out visitors (or a session that just expired) go to the login page and come back; travelers go to the home page. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  if (!user) return <Redirect to={`${routes.login}?next=${encodeURIComponent(location)}`} replace />;
  if (!canUseAdmin(user)) return <Redirect to={routes.home} replace />;
  return <>{children}</>;
}

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Traveler site: Tariq's design (src/pages/passenger). My bookings sends signed-out visitors to /login and back. */}
        <Route path={routes.passenger.home}><Passenger><TravelHome /></Passenger></Route>
        <Route path={routes.passenger.flights}><Passenger><FlightBooking /></Passenger></Route>
        <Route path={routes.passenger.bookings}><Passenger><MyBookings /></Passenger></Route>
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
  return (
    <WouterRouter>
      <Routes />
      <ChatAssistant />
      <ToastViewport />
    </WouterRouter>
  );
}