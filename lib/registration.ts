import { validEmail } from './auth-http.ts';
import { validNewPassword } from './passwords.ts';
export function registrationError(body: Record<string, unknown>, now = new Date()): string | null {
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(body.name)) return 'name';
  if (!validEmail(body.email)) return 'email';
  if (typeof body.phone !== 'string' || !/^\+?[0-9]{8,15}$/.test(body.phone)) return 'phone';
  if (!validNewPassword(body.password)) return 'password';
  if (typeof body.dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)) return 'dateOfBirth';
  const dob = new Date(body.dateOfBirth);
  if (!Number.isFinite(dob.getTime()) || dob.toISOString().slice(0, 10) !== body.dateOfBirth || dob > now || dob.getUTCFullYear() < 1900) return 'dateOfBirth';
  return null;
}
