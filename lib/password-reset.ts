import { createHmac, timingSafeEqual } from 'node:crypto';

type ResetPayload = { sub: string; exp: number; version: string };
const TTL_SECONDS = 15 * 60;

export function resetSecret(): string {
  const secret = process.env.PASSWORD_RESET_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error('Password recovery is not configured');
  return secret;
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Bind tokens to the existing password, so a change invalidates all outstanding tokens.
export function passwordVersion(password: string, secret: string): string {
  return sign(`password-version:${password}`, secret);
}

export function issueResetToken(user: { id: string; password: string }, secret: string, now = Date.now()): string {
  const payload: ResetPayload = {
    sub: user.id, exp: Math.floor(now / 1000) + TTL_SECONDS,
    version: passwordVersion(user.password, secret),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(`reset:${encoded}`, secret)}`;
}

export function readResetToken(token: string, secret: string, now = Date.now()): ResetPayload | null {
  if (token.length > 2048) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra !== undefined || !equal(sign(`reset:${encoded}`, secret), signature)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const seconds = Math.floor(now / 1000);
    if (typeof payload.sub !== 'string' || !payload.sub ||
        typeof payload.version !== 'string' || !Number.isSafeInteger(payload.exp) ||
        payload.exp <= seconds || payload.exp > seconds + TTL_SECONDS) return null;
    return payload;
  } catch { return null; }
}

export function matchesPassword(payload: ResetPayload, password: string, secret: string): boolean {
  return equal(payload.version, passwordVersion(password, secret));
}
