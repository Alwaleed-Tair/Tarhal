import { useFormat, useT } from '@/i18n/use-i18n';
import { useCurrency } from '@/store/currencyStore';

/**
 * Official Saudi Riyal symbol. The shapes are copied unchanged from public/Saudi_Riyal_Symbol-2.svg; they are inline so the
 * symbol takes the color of the surrounding text (dark mode, muted text) and prints, which an <img> of that file cannot do.
 * Left of the number in every language, with a space between them (SAMA). Its size matches the $ sign (0.9em, set 0.1em
 * below the baseline like the $), so SAR and USD amounts look the same size. See .sar-symbol in index.css.
 */
export function SarSymbol({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <svg className={`sar-symbol ${className}`} viewBox="0 0 1124.14 1256.39" fill="currentColor" role="img" aria-label={t('saudiRiyal')}>
      <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
      <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z" />
    </svg>
  );
}

/** The symbol, a no-break space and the number, always left to right so the symbol stays on the left on Arabic pages too. */
function SarAmount({ children }: { children: string }) {
  return <bdi dir="ltr" className="whitespace-nowrap"><SarSymbol />{' '}{children}</bdi>;
}

/** SAR amount (how the API and the demo data store it): 420 shows as the symbol and 420, or converted when the user picks USD. */
export function Money({ sar }: { sar: number }) {
  const format = useFormat();
  const currency = useCurrency();
  const amount = sar;
  if (currency === 'USD') return <bdi dir="ltr" className="whitespace-nowrap">{format.currency(amount)}</bdi>;
  return <SarAmount>{format.amount(amount)}</SarAmount>;
}

/** Chart axis label for a value already in the display currency. */
export function MoneyShort({ value }: { value: number }) {
  const currency = useCurrency();
  const short = value < 1000 ? String(value) : `${+(value / 1000).toFixed(1)}k`;
  if (currency === 'USD') return <>${short}</>;
  return <SarAmount>{short}</SarAmount>;
}
