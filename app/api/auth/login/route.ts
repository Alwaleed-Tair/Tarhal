import { prisma } from '../../../../lib/prisma.ts';
import { hashPassword, verifyPassword } from '../../../../lib/passwords.ts';
import { authOptions, authResponse, authError, jsonObject, validEmail } from '../../../../lib/auth-http.ts';

export const OPTIONS = authOptions;

export async function POST(request: Request) {
  const body = await jsonObject(request);
  if (!body) return authError('INVALID_BODY', 'Send a valid JSON object with your sign-in details.', 400);
  if (body.email !== undefined && body.username !== undefined) {
    return authError('IDENTITY_CONFLICT', 'Enter either your email or your username, not both.', 400);
  }
  if (body.email !== undefined && !validEmail(body.email)) {
    return authError('INVALID_EMAIL', 'Enter a valid email address, such as name@example.com.', 400, 'email');
  }
  if (body.email === undefined && (typeof body.username !== 'string' || !body.username.trim() || body.username.length > 254)) {
    return authError('INVALID_USERNAME', 'Enter your username (up to 254 characters), or sign in with your email.', 400, 'username');
  }
  if (typeof body.password !== 'string' || !body.password.length || body.password.length > 128) {
    return authError('INVALID_PASSWORD', 'Enter your password (up to 128 characters).', 400, 'password');
  }
  try {
    // Names are not unique; shared names must sign in using their unique email.
    const users = await prisma.user.findMany({
      where: body.email !== undefined ? { email: body.email as string } : { name: (body.username as string).trim() },
      take: 2,
    });
    const user = users.length === 1 ? users[0] : null;
    if (!user || !await verifyPassword(body.password, user.password)) {
      return authError('INVALID_CREDENTIALS', 'We could not sign you in. Check your email or username and password. Try your email if your name is shared, or use password recovery.', 401);
    }
    if (!user.password.startsWith('scrypt$')) {
      const upgraded = await prisma.user.updateMany({
        where: { id: user.id, password: user.password },
        data: { password: await hashPassword(body.password) },
      });
      if (upgraded.count !== 1) return authError('CREDENTIALS_CHANGED', 'Your sign-in details changed during this request. Sign in again with your current password.', 401);
    }
    return authResponse({ success: true, message: 'Login successful!', user: { id: user.id, name: user.name } });
  } catch {
    return authError('LOGIN_UNAVAILABLE', 'We could not sign you in right now. Please try again later.', 500);
  }
}
