import { useId, type ReactNode } from 'react';
import { Dropdown } from '@/components/dropdown';

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
export function Field({ label, value, onChange, type = 'text', inputMode, list, maxLength, placeholder, hint, required = false, ltr = false, error, testId, disabled }: FieldProps & { type?: string; inputMode?: 'decimal' | 'numeric'; list?: string; maxLength?: number; placeholder?: string; hint?: string; ltr?: boolean }) {
  const id = useId();
  const noteId = error || hint ? `${id}-note` : undefined;
  return (
    <label className="modal-field">
      <Label label={label} required={required} />
      <input className="input-control" type={type} inputMode={inputMode} list={list} maxLength={maxLength} placeholder={placeholder} data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={noteId} dir={ltr ? 'ltr' : undefined} disabled={disabled} />
      {error ? <small id={noteId} className="field-error" role="alert">{error}</small> : hint ? <small id={noteId} className="field-hint">{hint}</small> : null}
    </label>
  );
}

/**
 * One labelled dropdown of the admin forms, in the look of the fields next to it and the currency control's menu
 * (components/dropdown.tsx). `placeholder` adds an empty first choice.
 */
export function SelectField({ label, value, onChange, options, getLabel, placeholder, required = false, error, testId, disabled }: FieldProps & { options: string[]; getLabel: (value: string) => string; placeholder?: string }) {
  const id = useId();
  const labelId = `${id}-label`;
  const noteId = error ? `${id}-note` : undefined;
  const choices = [...(placeholder !== undefined ? [{ value: '', label: placeholder }] : []), ...options.map((option) => ({ value: option, label: getLabel(option) }))];
  return (
    <div className="modal-field">
      <span id={labelId}><Label label={label} required={required} /></span>
      <Dropdown variant="field" labelledBy={labelId} label={typeof label === 'string' ? label : ''} value={value} onChange={onChange} options={choices.map((o) => ({ ...o, text: o.label }))}
        invalid={Boolean(error)} describedBy={noteId} testId={testId} disabled={disabled} />
      {error && <small id={noteId} className="field-error" role="alert">{error}</small>}
    </div>
  );
}
