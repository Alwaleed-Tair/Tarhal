import { Coins } from 'lucide-react';
import { useT } from '@/i18n/use-i18n';
import { SarSymbol } from '@/components/money';
import { CURRENCIES, setCurrency, useCurrency, type Currency } from '@/store/currencyStore';

/** Navbar dropdown that switches the display currency for every amount in the app. */
export function CurrencySelect({ className = '' }: { className?: string }) {
  const t = useT();
  const currency = useCurrency();
  return (
    <label className={`currency-select ${className}`}>
      {currency === 'SAR' ? <SarSymbol className="text-[15px] leading-none" /> : <Coins size={15} aria-hidden="true" />}
      <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} aria-label={t('currency')} data-testid="select-currency">
        {CURRENCIES.map((code) => <option key={code} value={code}>{code === 'USD' ? 'USD ($)' : 'SAR (\u20C1)'}</option>)}
      </select>
    </label>
  );
}
