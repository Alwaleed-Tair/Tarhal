import { useFormat } from '@/i18n/use-i18n';
import { useCurrency } from '@/store/currencyStore';

/** Saudi Riyal sign (Unicode U+20C1). Follows the surrounding text color and size. */
export function SarSymbol({ className = '' }: { className?: string }) {
  return <span role="img" aria-label="SAR" className={`sar-symbol ${className}`}>{'⃁'}</span>;
}

/** SAR amount (how the API and the demo data store it): 420 shows as "SAR 420", or converted when the user picks USD. */
export function Money({ sar }: { sar: number }) {
  const format = useFormat();
  return <bdi dir="ltr" className="whitespace-nowrap">{format.currency(sar)}</bdi>;
}

/** Chart axis label for a value already in the display currency. */
export function MoneyShort({ value }: { value: number }) {
  const currency = useCurrency();
  const short = value < 1000 ? String(value) : `${+(value / 1000).toFixed(1)}k`;
  if (currency === 'USD') return <>${short}</>;
  return <bdi dir="ltr" className="whitespace-nowrap">SAR {short}</bdi>;
}
