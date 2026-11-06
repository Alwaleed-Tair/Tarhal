import { useState, type FormEvent } from 'react';
import type { FieldErrors } from '@/lib/validation';

/** Tiny controlled-form helper: errors appear after a field is blurred or the form is submitted. */
export function useForm<T extends Record<string, string | boolean>>(initial: T, validate: (values: T) => FieldErrors<T>) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const found = validate(values);
  const errors: FieldErrors<T> = {};
  (Object.keys(found) as (keyof T)[]).forEach((name) => {
    if (submitted || touched[name]) errors[name] = found[name];
  });

  return {
    values,
    errors,
    setValue: <K extends keyof T>(name: K, value: T[K]) => setValues((current) => ({ ...current, [name]: value }) as T),
    touch: (name: keyof T) => setTouched((current) => ({ ...current, [name]: true })),
    handleSubmit: (onValid: (values: T) => void) => (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitted(true);
      if (Object.keys(found).length === 0) onValid(values);
    },
  };
}
