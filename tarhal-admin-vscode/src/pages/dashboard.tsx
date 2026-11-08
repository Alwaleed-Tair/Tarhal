import { useState, type ReactNode } from 'react';
import type { Booking, ServiceFilter } from '@/data/demoData';
import { DataTable, type Column } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { Ltr } from '@/components/ltr';
import RevenueChart from '@/components/revenue-chart';
import { Money } from '@/components/money';
import { StatusBadge } from '@/components/status-badge';
import { useAdminBookings } from '@/hooks/use-admin-bookings';
import { useFormat, useT } from '@/i18n/use-i18n';
import { bookingMetrics, shortId } from '@/lib/booking-stats';

export default function Dashboard() {
  const t = useT();
  const format = useFormat();
  const { bookings, status, offline, reason } = useAdminBookings();
  const [service, setService] = useState<ServiceFilter>('all');
  // TODO / INTEGRATION POINT
  // INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
  const metrics = bookingMetrics(bookings, service);
  const loading = status === 'loading';
  // Hotel and car booking APIs do not exist yet: their numbers are labelled, never shown as zero.
  const noData = !offline && (service === 'hotel' || service === 'car');
  const recent = bookings.filter((row) => service === 'all' || row.type === service).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const show = (value: ReactNode) => (loading ? '…' : noData ? <span className="metric-no-data">{t('noDataYet')}</span> : value);

  const columns: Column<Booking>[] = [
    { key: 'type', width: '20%', header: t('type'), cell: (row) => t(row.type) },
    { key: 'id', width: '25%', header: t('bookingId'), cell: (row) => <span title={row.id}><Ltr>{shortId(row.id)}</Ltr></span> },
    { key: 'customer', width: '30%', header: t('customer'), cell: (row) => row.customer },
    { key: 'status', width: '25%', header: t('status'), align: 'center', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <Layout>
      <section className="page-panel">
        <PageHeader
          section={t('dashboard')}
          title={t('dashboard')}
          subtitle={t('dashboardSubtitle')}
          badges={offline ? <ContextBadge tone="warning">{t('demoBadge')} · {reason}</ContextBadge> : undefined}
          actions={
            <select className="select-control" value={service} onChange={(event) => setService(event.target.value as ServiceFilter)} aria-label={t('revenueByService')} data-testid="select-dashboard-service">
              <option value="all">{t('allServices')}</option><option value="flight">{t('flights')}</option><option value="hotel">{t('hotels')}</option><option value="car">{t('cars')}</option>
            </select>
          }
        />
        <div className="metric-grid">
          <Metric label={t('totalBookings')} value={show(format.number(metrics.bookings))} />
          <Metric label={t('totalRevenue')} value={show(<Money sar={metrics.revenue} />)} />
          <Metric label={t('activeUsers')} value={show(format.number(metrics.users))} />
        </div>
        <div className="content-grid">
          <section className="section-card">
            <h2 className="section-title">{t('recentTransactions')}</h2>
            <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t('recentTransactions')}>
              {!loading && <DataTable caption={t('recentTransactions')} columns={columns} rows={recent} getKey={(row) => row.id} minWidth={640} />}
              {!loading && recent.length === 0 && <EmptyState message={noData ? t('noDataYet') : t('noResults')} />}
            </div>
          </section>
          <section className="section-card">
            <h2 className="section-title">{t('revenueByService')}</h2>
            <div className="section-body"><RevenueChart service={service} bookings={bookings} loading={loading} offline={offline} /></div>
          </section>
        </div>
      </section>
    </Layout>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="metric-card h-auto overflow-visible py-6" data-testid={`metric-${label}`}><span className="metric-label">{label}</span><strong className="metric-value block leading-tight">{value}</strong></div>;
}