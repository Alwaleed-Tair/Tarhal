import { useFormat } from '@/i18n/use-i18n';
import { useCurrency } from '@/store/currencyStore';

/** Saudi Riyal sign (Unicode U+20C1). Follows the surrounding text color and size. */
export function SarSymbol({ className = '' }: { className?: string }) {
  return <span role="img" aria-label="SAR" className={`sar-symbol ${className}`}>{'\u20C1'}</span>;
}

/** USD amount (how data is stored) shown in the active currency. */
export function Money({ usd }: { usd: number }) {
  const format = useFormat();
  const currency = useCurrency();
  if (currency === 'USD') return <>{format.currency(usd)}</>;
  return <bdi dir="ltr" className="inline-flex items-center gap-1"><span>{format.number(Math.round(format.convert(usd)))}</span><SarSymbol /></bdi>;
}

/** Chart axis label for a value already in the display currency. */
export function MoneyShort({ value }: { value: number }) {
  const currency = useCurrency();
  const short = value < 1000 ? String(value) : `${+(value / 1000).toFixed(1)}k`;
  if (currency === 'USD') return <>${short}</>;
  return <bdi dir="ltr" className="inline-flex items-center gap-1"><span>{short}</span><SarSymbol /></bdi>;
}
