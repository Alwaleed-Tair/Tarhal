import { api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Paginated, type Raw } from '@/services/api';
import type { ResourceRow } from '@/data/demoData';
import type { Hotel } from '@/data/listings';

/** Real fields of the Hotel model in prisma/schema.prisma. The API has no status or availability for hotels. */
const toRow = (r: Raw): ResourceRow => ({
  id: str(pick(r, 'name')),
  apiId: pick(r, 'id') as string | number | undefined,
  city: str(pick(r, 'city')),
  address: str(pick(r, 'address')),
  roomType: str(pick(r, 'roomType')),
  rating: num(pick(r, 'rating')),
  imageUrl: str(pick(r, 'imageUrl')),
  price: num(pick(r, 'pricePerNight')),
});

/** Public hotel card (Stays page). Field names are guesses: ask Mohammed and adjust the pick(...) keys. */
const toHotel = (r: Raw): Hotel => {
  const name = str(pick(r, 'name', 'hotelName'));
  const address = str(pick(r, 'address', 'location', 'city'));
  return {
    id: str(pick(r, 'id')),
    name,
    nameAr: str(pick(r, 'nameAr', 'name_ar')) || name,
    address,
    addressAr: str(pick(r, 'addressAr', 'address_ar')) || address,
    rating: num(pick(r, 'rating', 'stars')),
    image: str(pick(r, 'imageUrl', 'image', 'thumbnail', 'photo')) || '/images/hotels/none.jpg', // missing file -> gradient placeholder
    city: str(pick(r, 'city')) || undefined,
    pricePerNight: pick(r, 'pricePerNight', 'price') === undefined ? undefined : num(pick(r, 'pricePerNight', 'price')),
  };
};

/** Hotel fields an admin can set. `pricePerNight` is SAR. */
export type HotelInput = { name: string; city: string; address?: string; roomType: string; pricePerNight: number; rating: number; imageUrl?: string };
/** What GET /api/hotels accepts (lib/catalog-filters.ts). Any other query parameter is answered with 400. */
export type HotelQuery = { page: number; pageSize: number; city?: string; roomType?: string; minPrice?: string; maxPrice?: string; minRating?: string };

export const hotelService = {
  /**
   * POST and PATCH /api/admin/hotels do not exist yet (Saud). The buttons stay hidden by WRITE_ACTIONS in pages/admin-resource.tsx.
   * The page reloads after a save, so nothing depends on the shape of the response.
   */
  async create(input: HotelInput): Promise<void> {
    assertWrite((await api.post<Envelope<Raw>>('/admin/hotels', input)).data);
  },
  async update(apiId: string | number, input: Partial<HotelInput>): Promise<void> {
    assertWrite((await api.patch<Envelope<Raw>>(`/admin/hotels/${encodeURIComponent(String(apiId))}`, input)).data);
  },
  /**
   * Public Stays page: one page from GET /api/hotels. Filters the API really supports (lib/catalog-filters.ts):
   * city, roomType, minPrice, maxPrice, minRating, page, pageSize. Anything else is answered with 400. Sorted by price.
   */
  async listPage(params: { page: number; pageSize: number } & Record<string, string | number>): Promise<{ items: Hotel[]; total: number }> {
    const { data } = await api.get<Paginated<Raw>>('/hotels', { params });
    assertSuccess(data);
    const items = toList(data).map(toHotel);
    return { items, total: data.pagination?.total ?? items.length };
  },
  /** First 100 hotels, unfiltered: the source of the filter choices (cities) and of the list when the API is offline. */
  async listPublic(): Promise<Hotel[]> {
    const { data } = await api.get<Paginated<Raw>>('/hotels', { params: { page: 1, pageSize: 100 } });
    assertSuccess(data);
    return toList(data).map(toHotel);
  },
  /** Admin Hotels page: one page from GET /api/hotels, filtered by the API. */
  async list(params: HotelQuery) {
    const { data } = await api.get<Paginated<Raw>>('/hotels', { params });
    assertSuccess(data);
    return { rows: toList(data).map(toRow), pagination: data.pagination };
  },
};
