import { useLocation } from 'wouter';
import { routes } from '@/config/routes';
import { authService } from '@/services/authService';
import { notify } from '@/store/notificationStore';

export function useSignOut() {
  const [, setLocation] = useLocation();
  return () => {
    void authService.logout();
    notify({ tone: 'info', titleKey: 'logoutTitle', messageKey: 'logoutMessage' });
    setLocation(routes.home);
  };
}
