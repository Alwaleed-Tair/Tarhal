import { api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Raw } from '@/services/api';
import type { ResourceRow } from '@/data/demoData';

export type Seat = { id: string; label: string; available: boolean };
export type FlightDetails = { id: string; airline: string; seats: Seat[] };
/** Values of the TicketClass enum in prisma/schema.prisma. */
export const TICKET_CLASSES = ['ECONOMY', 'BUSINESS', 'FIRST'] as const;
export type TicketClass = (typeof TICKET_CLASSES)[number];
export type Airline = { id: string; name: string; nameAr: string };
/** Body of POST /api/admin/flights. Times are UTC ISO strings, `basePrice` is SAR. */
export type FlightCreateInput = { flightNumber: string; airlineId: string; from: string; to: string; departureTime: string; arrivalTime: string; basePrice: number; seats: { seatCode: string; ticketClass: TicketClass; priceMultiplier: number }[] };
/** Body of PATCH /api/admin/flights/:id: the API only updates these two fields. */
export type FlightUpdateInput = { basePrice?: number; departureTime?: string };
export type FlightSearchParams = { from?: string; to?: string; date?: string; airline?: string };

/** `airline` may be a string or an object like { name, nameAr, iataCode }. */
const airlineName = (v: unknown): string => (v && typeof v === 'object' ? str(pick(v as Raw, 'name', 'nameEn')) : str(v));

const airlineRaw = (r: Raw): Raw => { const v = pick(r, 'airline'); return v && typeof v === 'object' ? (v as Raw) : {}; };

const toRow = (r: Raw): ResourceRow => {
  const from = str(pick(r, 'from', 'origin')), to = str(pick(r, 'to', 'destination'));
  return {
    id: str(pick(r, 'flightNumber', 'number', 'id')),
    apiId: pick(r, 'id') as string | number | undefined,
    airline: airlineName(pick(r, 'airline', 'airlineName')),
    airlineId: str(pick(r, 'airlineId')),
    airlineAr: str(pick(airlineRaw(r), 'nameAr')),
    departureTime: str(pick(r, 'departureTime')),
    arrivalTime: str(pick(r, 'arrivalTime')),
    route: from && to ? `${from} → ${to}` : str(pick(r, 'route')),
    price: num(pick(r, 'basePrice', 'price', 'fare')),
    status: str(pick(r, 'status')), // flights have no status in the schema
  };
};

const toSeat = (s: Raw): Seat => ({
  id: str(pick(s, 'id', 'seatId')),
  label: str(pick(s, 'seatNumber', 'label', 'number', 'id')),
  available: pick(s, 'isAvailable', 'available') !== false && pick(s, 'status') !== 'booked',
});

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
  async airlineDirectory(): Promise<Airline[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/admin/airlines');
    assertSuccess(data);
    return toList(data).map((a) => {
      const name = str(pick(a, 'name', 'nameEn', 'airlineName'));
      return { id: str(pick(a, 'id', 'airlineId')), name, nameAr: str(pick(a, 'nameAr')) || name };
    }).filter((a) => a.id && a.name);
  },
  /**
   * INTEGRATION POINT [Saud]: POST /api/admin/flights (needs airlineId), PATCH /api/admin/flights/:id, DELETE /api/admin/flights/:id.
   * On 400/409/etc. axios rejects; the Add/Edit modal shows the backend's message (see parseApiError in api.ts).
   * Checked against app/api/admin/[...slug]/route.ts: POST and PATCH exist (bodies above) and answer with the raw flight, not { data }.
   * DELETE does not exist yet, so the admin page does not offer Remove (see WRITE_ACTIONS in pages/admin-resource.tsx).
   */
  async create(input: FlightCreateInput): Promise<{ apiId?: string | number }> {
    const { data } = await api.post<Raw>('/admin/flights', input);
    assertWrite(data);
    return { apiId: pick(data ?? {}, 'id') as string | number | undefined };
  },
  async update(apiId: string | number, input: FlightUpdateInput): Promise<void> {
    assertWrite((await api.patch<Raw>(`/admin/flights/${encodeURIComponent(String(apiId))}`, input)).data);
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
