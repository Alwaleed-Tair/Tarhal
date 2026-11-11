import { useCallback, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useT } from '@/i18n/use-i18n';
import { SarSymbol } from '@/components/money';
import { useDismiss } from '@/hooks/use-dismiss';
import { CURRENCIES, setCurrency, useCurrency, type Currency } from '@/store/currencyStore';

const Mark = ({ code }: { code: Currency }) => (code === 'SAR' ? <SarSymbol className="currency-mark" /> : <span className="currency-mark" aria-hidden="true">$</span>);

/**
 * Currency dropdown in the header (admin top bar and the traveler header pills): the current currency with its symbol and
 * a chevron, and a small menu with SAR and USD. A real menu instead of a native <select>, so the options can show the riyal
 * symbol and match the other header controls. Mouse, touch and keyboard: arrows move, Enter/Space picks, Esc closes.
 */
export function CurrencySelect({ className = '', variant = 'admin' }: { className?: string; variant?: 'admin' | 'traveler' }) {
  const t = useT();
  const currency = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const name = (code: Currency) => t(code === 'SAR' ? 'currencySar' : 'currencyUsd');

  const pick = (code: Currency) => { setCurrency(code); setOpen(false); trigger.current?.focus(); };
  const options = () => [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
  const openMenu = () => {
    setOpen(true);
    requestAnimationFrame(() => (options().find((o) => o.getAttribute('aria-selected') === 'true') ?? options()[0])?.focus());
  };
  const onTriggerKey = (event: KeyboardEvent) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openMenu(); } };
  const onMenuKey = (event: KeyboardEvent) => {
    const list = options(); const at = list.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); list[(at + (event.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length]?.focus(); }
    if (event.key === 'Home') { event.preventDefault(); list[0]?.focus(); }
    if (event.key === 'End') { event.preventDefault(); list[list.length - 1]?.focus(); }
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div className={`currency-dd currency-dd-${variant} ${className}`} ref={ref}>
      <button ref={trigger} type="button" className={variant === 'traveler' ? 'hc-pill currency-trigger' : 'currency-select currency-trigger'}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-label={`${t('currency')}: ${name(currency)}`} onClick={() => (open ? setOpen(false) : openMenu())} onKeyDown={onTriggerKey}
        data-testid={variant === 'traveler' ? 'hc-currency' : 'select-currency'} data-value={currency}>
        <Mark code={currency} /><span className="currency-code">{currency}</span><ChevronDown className="currency-chevron" size={13} aria-hidden="true" />
      </button>
      {open && (
        <div className="currency-menu" role="listbox" id={listId} aria-label={t('currency')} onKeyDown={onMenuKey}>
          {CURRENCIES.map((code) => (
            <button key={code} type="button" role="option" aria-selected={code === currency} className="currency-option"
              onClick={() => pick(code)} data-testid={`currency-option-${code}`}>
              <Mark code={code} />
              <span className="currency-option-text"><strong>{code}</strong><small>{name(code)}</small></span>
              {code === currency && <Check className="currency-check" size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
