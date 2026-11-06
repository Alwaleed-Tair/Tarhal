import { api, httpStatus, pick, str, type Raw } from '@/services/api';
import { AuthError, logout as clearSession, mockLogin, mockRegister, saveSession, type AuthUser } from '@/store/authStore';

// INTEGRATION POINT [Mohammed]: confirm these two paths and the response shape (token + user).
const PATHS = { login: '/auth/login', register: '/auth/register' } as const;

/** Reads `{ data: { token, user } }`, `{ token, user }` or `{ token, name, email }` (field names are guesses). */
function readSession(body: Raw, fallback: AuthUser): { user: AuthUser; token?: string } {
  const d = ((body.data as Raw) ?? body) as Raw;
  const u = ((d.user as Raw) ?? d) as Raw;
  return {
    token: str(pick(d, 'token', 'accessToken', 'jwt')) || undefined,
    user: { name: str(pick(u, 'name', 'fullName', 'username')) || fallback.name, email: str(pick(u, 'email')) || fallback.email },
  };
}

/** True when there is no usable backend answer (offline, 404 wrong path, 5xx): we then use the demo login. */
const backendUnavailable = (error: unknown) => { const s = httpStatus(error); return s === undefined || s === 404 || s >= 500; };

export const authService = {
  /** Clears the local session right away, then asks the server to drop the cookie (POST /auth/logout). */
  async logout(): Promise<void> {
    clearSession();
    await api.post('/auth/logout').catch(() => undefined);
  },

  async login(input: { email: string; password: string }): Promise<AuthUser> {
    try {
      const { data } = await api.post<Raw>(PATHS.login, input);
      const { user, token } = readSession(data, { name: input.email.split('@')[0], email: input.email });
      saveSession(user, token);
      return user;
    } catch (error) {
      if (!backendUnavailable(error)) throw new AuthError('invalidCredentials'); // 400 / 401 / 403
      console.warn('[auth] backend unavailable, using demo login');
      return mockLogin(input.email);
    }
  },

  async register(input: { name: string; email: string; phone: string; dateOfBirth: string; password: string }): Promise<AuthUser> {
    try {
      const { data } = await api.post<Raw>(PATHS.register, input);
      const { user, token } = readSession(data, { name: input.name, email: input.email });
      saveSession(user, token);
      return user;
    } catch (error) {
      if (httpStatus(error) === 409) throw new AuthError('emailTaken');
      if (!backendUnavailable(error)) throw error; // 400 / 422: page shows the generic error
      console.warn('[auth] backend unavailable, using demo register');
      return mockRegister({ name: input.name, email: input.email });
    }
  },
};
