import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Pagination } from '@/components/pagination';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMockStatus } from '@/hooks/use-mock-loading';
import { usePagination } from '@/hooks/use-pagination';
import type { Language, TranslationKey } from '@/i18n/translations';
import { useFormat, useT } from '@/i18n/use-i18n';
import { useDemoState } from '@/store/demoStore';

export type FilterOption = { value: string; labelKey: TranslationKey };
/** One dropdown filter. `matches` decides whether an item passes for the chosen option value. */
export type FilterDef<T> = { key: string; labelKey: TranslationKey; options: FilterOption[]; matches: (item: T, value: string) => boolean };

export type SortOption<T> = { value: string; labelKey: TranslationKey; compare: (a: T, b: T) => number };

type ListingViewProps<T> = {
  title: string;
  subtitle: string;
  items: T[];
  getKey: (item: T) => string;
  /** Text the search box matches against (include both languages if you have them). */
  searchText: (item: T, language: Language) => string;
  sorts: SortOption<T>[];
  /** Optional dropdown filters shown under the search box. */
  filters?: FilterDef<T>[];
  /** Pass true while the real API request is running (shows the card skeletons). */
  loading?: boolean;
  renderItem: (item: T) => ReactNode;
  pageSize?: number;
  /** Placeholder card shown while loading. */
  skeleton: ReactNode;
};

/** Search + sort + loading/error/empty states + pagination for a grid of cards. */
export function ListingView<T>({ title, subtitle, items, getKey, searchText, sorts, filters = [], loading = false, renderItem, pageSize = 6, skeleton }: ListingViewProps<T>) {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  // TODO / INTEGRATION POINT: Connect Tariq's Search API here (this local text filter becomes the search request).
  const [query, setQuery] = useState('');
  const [sortValue, setSortValue] = useState(sorts[0].value);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const { status: mockStatus, empty, retry } = useMockStatus();
  const status = loading ? 'loading' : mockStatus;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const compare = sorts.find((sort) => sort.value === sortValue)?.compare ?? sorts[0].compare;
    const source = empty ? [] : items;
    return source
      .filter((item) => !term || searchText(item, language).toLowerCase().includes(term))
      .filter((item) => filters.every((f) => !filterValues[f.key] || f.matches(item, filterValues[f.key])))
      .sort(compare);
  }, [items, query, sortValue, sorts, filters, filterValues, searchText, language, empty]);

  const { page, totalPages, setPage, pageItems } = usePagination(visible, pageSize, `${query}|${sortValue}|${JSON.stringify(filterValues)}`);

  function changePage(next: number) {
    setPage(next);
    document.getElementById('listing-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const grid = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </header>

      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[1fr_14rem] sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} aria-label={t('search')} className="ps-9" data-testid="input-listing-search" />
        </div>
        <Select value={sortValue} onChange={(event) => setSortValue(event.target.value)} aria-label={t('sortBy')} data-testid="select-listing-sort">
          {sorts.map((sort) => <option key={sort.value} value={sort.value}>{t(sort.labelKey)}</option>)}
        </Select>
        {filters.length > 0 && (
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
            {filters.map((f) => (
              <Select key={f.key} value={filterValues[f.key] ?? ''} onChange={(event) => setFilterValues((cur) => ({ ...cur, [f.key]: event.target.value }))} aria-label={t(f.labelKey)} data-testid={`select-filter-${f.key}`}>
                <option value="">{t(f.labelKey)}: {t('filterAny')}</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
              </Select>
            ))}
          </div>
        )}
      </div>

      <section id="listing-results" aria-live="polite" aria-busy={status === 'loading'} className="grid scroll-mt-24 gap-5">
        {status === 'loading' && (
          <div className={grid} aria-label={t('loading')}>{Array.from({ length: pageSize }, (_, index) => <div key={index}>{skeleton}</div>)}</div>
        )}
        {status === 'error' && <ErrorState onRetry={retry} />}
        {status === 'ready' && visible.length === 0 && (
          <EmptyState message={t('noResults')} actionLabel={query ? t('clearSearch') : undefined} onAction={() => setQuery('')} />
        )}
        {status === 'ready' && visible.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">{t('resultsCount', { count: format.number(visible.length) })}</p>
            <ul className={grid}>{pageItems.map((item) => <li key={getKey(item)} className="flex">{renderItem(item)}</li>)}</ul>
            {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={changePage} />}
          </>
        )}
      </section>
    </div>
  );
}

/** Card-shaped loading placeholder. `image` adds the photo block used by hotel cards. */
export function CardSkeleton({ image = false }: { image?: boolean }) {
  return (
    <div className="grid w-full gap-3 rounded-xl border bg-card p-4">
      {image && <Skeleton className="aspect-[16/10] w-full" />}
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
