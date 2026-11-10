import { useState } from 'react';
import { Link, Redirect, useLocation, useSearch } from 'wouter';
import { routes } from '@/config/routes';
import type { TranslationKey } from '@/i18n/translations';
import { useForm } from '@/hooks/use-form';
import { useT } from '@/i18n/use-i18n';
import { nextPath, withNext } from '@/lib/next-path';
import { validateRegister } from '@/lib/validation';
import { AuthCard, AuthField } from '@/pages/passenger/components/auth-card';
import { authService } from '@/services/authService';
import { AuthError, useAuth } from '@/store/authStore';
import { notify } from '@/store/notificationStore';

export default function Register() {
  const t = useT();
  const [, setLocation] = useLocation();
  const next = nextPath(useSearch());
  const { isLoggedIn } = useAuth();
  const form = useForm({ name: '', email: '', phone: '', dateOfBirth: '', password: '', confirmPassword: '', terms: false as boolean }, validateRegister);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoggedIn && !submitting) return <Redirect to={next ?? routes.home} />;

  // Which message to show for an API rejection: duplicate account, or the field the API said is invalid.
  const FIELD_MESSAGE: Record<string, TranslationKey> = { name: 'errNameRequired', email: 'errEmailInvalid', phone: 'errPhoneInvalid', password: 'errPasswordShort', dateOfBirth: 'errDobInvalid', underage: 'errUnder21' };
  const registerErrorMessage = (error: unknown) => {
    if (error instanceof AuthError && error.code === 'emailTaken') return t('errEmailTaken');
    if (error instanceof AuthError && error.code === 'invalidField' && error.field && FIELD_MESSAGE[error.field]) return t(FIELD_MESSAGE[error.field]);
    return t('errorMessage');
  };

  // API calls live in src/services/authService.ts (paths + response shape: ask Mohammed).
  const submit = form.handleSubmit(async ({ name, email, phone, dateOfBirth, password }) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await authService.register({ name: name.trim(), email, phone: phone.trim(), dateOfBirth, password });
      notify({ tone: 'success', titleKey: 'registerSuccessTitle', messageKey: 'registerSuccessMessage' });
      // New accounts are travelers: back to the page that asked them to log in (e.g. the seat they picked), or home.
      setLocation(next ?? routes.home);
    } catch (error) {
      setFormError(registerErrorMessage(error));
      setSubmitting(false);
    }
  });

  return (
    <AuthCard title={t('tpCreateAccount')} subtitle={t('tpEnterDetails')}
      footer={<>{t('haveAccount')} <Link href={withNext(routes.login, next)}>{t('tpLogInHere')}</Link></>}>
      <form onSubmit={submit} noValidate className="login-form" data-testid="form-register">
        {formError && <p role="alert" className="auth-form-error">{formError}</p>}
        <AuthField id="register-name" label={t('fullName')} autoComplete="name" value={form.values.name} error={form.errors.name && t(form.errors.name)}
          onChange={(event) => form.setValue('name', event.target.value)} onBlur={() => form.touch('name')} />
        <AuthField id="register-email" label={t('email')} type="email" dir="ltr" autoComplete="email" value={form.values.email} error={form.errors.email && t(form.errors.email)}
          onChange={(event) => form.setValue('email', event.target.value)} onBlur={() => form.touch('email')} />
        <AuthField id="register-phone" label={t('phone')} type="tel" dir="ltr" autoComplete="tel" value={form.values.phone} error={form.errors.phone && t(form.errors.phone)}
          onChange={(event) => form.setValue('phone', event.target.value)} onBlur={() => form.touch('phone')} />
        <AuthField id="register-dob" label={t('dateOfBirth')} hint={t('registerAgeHint')} type="date" dir="ltr" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={form.values.dateOfBirth}
          error={form.errors.dateOfBirth && t(form.errors.dateOfBirth)} onChange={(event) => form.setValue('dateOfBirth', event.target.value)} onBlur={() => form.touch('dateOfBirth')} />
        <AuthField id="register-password" label={t('password')} type="password" dir="ltr" autoComplete="new-password" value={form.values.password}
          error={form.errors.password ? t(form.errors.password) : undefined} onChange={(event) => form.setValue('password', event.target.value)} onBlur={() => form.touch('password')} />
        <AuthField id="register-confirm" label={t('confirmPassword')} type="password" dir="ltr" autoComplete="new-password" value={form.values.confirmPassword}
          error={form.errors.confirmPassword && t(form.errors.confirmPassword)} onChange={(event) => form.setValue('confirmPassword', event.target.value)} onBlur={() => form.touch('confirmPassword')} />
        <label className="auth-terms">
          <input type="checkbox" checked={form.values.terms} aria-invalid={Boolean(form.errors.terms) || undefined} aria-describedby={form.errors.terms ? 'register-terms-error' : undefined}
            onChange={(event) => { form.setValue('terms', event.target.checked); form.touch('terms'); }} />
          <span>{t('acceptTerms')}</span>
        </label>
        {form.errors.terms && <small id="register-terms-error" role="alert" className="auth-error">{t(form.errors.terms)}</small>}
        <button type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? t('pleaseWait') : t('tpSignUp')}</button>
      </form>
    </AuthCard>
  );
}
