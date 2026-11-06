import { useState } from 'react';
import type { ServiceFilter } from '@/data/demoData';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import RevenueChart from '@/components/revenue-chart';
import { useT } from '@/i18n/use-i18n';

export default function Revenue() {
  const t = useT();
  const [service, setService] = useState<ServiceFilter>('all');

  return (
    <Layout>
      <section className="page-panel">
        <PageHeader
          section={t('revenue')}
          title={t('revenueOverview')}
          subtitle={t('revenueSubtitle')}
          badges={<ContextBadge>{t(service === 'all' ? 'allServices' : service)}</ContextBadge>}
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
          <RevenueChart service={service} showTotal />
        </section>
      </section>
    </Layout>
  );
}
