import { useMemo } from 'react';
import { CardSkeleton, ListingView, type FilterDef, type ListingSource, type SortOption } from '@/components/listing-view';
import { HotelCard } from '@/components/listing-cards';
import { PublicLayout } from '@/components/public-layout';
import { hotelListings, type Hotel } from '@/data/listings';
import { useLiveData } from '@/hooks/use-live-data';
import { useT } from '@/i18n/use-i18n';
import { hotelService } from '@/services/hotelService';

// The API returns hotels sorted by price (ascending), so that is the first (default) sort: it is what keeps server paging correct.
// Sorting by rating or name works on up to 100 rows loaded from the API.
const SORTS: SortOption<Hotel>[] = [
  { value: 'priceAsc', labelKey: 'sortPriceAsc', compare: (a, b) => (a.pricePerNightSar ?? 0) - (b.pricePerNightSar ?? 0) },
  { value: 'rating', labelKey: 'sortRating', compare: (a, b) => b.rating - a.rating },
  { value: 'name', labelKey: 'sortName', compare: (a, b) => a.name.localeCompare(b.name) },
];
const PRICE_STEPS_SAR = [200, 300, 400, 600];
const searchText = (hotel: Hotel) => `${hotel.name} ${hotel.nameAr} ${hotel.address} ${hotel.addressAr} ${hotel.city ?? ''}`;

/** Filters sent to GET /api/hotels: city, maxPrice (SAR), minRating. City choices come from the hotels themselves. */
function buildFilters(hotels: Hotel[]): FilterDef<Hotel>[] {
  const cities = [...new Set(hotels.map((hotel) => hotel.city).filter((city): city is string => Boolean(city)))].sort();
  return [
    { key: 'city', labelKey: 'filterCity', options: cities.map((city) => ({ value: city, label: city })), matches: (hotel, value) => hotel.city === value, param: (value) => ({ city: value }) },
    { key: 'price', labelKey: 'filterPrice', options: PRICE_STEPS_SAR.map((price) => ({ value: String(price), labelKey: 'priceUpTo' as const, params: { price } })),
      matches: (hotel, value) => hotel.pricePerNightSar === undefined || hotel.pricePerNightSar <= Number(value), param: (value) => ({ maxPrice: Number(value) }) },
    { key: 'rating', labelKey: 'filterRating', options: [{ value: '4', labelKey: 'ratingFrom40' }, { value: '4.5', labelKey: 'ratingFrom45' }],
      matches: (hotel, value) => hotel.rating >= Number(value), param: (value) => ({ minRating: Number(value) }) },
  ];
}

const source: ListingSource<Hotel> = { load: ({ params, page, pageSize }) => hotelService.listPage({ ...params, page, pageSize }) };

// Data: GET /api/hotels (filters + paging done by the API, see ListingView). Falls back to data/listings.ts when the backend is offline.
export default function Stays() {
  const t = useT();
  // Unfiltered list: the source of the city options and the offline fallback.
  const { data: hotels } = useLiveData(() => hotelService.listPublic(), () => hotelListings, 'public-hotels');
  const filters = useMemo(() => buildFilters(hotels), [hotels]);
  return (
    <PublicLayout>
      <ListingView title={t('hotels')} subtitle={t('staysSubtitle')} items={hotels} getKey={(hotel) => hotel.id} searchText={searchText}
        sorts={SORTS} filters={filters} source={source} renderItem={(hotel) => <HotelCard hotel={hotel} />} skeleton={<CardSkeleton image />} />
    </PublicLayout>
  );
}
