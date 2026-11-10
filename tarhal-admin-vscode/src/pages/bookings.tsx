import { useMemo, useState } from 'react';
import { bookingService } from '@/services/bookingService';
import { friendlyWriteError } from '@/lib/write-error';
import { DataTable, type Column } from '@/components/data-table';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { SuggestSearch } from '@/components/suggest-search';
import { EmptyState } from '@/components/empty-state';
import { Ltr } from '@/components/ltr';
import { ErrorState } from '@/components/error-state';
import { Money } from '@/components/money';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeleton';
import { Pagination } from '@/components/pagination';
import { useAdminBookings } from '@/hooks/use-admin-bookings';
import { usePagination } from '@/hooks/use-pagination';
import type { Booking, BookingStatus, ServiceFilter } from '@/data/demoData';
import { isoToRiyadhLocal } from '@/i18n/format';
import type { TranslationKey } from '@/i18n/translations';
import { useFormat, useT } from '@/i18n/use-i18n';
import { shortId } from '@/lib/booking-stats';
import { statusLabel, statusParam } from '@/i18n/labels';
import { notify } from '@/store/notificationStore';
import { updateBooking, useDemoState } from '@/store/demoStore';

const STATUSES: BookingStatus[] = ['Confirmed', 'Pending', 'Cancelled'];
const FILTERS: ServiceFilter[] = ['all', 'flight', 'hotel', 'car'];
const TYPE_LABEL: Record<Exclude<ServiceFilter, 'all'>, TranslationKey> = { flight: 'flightSingular', hotel: 'hotelSingular', car: 'carSingular' };

/**
 * Live status actions of one booking: Mark paid (pending ones) and Cancel (active ones, after a confirmation).
 * PATCH /api/admin/bookings/:id; cancelling a flight releases its seats. The list reloads afterwards.
 */
function BookingActions({ row, onChanged }: { row: Booking; onChanged: () => void }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  if (row.status === 'Cancelled') return <span className="cell-muted">—</span>;
  const run = async (action: 'cancel' | 'markPaid') => {
    setBusy(true);
    setProblem('');
    try {
      await bookingService.setStatus(row.id, row.type, action);
      notify({ tone: action === 'cancel' ? 'warning' : 'success', titleKey: 'statusUpdatedTitle', messageKey: action === 'cancel' ? 'bookingCancelledNotice' : 'bookingPaidNotice', params: { id: shortId(row.id) } });
      onChanged();
    } catch (error) {
      setProblem(friendlyWriteError(error, t));
      setBusy(false);
    }
    setConfirming(false);
  };
  if (confirming) {
    return (
      <div className="row-actions flex flex-row flex-wrap items-center justify-end gap-2">
        <span className="cell-muted">{t('confirmCancelBooking')}</span>
        <button className="button button-ghost" onClick={() => setConfirming(false)} disabled={busy}>{t('keepBooking')}</button>
        <button className="button button-ghost button-ghost-danger" onClick={() => void run('cancel')} disabled={busy} data-testid={`button-confirm-cancel-booking-${row.id}`}>{t('cancelBookingAction')}</button>
      </div>
    );
  }
  return (
    <div className="row-actions flex flex-row flex-wrap items-center justify-end gap-2">
      {problem && <span className="field-error" role="alert">{problem}</span>}
      {row.paymentStatus === 'PENDING' && <button className="button button-ghost" onClick={() => void run('markPaid')} disabled={busy} data-testid={`button-mark-paid-${row.id}`}>{t('markPaid')}</button>}
      <button className="button button-ghost button-ghost-danger" onClick={() => setConfirming(true)} disabled={busy} data-testid={`button-cancel-booking-${row.id}`}>{t('cancelBookingAction')}</button>
    </div>
  );
}

export default function Bookings() {
  const t = useT();
  const format = useFormat();
  // GET /api/admin/bookings. Only when the server cannot be reached: the demo store, with the "Demo data" badge.
  const { bookings, status: loadStatus, offline, reload, error } = useAdminBookings();
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const { language } = useDemoState().settings;
  const list = useMemo(() => bookings.filter((row) =>
    (filter === 'all' || row.type === filter) &&
    (!needle || `${row.id} ${row.customer} ${t(row.type)} ${statusLabel(row.status, t)}`.toLowerCase().includes(needle))), [bookings, filter, needle, language]);
  const { page, totalPages, setPage, pageItems } = usePagination(list, 20, `${filter}|${needle}`);
  const pendingCount = bookings.filter((row) => row.status === 'Pending').length;
  const resetFilters = () => { setFilter('all'); setQuery(''); };

  function changeStatus(id: string, status: BookingStatus) {
    updateBooking(id, status);
    notify({ tone: status === 'Cancelled' ? 'warning' : 'success', titleKey: 'statusUpdatedTitle', messageKey: 'bookingStatusUpdated', params: { id, status: statusParam(status) } });
  }

  // Live data: Mark paid and Cancel buttons (PATCH /api/admin/bookings/:id). Demo data (server offline): the old status dropdown.
  const widths = ['14%', '10%', '15%', '17%', '11%', '11%'];
  const columns: Column<Booking>[] = [
    { key: 'type', width: widths[0], header: t('type'), cell: (row) => <span className="flex flex-col"><span>{t(TYPE_LABEL[row.type])}</span>{row.detail && <span className="cell-sub" dir="auto">{row.detail}</span>}</span> },
    { key: 'id', width: widths[1], header: t('bookingId'), cell: (row) => <span title={row.id}><Ltr>{shortId(row.id)}</Ltr></span> },
    { key: 'customer', width: widths[2], header: t('customer'), cell: (row) => row.customer },
    { key: 'date', width: widths[3], header: t('dateTime'), muted: true, cell: (row) => format.dateTime(isoToRiyadhLocal(row.date) || row.date) },
    { key: 'price', width: widths[4], header: t('totalPrice'), align: 'end', cell: (row) => <Money sar={row.price} /> },
    { key: 'status', width: widths[5], header: t('status'), align: 'center', cell: (row) => <StatusBadge status={row.status} /> },
    ...(!offline ? [{ key: 'actions', width: '22%', header: t('actions'), align: 'end' as const, cell: (row: Booking) => <BookingActions row={row} onChanged={reload} /> }] : [{ key: 'actions', width: '22%', header: t('actions'), align: 'end' as const, cell: (row: Booking) => (
      <select className="select-control" value={row.status} onChange={(event) => changeStatus(row.id, event.target.value as BookingStatus)} aria-label={`${t('status')} ${row.id}`} data-testid={`select-status-${row.id}`}>
        {STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status, t)}</option>)}
      </select>
    ) }]),
  ];

  return (
    <>
      <section className="page-panel">
        <PageHeader
          section={t('bookings')}
          title={t('allBookings')}
          subtitle={t('bookingsSubtitle')}
          badges={<>
            <ContextBadge>{t('recordsCount', { count: format.number(bookings.length) })}</ContextBadge>
            {offline && <ContextBadge tone="warning">{t('demoBadge')}</ContextBadge>}
            {pendingCount > 0 && <ContextBadge tone="warning">{t('pendingCount', { count: format.number(pendingCount) })}</ContextBadge>}
          </>}
          actions={
            <SuggestSearch value={query} onChange={setQuery} placeholder={t('search')} testId="input-bookings-search"
              matches={list} getKey={(row) => row.id} pickValue={(row) => row.id}
              renderItem={(row) => <><span className="search-suggestion-id" dir="ltr">{row.id}</span><span className="search-suggestion-details">{row.customer} · {t(row.type)}</span></>} />
          }
        />
        <div className="filter-row">
          {FILTERS.map((value) => (
            <button key={value} className={`filter-chip ${filter === value ? 'active' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)} data-testid={`filter-bookings-${value}`}>{t(value)}</button>
          ))}
        </div>
        <div className="section-card">
          <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t('allBookings')}>
            {loadStatus === 'loading' ? <TableSkeleton columns={columns.length} /> : loadStatus === 'error' ? <ErrorState onRetry={reload} error={error} /> : <>
            {list.length > 0 && <DataTable caption={t('allBookings')} columns={columns} rows={pageItems} getKey={(row) => row.id} minWidth={0} stackOnPhone />}
            {list.length === 0 && <EmptyState message={query ? t('noResults') : !offline && (filter === 'hotel' || filter === 'car') ? t('noDataYet') : t('noBookingsYet')} actionLabel={filter !== 'all' || query ? t('clearFilters') : undefined} onAction={resetFilters} />}
            </>}
          </div>
          {totalPages > 1 && <div className="table-pager"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>}
        </div>
      </section>
    </>
  );
}
