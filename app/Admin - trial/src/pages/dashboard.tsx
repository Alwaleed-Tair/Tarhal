import { useState, type ReactNode } from 'react';
import { metricsByService, type Booking, type ServiceFilter } from '@/data/demoData';
import { DataTable, type Column } from '@/components/data-table';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { Ltr } from '@/components/ltr';
import RevenueChart from '@/components/revenue-chart';
import { Money } from '@/components/money';
import { StatusBadge } from '@/components/status-badge';
import { useFormat, useT } from '@/i18n/use-i18n';
import { useDemoState } from '@/store/demoStore';

export default function Dashboard() {
  const t = useT();
  const format = useFormat();
  const { bookings } = useDemoState();
  const [service, setService] = useState<ServiceFilter>('all');
  // TODO / INTEGRATION POINT
  // INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
  const metrics = metricsByService[service];

  const columns: Column<Booking>[] = [
    { key: 'type', width: '20%', header: t('type'), cell: (row) => t(row.type) },
    { key: 'id', width: '25%', header: t('bookingId'), cell: (row) => <Ltr>{row.id}</Ltr> },
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
          badges={<ContextBadge tone="success">{t('demoBadge')}</ContextBadge>}
          actions={
            <select className="select-control" value={service} onChange={(event) => setService(event.target.value as ServiceFilter)} aria-label={t('revenueByService')} data-testid="select-dashboard-service">
              <option value="all">{t('allServices')}</option><option value="flight">{t('flights')}</option><option value="hotel">{t('hotels')}</option><option value="car">{t('cars')}</option>
            </select>
          }
        />
        <div className="metric-grid">
          <Metric label={t('totalBookings')} value={format.number(metrics.bookings)} />
          <Metric label={t('totalRevenue')} value={<Money usd={metrics.revenue} />} />
          <Metric label={t('activeUsers')} value={format.number(metrics.users)} />
        </div>
        <div className="content-grid">
          <section className="section-card">
            <h2 className="section-title">{t('recentTransactions')}</h2>
            <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t('recentTransactions')}>
              <DataTable caption={t('recentTransactions')} columns={columns} rows={bookings.slice(0, 3)} getKey={(row) => row.id} minWidth={640} />
            </div>
          </section>
          <section className="section-card">
            <h2 className="section-title">{t('revenueByService')}</h2>
            <div className="section-body"><RevenueChart service={service} /></div>
          </section>
        </div>
      </section>
    </Layout>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="metric-card h-auto overflow-visible py-6" data-testid={`metric-${label}`}><span className="metric-label">{label}</span><strong className="metric-value block leading-tight">{value}</strong></div>;
}