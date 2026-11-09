import { sarToUsd, usdToSar, api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Paginated, type Raw } from '@/services/api';
import type { ResourceRow } from '@/data/demoData';
import type { Hotel } from '@/data/listings';

const toRow = (r: Raw): ResourceRow => ({
  id: str(pick(r, 'name', 'hotelName', 'id')),
  apiId: pick(r, 'id') as string | number | undefined,
  city: str(pick(r, 'city', 'location')),
  room: str(pick(r, 'roomType', 'room')),
  price: sarToUsd(num(pick(r, 'pricePerNight', 'price'))),
  status: str(pick(r, 'status'), 'Available'),
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
    pricePerNightSar: num(pick(r, 'pricePerNight', 'price'), NaN) || undefined,
  };
};

export type HotelInput = { name: string; city: string; room: string; price: number; status: string };
const toBody = (i: HotelInput) => ({ name: i.name, city: i.city, roomType: i.room, pricePerNight: usdToSar(i.price), status: i.status });

export const hotelService = {
  /**
   * INTEGRATION POINT [Mohammed]: POST /api/hotels, PATCH /api/hotels/:id, DELETE /api/hotels/:id (paths and body keys are
   * assumed: confirm them). The Add/Edit modal shows whatever message the backend returns on 400/409/etc.
   */
  async create(input: HotelInput): Promise<{ apiId?: string | number }> {
    const { data } = await api.post<Envelope<Raw>>('/hotels', toBody(input));
    assertWrite(data);
    return { apiId: pick(data?.data ?? {}, 'id') as string | number | undefined };
  },
  async update(apiId: string | number, input: HotelInput): Promise<void> {
    assertWrite((await api.patch<Envelope<Raw>>(`/hotels/${encodeURIComponent(String(apiId))}`, toBody(input))).data);
  },
  async remove(apiId: string | number): Promise<void> {
    assertWrite((await api.delete<Envelope<Raw>>(`/hotels/${encodeURIComponent(String(apiId))}`)).data);
  },
  /**
   * Public Stays page, server side: GET /api/hotels with the filters the API supports
   * (city, roomType, minPrice, maxPrice in SAR, minRating) plus page/pageSize. The API sorts by price.
   */
  async listPage(params: { page: number; pageSize: number } & Record<string, string | number>): Promise<{ items: Hotel[]; total: number }> {
    const { data } = await api.get<Paginated<Raw>>('/hotels', { params });
    assertSuccess(data);
    const items = toList(data).map(toHotel);
    return { items, total: data.pagination?.total ?? items.length };
  },
  /** First 100 hotels, unfiltered: used for the filter options (cities) and as the offline fallback. */
  async listPublic(): Promise<Hotel[]> {
    const { data } = await api.get<Paginated<Raw>>('/hotels', { params: { page: 1, pageSize: 100 } });
    assertSuccess(data);
    return toList(data).map(toHotel);
  },
  async list(params?: { page?: number; pageSize?: number }) {
    const { data } = await api.get<Paginated<Raw>>('/hotels', { params });
    assertSuccess(data);
    return { rows: toList(data).map(toRow), pagination: data.pagination };
  },
};
