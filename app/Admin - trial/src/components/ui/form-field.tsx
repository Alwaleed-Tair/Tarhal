import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { useT } from '@/i18n/use-i18n';

export type FieldProps = { id: string; 'aria-describedby'?: string; invalid: boolean };

/** Label + control + error/hint, with the ids wired up for screen readers. */
export function FormField({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: (field: FieldProps) => ReactNode }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

type PasswordInputProps = FieldProps & { value: string; onChange: (value: string) => void; onBlur: () => void; autoComplete: string };

export function PasswordInput({ invalid, value, onChange, onBlur, autoComplete, ...rest }: PasswordInputProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...rest} invalid={invalid} dir="ltr" type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value}
        onChange={(event) => onChange(event.target.value)} onBlur={onBlur} className="pe-11" />
      <button type="button" onClick={() => setVisible((current) => !current)} aria-pressed={visible}
        aria-label={visible ? t('hidePassword') : t('showPassword')}
        className="absolute end-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
