import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ContextBadge } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMockStatus } from '@/hooks/use-mock-loading';
import { usePagination } from '@/hooks/use-pagination';
import type { Language, TranslationKey, TranslationParams } from '@/i18n/translations';
import { useFormat, useT } from '@/i18n/use-i18n';
import { useDemoState } from '@/store/demoStore';

/** An option is either a translated label (`labelKey`, optional `params`) or a raw `label` (city and make names from the data). */
export type FilterOption = { value: string; labelKey?: TranslationKey; params?: TranslationParams; label?: string };
/**
 * One dropdown filter. `matches` is used when the data is filtered in the browser (demo data); `param` turns the chosen
 * value into the API query parameters (e.g. rating "4" -> { minRating: 4 }) when the list is served by the API.
 */
export type FilterDef<T> = {
  key: string;
  labelKey: TranslationKey;
  options: FilterOption[];
  matches: (item: T, value: string) => boolean;
  param?: (value: string) => Record<string, string | number>;
};

export type SortOption<T> = { value: string; labelKey: TranslationKey; compare: (a: T, b: T) => number };

/** Loads one page from the API. Must be a stable object (declare it outside the component). */
export type ListingSource<T> = {
  load: (query: { params: Record<string, string | number>; page: number; pageSize: number }) => Promise<{ items: T[]; total: number }>;
};

/** The API lets us ask for at most this many rows per request. */
const MAX_API_PAGE_SIZE = 100;

type ListingViewProps<T> = {
  title: string;
  subtitle: string;
  /** Demo/fallback items (also the data shown when the API is unreachable). */
  items: T[];
  getKey: (item: T) => string;
  /** Text the search box matches against (include both languages if you have them). */
  searchText: (item: T, language: Language) => string;
  /** The FIRST sort must be the order the API returns (price, ascending): that is what makes server paging correct. */
  sorts: SortOption<T>[];
  /** Optional dropdown filters shown under the search box. */
  filters?: FilterDef<T>[];
  /** Pass true while the page's own request is running (shows the card skeletons). */
  loading?: boolean;
  renderItem: (item: T) => ReactNode;
  pageSize?: number;
  /** Placeholder card shown while loading. */
  skeleton: ReactNode;
  /**
   * When given, filters and pagination are done by the API. Typing in the search box or choosing another sort
   * switches to "local" handling over up to 100 API rows, because the API cannot search text or sort by rating/name.
   * If the request fails, the demo `items` are shown and filtered in the browser.
   */
  source?: ListingSource<T>;
};

type Remote<T> = { status: 'loading' | 'ready' | 'offline'; items: T[]; total: number };

/** Search + sort + filters + loading/error/empty states + pagination for a grid of cards. */
export function ListingView<T>({ title, subtitle, items, getKey, searchText, sorts, filters = [], loading = false, renderItem, pageSize = 6, skeleton, source }: ListingViewProps<T>) {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const [query, setQuery] = useState('');
  const [sortValue, setSortValue] = useState(sorts[0].value);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const { status: mockStatus, empty, retry } = useMockStatus();

  // ---- API mode ------------------------------------------------------------------------------------------
  const [remote, setRemote] = useState<Remote<T>>({ status: 'loading', items: [], total: 0 });
  const [serverPage, setServerPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const serverParams = useMemo(() => {
    const params: Record<string, string | number> = {};
    for (const f of filters) if (filterValues[f.key] && f.param) Object.assign(params, f.param(filterValues[f.key]));
    return params;
  }, [filters, filterValues]);
  const paramsKey = JSON.stringify(serverParams);
  const localMode = Boolean(source) && (query.trim() !== '' || sortValue !== sorts[0].value);

  useEffect(() => { setServerPage(1); }, [paramsKey, localMode]);
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setRemote((current) => ({ ...current, status: 'loading' }));
    source.load({ params: serverParams, page: localMode ? 1 : serverPage, pageSize: localMode ? MAX_API_PAGE_SIZE : pageSize })
      .then((result) => { if (!cancelled) setRemote({ status: 'ready', items: result.items, total: result.total }); })
      .catch((error) => {
        console.warn('[listing] API request failed, showing the demo list:', error);
        if (!cancelled) setRemote({ status: 'offline', items: [], total: 0 });
      });
    return () => { cancelled = true; };
  }, [source, paramsKey, localMode, serverPage, pageSize, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const useApi = Boolean(source) && remote.status !== 'offline';
  const serverPaging = useApi && !localMode;
  const status = loading || (useApi && remote.status === 'loading') ? 'loading' : mockStatus;

  // ---- local pipeline (demo data, offline fallback, text search / custom sort over API rows) ---------------
  const localVisible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const compare = sorts.find((sort) => sort.value === sortValue)?.compare ?? sorts[0].compare;
    const source_ = empty ? [] : useApi ? remote.items : items;
    return source_
      .filter((item) => !term || searchText(item, language).toLowerCase().includes(term))
      // With the API the rows are already filtered by the server; only demo data is filtered here.
      .filter((item) => useApi || filters.every((f) => !filterValues[f.key] || f.matches(item, filterValues[f.key])))
      .sort(compare);
  }, [items, remote.items, useApi, query, sortValue, sorts, filters, filterValues, searchText, language, empty]);

  const local = usePagination(localVisible, pageSize, `${query}|${sortValue}|${JSON.stringify(filterValues)}`);
  const pageItems = serverPaging && !empty ? remote.items : local.pageItems;
  const page = serverPaging ? serverPage : local.page;
  const total = serverPaging && !empty ? remote.total : localVisible.length;
  const totalPages = serverPaging ? Math.max(1, Math.ceil(total / pageSize)) : local.totalPages;
  const filtersActive = Object.values(filterValues).some(Boolean);
  const offline = Boolean(source) && remote.status === 'offline';

  function changePage(next: number) {
    if (serverPaging) setServerPage(next); else local.setPage(next);
    document.getElementById('listing-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearAll() {
    setQuery('');
    setFilterValues({});
  }

  function retryAll() {
    retry();
    setAttempt((n) => n + 1);
  }

  const grid = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3';
  const visibleFilters = filters.filter((f) => f.options.length > 0);

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
        {visibleFilters.length > 0 && (
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFilters.map((f) => (
              <Select key={f.key} value={filterValues[f.key] ?? ''} onChange={(event) => setFilterValues((cur) => ({ ...cur, [f.key]: event.target.value }))} aria-label={t(f.labelKey)} data-testid={`select-filter-${f.key}`}>
                <option value="">{t(f.labelKey)}: {t('filterAny')}</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label ?? t(o.labelKey as TranslationKey, o.params)}</option>)}
              </Select>
            ))}
          </div>
        )}
      </div>

      <section id="listing-results" aria-live="polite" aria-busy={status === 'loading'} className="grid scroll-mt-24 gap-5">
        {status === 'loading' && (
          <div className={grid} aria-label={t('loading')}>{Array.from({ length: pageSize }, (_, index) => <div key={index}>{skeleton}</div>)}</div>
        )}
        {status === 'error' && <ErrorState onRetry={retryAll} />}
        {status === 'ready' && total === 0 && (
          <EmptyState message={t('noResults')} actionLabel={query || filtersActive ? t('clearFilters') : undefined} onAction={clearAll} />
        )}
        {status === 'ready' && total > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">{t('resultsCount', { count: format.number(total) })}</p>
              {/* Same badge the admin tables show: these cards are demo data because the API did not answer. */}
              {offline && <ContextBadge tone="warning">{t('demoBadge')}</ContextBadge>}
            </div>
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
