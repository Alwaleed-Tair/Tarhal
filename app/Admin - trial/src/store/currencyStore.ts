import { useSyncExternalStore } from 'react';

// FRONTEND MOCK. Every amount in the data is stored in USD; this store only decides how it is shown.
// INTEGRATION POINT: replace USD_TO_SAR with a rate from the backend (or a rates service) when one exists.

export type Currency = 'USD' | 'SAR';
export const CURRENCIES: Currency[] = ['USD', 'SAR'];
/** Mock exchange rate: 1 USD = 3.75 SAR (the real peg). */
export const USD_TO_SAR = 3.75;

const STORAGE_KEY = 'tarhal-currency';
const listeners = new Set<() => void>();

function load(): Currency {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'SAR' ? 'SAR' : 'USD';
  } catch {
    return 'USD';
  }
}

let current: Currency = load();

export function setCurrency(next: Currency) {
  current = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage can be unavailable; the choice still applies for this visit */ }
  listeners.forEach((listener) => listener());
}

/** Active display currency. Re-renders every component that formats money when it changes. */
export function useCurrency(): Currency {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => current,
    () => 'USD',
  );
}
