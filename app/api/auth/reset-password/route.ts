import { prisma } from '../../../../lib/prisma.ts';
import { authOptions, authResponse, jsonObject } from '../../../../lib/auth-http.ts';
import { hashPassword, validNewPassword } from '../../../../lib/passwords.ts';
import { matchesPassword, readResetToken, resetSecret } from '../../../../lib/password-reset.ts';

export const OPTIONS = authOptions;

function invalidToken() {
  return authResponse({ success: false, error: 'Reset token is invalid, expired, or already used' }, 400);
}

export async function POST(request: Request) {
  const body = await jsonObject(request);
  if (!body || typeof body.token !== 'string' || !body.token || !validNewPassword(body.newPassword)) {
    return authResponse({ success: false, error: 'Provide a reset token and a new password of 12–128 characters' }, 400);
  }
  let secret: string;
  try { secret = resetSecret(); } catch {
    return authResponse({ success: false, error: 'Password recovery is not configured' }, 503);
  }
  const payload = readResetToken(body.token, secret);
  if (!payload) return invalidToken();
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !matchesPassword(payload, user.password, secret)) return invalidToken();
    const password = await hashPassword(body.newPassword);
    if (!readResetToken(body.token, secret)) return invalidToken();
    // Compare-and-set makes a reset single-use even when two requests arrive together.
    const result = await prisma.user.updateMany({
      where: { id: user.id, password: user.password }, data: { password },
    });
    if (result.count !== 1) return invalidToken();
    return authResponse({ success: true, message: 'Password updated. Sign in with your new password.' });
  } catch {
    return authResponse({ success: false, error: 'Unable to reset password' }, 500);
  }
}
