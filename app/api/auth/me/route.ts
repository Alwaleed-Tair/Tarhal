import { getCurrentUser } from '../../../../lib/auth.ts';
import { authError, authOptions, authResponse } from '../../../../lib/auth-http.ts';

export const OPTIONS = authOptions;

// GET /api/auth/me — the logged-in user { id, name, email, role }, or 401. Lets a page check the session cookie is still valid.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return authError('UNAUTHORIZED', 'Login required', 401);
    return authResponse({ success: true, user });
  } catch {
    return authError('AUTH_UNAVAILABLE', 'We could not check your session right now. Please try again later.', 503);
  }
}
