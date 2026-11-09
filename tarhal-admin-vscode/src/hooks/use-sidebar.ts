import { useSyncExternalStore } from 'react';

// Admin sidebar: open or collapsed to an icon rail. Each admin page mounts its own Layout, so the state
// lives outside React. Until the user chooses, tablets and small laptops start collapsed.
const STORAGE_KEY = 'tarhal-admin-sidebar';
const narrow = window.matchMedia('(max-width: 1120px)');
const listeners = new Set<() => void>();

function loadChoice(): boolean | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'collapsed' ? true : raw === 'open' ? false : null;
  } catch {
    return null;
  }
}

let choice = loadChoice();
const isCollapsed = () => choice ?? narrow.matches;

narrow.addEventListener('change', () => listeners.forEach((listener) => listener()));

export function toggleSidebar() {
  choice = !isCollapsed();
  try { localStorage.setItem(STORAGE_KEY, choice ? 'collapsed' : 'open'); } catch { /* storage can be unavailable; the choice still applies for this visit */ }
  listeners.forEach((listener) => listener());
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, isCollapsed);
}
