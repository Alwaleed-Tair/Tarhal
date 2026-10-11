import { prisma } from '../../../../lib/prisma.ts';
import { authOptions, authResponse, authError, jsonObject } from '../../../../lib/auth-http.ts';
import { hashPassword, validNewPassword } from '../../../../lib/passwords.ts';
import { matchesPassword, readResetToken, resetSecret } from '../../../../lib/password-reset.ts';

export const OPTIONS = authOptions;

function invalidToken() {
  return authError('INVALID_RESET_TOKEN', 'This reset token is invalid, expired, or already used. Contact support to request a new token.', 400, 'token');
}

export async function POST(request: Request) {
  const body = await jsonObject(request);
  if (!body) return authError('INVALID_BODY', 'Send a valid JSON object with your reset token and new password.', 400);
  if (typeof body.token !== 'string' || !body.token.trim()) {
    return authError('RESET_TOKEN_REQUIRED', 'Enter the reset token provided by support.', 400, 'token');
  }
  if (!validNewPassword(body.newPassword)) {
    return authError('INVALID_NEW_PASSWORD', 'Choose a new password between 12 and 128 characters.', 400, 'newPassword');
  }
  let secret: string;
  try { secret = resetSecret(); } catch {
    return authError('RECOVERY_UNAVAILABLE', 'Password recovery is temporarily unavailable. Please try again later or contact your administrator.', 503);
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
    return authError('RESET_UNAVAILABLE', 'We could not update your password right now. Please try again later; if your token expires, request a new one from support.', 500);
  }
}
