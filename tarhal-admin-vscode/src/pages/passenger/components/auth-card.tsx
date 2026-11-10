import type { InputHTMLAttributes, ReactNode } from 'react';
import { Link } from 'wouter';
import { routes } from '@/config/routes';
import Airplane1 from '../assets/Airplane1.webp';
import Tarhallogo from '../assets/Tarhallogo.webp';
import { PassengerShell } from './passenger-shell';
import { TravelerControls } from './traveler-controls';

/**
 * Tariq's login card (his Login.jsx / SignUp.jsx look): form on the left, his airplane panel on the right.
 * The site's real login and register forms go inside it. His logo links home; his settings gear holds language and theme.
 */
export function AuthCard({ title, subtitle, footer, children }: { title: string; subtitle: string; footer: ReactNode; children: ReactNode }) {
  return (
    <PassengerShell>
      <div className="login-page">
        <div className="auth-corner">
          <Link href={routes.passenger.home} className="auth-logo" aria-label="Tarhal"><img src={Tarhallogo} alt="Tarhal" /></Link>
          <div className="auth-controls"><TravelerControls /></div>
        </div>
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
    </PassengerShell>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string };

/** One of his rounded inputs. The placeholder is the visible label (his design); the label is also given to screen readers. */
export function AuthField({ id, label, error, ...input }: FieldProps) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} placeholder={label} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : undefined} {...input} />
      {error && <small id={`${id}-error`} className="auth-error" role="alert">{error}</small>}
    </div>
  );
}
