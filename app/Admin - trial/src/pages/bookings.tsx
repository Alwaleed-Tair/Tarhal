import { useState } from 'react';
import { DataTable, type Column } from '@/components/data-table';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { SuggestSearch } from '@/components/suggest-search';
import { EmptyState } from '@/components/empty-state';
import { Ltr } from '@/components/ltr';
import { ErrorState } from '@/components/error-state';
import { Money } from '@/components/money';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeleton';
import { useMockStatus } from '@/hooks/use-mock-loading';
import type { Booking, BookingStatus, ServiceFilter } from '@/data/demoData';
import { useFormat, useT } from '@/i18n/use-i18n';
import { statusLabel, statusParam } from '@/i18n/labels';
import { notify } from '@/store/notificationStore';
import { updateBooking, useDemoState } from '@/store/demoStore';

const STATUSES: BookingStatus[] = ['Confirmed', 'Pending', 'Cancelled'];
const FILTERS: ServiceFilter[] = ['all', 'flight', 'hotel', 'car'];

export default function Bookings() {
  const t = useT();
  const format = useFormat();
  // TODO / INTEGRATION POINT
  // INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
  const { bookings } = useDemoState();
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [query, setQuery] = useState('');
  const { status: loadStatus, empty: forceEmpty, retry } = useMockStatus();
  const needle = query.trim().toLowerCase();
  const list = (forceEmpty ? [] : bookings).filter((row) =>
    (filter === 'all' || row.type === filter) &&
    (!needle || `${row.id} ${row.customer} ${t(row.type)} ${statusLabel(row.status, t)}`.toLowerCase().includes(needle)));
  const pendingCount = bookings.filter((row) => row.status === 'Pending').length;
  const resetFilters = () => { setFilter('all'); setQuery(''); };

  function changeStatus(id: string, status: BookingStatus) {
    updateBooking(id, status);
    notify({ tone: status === 'Cancelled' ? 'warning' : 'success', titleKey: 'statusUpdatedTitle', messageKey: 'bookingStatusUpdated', params: { id, status: statusParam(status) } });
  }

  const columns: Column<Booking>[] = [
    { key: 'type', width: '10%', header: t('type'), cell: (row) => t(row.type) },
    { key: 'id', width: '12%', header: t('bookingId'), cell: (row) => <Ltr>{row.id}</Ltr> },
    { key: 'customer', width: '17%', header: t('customer'), cell: (row) => row.customer },
    { key: 'date', width: '19%', header: t('dateTime'), muted: true, cell: (row) => format.dateTime(row.date) },
    { key: 'price', width: '12%', header: t('totalPrice'), align: 'end', cell: (row) => <Money usd={row.price} /> },
    { key: 'status', width: '12%', header: t('status'), align: 'center', cell: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', width: '18%', header: t('actions'), align: 'end', cell: (row) => (
      <select className="select-control" value={row.status} onChange={(event) => changeStatus(row.id, event.target.value as BookingStatus)} aria-label={`${t('status')} ${row.id}`} data-testid={`select-status-${row.id}`}>
        {STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status, t)}</option>)}
      </select>
    ) },
  ];

  return (
    <Layout>
      <section className="page-panel">
        <PageHeader
          section={t('bookings')}
          title={t('allBookings')}
          subtitle={t('bookingsSubtitle')}
          badges={<>
            <ContextBadge>{t('recordsCount', { count: format.number(bookings.length) })}</ContextBadge>
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
            {loadStatus === 'loading' ? <TableSkeleton columns={columns.length} /> : loadStatus === 'error' ? <ErrorState onRetry={retry} /> : <>
            <DataTable caption={t('allBookings')} columns={columns} rows={list} getKey={(row) => row.id} minWidth={1100} />
            {list.length === 0 && <EmptyState message={t('noResults')} actionLabel={filter !== 'all' || query ? t('clearFilters') : undefined} onAction={resetFilters} />}
            </>}
          </div>
        </div>
      </section>
    </Layout>
  );
}
