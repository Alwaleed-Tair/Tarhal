import { authOptions, authResponse, jsonObject, validEmail } from '../../../../lib/auth-http.ts';
import { resetSecret } from '../../../../lib/password-reset.ts';

export const OPTIONS = authOptions;

export async function POST(request: Request) {
  const body = await jsonObject(request);
  if (!body || !validEmail(body.email)) {
    return authResponse({ success: false, error: 'Provide a valid email address' }, 400);
  }
  const supportEmail = process.env.PASSWORD_RESET_SUPPORT_EMAIL;
  try { resetSecret(); } catch {
    return authResponse({ success: false, error: 'Password recovery is not configured' }, 503);
  }
  if (!validEmail(supportEmail)) {
    return authResponse({ success: false, error: 'Password recovery is not configured' }, 503);
  }
  // No mail service in this MVP. Do not claim mail was sent or disclose account existence.
  return authResponse({
    success: true, mode: 'support-assisted', supportEmail,
    message: 'Contact support from your registered email. After identity verification, support can provide a temporary reset token. No email has been sent automatically.',
  });
}
