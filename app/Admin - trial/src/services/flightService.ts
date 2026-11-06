import { api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Raw } from '@/services/api';
import type { CabinClass, ResourceRow } from '@/data/demoData';

export type Seat = { id: string; label: string; available: boolean };
export type FlightDetails = { id: string; airline: string; seats: Seat[] };
/** What the admin form submits. `airlineId` is resolved from the airline name via `airlineDirectory()`. */
export type FlightInput = { flightNumber: string; airline: string; airlineId?: string | number; route: string; cabinClass: string; price: number; status: string };
export type FlightSearchParams = { from?: string; to?: string; date?: string; airline?: string };

/** `airline` may be a string or an object like { name, nameAr, iataCode }. */
const airlineName = (v: unknown): string => (v && typeof v === 'object' ? str(pick(v as Raw, 'name', 'nameEn')) : str(v));

const toRow = (r: Raw): ResourceRow => {
  const from = str(pick(r, 'from', 'origin')), to = str(pick(r, 'to', 'destination'));
  return {
    id: str(pick(r, 'flightNumber', 'number', 'id')),
    apiId: pick(r, 'id') as string | number | undefined,
    airline: airlineName(pick(r, 'airline', 'airlineName')),
    cabinClass: str(pick(r, 'cabinClass', 'cabin'), 'Economy') as CabinClass,
    route: from && to ? `${from} → ${to}` : str(pick(r, 'route')),
    price: num(pick(r, 'price', 'fare')),
    status: str(pick(r, 'status'), 'Scheduled'),
  };
};

const toSeat = (s: Raw): Seat => ({
  id: str(pick(s, 'id', 'seatId')),
  label: str(pick(s, 'seatNumber', 'label', 'number', 'id')),
  available: pick(s, 'isAvailable', 'available') !== false && pick(s, 'status') !== 'booked',
});

const toBody = (i: FlightInput) => {
  const [from = '', to = ''] = i.route.split('→').map((part) => part.trim());
  return { flightNumber: i.flightNumber, airlineId: i.airlineId, from, to, cabinClass: i.cabinClass, price: i.price, status: i.status };
};

export const flightService = {
  /** Admin table. INTEGRATION POINT [Saud]: GET /api/admin/flights (admin session required). */
  async adminList(): Promise<ResourceRow[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/admin/flights');
    assertSuccess(data);
    return toList(data).map(toRow);
  },
  /** Airline names for the Add/Edit dropdown. INTEGRATION POINT [Saud]: GET /api/admin/airlines. */
  async airlines(): Promise<string[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/admin/airlines');
    assertSuccess(data);
    return toList(data).map((a) => str(pick(a, 'name', 'nameEn', 'airlineName'))).filter(Boolean);
  },
  /** Same endpoint as `airlines()`, but keeps the ids the create/update calls need. */
  async airlineDirectory(): Promise<{ id: string | number | undefined; name: string }[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/admin/airlines');
    assertSuccess(data);
    return toList(data).map((a) => ({ id: pick(a, 'id', 'airlineId') as string | number | undefined, name: str(pick(a, 'name', 'nameEn', 'airlineName')) })).filter((a) => a.name);
  },
  /**
   * INTEGRATION POINT [Saud]: POST /api/admin/flights (needs airlineId), PATCH /api/admin/flights/:id, DELETE /api/admin/flights/:id.
   * On 400/409/etc. axios rejects; the Add/Edit modal shows the backend's message (see parseApiError in api.ts).
   * Confirm the body keys below (from/to, cabinClass...) with Saud; add departure/arrival times once the form has them.
   */
  async create(input: FlightInput): Promise<{ apiId?: string | number }> {
    const { data } = await api.post<Envelope<Raw>>('/admin/flights', toBody(input));
    assertWrite(data);
    return { apiId: pick(data?.data ?? {}, 'id') as string | number | undefined };
  },
  async update(apiId: string | number, input: FlightInput): Promise<void> {
    assertWrite((await api.patch<Envelope<Raw>>(`/admin/flights/${encodeURIComponent(String(apiId))}`, toBody(input))).data);
  },
  async remove(apiId: string | number): Promise<void> {
    assertWrite((await api.delete<Envelope<Raw>>(`/admin/flights/${encodeURIComponent(String(apiId))}`)).data);
  },
  async search(params: FlightSearchParams = {}): Promise<ResourceRow[]> {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    const { data } = await api.get<Envelope<Raw[]>>('/flights/search', { params: clean });
    assertSuccess(data);
    return toList(data).map(toRow);
  },
  async getById(id: string | number): Promise<FlightDetails> {
    const { data } = await api.get<Envelope<Raw>>(`/flights/${encodeURIComponent(String(id))}`);
    assertSuccess(data);
    const d = data.data;
    return { id: str(d.id), airline: airlineName(d.airline), seats: ((d.seats as Raw[]) ?? []).map(toSeat) };
  },
};
