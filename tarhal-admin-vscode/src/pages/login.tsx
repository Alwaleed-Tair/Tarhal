import { useState } from 'react';
import { Link, Redirect, useLocation, useSearch } from 'wouter';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { FormField, PasswordInput } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { routes } from '@/config/routes';
import { useForm } from '@/hooks/use-form';
import { useT } from '@/i18n/use-i18n';
import { validateLogin } from '@/lib/validation';
import { authService } from '@/services/authService';
import { AuthError, useAuth } from '@/store/authStore';
import { notify } from '@/store/notificationStore';

/** Where to go back after logging in (?next=/travel/flights). Only a path inside this site, never another address. */
function nextPath(search: string): string | null {
  const next = new URLSearchParams(search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
}

export default function Login() {
  const t = useT();
  const [, setLocation] = useLocation();
  const next = nextPath(useSearch());
  const { isLoggedIn } = useAuth();
  const form = useForm({ email: '', password: '' }, validateLogin);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoggedIn && !submitting) return <Redirect to={next ?? routes.home} />;

  // API calls live in src/services/authService.ts (paths + response shape: ask Mohammed).
  const submit = form.handleSubmit(async ({ email, password }) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const user = await authService.login({ email, password });
      notify({ tone: 'success', titleKey: 'loginSuccessTitle', messageKey: 'loginSuccessMessage' });
      // Admins always land on the Dashboard; travelers go back to the page that asked them to log in, or home.
      setLocation(user.role?.toUpperCase() === 'ADMIN' ? routes.admin.dashboard : next ?? routes.home);
    } catch (error) {
      setFormError(error instanceof AuthError ? t('errInvalidCredentials') : t('errorMessage'));
      setSubmitting(false);
    }
  });

  return (
    <AuthShell title={t('loginTitle')} subtitle={t('loginSubtitle')}
      footer={<>{t('noAccount')} <Link href={routes.register} className="font-semibold text-primary hover:underline">{t('register')}</Link></>}>
      <form onSubmit={submit} noValidate className="grid gap-4" data-testid="form-login">
        {formError && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
        <FormField id="login-email" label={t('email')} error={form.errors.email && t(form.errors.email)}>
          {(field) => <Input {...field} type="email" dir="ltr" autoComplete="email" value={form.values.email}
            onChange={(event) => form.setValue('email', event.target.value)} onBlur={() => form.touch('email')} />}
        </FormField>
        <FormField id="login-password" label={t('password')} error={form.errors.password && t(form.errors.password)}>
          {(field) => <PasswordInput {...field} autoComplete="current-password" value={form.values.password}
            onChange={(value) => form.setValue('password', value)} onBlur={() => form.touch('password')} />}
        </FormField>
        <Button type="submit" loading={submitting} className="w-full">{submitting ? t('pleaseWait') : t('login')}</Button>
        {import.meta.env.DEV && <p className="text-center text-xs text-muted-foreground">{t('demoLoginHint')}</p>}
      </form>
    </AuthShell>
  );
}
