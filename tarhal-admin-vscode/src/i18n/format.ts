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

/** Riyadh is UTC+3 all year. The API stores UTC; flights are entered and shown in Riyadh time. */
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
/** "2027-01-10T08:00:00.000Z" -> "2027-01-10T11:00" (the value a datetime-local input uses). Empty when not a date. */
export function isoToRiyadhLocal(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '' : new Date(time + RIYADH_OFFSET_MS).toISOString().slice(0, 16);
}
/** "2027-01-10T11:00" entered as Riyadh time -> "2027-01-10T08:00:00.000Z". */
export function riyadhLocalToIso(local: string): string {
  return new Date(`${local}:00+03:00`).toISOString();
}

export function createFormatters(language: Language, currency: Currency = 'SAR') {
  const locale = LOCALES[language];
  const numberFormat = new Intl.NumberFormat(locale);
  /** All amounts are stored in SAR; they are converted only when the user picks USD. */
  const toDisplay = (sar: number) => (currency === 'USD' ? sar / USD_TO_SAR : sar);

  /** Amount that is already in the display currency -> "$1,200" or "SAR 1,200". Whole amounts show no decimals, others show two. */
  function money(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    const digits = Number.isInteger(rounded) ? 0 : 2;
    const options = { minimumFractionDigits: digits, maximumFractionDigits: digits };
    if (currency === 'USD') return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', ...options }).format(rounded);
    // LRI...PDI keeps "SAR 1,200" in one left-to-right run, in both English and Arabic pages.
    return `\u2066SAR\u00A0${new Intl.NumberFormat(locale, options).format(rounded)}\u2069`;
  }
  // `calendar: 'gregory'` stops ar-SA from switching to the Hijri calendar.
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', calendar: 'gregory' });
  const timeFormat = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const monthFormat = new Intl.DateTimeFormat(locale, { month: 'short', calendar: 'gregory' });
  const dayMonthFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', calendar: 'gregory' });
  const monthYearFormat = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', calendar: 'gregory' });

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
    /** SAR amount (how data is stored) -> converted if needed and formatted in the active currency. */
    currency: (sar: number) => money(toDisplay(sar)),
    /** SAR -> display currency number, unformatted (used for chart scales). */
    convert: toDisplay,
    /** Accepts an ISO string; falls back to the raw text if it cannot be parsed. */
    date: (value: string) => { const date = parseDate(value); return date ? formatDateObject(date) : value; },
    dateTime: (value: string) => { const date = parseDate(value); return date ? `${formatDateObject(date)} · ${timeFormat.format(date)}` : value; },
    /** Compact axis label for a value already in the display currency: $0, $2k / SAR 0, SAR 2k. Render inside <bdi dir="ltr">. */
    axisCurrency: (value: number) => {
      const short = value < 1000 ? String(value) : `${+(value / 1000).toFixed(1)}k`;
      return currency === 'USD' ? `$${short}` : `SAR ${short}`;
    },
    time: (timestamp: number) => timeFormat.format(new Date(timestamp)),
    month: (monthIndex: number) => monthFormat.format(new Date(2026, monthIndex, 1)),
    /** "2026-11-03" -> "3 Nov" (chart label). */
    dayMonth: (value: string) => { const date = parseDate(value); return date ? dayMonthFormat.format(date) : value; },
    /** "2026-11" -> "Nov 26" (chart label). */
    monthYear: (value: string) => { const date = parseDate(`${value}-01`); return date ? monthYearFormat.format(date) : value; },
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
