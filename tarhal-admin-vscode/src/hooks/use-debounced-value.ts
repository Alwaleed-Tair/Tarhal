import { useEffect, useState } from 'react';

/** `value`, after it has stayed the same for `delay` milliseconds. */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
