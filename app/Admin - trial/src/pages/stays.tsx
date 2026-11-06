import { CardSkeleton, ListingView, type FilterDef, type SortOption } from '@/components/listing-view';
import { HotelCard } from '@/components/listing-cards';
import { PublicLayout } from '@/components/public-layout';
import { hotelListings, type Hotel } from '@/data/listings';
import { useLiveData } from '@/hooks/use-live-data';
import { useT } from '@/i18n/use-i18n';
import { hotelService } from '@/services/hotelService';

const SORTS: SortOption<Hotel>[] = [
  { value: 'rating', labelKey: 'sortRating', compare: (a, b) => b.rating - a.rating },
  { value: 'name', labelKey: 'sortName', compare: (a, b) => a.name.localeCompare(b.name) },
];
const FILTERS: FilterDef<Hotel>[] = [
  { key: 'rating', labelKey: 'filterRating', options: [{ value: '4', labelKey: 'ratingFrom40' }, { value: '4.5', labelKey: 'ratingFrom45' }], matches: (hotel, value) => hotel.rating >= Number(value) },
];
const searchText = (hotel: Hotel) => `${hotel.name} ${hotel.nameAr} ${hotel.address} ${hotel.addressAr}`;

// Data: hotelService.listPublic() (GET /api/hotels). Falls back to data/listings.ts when the backend is offline.
export default function Stays() {
  const t = useT();
  const { data: hotels, status } = useLiveData(() => hotelService.listPublic(), () => hotelListings, 'public-hotels');
  return (
    <PublicLayout>
      <ListingView title={t('hotels')} subtitle={t('staysSubtitle')} items={hotels} loading={status === 'loading'} getKey={(hotel) => hotel.id} searchText={searchText}
        sorts={SORTS} filters={FILTERS} renderItem={(hotel) => <HotelCard hotel={hotel} />} skeleton={<CardSkeleton image />} />
    </PublicLayout>
  );
}
