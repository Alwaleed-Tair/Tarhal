import { authResponse, authOptions, rejectCrossOrigin } from '../../../../lib/auth-http.ts';
import { SESSION_COOKIE, sessionCookieOptions } from '../../../../lib/session-token.ts';
export const OPTIONS = authOptions;
export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request); if (denied) return denied;
  const response = authResponse({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
