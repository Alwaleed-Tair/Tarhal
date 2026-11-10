/** Where to go back after logging in or registering (?next=/travel/flights). Only a path inside this site, never another address. */
export function nextPath(search: string): string | null {
  const next = new URLSearchParams(search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
}

/** Adds the same ?next= to a link, so it survives going from login to register and back. */
export const withNext = (path: string, next: string | null) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);
