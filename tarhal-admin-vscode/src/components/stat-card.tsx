import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Sparkline } from '@/components/sparkline';
import { useCountUp } from '@/hooks/use-count-up';
import { useT } from '@/i18n/use-i18n';
import { weekChange } from '@/lib/booking-stats';

type StatCardProps = {
  label: string;
  value?: number;
  render?: (value: number) => ReactNode;
  /** Monthly values for the trend line and the "vs last month" note. */
  series?: number[];
  loading?: boolean;
  /** The API cannot answer this yet: labelled, never shown as zero. */
  noData?: boolean;
  /** Replaces the "No data yet" text, e.g. when the request failed. */
  noDataLabel?: string;
  /** One more honest detail under the number. */
  hint?: ReactNode;
};

/** The admin's one stat card: label, counted-up value, and (when the dashboard has a meaningful daily line) the line and the change on the week before. */
export function StatCard({ label, value = 0, render = String, series, loading = false, noData = false, noDataLabel, hint }: StatCardProps) {
  const t = useT();
  const change = noData || !series ? null : weekChange(series);
  return (
    <div className="metric-card h-auto overflow-visible py-6" data-testid={`metric-${label}`}>
      <span className="metric-label">{label}</span>
      <div className="metric-main">
        <strong className="metric-value block leading-tight">
          {loading ? <span className="skeleton metric-skeleton" role="status" aria-label={t('loading')} /> : noData ? <span className="metric-no-data">{noDataLabel ?? t('noDataYet')}</span> : <CountUp value={value} render={render} />}
        </strong>
        {!loading && !noData && series && <Sparkline values={series} />}
      </div>
      <div className="metric-foot">
        {!loading && !noData && hint && <span className="metric-hint">{hint}</span>}
        {!loading && change !== null && (
          <span className={`metric-change ${change >= 0 ? 'is-up' : 'is-down'}`}>
            {change >= 0 ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}
            {t('vsLastWeek', { change: `⁦${change > 0 ? '+' : ''}${change}%⁩` })}
          </span>
        )}
      </div>
    </div>
  );
}

function CountUp({ value, render }: { value: number; render: (value: number) => ReactNode }) {
  return <>{render(useCountUp(value))}</>;
}
