import { useEffect, useState } from 'react';

/**
 * Frontend-only stand-in for a data request: `true` for a short moment after mount (and whenever
 * `resetKey` changes). Replace it with the real loading flag when the data layer exists.
 */
export function useMockLoading(resetKey: unknown = null, delay = 350): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const id = window.setTimeout(() => setLoading(false), delay);
    return () => window.clearTimeout(id);
  }, [resetKey, delay]);

  return loading;
}

/** Object form used by pages that render loading / error / empty states. */
export function useMockStatus(resetKey: unknown = null) {
  const loading = useMockLoading(resetKey);
  return { status: (loading ? 'loading' : 'ready') as 'loading' | 'ready' | 'error', empty: false, retry: () => {} };
}
