import { cookies } from 'next/headers.js';
import { prisma } from './prisma.ts';
import { SESSION_COOKIE, readSession, sessionSecret, sessionMatchesPassword } from './session-token.ts';
export async function getCurrentUser(request?: { cookies: { get(name: string): { value: string } | undefined } }) {
  const token = (request?.cookies ?? await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = sessionSecret();
  const payload = readSession(token, secret);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !sessionMatchesPassword(payload.version, user.password, secret)) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
