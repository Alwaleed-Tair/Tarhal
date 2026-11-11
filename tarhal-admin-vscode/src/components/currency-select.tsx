import { useT } from '@/i18n/use-i18n';
import { SarSymbol } from '@/components/money';
import { Dropdown } from '@/components/dropdown';
import { CURRENCIES, setCurrency, useCurrency, type Currency } from '@/store/currencyStore';

const Mark = ({ code }: { code: Currency }) => (code === 'SAR' ? <SarSymbol className="currency-mark" /> : <span className="currency-mark" aria-hidden="true">$</span>);

/**
 * Currency dropdown in the header (admin top bar and the traveler header pills): the current currency with its symbol and
 * a chevron, and a small menu with SAR and USD. Built on the site's one dropdown (components/dropdown.tsx), so every
 * dropdown opens, animates and answers the keyboard the same way.
 */
export function CurrencySelect({ className = '', variant = 'admin' }: { className?: string; variant?: 'admin' | 'traveler' }) {
  const t = useT();
  const currency = useCurrency();
  const name = (code: Currency) => t(code === 'SAR' ? 'currencySar' : 'currencyUsd');
  return (
    <Dropdown variant={variant} className={className} value={currency} label={t('currency')} onChange={(v) => setCurrency(v as Currency)}
      testId={variant === 'traveler' ? 'hc-currency' : 'select-currency'}
      trigger={<><Mark code={currency} /><span className="currency-code">{currency}</span></>}
      options={CURRENCIES.map((code) => ({ value: code, label: code, text: `${code} ${name(code)}`, hint: name(code), mark: <Mark code={code} />, testId: `currency-option-${code}` }))} />
  );
}
