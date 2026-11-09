import { useSyncExternalStore } from 'react';
import type { Language } from '@/i18n/translations';
import { bookings as initialBookings, users as initialUsers } from '@/data/demoData';

type Settings = { language: Language; theme: 'light' | 'dark'; largerText: boolean; highContrast: boolean };
type DemoState = { settings: Settings; bookings: typeof initialBookings; users: typeof initialUsers };
const key = 'tarhal-demo-state-v3'; // bumped: the demo users and bookings changed
const OLD_KEY = 'tarhal-demo-state-v2';
const fallback: DemoState = { settings: { language: 'en', theme: 'light', largerText: false, highContrast: false }, bookings: initialBookings, users: initialUsers };
// INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
// Seed state for bookings; users belong to Mohammed's APIs. Replace with fetched data + mutations.
let state: DemoState = (() => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
    // Keep language and theme from the old key, but not its old demo rows.
    const old = localStorage.getItem(OLD_KEY);
    return old ? { ...fallback, settings: { ...fallback.settings, ...JSON.parse(old).settings } } : fallback;
  } catch { return fallback; }
})();
const listeners = new Set<() => void>();
const emit = () => { localStorage.setItem(key, JSON.stringify(state)); listeners.forEach((listener) => listener()); };
export function useDemoState() { return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state, () => fallback); }
export function updateSettings(patch: Partial<Settings>) { state = { ...state, settings: { ...state.settings, ...patch } }; emit(); }
export function updateBooking(id: string, status: (typeof initialBookings)[number]['status']) { state = { ...state, bookings: state.bookings.map((item) => item.id === id ? { ...item, status } : item) }; emit(); }
export function updateUser(id: string, status: (typeof initialUsers)[number]['status']) { state = { ...state, users: state.users.map((item) => item.id === id ? { ...item, status } : item) }; emit(); }

/** Senior Accessibility Mode = large text + high contrast, switched together. */
export function setSeniorMode(enabled: boolean) { updateSettings({ largerText: enabled, highContrast: enabled }); }
