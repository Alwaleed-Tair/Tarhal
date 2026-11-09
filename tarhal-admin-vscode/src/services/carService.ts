import { api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Paginated, type Raw } from '@/services/api';
import type { ResourceRow } from '@/data/demoData';
import type { Car } from '@/data/listings';

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

/** Public car card (Rentals page). Field names are guesses: ask Mohammed and adjust the pick(...) keys. */
const toCar = (r: Raw): Car => ({
  id: str(pick(r, 'id')),
  make: str(pick(r, 'make', 'brand')),
  model: str(pick(r, 'model', 'name')),
  year: num(pick(r, 'year')),
  seats: num(pick(r, 'seats', 'seatCount', 'capacity')),
  transmission: /man/i.test(str(pick(r, 'transmission'))) ? 'Manual' : 'Automatic',
  city: str(pick(r, 'city', 'location')) || undefined,
  pricePerDay: num(pick(r, 'pricePerDay', 'price')),
  insurancePerDay: num(pick(r, 'insurancePerDay', 'insurancePricePerDay', 'insurancePrice')),
});

/** Car fields an admin can set. Prices are SAR. */
export type CarInput = { make: string; model: string; year: number; seats: number; category: string; transmission: Transmission; city: string; pricePerDay: number; insurancePricePerDay: number; isAvailable: boolean; imageUrl?: string };
/** What GET /api/cars accepts (lib/catalog-filters.ts). Any other query parameter is answered with 400. */
export type CarQuery = { page: number; pageSize: number; city?: string; make?: string; category?: string; transmission?: string; minSeats?: string; minYear?: string; minPrice?: string; maxPrice?: string };

export const carService = {
  /**
   * POST and PATCH /api/admin/cars do not exist yet (Saud). The buttons stay hidden by WRITE_ACTIONS in pages/admin-resource.tsx.
   * The page reloads after a save, so nothing depends on the shape of the response.
   */
  async create(input: CarInput): Promise<void> {
    assertWrite((await api.post<Envelope<Raw>>('/admin/cars', input)).data);
  },
  async update(apiId: string | number, input: Partial<CarInput>): Promise<void> {
    assertWrite((await api.patch<Envelope<Raw>>(`/admin/cars/${encodeURIComponent(String(apiId))}`, input)).data);
  },
  /**
   * Public Rentals page: one page from GET /api/cars (only available cars). Filters the API really supports (lib/catalog-filters.ts):
   * city, make, category, transmission (AUTOMATIC | MANUAL), minSeats, minYear, minPrice, maxPrice, page, pageSize.
   * Anything else is answered with 400. Sorted by price.
   */
  async listPage(params: { page: number; pageSize: number } & Record<string, string | number>): Promise<{ items: Car[]; total: number }> {
    const { data } = await api.get<Paginated<Raw>>('/cars', { params });
    assertSuccess(data);
    const items = toList(data).map(toCar);
    return { items, total: data.pagination?.total ?? items.length };
  },
  /** First 100 cars, unfiltered: the source of the filter choices (cities, makes) and of the list when the API is offline. */
  async listPublic(): Promise<Car[]> {
    const { data } = await api.get<Paginated<Raw>>('/cars', { params: { page: 1, pageSize: 100 } });
    assertSuccess(data);
    return toList(data).map(toCar);
  },
  /** Admin Cars page: one page from GET /api/cars, filtered by the API. The API only returns available cars. */
  async list(params: CarQuery) {
    const { data } = await api.get<Paginated<Raw>>('/cars', { params });
    assertSuccess(data);
    return { rows: toList(data).map(toRow), pagination: data.pagination };
  },
};
