import { lazy, Suspense, type ReactNode } from 'react';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import ChatAssistant from '@/components/chat-assistant';
import ToastViewport from '@/components/toast-viewport';
import { useDocumentSettings } from '@/hooks/use-document-settings';
import Home from '@/pages/home';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Stays from '@/pages/stays';
import Rentals from '@/pages/rentals';
import Dashboard from '@/pages/dashboard';
import AdminResource from '@/pages/admin-resource';
import Bookings from '@/pages/bookings';
import Revenue from '@/pages/revenue';
import Users from '@/pages/users';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';
import { routes } from '@/config/routes';
import { canUseAdmin, useAuth } from '@/store/authStore';

// Tariq's passenger pages (src/pages/passenger). Loaded on demand: their photos and styles stay out of the admin bundle.
const TravelGuide = lazy(() => import('@/pages/passenger/travel-guide'));
const CityGuide = lazy(() => import('@/pages/passenger/city-guide'));
const Passenger = ({ children }: { children: ReactNode }) => <Suspense fallback={<div className="min-h-dvh bg-background" role="status" aria-busy="true" />}>{children}</Suspense>;

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

/** Signed-out visitors go to the login page, travelers to the home page. */
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Redirect to={routes.login} replace />;
  if (!canUseAdmin(user)) return <Redirect to={routes.home} replace />;
  return <>{children}</>;
}

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Public site */}
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/stays" component={Stays} />
        <Route path="/rentals" component={Rentals} />
        {/* Passenger (Tariq): travel guide. */}
        <Route path={routes.passenger.guide}><Passenger><TravelGuide /></Passenger></Route>
        <Route path="/travel/guide/:slug"><Passenger><CityGuide /></Passenger></Route>
        {/* Admin (see routes.admin in config/routes.ts) */}
        <Route path="/dashboard"><AdminOnly><Dashboard /></AdminOnly></Route>
        <Route path="/flights"><AdminOnly><AdminResource kind="flight" /></AdminOnly></Route>
        <Route path="/hotels"><AdminOnly><AdminResource kind="hotel" /></AdminOnly></Route>
        <Route path="/cars"><AdminOnly><AdminResource kind="car" /></AdminOnly></Route>
        <Route path="/bookings"><AdminOnly><Bookings /></AdminOnly></Route>
        <Route path="/revenue"><AdminOnly><Revenue /></AdminOnly></Route>
        <Route path="/users"><AdminOnly><Users /></AdminOnly></Route>
        <Route path="/settings"><AdminOnly><Settings /></AdminOnly></Route>
        <Route component={NotFound} />
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