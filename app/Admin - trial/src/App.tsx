import { type ReactNode } from 'react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
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
import NotFound from '@/pages/not-found';

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Routes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/flights">
          <AdminResource kind="flight" />
        </Route>
        <Route path="/hotels">
          <AdminResource kind="hotel" />
        </Route>
        <Route path="/cars">
          <AdminResource kind="car" />
        </Route>
        <Route path="/bookings" component={Bookings} />
        <Route path="/revenue" component={Revenue} />
        <Route path="/users" component={Users} />
        <Route path="/settings" component={Settings} />
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