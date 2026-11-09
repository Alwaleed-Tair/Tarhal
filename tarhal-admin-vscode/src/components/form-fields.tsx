import { useId, type ReactNode } from 'react';

type FieldProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  testId?: string;
  disabled?: boolean;
};

const Label = ({ label, required }: { label: ReactNode; required: boolean }) => <span>{label}{required && ' *'}</span>;

/** One labelled input of the admin forms. A message under the field is tied to it for screen readers. */
export function Field({ label, value, onChange, type = 'text', min, step, inputMode, list, maxLength, hint, required = false, ltr = false, error, testId, disabled }: FieldProps & { type?: string; min?: string; step?: string; inputMode?: 'decimal' | 'numeric'; list?: string; maxLength?: number; hint?: string; ltr?: boolean }) {
  const id = useId();
  const noteId = error || hint ? `${id}-note` : undefined;
  return (
    <label className="modal-field">
      <Label label={label} required={required} />
      <input className="input-control" type={type} min={min} step={step} inputMode={inputMode} list={list} maxLength={maxLength} data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={noteId} dir={ltr ? 'ltr' : undefined} disabled={disabled} />
      {error ? <small id={noteId} className="field-error" role="alert">{error}</small> : hint ? <small id={noteId} className="field-hint">{hint}</small> : null}
    </label>
  );
}

/** One labelled dropdown of the admin forms. `placeholder` adds an empty first choice. */
export function SelectField({ label, value, onChange, options, getLabel, placeholder, required = false, error, testId, disabled }: FieldProps & { options: string[]; getLabel: (value: string) => string; placeholder?: string }) {
  const id = useId();
  const noteId = error ? `${id}-note` : undefined;
  return (
    <label className="modal-field">
      <Label label={label} required={required} />
      <select className="select-control" value={value} onChange={(event) => onChange(event.target.value)} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={noteId} data-testid={testId} disabled={disabled}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option} value={option}>{getLabel(option)}</option>)}
      </select>
      {error && <small id={noteId} className="field-error" role="alert">{error}</small>}
    </label>
  );
}
