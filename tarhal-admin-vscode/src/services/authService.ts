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
    user: { name: str(pick(u, 'name', 'fullName', 'username')) || fallback.name, email: str(pick(u, 'email')) || fallback.email, role: str(pick(u, 'role')) || undefined },
  };
}

/** Local development only: no usable backend answer (offline, 404 wrong path, 5xx) falls back to the demo login. Never in a production build. */
const useDemoAuth = (error: unknown) => { const s = httpStatus(error); return import.meta.env.DEV && (s === undefined || s === 404 || s >= 500); };
/** The server looked at the sign-in details and refused them. Anything else is not the visitor's mistake. */
const credentialsRefused = (error: unknown) => { const s = httpStatus(error); return s === 400 || s === 401 || s === 403; };

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
      if (credentialsRefused(error)) throw new AuthError('invalidCredentials');
      if (!useDemoAuth(error)) throw error; // The page shows the generic error.
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
      if (!useDemoAuth(error)) throw error; // 400 / 422: page shows the generic error
      return mockRegister({ name: input.name, email: input.email });
    }
  },
};
