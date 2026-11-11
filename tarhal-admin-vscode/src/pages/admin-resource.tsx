import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { CatalogFilterBar } from '@/components/catalog-filter-bar';
import { DataTable, type Column } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Ltr } from '@/components/ltr';
import { Money } from '@/components/money';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { ResourceModal } from '@/components/resource-modal';
import { TableSkeleton } from '@/components/skeleton';
import { StatCard } from '@/components/stat-card';
import { SuggestSearch } from '@/components/suggest-search';
import { initialResources, type ResourceRow, type Service } from '@/data/demoData';
import { useAdminBookings } from '@/hooks/use-admin-bookings';
import { useAdminData } from '@/hooks/use-admin-data';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePagination } from '@/hooks/use-pagination';
import { isoToRiyadhLocal, type Formatters } from '@/i18n/format';
import { translateCarCategory, translateValue } from '@/i18n/labels';
import type { Language, TranslationKey } from '@/i18n/translations';
import { useFormat, useT } from '@/i18n/use-i18n';
import { flightMetrics } from '@/lib/booking-stats';
import { catalogQuery, filterProblems, NO_FILTERS, type FilterKey } from '@/lib/catalog-query';
import { rowKey, type ModalMode } from '@/lib/resource-draft';
import type { Pagination as ApiPagination } from '@/services/api';
import { carService } from '@/services/carService';
import { flightService, type Airline } from '@/services/flightService';
import { hotelService } from '@/services/hotelService';
import { useDemoState } from '@/store/demoStore';

/**
 * Which buttons each table offers. Only what the real API has (app/api/admin/[...slug]/route.ts):
 * flights, hotels and cars: POST, PATCH and DELETE (DELETE answers 409 while the record has bookings; the page explains it).
 */
const WRITE_ACTIONS: Record<Service, Record<ModalMode, boolean>> = {
  flight: { add: true, edit: true, remove: true },
  hotel: { add: true, edit: true, remove: true },
  car: { add: true, edit: true, remove: true },
};
const NO_WRITES: Record<ModalMode, boolean> = { add: false, edit: false, remove: false };

const PAGE_SIZE = 20;

const heading: Record<Service, TranslationKey> = { flight: 'flightManagement', hotel: 'hotelManagement', car: 'carManagement' };
const singular: Record<Service, TranslationKey> = { flight: 'flightSingular', hotel: 'hotelSingular', car: 'carSingular' };
const sectionKey: Record<Service, TranslationKey> = { flight: 'flights', hotel: 'hotels', car: 'cars' };
const emptyKey: Record<Service, TranslationKey> = { flight: 'noFlightsYet', hotel: 'noHotelsYet', car: 'noCarsYet' };

type Listing = { rows: ResourceRow[]; total: number; totalPages: number };
const NO_ROWS: Listing = { rows: [], total: 0, totalPages: 1 };
const NO_AIRLINES: Airline[] = [];
const toListing = ({ rows, pagination }: { rows: ResourceRow[]; pagination?: ApiPagination }): Listing => ({ rows, total: pagination?.total ?? rows.length, totalPages: Math.max(1, pagination?.totalPages ?? 1) });

/** A new page for each kind, so filters, paging and search never leak from Hotels into Cars. */
export default function AdminResource({ kind }: { kind: Service }) {
  return <ResourcePage key={kind} kind={kind} />;
}

function ResourcePage({ kind }: { kind: Service }) {
  const t = useT();
  const format = useFormat();
  const lang = useDemoState().settings.language;

  // Hotels and cars: the filters and the page are sent to the API. Flights: GET /api/admin/flights has neither, so the search box and paging work on its list.
  const [filters, setFilters] = useState(NO_FILTERS);
  const problems = useMemo(() => filterProblems(kind, filters), [kind, filters]);
  const settled = useDebouncedValue(filters);
  const [request, setRequest] = useState({ query: catalogQuery(kind, NO_FILTERS), page: 1 });
  const [knownCities, setKnownCities] = useState<string[]>([]);

  useEffect(() => {
    if (Object.keys(filterProblems(kind, settled)).length > 0) return; // A value the API would refuse is explained at the field, not sent.
    const query = catalogQuery(kind, settled);
    setRequest((current) => (JSON.stringify(current.query) === JSON.stringify(query) ? current : { query, page: 1 }));
  }, [kind, settled]);

  const { data, status: loadStatus, offline, reload, error } = useAdminData<Listing>(
    () => {
      if (kind === 'flight') return flightService.adminList().then((rows) => ({ rows, total: rows.length, totalPages: 1 }));
      const params = { ...request.query, page: request.page, pageSize: PAGE_SIZE };
      // Cars: GET /api/admin/cars, so cars switched off (isAvailable false) are listed too and can be switched back on.
      return (kind === 'hotel' ? hotelService.list(params) : carService.adminList(params)).then(toListing);
    },
    () => ({ rows: initialResources[kind], total: initialResources[kind].length, totalPages: 1 }),
    NO_ROWS,
    JSON.stringify(request),
  );
  const { data: airlines } = useAdminData<Airline[]>(() => (kind === 'flight' ? flightService.airlineDirectory() : Promise.resolve(NO_AIRLINES)), () => NO_AIRLINES, NO_AIRLINES, kind);

  useEffect(() => {
    setKnownCities((current) => [...new Set([...current, ...data.rows.map((row) => row.city ?? '').filter(Boolean)])].sort());
  }, [data]);

  // Saving needs the server, so the demo data is read only.
  const can = offline ? NO_WRITES : WRITE_ACTIONS[kind];
  const [modal, setModal] = useState<{ mode: ModalMode; key: string } | null>(null);
  const [query, setQuery] = useState('');

  const needle = query.toLowerCase();
  const searched = useMemo(() => (kind === 'flight' && needle
    ? data.rows.filter((row) => `${row.id} ${row.airline ?? ''} ${row.airlineAr ?? ''} ${translateValue(row.airline ?? '', lang)} ${row.route ?? ''}`.toLowerCase().includes(needle))
    : data.rows), [kind, data.rows, needle, lang]);
  const flightPages = usePagination(searched, PAGE_SIZE, needle);
  const visible = kind === 'flight' ? flightPages.pageItems : data.rows;
  const page = kind === 'flight' ? flightPages.page : request.page;
  const totalPages = kind === 'flight' ? flightPages.totalPages : data.totalPages;
  const goToPage = (next: number) => { if (kind === 'flight') flightPages.setPage(next); else setRequest((current) => ({ ...current, page: next })); };

  const updateFilter = (key: FilterKey, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => setFilters(NO_FILTERS);
  const filtered = Object.values(filters).some(Boolean);

  const loading = loadStatus === 'loading';
  const dataState = { loading, noData: loadStatus === 'error', noDataLabel: t('couldNotLoad') };
  const count = (value: number) => format.number(value);
  const totals = useMemo(() => flightMetrics(data.rows), [data.rows]);
  // Hotel and car numbers come from GET /api/admin/bookings (type "hotel" / "car"): paid revenue and guests of active stays.
  const { bookings, status: bookingStatus } = useAdminBookings();
  const stays = useMemo(() => {
    const ofKind = bookings.filter((b) => b.type === kind);
    return {
      paid: ofKind.filter((b) => b.paymentStatus === 'PAID' && b.status !== 'Cancelled').reduce((sum, b) => sum + b.price, 0),
      guests: ofKind.filter((b) => b.status !== 'Cancelled').reduce((sum, b) => sum + (b.guests ?? 0), 0),
    };
  }, [bookings, kind]);
  const bookingState = { loading: bookingStatus === 'loading', noData: bookingStatus === 'error', noDataLabel: t('couldNotLoad') };
  const availableOnPage = data.rows.filter((row) => row.isAvailable !== false).length;
  const metrics = kind === 'flight'
    ? [
        { label: t('totalFlights'), value: totals.flights, render: count, ...dataState },
        { label: t('upcomingFlights'), value: totals.upcoming, render: count, ...dataState },
        { label: t('averageBasePrice'), value: totals.averagePrice, render: (value: number) => <Money sar={value} />, ...dataState },
      ]
    : kind === 'hotel'
      ? [
          { label: t('hotelsFound'), value: data.total, render: count, ...dataState },
          { label: t('paidHotelRevenue'), value: stays.paid, render: (value: number) => <Money sar={value} />, ...bookingState },
          { label: t('hotelGuests'), value: stays.guests, render: count, ...bookingState },
        ]
      : [
          { label: t('carsInFleet'), value: data.total, render: count, ...dataState },
          // Available on this page of the list (all of them when the list fits one page).
          { label: t('availableCars'), value: availableOnPage, render: count, ...dataState },
          { label: t('paidCarRevenue'), value: stays.paid, render: (value: number) => <Money sar={value} />, ...bookingState },
        ];

  const columns = resourceColumns({ kind, t, lang, format, can, onEdit: (key) => setModal({ mode: 'edit', key }), onRemove: (key) => setModal({ mode: 'remove', key }) });
  const subtitle: Record<Service, TranslationKey> = { flight: 'flightsSubtitle', hotel: can.add ? 'hotelsSubtitle' : 'hotelsReadOnlySubtitle', car: can.add ? 'carsSubtitle' : 'carsReadOnlySubtitle' };
  const noun = t(singular[kind]);

  return (
    <>
      <section className="page-panel">
        <PageHeader
          section={t(sectionKey[kind])}
          title={t(heading[kind])}
          subtitle={t(subtitle[kind])}
          badges={<>
            {!loading && loadStatus !== 'error' && <ContextBadge>{t('recordsCount', { count: format.number(data.total) })}</ContextBadge>}
            {offline && <ContextBadge tone="warning">{t('demoBadge')}</ContextBadge>}
          </>}
          actions={kind === 'flight' || can.add ? <>
            {kind === 'flight' && <SuggestSearch value={query} onChange={setQuery} placeholder={t('search')} testId="input-flight-search"
              matches={searched} getKey={rowKey} pickValue={(row) => row.id}
              renderItem={(row) => <><span className="search-suggestion-id"><Ltr>{row.id}</Ltr></span><span className="search-suggestion-details">{row.route}</span></>} />}
            {can.add && <button className="button button-primary" onClick={() => setModal({ mode: 'add', key: '' })} data-testid={`button-add-${kind}`}><Plus size={15} aria-hidden="true" />{t('add')} {noun}</button>}
          </> : undefined}
        />

        <div className="metric-grid">
          {metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
        </div>

        {kind !== 'flight' && <CatalogFilterBar kind={kind} filters={filters} problems={problems} cities={knownCities} onChange={updateFilter} onClear={clearFilters} />}

        <section className="section-card">
          <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t(heading[kind])} aria-busy={loading}>
            {loading ? <TableSkeleton columns={columns.length} /> : loadStatus === 'error' ? <ErrorState onRetry={reload} error={error} /> : visible.length === 0
              ? <EmptyState message={query || filtered ? t('noResults') : t(emptyKey[kind])} actionLabel={query ? t('clearSearch') : filtered ? t('clearFilters') : undefined} onAction={() => { setQuery(''); clearFilters(); }} />
              : <DataTable caption={t(heading[kind])} columns={columns} rows={visible} getKey={rowKey} minWidth={0} stackOnPhone />}
          </div>
          {!loading && loadStatus !== 'error' && totalPages > 1 && <div className="table-pager"><Pagination page={page} totalPages={totalPages} onPageChange={goToPage} /></div>}
        </section>
      </section>

      {modal && <ResourceModal kind={kind} mode={modal.mode} initialKey={modal.key} rows={data.rows} airlines={airlines} onClose={() => setModal(null)} onSaved={reload} />}
    </>
  );
}

type ColumnOptions = {
  kind: Service;
  t: ReturnType<typeof useT>;
  lang: Language;
  format: Formatters;
  can: Record<ModalMode, boolean>;
  onEdit: (key: string) => void;
  onRemove: (key: string) => void;
};

/** Edit / Remove buttons of one row. */
function RowActions({ kind, row, t, can, onEdit, onRemove }: Pick<ColumnOptions, 'kind' | 't' | 'can' | 'onEdit' | 'onRemove'> & { row: ResourceRow }) {
  const key = rowKey(row);
  return (
    <div className="row-actions flex flex-row items-center justify-center gap-3">
      {can.edit && <button className="button button-ghost" onClick={() => onEdit(key)} aria-label={`${t('edit')} ${row.id}`} data-testid={`button-edit-${kind}-${row.id}`}><Pencil size={14} aria-hidden="true" />{t('edit')}</button>}
      {can.remove && <button className="button button-ghost button-ghost-danger" onClick={() => onRemove(key)} aria-label={`${t('remove')} ${row.id}`} data-testid={`button-remove-${kind}-${row.id}`}><Trash2 size={14} aria-hidden="true" />{t('remove')}</button>}
    </div>
  );
}

/** Columns of the three tables, from the real fields of each model. The header and the cells come from this one list. */
function resourceColumns({ kind, t, lang, format, can, onEdit, onRemove }: ColumnOptions): Column<ResourceRow>[] {
  const hasActions = can.edit || can.remove;
  // With an Actions column the other columns give up 22% of the width (Edit and Remove side by side need about 175px).
  // Without any button there is no such column.
  const share = (full: number) => `${hasActions ? (full * 78) / 100 : full}%`;
  const actions: Column<ResourceRow> = { key: 'actions', width: '22%', header: t('actions'), align: 'end', cell: (row) => <RowActions kind={kind} row={row} t={t} can={can} onEdit={onEdit} onRemove={onRemove} /> };
  const text = (value: string | undefined): ReactNode => (value ? translateValue(value, lang) : '—');
  const price = (width: string, header: string): Column<ResourceRow> => ({ key: 'price', width, header, align: 'end', cell: (row) => <Money sar={row.price} /> });

  if (kind === 'flight') {
    const airlineName = (row: ResourceRow) => (lang === 'ar' ? row.airlineAr || translateValue(row.airline ?? '', lang) : row.airline) || '—';
    const flightColumns: Column<ResourceRow>[] = [
      { key: 'name', width: share(17), header: t('flightNumber'), cell: (row) => <Ltr>{row.id}</Ltr> },
      { key: 'airline', width: share(21), header: t('airline'), cell: airlineName },
      { key: 'details', width: share(21), header: t('route'), cell: (row) => <Ltr>{row.route ?? ''}</Ltr> },
      { key: 'departure', width: share(24), header: t('departureTime'), muted: true, cell: (row) => (row.departureTime ? format.dateTime(isoToRiyadhLocal(row.departureTime)) : '—') },
      price(share(17), t('price')),
    ];
    if (hasActions) flightColumns.push(actions);
    return flightColumns;
  }
  const columns: Column<ResourceRow>[] = kind === 'hotel'
    ? [
        { key: 'name', width: share(30), header: t('hotelName'), cell: (row) => text(row.id) },
        { key: 'city', width: share(18), header: t('city'), cell: (row) => text(row.city) },
        { key: 'room', width: share(20), header: t('roomType'), cell: (row) => text(row.roomType) },
        { key: 'rating', width: share(12), header: t('colRating'), align: 'center', cell: (row) => (row.rating === undefined ? '—' : format.rating(row.rating)) },
        price(share(20), t('nightlyPrice')),
      ]
    : [
        { key: 'name', width: share(24), header: t('colCar'), cell: (row) => <span>{text(row.make)} {text(row.model)} <Ltr>{row.year ? String(row.year) : ''}</Ltr></span> },
        { key: 'city', width: share(12), header: t('city'), cell: (row) => text(row.city) },
        { key: 'type', width: share(21), header: t('colType'), cell: (row) => <span>{row.category ? translateCarCategory(row.category, lang) : '—'} · {t(row.transmission === 'MANUAL' ? 'manual' : 'automatic')}</span> },
        { key: 'seats', width: share(9), header: t('colSeats'), align: 'center', cell: (row) => format.number(row.seats ?? 0) },
        { key: 'availability', width: share(19), header: t('availability'), align: 'center', cell: (row) => <span className={`status status-pill status-${row.isAvailable === false ? 'limited' : 'available'}`} data-testid={`car-availability-${row.apiId}`}>{t(row.isAvailable === false ? 'unavailableCar' : 'availableCar')}</span> },
        price(share(15), t('dailyPrice')),
      ];
  if (hasActions) columns.push(actions);
  return columns;
}
