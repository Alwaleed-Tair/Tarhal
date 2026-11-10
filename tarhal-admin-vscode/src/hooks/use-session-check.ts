import { useEffect } from 'react';
import { httpStatus } from '@/services/api';
import { tripService } from '@/services/tripService';
import { currentSession, logout, saveSession } from '@/store/authStore';

/**
 * Once per page load: when this browser remembers a login, GET /api/auth/me checks the session cookie is still valid.
 * 401 -> the remembered login is cleared (pages then ask to log in). Otherwise name, email and role come from the server,
 * so the admin link follows the real role. A network error leaves things as they are.
 */
export function useSessionCheck() {
  useEffect(() => {
    if (!currentSession()) return;
    let live = true;
    tripService.me()
      .then((me) => { if (live && currentSession()) saveSession({ name: me.name, email: me.email, role: me.role }); })
      .catch((error) => { if (live && httpStatus(error) === 401) logout(); });
    return () => { live = false; };
  }, []);
}
