import type { ReactNode } from 'react';

export type Align = 'start' | 'center' | 'end';

/** One column definition drives BOTH its header and its cells, so they can never get out of step. */
export type Column<T> = {
  key: string;
  header: string;
  /** Share of the table width, e.g. '18%'. Every table's widths must add up to 100%. */
  width: string;
  /** Text alignment of the column; defaults to the start side. */
  align?: Align;
  /** Secondary text (dates, emails): smaller and muted. */
  muted?: boolean;
  cell: (row: T) => ReactNode;
};

const TH =
  'text-center align-middle px-6 py-4 ' +
  'bg-slate-100/90 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200 dark:border-white/10 ' +
  'text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300';
const TD = 'text-center align-middle px-6 py-4';

/**
 * The shared admin table. Wrap it in `.table-wrap` (scroll region) like the other pages do.
 * `table-fixed` + an explicit width on every <th> keeps each column at its set share of the table.
 * (Widths are inline styles because Tailwind cannot generate `w-[X%]` classes from runtime values.)
 * `minWidth` is the narrowest the table gets before the wrapper scrolls sideways.
 */
export function DataTable<T>({ caption, columns, rows, getKey, minWidth = 880, stackOnPhone = false }: { caption: string; columns: Column<T>[]; rows: T[]; getKey: (row: T) => string; minWidth?: number; /** On phones each row becomes a labelled card instead of scrolling sideways. */ stackOnPhone?: boolean }) {
  return (
    <table className={`data-table data-table-fixed table-fixed w-full border-collapse${stackOnPhone ? ' data-table-stack' : ''}`} style={{ minWidth }}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {columns.map(({ key, header, width, align = 'start' }) => (
            <th key={key} scope="col" className={`${TH} col-${align}`} style={{ width }}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getKey(row)}>
            {columns.map(({ key, header, muted, align = 'start', cell }) => (
              <td key={key} className={`${TD} col-${align}${muted ? ' cell-muted' : ''}`} data-label={stackOnPhone ? header : undefined}>{cell(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
