import { useEffect, useState } from 'react';
import { describeError } from '@/services/api';

type Status = 'loading' | 'ready' | 'error';

/**
 * Loads live data; if the request fails (server offline, error response) it falls back to `fallback()`
 * (the demo data) and sets `offline: true`. `status: 'error'` only happens if the fallback itself throws.
 */
export function useLiveData<T>(load: () => Promise<T>, fallback: () => T, key: unknown = null) {
  const [state, setState] = useState<{ data: T; status: Status; offline: boolean; reason: string }>(() => ({ data: fallback(), status: 'loading', offline: false, reason: '' }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    load()
      .then((data) => { if (!cancelled) setState({ data, status: 'ready', offline: false, reason: '' }); })
      .catch((err) => {
        if (cancelled) return;
        const reason = describeError(err);
        console.warn('[api] request failed, showing demo data:', reason, err);
        try { setState({ data: fallback(), status: 'ready', offline: true, reason }); }
        catch { setState((s) => ({ ...s, status: 'error' })); }
      });
    return () => { cancelled = true; };
  }, [key, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
