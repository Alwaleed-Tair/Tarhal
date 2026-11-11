import { lazy, Suspense, useState } from 'react';
import { Dropdown } from '@/components/dropdown';
import type { ServiceFilter } from '@/data/demoData';
import { ErrorState } from '@/components/error-state';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { ChartSkeleton } from '@/components/skeleton';
import { useAdminBookings } from '@/hooks/use-admin-bookings';
import { useT } from '@/i18n/use-i18n';

const RevenueChart = lazy(() => import('@/components/revenue-chart'));

export default function Revenue() {
  const t = useT();
  const [service, setService] = useState<ServiceFilter>('all');
  const { bookings, status, offline, reload, error } = useAdminBookings();

  return (
    <>
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
            <Dropdown variant="field" className="dd-compact" value={service} onChange={(value) => setService(value as ServiceFilter)} label={t('filterByService')} testId="select-revenue-service"
              options={[{ value: 'all', label: t('allServices') }, { value: 'flight', label: t('flights') }, { value: 'hotel', label: t('hotels') }, { value: 'car', label: t('cars') }]} />
          }
        />
        <section className="chart-panel">
          {status === 'error' ? <ErrorState onRetry={reload} error={error} /> : <Suspense fallback={<ChartSkeleton />}><RevenueChart service={service} bookings={bookings} loading={status === 'loading'} offline={offline} showTotal allowCustomRange /></Suspense>}
        </section>
      </section>
    </>
  );
}
