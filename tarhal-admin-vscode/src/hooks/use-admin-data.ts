import { useEffect, useState } from 'react';
import { httpStatus, isServerUnreachable } from '@/services/api';
import { currentSession, logout } from '@/store/authStore';
import { notify } from '@/store/notificationStore';

type Status = 'loading' | 'ready' | 'error';

/**
 * Loads the data of an admin page. What happens when the request fails depends on why:
 * - 401 / 403: the session is over. It is cleared, and the AdminOnly guard in App.tsx sends the visitor to the login page.
 * - The server cannot be reached: the demo rows, with `offline: true` so the page shows the Demo data badge.
 * - Any other answer (400, 404, 500...): `status: 'error'` and no rows, so the page shows its error state. Demo rows are never shown as if they were real.
 */
export function useAdminData<T>(load: () => Promise<T>, demo: () => T, empty: T, key: unknown = null) {
  const [state, setState] = useState<{ data: T; status: Status; offline: boolean }>({ data: empty, status: 'loading', offline: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, status: 'loading' }));
    load()
      .then((data) => { if (!cancelled) setState({ data, status: 'ready', offline: false }); })
      .catch((error) => {
        if (cancelled) return;
        const status = httpStatus(error);
        if (status === 401 || status === 403) {
          // Several requests can fail together: only the first one says so.
          if (currentSession()) {
            logout();
            notify({ tone: 'warning', titleKey: 'sessionExpiredTitle', messageKey: 'errUnauthorized' });
          }
          return;
        }
        if (isServerUnreachable(error)) setState({ data: demo(), status: 'ready', offline: true });
        else setState({ data: empty, status: 'error', offline: false });
      });
    return () => { cancelled = true; };
  }, [key, attempt]);

  return { ...state, reload: () => setAttempt((count) => count + 1) };
}
