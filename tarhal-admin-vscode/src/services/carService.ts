import { api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Paginated, type Raw } from '@/services/api';
import type { ResourceRow } from '@/data/demoData';

/** Values of the Transmission enum in prisma/schema.prisma. */
export const TRANSMISSIONS = ['AUTOMATIC', 'MANUAL'] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];

/** Real fields of the Car model in prisma/schema.prisma. The table shows "make model year". */
const toRow = (r: Raw): ResourceRow => {
  const make = str(pick(r, 'make')), model = str(pick(r, 'model')), year = num(pick(r, 'year'));
  return {
    id: [make, model, year || ''].filter(Boolean).join(' '),
    apiId: pick(r, 'id') as string | number | undefined,
    make, model, year,
    seats: num(pick(r, 'seats')),
    category: str(pick(r, 'category')),
    transmission: str(pick(r, 'transmission')),
    city: str(pick(r, 'city')),
    price: num(pick(r, 'pricePerDay')),
    insurancePricePerDay: num(pick(r, 'insurancePricePerDay')),
    isAvailable: pick(r, 'isAvailable') !== false,
    imageUrl: str(pick(r, 'imageUrl')),
  };
};

/** Car fields an admin can set. Prices are SAR. */
export type CarInput = { make: string; model: string; year: number; seats: number; category: string; transmission: Transmission; city: string; pricePerDay: number; insurancePricePerDay: number; isAvailable: boolean; imageUrl?: string };
/** What GET /api/cars accepts (lib/catalog-filters.ts). Any other query parameter is answered with 400. */
export type CarQuery = { page: number; pageSize: number; city?: string; make?: string; category?: string; transmission?: string; minSeats?: string; minYear?: string; minPrice?: string; maxPrice?: string; pickupDate?: string; returnDate?: string };

export const carService = {
  /** POST /api/admin/cars and PATCH /api/admin/cars/:id (400 with the field name, 404 unknown car). The page reloads after a save. */
  async create(input: CarInput): Promise<void> {
    assertWrite((await api.post<Envelope<Raw>>('/admin/cars', input)).data);
  },
  async update(apiId: string | number, input: Partial<CarInput>): Promise<void> {
    assertWrite((await api.patch<Envelope<Raw>>(`/admin/cars/${encodeURIComponent(String(apiId))}`, input)).data);
  },
  /** DELETE /api/admin/cars/:id: 409 while the car has rentals. */
  async remove(apiId: string | number): Promise<void> {
    assertWrite((await api.delete<Envelope<Raw>>(`/admin/cars/${encodeURIComponent(String(apiId))}`)).data);
  },
  /** One page from GET /api/admin/cars: every car, also the ones switched off, with the same filters as /api/cars. Admin only. */
  async adminList(params: CarQuery) {
    const { data } = await api.get<Paginated<Raw>>('/admin/cars', { params });
    assertSuccess(data);
    return { rows: toList(data).map(toRow), pagination: data.pagination };
  },
  /** One page from GET /api/cars, filtered by the API: the traveler car step. Only available cars, and with pickupDate and
   *  returnDate only cars that are free on those days. */
  async list(params: CarQuery) {
    const { data } = await api.get<Paginated<Raw>>('/cars', { params });
    assertSuccess(data);
    return { rows: toList(data).map(toRow), pagination: data.pagination };
  },
};
