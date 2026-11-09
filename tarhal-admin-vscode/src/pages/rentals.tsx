import { useMemo } from 'react';
import { CarCard } from '@/components/listing-cards';
import { CardSkeleton, ListingView, priceFilter, type FilterDef, type ListingSource, type SortOption } from '@/components/listing-view';
import { PublicLayout } from '@/components/public-layout';
import { carListings, type Car } from '@/data/listings';
import { useLiveData } from '@/hooks/use-live-data';
import { useT } from '@/i18n/use-i18n';
import { carService } from '@/services/carService';

// The API returns cars sorted by price per day (ascending): the first (default) sort keeps server paging correct.
// The API has no other sort: the others work on up to 100 rows loaded from the API.
const SORTS: SortOption<Car>[] = [
  { value: 'priceAsc', labelKey: 'sortPriceAsc', compare: (a, b) => a.pricePerDay - b.pricePerDay },
  { value: 'priceDesc', labelKey: 'sortPriceDesc', compare: (a, b) => b.pricePerDay - a.pricePerDay },
  { value: 'newest', labelKey: 'sortNewest', compare: (a, b) => b.year - a.year },
];
const YEARS = [2022, 2023, 2024];
const searchText = (car: Car) => `${car.make} ${car.model} ${car.year} ${car.transmission} ${car.city ?? ''}`;
const distinct = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();

/** Filters sent to GET /api/cars: city, make, minPrice + maxPrice (SAR), minYear, transmission, minSeats. City and make choices come from the cars. */
function buildFilters(cars: Car[]): FilterDef<Car>[] {
  return [
    { key: 'city', labelKey: 'filterCity', options: distinct(cars.map((car) => car.city)).map((city) => ({ value: city, label: city })), matches: (car, value) => car.city === value, param: (value) => ({ city: value }) },
    { key: 'make', labelKey: 'filterMake', options: distinct(cars.map((car) => car.make)).map((make) => ({ value: make, label: make })), matches: (car, value) => car.make === value, param: (value) => ({ make: value }) },
    priceFilter<Car>([[0, 100], [100, 200], [200, 400]], 400, (car) => car.pricePerDay),
    { key: 'year', labelKey: 'filterYear', options: YEARS.map((year) => ({ value: String(year), labelKey: 'yearFrom' as const, params: { year } })), matches: (car, value) => car.year >= Number(value), param: (value) => ({ minYear: value }) },
    { key: 'transmission', labelKey: 'filterTransmission', options: [{ value: 'Automatic', labelKey: 'automatic' }, { value: 'Manual', labelKey: 'manual' }], matches: (car, value) => car.transmission === value, param: (value) => ({ transmission: value.toUpperCase() }) },
    { key: 'seats', labelKey: 'filterSeats', options: [{ value: '5', labelKey: 'seats5Plus' }, { value: '7', labelKey: 'seats7Plus' }], matches: (car, value) => car.seats >= Number(value), param: (value) => ({ minSeats: value }) },
  ];
}

const source: ListingSource<Car> = { load: ({ params, page, pageSize }) => carService.listPage({ ...params, page, pageSize }) };

// Data: GET /api/cars (filters + paging done by the API, see ListingView). Falls back to data/listings.ts when the backend is offline.
export default function Rentals() {
  const t = useT();
  const { data: cars } = useLiveData(() => carService.listPublic(), () => carListings, 'public-cars');
  const filters = useMemo(() => buildFilters(cars), [cars]);
  return (
    <PublicLayout>
      <ListingView title={t('cars')} subtitle={t('rentalsSubtitle')} items={cars} getKey={(car) => car.id} searchText={searchText}
        sorts={SORTS} filters={filters} source={source} renderItem={(car) => <CarCard car={car} />} skeleton={<CardSkeleton />} />
    </PublicLayout>
  );
}
