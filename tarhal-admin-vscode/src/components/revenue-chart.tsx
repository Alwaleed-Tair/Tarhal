import { useMemo, useState, type CSSProperties } from 'react';
import type { Booking, MonthlyRevenue, RevenueKey, ServiceFilter } from '@/data/demoData';
import { isoToRiyadhLocal } from '@/i18n/format';
import { Money, MoneyShort } from '@/components/money';
import { ChartSkeleton } from '@/components/skeleton';
import type { TranslationKey } from '@/i18n/translations';
import { useFormat, useT } from '@/i18n/use-i18n';
import { bookingMetrics, monthlyRevenue, revenueBetween } from '@/lib/booking-stats';

type Period = 'thisMonth' | 'last3' | 'last6' | 'ytd' | 'year' | 'custom';

const ALL_SERIES: RevenueKey[] = ['cars', 'flights', 'hotels'];
const SERIES_BY_SERVICE: Record<Exclude<ServiceFilter, 'all'>, RevenueKey> = { flight: 'flights', hotel: 'hotels', car: 'cars' };
const BAR_CLASS: Record<RevenueKey, string> = { cars: 'bar-cyan', flights: 'bar-teal', hotels: 'bar-navy' };
const PERIODS: { value: Period; label: TranslationKey }[] = [
  { value: 'thisMonth', label: 'thisMonth' },
  { value: 'last3', label: 'last3Months' },
  { value: 'last6', label: 'last6Months' },
  { value: 'ytd', label: 'yearToDate' },
  { value: 'year', label: 'fullYear' },
];
// The chart shows the current calendar year; the current month decides the relative presets.
const CURRENT_MONTH = new Date().getMonth();
const CURRENT_YEAR = new Date().getFullYear();

/** Frontend date slicing: picks the months that belong to a preset period. */
function monthsFor(months: MonthlyRevenue[], period: Exclude<Period, 'custom'>): MonthlyRevenue[] {
  const end = CURRENT_MONTH + 1;
  switch (period) {
    case 'thisMonth': return months.slice(CURRENT_MONTH, end);
    case 'last3': return months.slice(Math.max(0, end - 3), end);
    case 'last6': return months.slice(Math.max(0, end - 6), end);
    case 'ytd': return months.slice(0, end);
    default: return months;
  }
}
/** Fewer months means wider bars, so a single month doesn't look empty. */
const barMaxWidth = (months: number) => (months <= 1 ? 64 : months <= 3 ? 44 : months <= 6 ? 28 : 16);
const TICK_TARGET = 5;

/** Rounds the data maximum up to a "nice" axis top (2k, 2.5k, 5k steps...) and lists the ticks. */
function niceScale(max: number) {
  if (max <= 0) return { top: 1, ticks: [0] }; // no revenue in this period: just the baseline
  const rough = max / TICK_TARGET;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

/** Grouped bar chart with Y axis, dashed grid, legend, period dropdown and hover/focus tooltips. */
export default function RevenueChart({ service, bookings, loading, offline, showTotal = false, allowCustomRange = false }: { service: ServiceFilter; bookings: Booking[]; loading: boolean; offline: boolean; showTotal?: boolean; /** Adds a "Custom range" choice with from and to dates, built in the browser from the booking dates. */ allowCustomRange?: boolean }) {
  const t = useT();
  const format = useFormat();
  // INTEGRATION POINT: Connect Saud's Flight & Booking APIs here (revenue is an aggregate of bookings)
  const [period, setPeriod] = useState<Period>('year');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [range, setRange] = useState(() => { const today = isoToRiyadhLocal(new Date().toISOString()).slice(0, 10); return { from: `${today.slice(0, 8)}01`, to: today }; });
  const custom = period === 'custom';
  const rangeValid = Boolean(range.from && range.to && range.from <= range.to);

  const months = useMemo(() => monthlyRevenue(bookings, CURRENT_YEAR), [bookings]);
  // Hotel and car booking APIs do not exist yet: live data only has flights. Their revenue is labelled, never shown as zero.
  const noData = !offline && (service === 'hotel' || service === 'car');
  const series = service === 'all' ? (offline ? ALL_SERIES : (['flights'] as RevenueKey[])) : [SERIES_BY_SERVICE[service]];
  const rows = useMemo(() => {
    if (period !== 'custom') return monthsFor(months, period).map((month) => ({ ...month, key: String(month.monthIndex), label: format.month(month.monthIndex) }));
    if (!rangeValid) return [];
    const { unit, buckets } = revenueBetween(bookings, range.from, range.to);
    return buckets.map((bucket) => ({ ...bucket, label: unit === 'day' ? format.dayMonth(bucket.key) : unit === 'month' ? format.monthYear(bucket.key) : bucket.key }));
  }, [months, period, bookings, range, rangeValid, format]);
  // Long custom ranges: label only some of the bars so the text never collides.
  const dense = rows.length > 12;
  const labelEvery = dense ? Math.ceil(rows.length / 8) : 1;
  // Scale in the display currency so axis ticks stay round after conversion.
  const { top, ticks } = niceScale(format.convert(Math.max(...rows.flatMap((row) => series.map((key) => row[key])))));
  const total = rows.reduce((sum, row) => sum + series.reduce((inner, key) => inner + row[key], 0), 0);

  const allTime = useMemo(() => bookingMetrics(bookings, service).revenue, [bookings, service]);

  if (noData) return <p className="chart-no-data" data-testid="chart-no-data">{t('noDataYet')}</p>;

  return (
    <div className="revenue-chart">
      {showTotal && (
        <div className="chart-total"><strong key={total} className="value-pop text-4xl sm:text-6xl font-bold leading-tight"><Money sar={total} /></strong><span>{t('totalRevenue')}</span></div>
      )}

      <div className="chart-toolbar">
        {!showTotal && (
          <div className="chart-summary">
            <span>{t('totalRevenue')}</span>
            <strong key={total} className="value-pop"><Money sar={total} /></strong>
          </div>
        )}
        <select className="select-control period-select" value={period} aria-label={t('period')} data-testid="chart-period"
          onChange={(event) => { setPeriod(event.target.value as Period); setActiveIndex(null); }}>
          {PERIODS.map(({ value, label }) => <option key={value} value={value}>{t(label)}</option>)}
          {allowCustomRange && <option value="custom">{t('customRange')}</option>}
        </select>
        {custom && (
          <div className="custom-range" data-testid="chart-custom-range">
            <label>{t('rangeFrom')}<input type="date" className="input-control" dir="ltr" value={range.from} aria-invalid={!rangeValid} onChange={(event) => { setRange((current) => ({ ...current, from: event.target.value })); setActiveIndex(null); }} data-testid="chart-range-from" /></label>
            <label>{t('rangeTo')}<input type="date" className="input-control" dir="ltr" value={range.to} aria-invalid={!rangeValid} onChange={(event) => { setRange((current) => ({ ...current, to: event.target.value })); setActiveIndex(null); }} data-testid="chart-range-to" /></label>
            {!rangeValid && <small className="field-error" role="alert" data-testid="chart-range-error">{t('rangeInvalid')}</small>}
          </div>
        )}
      </div>

      {!loading && allTime !== total && <p className="chart-period-note" data-testid="chart-period-note">{t('chartPeriodNote', { year: format.year(CURRENT_YEAR) })} <span>{t('allBookingsTotal')}: <Money sar={allTime} /></span></p>}

      {loading ? <ChartSkeleton /> : custom && !rangeValid ? null : total === 0 ? <p className="chart-no-data" data-testid="chart-empty">{t('noRevenueInPeriod')}</p> : (
        <div className="chart-scroll">
          <div className="chart-inner" style={{ '--months': rows.length, '--bar-max': `${barMaxWidth(rows.length)}px` } as CSSProperties}>
            <div className="chart-frame">
              <div className="chart-yaxis" aria-hidden="true">
                {ticks.map((value) => <span key={value} style={{ bottom: `${(value / top) * 100}%` }}><MoneyShort value={value} /></span>)}
              </div>
              <div className="chart-plot" onMouseLeave={() => setActiveIndex(null)}>
                {ticks.map((value) => <div key={value} className={`chart-grid-line ${value === 0 ? 'baseline' : ''}`} style={{ bottom: `${(value / top) * 100}%` }} aria-hidden="true" />)}
                <div className="chart-bars">
                  {rows.map((row, index) => {
                    const month = row.label;
                    const rowTotal = series.reduce((sum, key) => sum + row[key], 0);
                    const anchor = index < 2 ? 'tip-start' : index >= rows.length - 2 ? 'tip-end' : '';
                    return (
                      <div key={row.key} className={`bar-group ${activeIndex === index ? 'active' : ''}`} style={{ '--i': index } as CSSProperties} tabIndex={0} role="group"
                        aria-label={`${month}: ${series.map((key) => `${t(key)} ${format.currency(row[key])}`).join(', ')}`}
                        onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}
                        data-testid={`chart-month-${row.key}`}>
                        {series.map((key) => <div key={key} className={`bar ${BAR_CLASS[key]}`} style={{ height: `${(format.convert(row[key]) / top) * 100}%` }} />)}
                        {activeIndex === index && (
                          <div className={`chart-tooltip ${anchor}`} aria-hidden="true">
                            <strong>{month}</strong>
                            {series.map((key) => (
                              <div className="tip-row" key={key}><i className={`legend-dot ${BAR_CLASS[key]}`} /><span>{t(key)}</span><b><Money sar={row[key]} /></b></div>
                            ))}
                            {series.length > 1 && <div className="tip-row tip-total"><span>{t('total')}</span><b><Money sar={rowTotal} /></b></div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="chart-months" data-dense={dense || undefined} aria-hidden="true">
              {rows.map((row, index) => <span key={row.key}>{index % labelEvery === 0 ? row.label : ''}</span>)}
            </div>
          </div>
        </div>
      )}

      <ul className="chart-legend" aria-label={t('chartLegend')}>
        {series.map((key) => <li key={key}><i className={`legend-dot ${BAR_CLASS[key]}`} />{t(key)}</li>)}
        {!offline && service === 'all' && <li className="chart-legend-note">{t('hotels')} · {t('cars')}: {t('noDataYet')}</li>}
      </ul>
    </div>
  );
}