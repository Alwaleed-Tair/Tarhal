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

export function validateRegister(values: RegisterValues): FieldErrors<RegisterValues> {
  return compact<RegisterValues>({
    name: values.name.trim().length >= 2 && values.name.trim().length <= 100 ? undefined : 'errNameRequired',
    email: emailError(values.email),
    // Spaces and dashes are allowed while typing; the API wants an optional + and 8-15 digits (see authService.register).
    phone: /^\+?[0-9]{8,15}$/.test(values.phone.replace(/[\s-]/g, '')) ? undefined : 'errPhoneInvalid',
    dateOfBirth: values.dateOfBirth >= '1900-01-01' && values.dateOfBirth <= new Date().toISOString().slice(0, 10) ? undefined : 'errDobInvalid',
    password: passwordError(values.password),
    confirmPassword: values.confirmPassword === values.password ? undefined : 'errConfirmMismatch',
    terms: values.terms ? undefined : 'errTermsRequired',
  });
}
