import type { KeyboardEvent, ReactNode } from 'react';
import { Search } from 'lucide-react';

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Accessibility wiring for an attached suggestions list (set by SuggestSearch). */
  listboxId?: string;
  expanded?: boolean;
  activeDescendant?: string;
  /** Optional dropdown (suggestions) rendered under the field. */
  children?: ReactNode;
};

/** Page-level search box with the magnifier inside the field, same look as the top bar search. */
export function SearchField({ value, onChange, placeholder, testId, onFocus, onBlur, onKeyDown, listboxId, expanded, activeDescendant, children }: SearchFieldProps) {
  const combobox = listboxId ? { role: 'combobox' as const, 'aria-autocomplete': 'list' as const, 'aria-expanded': Boolean(expanded), 'aria-controls': listboxId, 'aria-activedescendant': activeDescendant } : {};
  return (
    <div className="page-search-wrap">
      <label className="global-search page-search">
        <Search size={15} aria-hidden="true" />
        <input type="search" value={value} onChange={(event) => onChange(event.target.value)} onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown}
          placeholder={placeholder} aria-label={placeholder} data-testid={testId} autoComplete="off" {...combobox} />
      </label>
      {children}
    </div>
  );
}
