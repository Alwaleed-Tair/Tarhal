import { FrameHeader } from './frame-header';
import type { InputHTMLAttributes, ReactNode } from 'react';
import Airplane1 from '../assets/Airplane1.webp';
import { PassengerShell } from './passenger-shell';

/**
 * Tariq's login card (his Login.jsx / SignUp.jsx look): form on the left, his airplane panel on the right.
 * The site's real login and register forms go inside it. Above the card, a header row: the site logo (same file and size as on
 * the other pages) and only the language and theme switches (no account button or currency on these pages).
 */
export function AuthCard({ title, subtitle, footer, children }: { title: string; subtitle: string; footer: ReactNode; children: ReactNode }) {
  return (
    <PassengerShell>
      <div className="login-page tframe">
        <FrameHeader auth />
        <div className="tframe-content tframe-auth" data-frame="content">
        <div className="login-container">
          <div className="login-form-panel">
            <div className="login-form-inner">
              <span className="login-logo" role="img" aria-label="Tarhal">🐫</span>
              <h1>{title}</h1>
              <p className="login-subtitle">{subtitle}</p>
              {children}
              <p className="login-signup">{footer}</p>
            </div>
          </div>
          <div className="login-image-panel" aria-hidden="true">
            <img className="login-airplane-img" src={Airplane1} alt="" />
          </div>
        </div>
        </div>
      </div>
    </PassengerShell>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; hint?: string };

/**
 * One of his rounded inputs. The placeholder is the visible label (his design); the label is also given to screen readers.
 * A date input cannot show a placeholder, so its label is shown above it. `hint` is a short note under the field.
 */
export function AuthField({ id, label, error, hint, ...input }: FieldProps) {
  const described = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="auth-field">
      <label htmlFor={id} className={input.type === 'date' ? 'auth-label' : 'sr-only'}>{label}</label>
      <input id={id} placeholder={label} aria-invalid={Boolean(error) || undefined} aria-describedby={described} {...input} />
      {hint && !error && <small id={`${id}-hint`} className="auth-hint">{hint}</small>}
      {error && <small id={`${id}-error`} className="auth-error" role="alert">{error}</small>}
    </div>
  );
}
