import { lazy, Suspense, useState } from 'react';
import type { ServiceFilter } from '@/data/demoData';
import { ErrorState } from '@/components/error-state';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { ChartSkeleton } from '@/components/skeleton';
import { useAdminBookings } from '@/hooks/use-admin-bookings';
import { useT } from '@/i18n/use-i18n';

const RevenueChart = lazy(() => import('@/components/revenue-chart'));

export default function Revenue() {
  const t = useT();
  const [service, setService] = useState<ServiceFilter>('all');
  const { bookings, status, offline, reload } = useAdminBookings();

  return (
    <Layout>
      <section className="page-panel">
        <PageHeader
          section={t('revenue')}
          title={t('revenueOverview')}
          subtitle={t('revenueSubtitle')}
          badges={<>
            <ContextBadge>{t(service === 'all' ? 'allServices' : service)}</ContextBadge>
            {offline && <ContextBadge tone="warning">{t('demoBadge')}</ContextBadge>}
          </>}
          actions={
            <select className="select-control" value={service} onChange={(event) => setService(event.target.value as ServiceFilter)} aria-label={t('allServices')} data-testid="select-revenue-service">
              <option value="all">{t('allServices')}</option>
              <option value="flight">{t('flights')}</option>
              <option value="hotel">{t('hotels')}</option>
              <option value="car">{t('cars')}</option>
            </select>
          }
        />
        <section className="chart-panel">
          {status === 'error' ? <ErrorState onRetry={reload} /> : <Suspense fallback={<ChartSkeleton />}><RevenueChart service={service} bookings={bookings} loading={status === 'loading'} offline={offline} showTotal allowCustomRange /></Suspense>}
        </section>
      </section>
    </Layout>
  );
}
