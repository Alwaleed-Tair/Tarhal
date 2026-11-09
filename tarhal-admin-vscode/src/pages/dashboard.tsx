import { lazy, Suspense, useMemo, useState, type ComponentProps } from 'react';
import type { Booking, Service, ServiceFilter } from '@/data/demoData';
import type { TranslationKey } from '@/i18n/translations';
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
import { useAdminBookings, useAdminFlights, useCatalogSummary } from '@/hooks/use-admin-bookings';
import { isoToRiyadhLocal } from '@/i18n/format';
import { useFormat, useT } from '@/i18n/use-i18n';
import { bookingDays, bookingMetrics, flightMetrics, monthlyMetrics, shortId } from '@/lib/booking-stats';

const TYPE_LABEL: Record<Service, TranslationKey> = { flight: 'flightSingular', hotel: 'hotelSingular', car: 'carSingular' };
const RevenueChart = lazy(() => import('@/components/revenue-chart'));
/** A trend line over fewer days than this says nothing. */
const MIN_TREND_DAYS = 3;

type Box = ComponentProps<typeof StatCard>;

export default function Dashboard() {
  const t = useT();
  const format = useFormat();
  const { bookings, status, offline: bookingsOffline, reload, error } = useAdminBookings();
  const { flights, status: flightsStatus, offline: flightsOffline } = useAdminFlights();
  const [service, setService] = useState<ServiceFilter>('all');
  const hotels = useCatalogSummary('hotel');
  const cars = useCatalogSummary('car');
  const offline = bookingsOffline || flightsOffline || hotels.offline || cars.offline;
  const flightTotals = useMemo(() => flightMetrics(flights), [flights]);
  const metrics = useMemo(() => bookingMetrics(bookings, service), [bookings, service]);
  const trends = useMemo(() => monthlyMetrics(bookings, new Date().getFullYear(), service), [bookings, service]);
  const showTrend = useMemo(() => bookingDays(bookings, service) >= MIN_TREND_DAYS, [bookings, service]);
  const loading = status === 'loading';
  // A service with no bookings from the API is labelled, never shown as zero. This follows the data, so it changes by itself when other bookings appear.
  const noData = !offline && (service === 'hotel' || service === 'car') && !bookings.some((row) => row.type === service);
  const recent = useMemo(() => bookings.filter((row) => service === 'all' || row.type === service).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [bookings, service]);

  const count = (value: number) => format.number(value);
  const money = (value: number) => <Money sar={value} />;
  // Failed data says so, and is never shown as zero.
  const stateOf = (dataStatus: 'loading' | 'ready' | 'error') => ({ loading: dataStatus === 'loading', noData: dataStatus === 'error', noDataLabel: t('couldNotLoad') });
  const bookingBox = { loading, noData };
  const flightBox = stateOf(flightsStatus), hotelBox = stateOf(hotels.status), carBox = stateOf(cars.status);
  const cancelledHint = <>{t('cancelled')}: {count(metrics.cancelled)}</>;
  const paidHint = <>{t('paidSoFar')}: {money(metrics.paid)}</>;
  const bookingsBox = (label: TranslationKey): Box => ({ label: t(label), value: metrics.bookings, render: count, series: showTrend ? trends.bookings : undefined, hint: cancelledHint, ...bookingBox });
  const valueBox = (label: TranslationKey): Box => ({ label: t(label), value: metrics.revenue, render: money, series: showTrend ? trends.revenue : undefined, hint: paidHint, ...bookingBox });
  const customersBox = (label: TranslationKey, hint?: Box['hint']): Box => ({ label: t(label), value: metrics.users, render: count, series: showTrend ? trends.users : undefined, hint, ...bookingBox });
  const flightsBox: Box = { label: t('totalFlights'), value: flightTotals.flights, render: count, ...flightBox };
  const hotelsBox: Box = { label: t('hotels'), value: hotels.data.total, render: count, ...hotelBox };
  const carsBox: Box = { label: t('availableCars'), value: cars.data.total, render: count, ...carBox };
  const boxes: Record<ServiceFilter, Box[]> = {
    all: [bookingsBox('totalBookings'), valueBox('totalRevenue'), customersBox('activeUsers', <>{t('allCustomers')}: {count(metrics.allCustomers)}</>), flightsBox, hotelsBox, carsBox],
    flight: [
      bookingsBox('flightBookings'), valueBox('flightBookedValue'), customersBox('flightCustomers'), flightsBox,
      { label: t('upcomingFlights'), value: flightTotals.upcoming, render: count, ...flightBox },
      { label: t('averageBasePrice'), value: flightTotals.averagePrice, render: money, ...flightBox },
    ],
    hotel: [hotelsBox, { label: t('averagePricePerNight'), value: hotels.data.averagePrice, render: money, ...hotelBox }, bookingsBox('hotelBookings'), valueBox('hotelBookedValue')],
    car: [carsBox, { label: t('averagePricePerDay'), value: cars.data.averagePrice, render: money, ...carBox }, bookingsBox('carBookings'), valueBox('carBookedValue')],
  };

  const columns: Column<Booking>[] = [
    { key: 'customer', width: '34%', header: t('customer'), cell: (row) => <span className="cell-stack">{row.customer}<span className="cell-sub">{t(TYPE_LABEL[row.type])} · <span title={row.id}><Ltr>{shortId(row.id)}</Ltr></span></span></span> },
    { key: 'date', width: '20%', header: t('bookingDate'), muted: true, cell: (row) => format.date(isoToRiyadhLocal(row.date) || row.date) },
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
            <select className="select-control" value={service} onChange={(event) => setService(event.target.value as ServiceFilter)} aria-label={t('filterByService')} data-testid="select-dashboard-service">
              <option value="all">{t('allServices')}</option><option value="flight">{t('flights')}</option><option value="hotel">{t('hotels')}</option><option value="car">{t('cars')}</option>
            </select>
          }
        />
        {status === 'error' ? <div className="section-card"><ErrorState onRetry={reload} error={error} /></div> : <>
          <div className={`metric-grid ${boxes[service].length === 4 ? 'metric-grid-four' : 'metric-grid-six'}`}>
            {boxes[service].map((box) => <StatCard key={box.label} {...box} />)}
          </div>
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
