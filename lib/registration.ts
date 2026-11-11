import { validEmail } from './auth-http.ts';
import { validNewPassword } from './passwords.ts';

/** The person who creates an account must be at least this old. Travelers inside a booking (children too) can be any age. */
export const MIN_ACCOUNT_AGE = 21;

/** Full years between a "YYYY-MM-DD" birth date and `now` (the calendar day in Riyadh, UTC+3). */
export function ageOn(dateOfBirth: string, now = new Date()): number {
  const today = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Old enough to hold an account (21 on the birthday itself counts). */
export const oldEnoughForAccount = (dateOfBirth: string, now = new Date()) => ageOn(dateOfBirth, now) >= MIN_ACCOUNT_AGE;

/** The first invalid field, "underage" when the person is younger than 21, or null when the body is fine. */
export function registrationError(body: Record<string, unknown>, now = new Date()): string | null {
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(body.name)) return 'name';
  if (!validEmail(body.email)) return 'email';
  if (typeof body.phone !== 'string' || !/^\+?[0-9]{8,15}$/.test(body.phone)) return 'phone';
  if (!validNewPassword(body.password)) return 'password';
  if (typeof body.dateOfBirth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)) return 'dateOfBirth';
  const dob = new Date(body.dateOfBirth);
  if (!Number.isFinite(dob.getTime()) || dob.toISOString().slice(0, 10) !== body.dateOfBirth || dob > now || dob.getUTCFullYear() < 1900) return 'dateOfBirth';
  if (!oldEnoughForAccount(body.dateOfBirth, now)) return 'underage';
  return null;
}
