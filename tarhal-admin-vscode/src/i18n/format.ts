import type { Language } from '@/i18n/translations';
import { USD_TO_SAR, type Currency } from '@/store/currencyStore';

// Latin digits keep ids, prices and dates consistent with codes like "SV-102".
// Swap `latn` for `arab` to show Arabic-Indic digits (٠١٢٣) in Arabic.
const LOCALES: Record<Language, string> = { en: 'en-US', ar: 'ar-SA-u-nu-latn' };

/** "2026-09-12" must be read as a local day, not UTC, or it can shift by one day. */
function parseDate(value: string): Date | null {
  const date = new Date(value.length === 10 ? `${value}T00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function createFormatters(language: Language, currency: Currency = 'USD') {
  const locale = LOCALES[language];
  const numberFormat = new Intl.NumberFormat(locale);
  const usdFormat = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });
  const rate = currency === 'SAR' ? USD_TO_SAR : 1;

  /** Amount that is already in the display currency -> "$1,200" or "1,200 ⃁". */
  function money(value: number): string {
    if (currency === 'USD') return usdFormat.format(value);
    // LRI...PDI keeps "1,200 ⃁" in one left-to-right run, in both English and Arabic pages.
    return `\u2066${numberFormat.format(Math.round(value))}\u00A0\u20C1\u2069`;
  }
  // `calendar: 'gregory'` stops ar-SA from switching to the Hijri calendar.
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', calendar: 'gregory' });
  const timeFormat = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const monthFormat = new Intl.DateTimeFormat(locale, { month: 'short', calendar: 'gregory' });

  function formatDateObject(date: Date): string {
    if (language === 'ar') return dateFormat.format(date);
    const parts = Object.fromEntries(dateFormat.formatToParts(date).map((part) => [part.type, part.value]));
    return `${parts.day} ${parts.month} ${parts.year}`; // "12 Sep 2026"
  }

  return {
    number: (value: number) => numberFormat.format(value),
    /** 4.6 -> "4.6" (one decimal, same digits as the rest of the page). */
    rating: (value: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value),
    /** 2024 -> "2024" (no thousands separator). */
    year: (value: number) => String(value),
    /** USD amount (how data is stored) -> converted and formatted in the active currency. */
    currency: (usd: number) => money(usd * rate),
    /** USD -> display currency number, unformatted (used for chart scales). */
    convert: (usd: number) => usd * rate,
    /** Accepts an ISO string; falls back to the raw text if it cannot be parsed. */
    date: (value: string) => { const date = parseDate(value); return date ? formatDateObject(date) : value; },
    dateTime: (value: string) => { const date = parseDate(value); return date ? `${formatDateObject(date)} · ${timeFormat.format(date)}` : value; },
    /** Compact axis label for a value already in the display currency: $0, $2k / 0, 2k ⃁. Render inside <bdi dir="ltr">. */
    axisCurrency: (value: number) => {
      const short = value < 1000 ? String(value) : `${+(value / 1000).toFixed(1)}k`;
      return currency === 'USD' ? `$${short}` : `${short} \u20C1`;
    },
    time: (timestamp: number) => timeFormat.format(new Date(timestamp)),
    month: (monthIndex: number) => monthFormat.format(new Date(2026, monthIndex, 1)),
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
