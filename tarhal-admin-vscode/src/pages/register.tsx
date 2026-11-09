import { useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { FormField, PasswordInput } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { routes } from '@/config/routes';
import type { TranslationKey } from '@/i18n/translations';
import { useForm } from '@/hooks/use-form';
import { useT } from '@/i18n/use-i18n';
import { validateRegister } from '@/lib/validation';
import { authService } from '@/services/authService';
import { AuthError, useAuth } from '@/store/authStore';
import { notify } from '@/store/notificationStore';

export default function Register() {
  const t = useT();
  const [, setLocation] = useLocation();
  const { isLoggedIn } = useAuth();
  const form = useForm({ name: '', email: '', phone: '', dateOfBirth: '', password: '', confirmPassword: '', terms: false as boolean }, validateRegister);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoggedIn && !submitting) return <Redirect to={routes.home} />;

  // Which message to show for an API rejection: duplicate account, or the field the API said is invalid.
  const FIELD_MESSAGE: Record<string, TranslationKey> = { name: 'errNameRequired', email: 'errEmailInvalid', phone: 'errPhoneInvalid', password: 'errPasswordShort', dateOfBirth: 'errDobInvalid' };
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
      setLocation(routes.home);
    } catch (error) {
      setFormError(registerErrorMessage(error));
      setSubmitting(false);
    }
  });

  return (
    <AuthShell title={t('registerTitle')} subtitle={t('registerSubtitle')}
      footer={<>{t('haveAccount')} <Link href={routes.login} className="font-semibold text-primary hover:underline">{t('login')}</Link></>}>
      <form onSubmit={submit} noValidate className="grid gap-4" data-testid="form-register">
        {formError && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
        <FormField id="register-name" label={t('fullName')} error={form.errors.name && t(form.errors.name)}>
          {(field) => <Input {...field} autoComplete="name" value={form.values.name}
            onChange={(event) => form.setValue('name', event.target.value)} onBlur={() => form.touch('name')} />}
        </FormField>
        <FormField id="register-email" label={t('email')} error={form.errors.email && t(form.errors.email)}>
          {(field) => <Input {...field} type="email" dir="ltr" autoComplete="email" value={form.values.email}
            onChange={(event) => form.setValue('email', event.target.value)} onBlur={() => form.touch('email')} />}
        </FormField>
        <FormField id="register-phone" label={t('phone')} error={form.errors.phone && t(form.errors.phone)}>
          {(field) => <Input {...field} type="tel" dir="ltr" autoComplete="tel" value={form.values.phone}
            onChange={(event) => form.setValue('phone', event.target.value)} onBlur={() => form.touch('phone')} />}
        </FormField>
        <FormField id="register-dob" label={t('dateOfBirth')} error={form.errors.dateOfBirth && t(form.errors.dateOfBirth)}>
          {(field) => <Input {...field} type="date" dir="ltr" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={form.values.dateOfBirth}
            onChange={(event) => form.setValue('dateOfBirth', event.target.value)} onBlur={() => form.touch('dateOfBirth')} />}
        </FormField>
        <FormField id="register-password" label={t('password')} hint={t('passwordHint')} error={form.errors.password && t(form.errors.password)}>
          {(field) => <PasswordInput {...field} autoComplete="new-password" value={form.values.password}
            onChange={(value) => form.setValue('password', value)} onBlur={() => form.touch('password')} />}
        </FormField>
        <FormField id="register-confirm" label={t('confirmPassword')} error={form.errors.confirmPassword && t(form.errors.confirmPassword)}>
          {(field) => <PasswordInput {...field} autoComplete="new-password" value={form.values.confirmPassword}
            onChange={(value) => form.setValue('confirmPassword', value)} onBlur={() => form.touch('confirmPassword')} />}
        </FormField>
        <div className="grid gap-1.5">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
            <input type="checkbox" className="mt-0.5 size-4 accent-[hsl(var(--primary))]" checked={form.values.terms}
              aria-invalid={Boolean(form.errors.terms) || undefined} aria-describedby={form.errors.terms ? 'register-terms-error' : undefined}
              onChange={(event) => { form.setValue('terms', event.target.checked); form.touch('terms'); }} />
            <span>{t('acceptTerms')}</span>
          </label>
          {form.errors.terms && <p id="register-terms-error" role="alert" className="text-xs font-medium text-destructive">{t(form.errors.terms)}</p>}
        </div>
        <Button type="submit" loading={submitting} className="w-full">{submitting ? t('pleaseWait') : t('register')}</Button>
        <p className="text-center text-xs text-muted-foreground">{t('demoRegisterHint')}</p>
      </form>
    </AuthShell>
  );
}
