import { authOptions, authResponse, authError, jsonObject, validEmail } from '../../../../lib/auth-http.ts';
import { resetSecret } from '../../../../lib/password-reset.ts';

export const OPTIONS = authOptions;

export async function POST(request: Request) {
  const body = await jsonObject(request);
  if (!body) return authError('INVALID_BODY', 'Send a valid JSON object with your email address.', 400);
  if (!validEmail(body.email)) {
    return authError('INVALID_EMAIL', 'Enter a valid email address, such as name@example.com.', 400, 'email');
  }
  const supportEmail = process.env.PASSWORD_RESET_SUPPORT_EMAIL;
  try { resetSecret(); } catch {
    return authError('RECOVERY_UNAVAILABLE', 'Password recovery is temporarily unavailable. Please try again later or contact your administrator.', 503);
  }
  if (!validEmail(supportEmail)) {
    return authError('RECOVERY_UNAVAILABLE', 'Password recovery is temporarily unavailable. Please try again later or contact your administrator.', 503);
  }
  // No mail service in this MVP. Do not claim mail was sent or disclose account existence.
  return authResponse({
    success: true, mode: 'support-assisted', supportEmail,
    message: 'Contact support from your registered email. After identity verification, support can provide a temporary reset token. No email has been sent automatically.',
  });
}
