import { useState } from 'react';
import { Link, Redirect, useLocation, useSearch } from 'wouter';
import { routes } from '@/config/routes';
import { useForm } from '@/hooks/use-form';
import { useT } from '@/i18n/use-i18n';
import { nextPath, withNext } from '@/lib/next-path';
import { validateLogin } from '@/lib/validation';
import { AuthCard, AuthField } from '@/pages/passenger/components/auth-card';
import { authService } from '@/services/authService';
import { AuthError, useAuth } from '@/store/authStore';
import { notify } from '@/store/notificationStore';

/** The one login page, in Tariq's card design. Admins land on /dashboard; travelers go back to ?next= or home. */
export default function Login() {
  const t = useT();
  const [, setLocation] = useLocation();
  const next = nextPath(useSearch());
  const { isLoggedIn } = useAuth();
  const form = useForm({ email: '', password: '' }, validateLogin);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoggedIn && !submitting) return <Redirect to={next ?? routes.home} />;

  // API calls live in src/services/authService.ts.
  const submit = form.handleSubmit(async ({ email, password }) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const user = await authService.login({ email, password });
      notify({ tone: 'success', titleKey: 'loginSuccessTitle', messageKey: 'loginSuccessMessage' });
      setLocation(user.role?.toUpperCase() === 'ADMIN' ? routes.admin.dashboard : next ?? routes.home);
    } catch (error) {
      setFormError(error instanceof AuthError ? t('errInvalidCredentials') : t('errorMessage'));
      setSubmitting(false);
    }
  });

  return (
    <AuthCard title={t('tpWelcomeHome')} subtitle={t('tpEnterDetails')}
      footer={<>{t('noAccount')} <Link href={withNext(routes.register, next)}>{t('tpSignUpHere')}</Link></>}>
      <form onSubmit={submit} noValidate className="login-form" data-testid="form-login">
        {formError && <p role="alert" className="auth-form-error">{formError}</p>}
        <AuthField id="login-email" label={t('email')} type="email" dir="ltr" autoComplete="email" value={form.values.email}
          error={form.errors.email && t(form.errors.email)} onChange={(event) => form.setValue('email', event.target.value)} onBlur={() => form.touch('email')} />
        <AuthField id="login-password" label={t('password')} type="password" dir="ltr" autoComplete="current-password" value={form.values.password}
          error={form.errors.password && t(form.errors.password)} onChange={(event) => form.setValue('password', event.target.value)} onBlur={() => form.touch('password')} />
        <button type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? t('pleaseWait') : t('login')}</button>
      </form>
    </AuthCard>
  );
}
