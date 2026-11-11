import { api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Paginated, type Raw } from '@/services/api';
import type { ResourceRow } from '@/data/demoData';

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

/** Hotel fields an admin can set. `pricePerNight` is SAR. */
export type HotelInput = { name: string; city: string; address?: string; roomType: string; pricePerNight: number; rating: number; imageUrl?: string };
/** What GET /api/hotels accepts (lib/catalog-filters.ts). Any other query parameter is answered with 400. */
export type HotelQuery = { page: number; pageSize: number; city?: string; roomType?: string; minPrice?: string; maxPrice?: string; minRating?: string };

export const hotelService = {
  /** POST /api/admin/hotels and PATCH /api/admin/hotels/:id (400 with the field name, 404 unknown hotel). The page reloads after a save. */
  async create(input: HotelInput): Promise<void> {
    assertWrite((await api.post<Envelope<Raw>>('/admin/hotels', input)).data);
  },
  async update(apiId: string | number, input: Partial<HotelInput>): Promise<void> {
    assertWrite((await api.patch<Envelope<Raw>>(`/admin/hotels/${encodeURIComponent(String(apiId))}`, input)).data);
  },
  /** DELETE /api/admin/hotels/:id: 409 while the hotel has bookings. */
  async remove(apiId: string | number): Promise<void> {
    assertWrite((await api.delete<Envelope<Raw>>(`/admin/hotels/${encodeURIComponent(String(apiId))}`)).data);
  },
  /** One page from GET /api/hotels, filtered by the API: admin Hotels page and the traveler hotel search. */
  async list(params: HotelQuery) {
    const { data } = await api.get<Paginated<Raw>>('/hotels', { params });
    assertSuccess(data);
    return { rows: toList(data).map(toRow), pagination: data.pagination };
  },
};
