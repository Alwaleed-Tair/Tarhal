import { useState } from 'react';
import { DataTable, type Column } from '@/components/data-table';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { SuggestSearch } from '@/components/suggest-search';
import { EmptyState } from '@/components/empty-state';
import { Ltr } from '@/components/ltr';
import { ErrorState } from '@/components/error-state';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeleton';
import { useAdminData } from '@/hooks/use-admin-data';
import { userService } from '@/services/userService';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/pagination';
import type { User, UserStatus } from '@/data/demoData';
import { useFormat, useT } from '@/i18n/use-i18n';
import { statusLabel, statusParam } from '@/i18n/labels';
import { notify } from '@/store/notificationStore';
import { updateUser, useDemoState } from '@/store/demoStore';

const STATUSES: UserStatus[] = ['Active', 'Inactive', 'Deleted'];
const NO_USERS: User[] = [];

export default function Users() {
  const t = useT();
  const format = useFormat();
  // Live rows: every account from GET /api/admin/users. The demo store (with its status filters and status changes)
  // is only used when the server cannot be reached, with the Demo data badge.
  const { users: demoUsers } = useDemoState();
  const { data: liveUsers, status: loadStatus, offline, reload, error } = useAdminData<User[]>(() => userService.all(), () => demoUsers, NO_USERS, 'users');
  const users = offline ? demoUsers : liveUsers;
  const [filter, setFilter] = useState<'all' | UserStatus>('all');
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const list = users.filter((row) =>
    (filter === 'all' || row.status === filter) &&
    (!needle || `${row.id} ${row.name} ${row.email}`.toLowerCase().includes(needle)));
  const { page, totalPages, setPage, pageItems } = usePagination(list, 20, `${filter}|${needle}`);
  const activeCount = users.filter((row) => row.status === 'Active').length;
  const resetFilters = () => { setFilter('all'); setQuery(''); };

  function changeStatus(id: string, status: UserStatus) {
    updateUser(id, status);
    notify({ tone: status === 'Deleted' ? 'warning' : 'success', titleKey: 'statusUpdatedTitle', messageKey: 'userStatusUpdated', params: { id, status: statusParam(status) } });
  }

  const liveColumns: Column<User>[] = [
    { key: 'name', width: '22%', header: t('fullName'), cell: (row) => row.name },
    { key: 'email', width: '26%', header: t('email'), muted: true, cell: (row) => <Ltr>{row.email}</Ltr> },
    { key: 'phone', width: '16%', header: t('phone'), muted: true, cell: (row) => <Ltr>{row.phone ?? '—'}</Ltr> },
    { key: 'role', width: '11%', header: t('role'), cell: (row) => t(row.role === 'ADMIN' ? 'roleAdmin' : 'roleTraveler') },
    { key: 'joined', width: '13%', header: t('joinDate'), muted: true, cell: (row) => format.date(row.date) },
    { key: 'bookings', width: '12%', header: t('totalBookings'), align: 'end', cell: (row) => format.number(row.bookings) },
  ];
  const demoColumns: Column<User>[] = [
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

  const columns = offline ? demoColumns : liveColumns;

  return (
    <>
      <section className="page-panel">
        <PageHeader
          section={t('users')}
          title={t('usersManagement')}
          subtitle={offline ? t('usersSubtitle') : t('usersLiveSubtitle')}
          badges={<>
            <ContextBadge>{t('recordsCount', { count: format.number(users.length) })}</ContextBadge>
            {offline && <ContextBadge tone="success">{t('activeCount', { count: format.number(activeCount) })}</ContextBadge>}
            {offline && <ContextBadge tone="warning">{t('demoBadge')}</ContextBadge>}
          </>}
          actions={
            <SuggestSearch value={query} onChange={setQuery} placeholder={t('search')} testId="input-users-search"
              matches={list} getKey={(row) => row.id} pickValue={(row) => row.name}
              renderItem={(row) => <><span className="search-suggestion-id">{row.name}</span><span className="search-suggestion-details" dir="ltr">{row.email}</span></>} />
          }
        />
        {offline && <div className="filter-row">
          <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')} data-testid="filter-users-all">{t('all')}</button>
          {STATUSES.map((status) => (
            <button key={status} className={`filter-chip ${filter === status ? 'active' : ''}`} aria-pressed={filter === status} onClick={() => setFilter(status)} data-testid={`filter-users-${status}`}>{statusLabel(status, t)}</button>
          ))}
        </div>}
        <div className="section-card">
          <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t('usersManagement')}>
            {loadStatus === 'loading' ? <TableSkeleton columns={columns.length} /> : loadStatus === 'error' ? <ErrorState onRetry={reload} error={error} /> : <>
            {list.length > 0 && <DataTable caption={t('usersManagement')} columns={columns} rows={pageItems} getKey={(row) => row.id} minWidth={0} stackOnPhone />}
            {list.length === 0 && <EmptyState message={!offline && !query ? t('noCustomersYet') : t('noResults')} actionLabel={filter !== 'all' || query ? t('clearFilters') : undefined} onAction={resetFilters} />}
            </>}
          </div>
          {totalPages > 1 && <div className="table-pager"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>}
        </div>
      </section>
    </>
  );
}
