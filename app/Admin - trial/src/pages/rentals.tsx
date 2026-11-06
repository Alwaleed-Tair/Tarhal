import { CarCard } from '@/components/listing-cards';
import { CardSkeleton, ListingView, type FilterDef, type SortOption } from '@/components/listing-view';
import { PublicLayout } from '@/components/public-layout';
import { carListings, type Car } from '@/data/listings';
import { useLiveData } from '@/hooks/use-live-data';
import { useT } from '@/i18n/use-i18n';
import { carService } from '@/services/carService';

const SORTS: SortOption<Car>[] = [
  { value: 'priceAsc', labelKey: 'sortPriceAsc', compare: (a, b) => a.pricePerDay - b.pricePerDay },
  { value: 'priceDesc', labelKey: 'sortPriceDesc', compare: (a, b) => b.pricePerDay - a.pricePerDay },
  { value: 'newest', labelKey: 'sortNewest', compare: (a, b) => b.year - a.year },
];
const FILTERS: FilterDef<Car>[] = [
  { key: 'transmission', labelKey: 'filterTransmission', options: [{ value: 'Automatic', labelKey: 'automatic' }, { value: 'Manual', labelKey: 'manual' }], matches: (car, value) => car.transmission === value },
  { key: 'seats', labelKey: 'filterSeats', options: [{ value: '5', labelKey: 'seats5Plus' }, { value: '7', labelKey: 'seats7Plus' }], matches: (car, value) => car.seats >= Number(value) },
];
const searchText = (car: Car) => `${car.make} ${car.model} ${car.year} ${car.transmission}`;

// Data: carService.listPublic() (GET /api/cars). Falls back to data/listings.ts when the backend is offline.
export default function Rentals() {
  const t = useT();
  const { data: cars, status } = useLiveData(() => carService.listPublic(), () => carListings, 'public-cars');
  return (
    <PublicLayout>
      <ListingView title={t('cars')} subtitle={t('rentalsSubtitle')} items={cars} loading={status === 'loading'} getKey={(car) => car.id} searchText={searchText}
        sorts={SORTS} filters={FILTERS} renderItem={(car) => <CarCard car={car} />} skeleton={<CardSkeleton />} />
    </PublicLayout>
  );
}
