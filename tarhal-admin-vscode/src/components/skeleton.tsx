import { useT } from '@/i18n/use-i18n';

/** Placeholder rows shown while a table's data "loads". */
export function TableSkeleton({ columns, rows = 4 }: { columns: number; rows?: number }) {
  const t = useT();
  return (
    <div className="table-skeleton" role="status" aria-busy="true" aria-label={t('loading')}>
      {Array.from({ length: rows }, (_, row) => (
        <div className="table-skeleton-row" key={row} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => <span className="skeleton" key={column} />)}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  const t = useT();
  return <div className="chart-skeleton skeleton" role="status" aria-busy="true" aria-label={t('loading')} />;
}
