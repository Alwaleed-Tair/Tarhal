import { useState } from 'react';
import { DataTable, type Column } from '@/components/data-table';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { SuggestSearch } from '@/components/suggest-search';
import { EmptyState } from '@/components/empty-state';
import { Ltr } from '@/components/ltr';
import { ErrorState } from '@/components/error-state';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeleton';
import { useMockStatus } from '@/hooks/use-mock-loading';
import type { User, UserStatus } from '@/data/demoData';
import { useFormat, useT } from '@/i18n/use-i18n';
import { statusLabel, statusParam } from '@/i18n/labels';
import { notify } from '@/store/notificationStore';
import { updateUser, useDemoState } from '@/store/demoStore';

const STATUSES: UserStatus[] = ['Active', 'Inactive', 'Deleted'];

export default function Users() {
  const t = useT();
  const format = useFormat();
  // TODO / INTEGRATION POINT
  // INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here
  const { users } = useDemoState();
  const [filter, setFilter] = useState<'all' | UserStatus>('all');
  const [query, setQuery] = useState('');
  const { status: loadStatus, empty: forceEmpty, retry } = useMockStatus();
  const needle = query.trim().toLowerCase();
  const list = (forceEmpty ? [] : users).filter((row) =>
    (filter === 'all' || row.status === filter) &&
    (!needle || `${row.id} ${row.name} ${row.email}`.toLowerCase().includes(needle)));
  const activeCount = users.filter((row) => row.status === 'Active').length;
  const resetFilters = () => { setFilter('all'); setQuery(''); };

  function changeStatus(id: string, status: UserStatus) {
    updateUser(id, status);
    notify({ tone: status === 'Deleted' ? 'warning' : 'success', titleKey: 'statusUpdatedTitle', messageKey: 'userStatusUpdated', params: { id, status: statusParam(status) } });
  }

  const columns: Column<User>[] = [
    { key: 'id', width: '9%', header: t('userId'), cell: (row) => <Ltr>{row.id}</Ltr> },
    { key: 'name', width: '16%', header: t('fullName'), cell: (row) => row.name },
    { key: 'email', width: '22%', header: t('email'), muted: true, cell: (row) => <Ltr>{row.email}</Ltr> },
    { key: 'joined', width: '13%', header: t('joinDate'), muted: true, cell: (row) => format.date(row.date) },
    { key: 'bookings', width: '12%', header: t('totalBookings'), align: 'end', cell: (row) => format.number(row.bookings) },
    { key: 'status', width: '12%', header: t('status'), align: 'center', cell: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', width: '16%', header: t('actions'), align: 'end', cell: (row) => (
      <select className="select-control" value={row.status} onChange={(event) => changeStatus(row.id, event.target.value as UserStatus)} aria-label={`${t('status')} ${row.id}`} data-testid={`select-user-status-${row.id}`}>
        {STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status, t)}</option>)}
      </select>
    ) },
  ];

  return (
    <Layout>
      <section className="page-panel">
        <PageHeader
          section={t('users')}
          title={t('usersManagement')}
          subtitle={t('usersSubtitle')}
          badges={<>
            <ContextBadge>{t('recordsCount', { count: format.number(users.length) })}</ContextBadge>
            <ContextBadge tone="success">{t('activeCount', { count: format.number(activeCount) })}</ContextBadge>
          </>}
          actions={
            <SuggestSearch value={query} onChange={setQuery} placeholder={t('search')} testId="input-users-search"
              matches={list} getKey={(row) => row.id} pickValue={(row) => row.name}
              renderItem={(row) => <><span className="search-suggestion-id">{row.name}</span><span className="search-suggestion-details" dir="ltr">{row.email}</span></>} />
          }
        />
        <div className="filter-row">
          <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')} data-testid="filter-users-all">{t('all')}</button>
          {STATUSES.map((status) => (
            <button key={status} className={`filter-chip ${filter === status ? 'active' : ''}`} aria-pressed={filter === status} onClick={() => setFilter(status)} data-testid={`filter-users-${status}`}>{statusLabel(status, t)}</button>
          ))}
        </div>
        <div className="section-card">
          <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t('usersManagement')}>
            {loadStatus === 'loading' ? <TableSkeleton columns={columns.length} /> : loadStatus === 'error' ? <ErrorState onRetry={retry} /> : <>
            <DataTable caption={t('usersManagement')} columns={columns} rows={list} getKey={(row) => row.id} minWidth={1100} />
            {list.length === 0 && <EmptyState message={t('noResults')} actionLabel={filter !== 'all' || query ? t('clearFilters') : undefined} onAction={resetFilters} />}
            </>}
          </div>
        </div>
      </section>
    </Layout>
  );
}
