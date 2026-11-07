import { useSyncExternalStore } from 'react';

// FRONTEND MOCK. There is no server: "logging in" only stores { name, email } in localStorage.
// Replace mockLogin / mockRegister with real API calls when the backend exists.
// Demo triggers: error@tarhal.com fails to log in, taken@tarhal.com fails to register.

export type AuthUser = { name: string; email: string };
export type AuthErrorCode = 'invalidCredentials' | 'emailTaken' | 'invalidField';

export class AuthError extends Error {
  code: AuthErrorCode;
  /** For 'invalidField': which form field the API rejected (name, email, phone, password, dateOfBirth). */
  field?: string;
  constructor(code: AuthErrorCode, field?: string) {
    super(code);
    this.code = code;
    this.field = field;
  }
}

const STORAGE_KEY = 'tarhal-auth';
const NETWORK_DELAY_MS = 700;
const listeners = new Set<() => void>();

function load(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

let currentUser: AuthUser | null = load();

function setUser(next: AuthUser | null) {
  currentUser = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage can be unavailable (private mode); the in-memory session still works */
  }
  listeners.forEach((listener) => listener());
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** "omar.faraj@tarhal.com" becomes "Omar Faraj". */
function nameFromEmail(email: string): string {
  return email.split('@')[0].split(/[._-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

// TODO / INTEGRATION POINT
// INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
export async function mockLogin(email: string): Promise<AuthUser> {
  await wait(NETWORK_DELAY_MS);
  const address = email.trim().toLowerCase();
  if (address === 'error@tarhal.com') throw new AuthError('invalidCredentials');
  const user = { name: nameFromEmail(address), email: address };
  setUser(user);
  return user;
}

// TODO / INTEGRATION POINT
// INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
export async function mockRegister(input: { name: string; email: string }): Promise<AuthUser> {
  await wait(NETWORK_DELAY_MS);
  const address = input.email.trim().toLowerCase();
  if (address === 'taken@tarhal.com') throw new AuthError('emailTaken');
  const user = { name: input.name.trim(), email: address };
  setUser(user);
  return user;
}

/** Used by authService after a real login/register: stores the user and (if any) the Bearer token. */
export function saveSession(user: AuthUser, token?: string) {
  setUser(user);
  try {
    if (token) localStorage.setItem('token', token);
  } catch { /* storage unavailable */ }
}

export function logout() {
  setUser(null);
  try { localStorage.removeItem('token'); } catch { /* storage unavailable */ }
}

export function useAuth() {
  const user = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => currentUser,
  );
  return { user, isLoggedIn: user !== null };
}
