import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { SearchField } from '@/components/search-field';
import { useT } from '@/i18n/use-i18n';

type SuggestSearchProps<T> = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
  /** This page's own rows that match the current search (and the page's filters). Nothing from other pages. */
  matches: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Text put in the search box when a suggestion is chosen (the table then narrows to it). */
  pickValue: (item: T) => string;
  limit?: number;
};

/**
 * Page search with auto-suggest, scoped to the data of the page that renders it.
 * Mouse: click a suggestion. Keyboard: arrows to move, Enter to choose, Esc to close.
 */
export function SuggestSearch<T>({ value, onChange, placeholder, testId, matches, getKey, renderItem, pickValue, limit = 6 }: SuggestSearchProps<T>) {
  const t = useT();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const hasText = value.trim().length > 0;
  const shown = hasText ? matches.slice(0, limit) : [];
  const expanded = open && hasText;

  useEffect(() => { setActive(-1); }, [value]);

  const pick = (item: T) => { onChange(pickValue(item)); setOpen(false); };

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') return setOpen(false);
    if (shown.length === 0) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => (i + 1) % shown.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => (i <= 0 ? shown.length - 1 : i - 1)); }
    else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); pick(shown[active]); }
  }

  return (
    <SearchField value={value} onChange={(next) => { onChange(next); setOpen(true); }} placeholder={placeholder} testId={testId}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown}
      listboxId={listId} expanded={expanded} activeDescendant={active >= 0 ? `${listId}-${active}` : undefined}>
      {expanded && (
        <div className="search-suggestions" id={listId} role="listbox">
          {shown.length === 0
            ? <span className="search-suggestion-empty">{t('noResults')}</span>
            : shown.map((item, index) => (
              <button key={getKey(item)} id={`${listId}-${index}`} type="button" role="option" aria-selected={index === active}
                className={`search-suggestion${index === active ? ' active' : ''}`}
                onMouseDown={(event) => { event.preventDefault(); pick(item); }} data-testid={`suggestion-${testId}-${getKey(item)}`}>
                {renderItem(item)}
              </button>
            ))}
        </div>
      )}
    </SearchField>
  );
}
