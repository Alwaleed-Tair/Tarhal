import { prisma } from '../../../../lib/prisma.ts';
import { hashPassword, verifyPassword } from '../../../../lib/passwords.ts';
import { authOptions, authResponse, jsonObject, validEmail } from '../../../../lib/auth-http.ts';

export const OPTIONS = authOptions;

export async function POST(request: Request) {
  const body = await jsonObject(request);
  if (!body || typeof body.password !== 'string' || !body.password.length || body.password.length > 128 ||
      (body.email === undefined
        ? typeof body.username !== 'string' || !body.username.trim() || body.username.length > 254
        : !validEmail(body.email) || body.username !== undefined)) {
    return authResponse({ success: false, error: 'Provide a username or email and a password' }, 400);
  }
  try {
    // Names are not unique; shared names must sign in using their unique email.
    const users = await prisma.user.findMany({
      where: body.email !== undefined ? { email: body.email as string } : { name: (body.username as string).trim() },
      take: 2,
    });
    const user = users.length === 1 ? users[0] : null;
    if (!user || !await verifyPassword(body.password, user.password)) {
      return authResponse({ success: false, error: 'Invalid credentials; use your email if your name is shared' }, 401);
    }
    if (!user.password.startsWith('scrypt$')) {
      const upgraded = await prisma.user.updateMany({
        where: { id: user.id, password: user.password },
        data: { password: await hashPassword(body.password) },
      });
      if (upgraded.count !== 1) return authResponse({ success: false, error: 'Credentials changed; sign in again' }, 401);
    }
    return authResponse({ success: true, message: 'Login successful!', user: { id: user.id, name: user.name } });
  } catch {
    return authResponse({ success: false, error: 'Failed to process login' }, 500);
  }
}
