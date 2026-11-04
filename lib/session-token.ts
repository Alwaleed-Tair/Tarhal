import { createHmac, timingSafeEqual } from 'node:crypto';
export const SESSION_COOKIE = 'tarhal_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('SESSION_SECRET must contain at least 32 bytes');
  return secret;
}
function sign(value: string, secret: string) { return createHmac('sha256', secret).update(value).digest('base64url'); }
export function issueSession(user: { id: string; password: string }, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(now / 1000) + SESSION_SECONDS, version: sign(user.password, secret) })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}
export function readSession(token: string, secret: string, now = Date.now()): { sub: string; exp: number; version: string } | null {
  try {
    if (token.length > 2048) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra !== undefined) return null;
    const expected = Buffer.from(sign(payload, secret)); const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.sub !== 'string' || !data.sub || !Number.isSafeInteger(data.exp) || data.exp <= Math.floor(now / 1000) || typeof data.version !== 'string') return null;
    return data;
  } catch { return null; }
}
export function sessionMatchesPassword(version: string, password: string, secret: string) {
  const a = Buffer.from(version), b = Buffer.from(sign(password, secret));
  return a.length === b.length && timingSafeEqual(a, b);
}
export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_SECONDS };
}
