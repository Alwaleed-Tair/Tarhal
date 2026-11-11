import { useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Link } from 'wouter';
import { useDismiss } from '@/hooks/use-dismiss';

/**
 * The site's dropdowns, all in the look of the currency control: a button with a turning chevron, and a small menu that
 * fades and slides in (and out again) under it. One open/close behaviour for every dropdown:
 * - mouse and touch: click to open, click an option or outside to close;
 * - keyboard: Enter/Space/arrows open, arrows/Home/End move, Enter/Space picks, Esc closes (focus back on the button),
 *   Tab closes; typing a letter jumps to the next option that starts with it;
 * - the menu stays on screen: it opens towards the side that has room (mirrored in Arabic by the logical CSS);
 * - "reduce motion": no animation.
 *
 * Variants: `admin` (top bar of the admin), `traveler` (Tariq's header pills), `field` (a form field, full width, like the
 * fields next to it), `inline` (inside one of Tariq's own field boxes, taking his text styles).
 */
export type DropdownVariant = 'admin' | 'traveler' | 'field' | 'inline';
export type DropdownOption = { value: string; label: ReactNode; text?: string; hint?: ReactNode; mark?: ReactNode; testId?: string };

const CLOSE_MS = 120;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Open / closing / closed, with a short closing animation; the menu also flips to the side of the screen with room. */
function useMenuState() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const timer = useRef<number>(0);
  // Read by the focus moves that wait a frame: they do nothing once the menu is closing (Esc pressed in that frame).
  const isOpen = useRef(false);
  const show = useCallback(() => { window.clearTimeout(timer.current); isOpen.current = true; setClosing(false); setOpen(true); }, []);
  const hide = useCallback(() => {
    isOpen.current = false;
    if (reduced()) { setOpen(false); setClosing(false); return; }
    setClosing(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setOpen(false); setClosing(false); }, CLOSE_MS);
  }, []);
  /** Focus in the next frame (the menu is rendered by then), unless the menu has started closing. */
  const later = useCallback((fn: () => void) => requestAnimationFrame(() => { if (isOpen.current) fn(); }), []);
  return { open, closing, show, hide, later };
}

/** The nearest box around an element that scrolls (a dialog) or cuts off what overflows it (a table card), if any. */
function container(el: HTMLElement) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if (/(auto|scroll)/.test(y)) return { box: p, scrolls: true };
    if (/(hidden|clip)/.test(y)) return { box: p, scrolls: false };
  }
  return null;
}

/**
 * Keeps a menu in view: if it would run past the side of the screen it lines up with the other side of its button. If it
 * would run past the bottom: in a box that scrolls (a dialog) the box scrolls to show it; elsewhere it opens upwards when
 * there is room above.
 */
function useFitOnScreen(menu: React.RefObject<HTMLDivElement | null>, open: boolean) {
  useLayoutEffect(() => {
    const el = menu.current;
    if (!open || !el) return;
    el.removeAttribute('data-flip');
    el.removeAttribute('data-up');
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - 4 || r.left < 4) el.setAttribute('data-flip', '');
    const anchor = el.parentElement?.getBoundingClientRect();
    const around = container(el);
    const bottom = Math.min(window.innerHeight, around ? around.box.getBoundingClientRect().bottom : Infinity);
    if (!anchor || r.bottom <= bottom - 4) return;
    if (around?.scrolls) el.scrollIntoView({ block: 'nearest' });
    else if (anchor.top - r.height - 8 > Math.max(4, around ? around.box.getBoundingClientRect().top : 0)) el.setAttribute('data-up', '');
  }, [menu, open]);
}

function moveFocus(event: KeyboardEvent, items: HTMLElement[], close: () => void) {
  const at = items.indexOf(document.activeElement as HTMLElement);
  const go = (i: number) => { event.preventDefault(); items[(i + items.length) % items.length]?.focus(); };
  if (event.key === 'ArrowDown') go(at + 1);
  else if (event.key === 'ArrowUp') go(at - 1);
  else if (event.key === 'Home') go(0);
  else if (event.key === 'End') go(items.length - 1);
  else if (event.key === 'Escape') { event.preventDefault(); close(); }
  else if (event.key === 'Tab') close();
  else if (event.key.length === 1 && /\S/.test(event.key)) {
    const k = event.key.toLocaleLowerCase();
    const next = [...items.slice(at + 1), ...items.slice(0, at + 1)].find((item) => (item.dataset.text ?? item.textContent ?? '').trim().toLocaleLowerCase().startsWith(k));
    if (next) { event.preventDefault(); next.focus(); }
  }
}

type DropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Name for screen readers (the field's label). */
  label: string;
  testId?: string;
  variant?: DropdownVariant;
  /** What the button shows; by default the chosen option's label. */
  trigger?: ReactNode;
  className?: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  /** Id of a visible label: the button is then named by that label and the chosen value (instead of `label`). */
  labelledBy?: string;
};

/** A dropdown that picks one value (a listbox). */
export function Dropdown({ value, options, onChange, label, testId, variant = 'field', trigger, className = '', id, invalid, describedBy, disabled, labelledBy }: DropdownProps) {
  const { open, closing, show, hide, later } = useMenuState();
  const box = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const ownId = useId();
  const buttonId = id ?? ownId;
  const close = useCallback(() => { hide(); }, [hide]);
  useDismiss(box, open && !closing, close);
  useFitOnScreen(menu, open);
  const chosen = options.find((o) => o.value === value) ?? options[0];
  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
  const openMenu = () => { show(); later(() => (items().find((o) => o.getAttribute('aria-selected') === 'true') ?? items()[0])?.focus()); };
  const pick = (v: string) => { if (v !== value) onChange(v); hide(); button.current?.focus(); };
  const triggerClass = variant === 'traveler' ? 'hc-pill currency-trigger' : variant === 'admin' ? 'currency-select currency-trigger' : variant === 'inline' ? 'dd-inline-trigger currency-trigger' : 'select-control dd-field-trigger currency-trigger';

  return (
    <div className={`currency-dd currency-dd-${variant === 'traveler' || variant === 'inline' ? 'traveler' : 'admin'} dd dd-${variant} ${className}`} ref={box}>
      <button ref={button} id={buttonId} type="button" className={triggerClass} disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open && !closing} aria-controls={open ? listId : undefined}
        aria-label={labelledBy ? undefined : `${label}: ${chosen?.text ?? (typeof chosen?.label === 'string' ? chosen.label : '')}`}
        aria-labelledby={labelledBy ? `${labelledBy} ${buttonId}` : undefined}
        aria-invalid={invalid || undefined} aria-describedby={describedBy}
        onClick={() => (open && !closing ? hide() : openMenu())}
        onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); openMenu(); } }}
        data-testid={testId} data-value={value}>
        {trigger ?? <span className="dd-value">{chosen?.mark}{chosen?.label}</span>}
        <ChevronDown className="currency-chevron" size={14} aria-hidden="true" />
      </button>
      {open && (
        <div ref={menu} className="currency-menu dd-menu" role="listbox" id={listId} aria-label={label} data-closing={closing || undefined}
          onKeyDown={(event) => moveFocus(event, items(), () => { hide(); button.current?.focus(); })}>
          {options.map((o) => (
            <button key={o.value || '_empty'} type="button" role="option" aria-selected={o.value === value} className="currency-option dd-option"
              data-text={o.text} onClick={() => pick(o.value)} data-testid={o.testId ?? (testId ? `${testId}-option-${o.value || 'all'}` : undefined)}>
              {o.mark}
              <span className="currency-option-text"><strong>{o.label}</strong>{o.hint && <small>{o.hint}</small>}</span>
              {o.value === value && <Check className="currency-check" size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type MenuItem = { key: string; label: ReactNode; href?: string; onSelect?: () => void; testId?: string; icon?: ReactNode };

/** A button that opens a menu of actions and links (the account menus). */
export function MenuButton({ label, icon, items, header, variant, testId, menuTestId, buttonLabel }: {
  label: ReactNode; icon?: ReactNode; items: MenuItem[]; header?: ReactNode; variant: 'admin' | 'traveler'; testId?: string; menuTestId?: string; buttonLabel: string;
}) {
  const { open, closing, show, hide, later } = useMenuState();
  const box = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = useCallback(() => { hide(); }, [hide]);
  useDismiss(box, open && !closing, close);
  useFitOnScreen(menu, open);
  const entries = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  const openMenu = (focusFirst: boolean) => { show(); if (focusFirst) later(() => entries()[0]?.focus()); };
  const done = (fn?: () => void) => () => { hide(); fn?.(); };

  return (
    <div className={`currency-dd currency-dd-${variant} dd dd-account dd-${variant}`} ref={box}>
      <button ref={button} type="button" className={variant === 'traveler' ? 'hc-pill currency-trigger' : 'currency-select currency-trigger dd-account-trigger'}
        aria-haspopup="menu" aria-expanded={open && !closing} aria-controls={open ? menuId : undefined} aria-label={buttonLabel}
        onClick={(event) => (open && !closing ? hide() : openMenu(event.detail === 0))}
        onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); openMenu(true); } }}
        data-testid={testId}>
        {icon}<span className="hc-label dd-account-name">{label}</span><ChevronDown className="currency-chevron" size={14} aria-hidden="true" />
      </button>
      {open && (
        <div ref={menu} className="currency-menu dd-menu dd-account-menu" role="menu" id={menuId} aria-label={buttonLabel} data-closing={closing || undefined}
          onKeyDown={(event) => moveFocus(event, entries(), () => { hide(); button.current?.focus(); })} data-testid={menuTestId}>
          {header && <div className="dd-menu-header" role="presentation">{header}</div>}
          {items.map((item) => item.href ? (
            <Link key={item.key} href={item.href} role="menuitem" className="currency-option dd-option dd-menu-item" onClick={done(item.onSelect)} data-testid={item.testId}>
              {item.icon}<span className="currency-option-text"><strong>{item.label}</strong></span>
            </Link>
          ) : (
            <button key={item.key} type="button" role="menuitem" className="currency-option dd-option dd-menu-item" onClick={done(item.onSelect)} data-testid={item.testId}>
              {item.icon}<span className="currency-option-text"><strong>{item.label}</strong></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
