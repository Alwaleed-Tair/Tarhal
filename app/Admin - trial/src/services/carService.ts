import { api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Paginated, type Raw } from '@/services/api';
import type { ResourceRow } from '@/data/demoData';
import type { Car } from '@/data/listings';

const toRow = (r: Raw): ResourceRow => {
  const count = pick(r, 'availableCount', 'available', 'quantity');
  return {
    id: str(pick(r, 'name', 'model', 'carModel', 'id')),
    apiId: pick(r, 'id') as string | number | undefined,
    location: str(pick(r, 'location', 'city')),
    availability: typeof count === 'number' ? `${count} available` : str(pick(r, 'availability'), 'Available Now'),
    price: num(pick(r, 'pricePerDay', 'price')),
    status: str(pick(r, 'status'), 'Available'),
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
  pricePerDay: num(pick(r, 'pricePerDay', 'price')),
  insurancePerDay: num(pick(r, 'insurancePerDay', 'insurancePricePerDay', 'insurancePrice')),
});

export type CarInput = { name: string; location: string; availability: string; price: number; status: string };
const toBody = (i: CarInput) => ({ name: i.name, location: i.location, availability: i.availability, pricePerDay: i.price, status: i.status });

export const carService = {
  /**
   * INTEGRATION POINT [Mohammed]: POST /api/cars, PATCH /api/cars/:id, DELETE /api/cars/:id (paths and body keys are
   * assumed: confirm them). The Add/Edit modal shows whatever message the backend returns on 400/409/etc.
   */
  async create(input: CarInput): Promise<{ apiId?: string | number }> {
    const { data } = await api.post<Envelope<Raw>>('/cars', toBody(input));
    assertWrite(data);
    return { apiId: pick(data?.data ?? {}, 'id') as string | number | undefined };
  },
  async update(apiId: string | number, input: CarInput): Promise<void> {
    assertWrite((await api.patch<Envelope<Raw>>(`/cars/${encodeURIComponent(String(apiId))}`, toBody(input))).data);
  },
  async remove(apiId: string | number): Promise<void> {
    assertWrite((await api.delete<Envelope<Raw>>(`/cars/${encodeURIComponent(String(apiId))}`)).data);
  },
  /** Public Rentals page: first 100 cars; filtering/sorting/pagination happen in the browser (ListingView). */
  async listPublic(): Promise<Car[]> {
    const { data } = await api.get<Paginated<Raw>>('/cars', { params: { page: 1, pageSize: 100 } });
    assertSuccess(data);
    return toList(data).map(toCar);
  },
  async list(params?: { page?: number; pageSize?: number }) {
    const { data } = await api.get<Paginated<Raw>>('/cars', { params });
    assertSuccess(data);
    return { rows: toList(data).map(toRow), pagination: data.pagination };
  },
};
