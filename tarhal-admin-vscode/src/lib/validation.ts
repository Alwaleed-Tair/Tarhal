import type { TranslationKey } from '@/i18n/translations';

/** Validators return translation keys, so messages follow the active language. */
export type FieldErrors<T> = Partial<Record<keyof T, TranslationKey>>;

export type LoginValues = { email: string; password: string };
export type RegisterValues = {
  phone: string;
  dateOfBirth: string; name: string; email: string; password: string; confirmPassword: string; terms: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function emailError(value: string): TranslationKey | undefined {
  const email = value.trim();
  if (!email) return 'errEmailRequired';
  return EMAIL_PATTERN.test(email) ? undefined : 'errEmailInvalid';
}

function passwordError(value: string): TranslationKey | undefined {
  if (!value) return 'errPasswordRequired';
  // The API accepts 12-128 characters (docs/api-documentation.md, POST /api/auth/register).
  if (value.length < 12) return 'errPasswordShort';
  return /[A-Za-z؀-ۿ]/.test(value) && /\d/.test(value) ? undefined : 'errPasswordWeak';
}

/** Drops fields without an error. */
function compact<T>(errors: FieldErrors<T>): FieldErrors<T> {
  const result: FieldErrors<T> = {};
  (Object.keys(errors) as (keyof T)[]).forEach((name) => { if (errors[name]) result[name] = errors[name]; });
  return result;
}

export function validateLogin(values: LoginValues): FieldErrors<LoginValues> {
  return compact<LoginValues>({
    email: emailError(values.email),
    password: values.password ? undefined : 'errPasswordRequired',
  });
}

/** Full years on today's Riyadh calendar day, as the server counts them (lib/registration.ts). */
function ageToday(dateOfBirth: string): number {
  const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export function validateRegister(values: RegisterValues): FieldErrors<RegisterValues> {
  return compact<RegisterValues>({
    name: values.name.trim().length >= 2 && values.name.trim().length <= 100 ? undefined : 'errNameRequired',
    email: emailError(values.email),
    // Spaces and dashes are allowed while typing; the API wants an optional + and 8-15 digits (see authService.register).
    phone: /^\+?[0-9]{8,15}$/.test(values.phone.replace(/[\s-]/g, '')) ? undefined : 'errPhoneInvalid',
    // The account holder must be 21 or older (the server checks it too). Travelers in a booking can be any age.
    dateOfBirth: !(values.dateOfBirth >= '1900-01-01' && values.dateOfBirth <= new Date().toISOString().slice(0, 10)) ? 'errDobInvalid' : ageToday(values.dateOfBirth) < 21 ? 'errUnder21' : undefined,
    password: passwordError(values.password),
    confirmPassword: values.confirmPassword === values.password ? undefined : 'errConfirmMismatch',
    terms: values.terms ? undefined : 'errTermsRequired',
  });
}
