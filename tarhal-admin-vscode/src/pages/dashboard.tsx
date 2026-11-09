import { lazy, Suspense, useMemo, useState } from 'react';
import type { Booking, ServiceFilter } from '@/data/demoData';
import { DataTable, type Column } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { Ltr } from '@/components/ltr';
import { ChartSkeleton, TableSkeleton } from '@/components/skeleton';
import { StatCard } from '@/components/stat-card';
import { Money } from '@/components/money';
import { StatusBadge } from '@/components/status-badge';
import { useAdminBookings, useAdminFlights } from '@/hooks/use-admin-bookings';
import { useFormat, useT } from '@/i18n/use-i18n';
import { bookingMetrics, flightMetrics, monthlyMetrics, shortId } from '@/lib/booking-stats';

const RevenueChart = lazy(() => import('@/components/revenue-chart'));

export default function Dashboard() {
  const t = useT();
  const format = useFormat();
  const { bookings, status, offline: bookingsOffline, reload } = useAdminBookings();
  const { flights, status: flightsStatus, offline: flightsOffline } = useAdminFlights();
  const [service, setService] = useState<ServiceFilter>('all');
  const offline = bookingsOffline || flightsOffline;
  const flightTotals = useMemo(() => flightMetrics(flights), [flights]);
  const flightState = { loading: flightsStatus === 'loading', noData: flightsStatus === 'error', noDataLabel: t('couldNotLoad') };
  const metrics = useMemo(() => bookingMetrics(bookings, service), [bookings, service]);
  const trends = useMemo(() => monthlyMetrics(bookings, new Date().getFullYear(), service), [bookings, service]);
  const loading = status === 'loading';
  // Hotel and car booking APIs do not exist yet: their numbers are labelled, never shown as zero.
  const noData = !offline && (service === 'hotel' || service === 'car');
  const recent = useMemo(() => bookings.filter((row) => service === 'all' || row.type === service).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [bookings, service]);
  const metricState = { loading, noData };

  const columns: Column<Booking>[] = [
    { key: 'customer', width: '34%', header: t('customer'), cell: (row) => <span className="cell-stack">{row.customer}<span className="cell-sub">{t(row.type)} · <span title={row.id}><Ltr>{shortId(row.id)}</Ltr></span></span></span> },
    { key: 'date', width: '20%', header: t('bookingDate'), muted: true, cell: (row) => format.date(row.date) },
    { key: 'price', width: '21%', header: t('totalPrice'), align: 'end', cell: (row) => <Money sar={row.price} /> },
    { key: 'status', width: '25%', header: t('status'), align: 'center', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <Layout>
      <section className="page-panel dash">
        <PageHeader
          section={t('dashboard')}
          title={t('dashboard')}
          subtitle={t('dashboardSubtitle')}
          badges={offline ? <ContextBadge tone="warning">{t('demoBadge')}</ContextBadge> : undefined}
          actions={
            <select className="select-control" value={service} onChange={(event) => setService(event.target.value as ServiceFilter)} aria-label={t('revenueByService')} data-testid="select-dashboard-service">
              <option value="all">{t('allServices')}</option><option value="flight">{t('flights')}</option><option value="hotel">{t('hotels')}</option><option value="car">{t('cars')}</option>
            </select>
          }
        />
        {status === 'error' ? <div className="section-card"><ErrorState onRetry={reload} /></div> : <>
          <div className="metric-grid">
            <StatCard label={t('totalBookings')} value={metrics.bookings} render={(n) => format.number(n)} series={trends.bookings} {...metricState} />
            <StatCard label={t('totalRevenue')} value={metrics.revenue} render={(n) => <Money sar={n} />} series={trends.revenue} hint={<>{t('paidSoFar')}: <Money sar={metrics.paid} /></>} {...metricState} />
            <StatCard label={t('activeUsers')} value={metrics.users} render={(n) => format.number(n)} series={trends.users} {...metricState} />
            {(service === 'all' || service === 'flight') && <>
              <StatCard label={t('totalFlights')} value={flightTotals.flights} render={(n) => format.number(n)} {...flightState} />
              <StatCard label={t('upcomingFlights')} value={flightTotals.upcoming} render={(n) => format.number(n)} {...flightState} />
              <StatCard label={t('averageBasePrice')} value={flightTotals.averagePrice} render={(n) => <Money sar={n} />} {...flightState} />
            </>}
          </div>
          {!offline && <p className="metric-note" data-testid="metrics-no-data-note">{t('noDataYet')}: {t('registeredUsers')} · {t('hotelRevenue')} · {t('carsRevenue')}</p>}
          <div className="content-grid">
            <section className="section-card">
              <h2 className="section-title">{t('recentTransactions')}</h2>
              <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t('recentTransactions')}>
                {loading ? <TableSkeleton columns={columns.length} rows={3} /> : recent.length === 0
                  ? <EmptyState message={noData ? t('noDataYet') : t('noBookingsYet')} />
                  : <DataTable caption={t('recentTransactions')} columns={columns} rows={recent} getKey={(row) => row.id} minWidth={0} stackOnPhone />}
              </div>
            </section>
            <section className="section-card">
              <h2 className="section-title">{t('revenueByService')}</h2>
              <div className="section-body"><Suspense fallback={<ChartSkeleton />}><RevenueChart service={service} bookings={bookings} loading={loading} offline={offline} /></Suspense></div>
            </section>
          </div>
        </>}
      </section>
    </Layout>
  );
}
