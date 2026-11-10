import { api, assertSuccess, assertWrite, toList, num, pick, str, type Envelope, type Raw } from '@/services/api';
import type { ResourceRow } from '@/data/demoData';

/** Values of the TicketClass enum in prisma/schema.prisma. */
export const TICKET_CLASSES = ['ECONOMY', 'BUSINESS', 'FIRST'] as const;
export type TicketClass = (typeof TICKET_CLASSES)[number];
export type Airline = { id: string; name: string; nameAr: string };

/** One row of GET /api/flights/search: the flight, its airline, and how many seats are free and from what price (SAR). */
export type FlightOption = {
  id: string; flightNumber: string; from: string; to: string; departureTime: string; arrivalTime: string;
  basePrice: number; airline: { name: string; nameAr: string; iataCode: string; logoUrl: string };
  availableSeats: number; lowestPrice: number | null;
};
/** A seat of GET /api/flights/:id. The API says whether it is free and whether this traveler holds it, never who else does. */
export type Seat = { id: string; code: string; ticketClass: TicketClass; priceMultiplier: number; status: 'AVAILABLE' | 'HELD' | 'BOOKED'; free: boolean; heldByMe: boolean };
export type FlightDetails = FlightOption & { seats: Seat[] };
/** Body of POST /api/admin/flights. Times are UTC ISO strings, `basePrice` is SAR. */
export type FlightCreateInput = { flightNumber: string; airlineId: string; from: string; to: string; departureTime: string; arrivalTime: string; basePrice: number; seats: { seatCode: string; ticketClass: TicketClass; priceMultiplier: number }[] };
/** Body of PATCH /api/admin/flights/:id. */
export type FlightUpdateInput = { basePrice?: number; departureTime?: string; arrivalTime?: string };
export type FlightSearchParams = { from?: string; to?: string; date?: string; returnDate?: string; passengers?: number; airline?: string };

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
  };
};

const toOption = (r: Raw): FlightOption => {
  const a = airlineRaw(r);
  const lowest = pick(r, 'lowestPrice');
  return {
    id: str(r.id), flightNumber: str(r.flightNumber), from: str(r.from), to: str(r.to),
    departureTime: str(r.departureTime), arrivalTime: str(r.arrivalTime), basePrice: num(r.basePrice),
    airline: { name: str(a.name), nameAr: str(a.nameAr) || str(a.name), iataCode: str(a.iataCode), logoUrl: str(a.logoUrl) },
    availableSeats: num(r.availableSeatsCount), lowestPrice: lowest === undefined ? null : num(lowest),
  };
};

const toSeat = (s: Raw): Seat => {
  const status = (str(s.status, 'AVAILABLE').toUpperCase() as Seat['status']);
  const ticketClass = str(s.ticketClass, 'ECONOMY').toUpperCase() as TicketClass;
  return { id: str(s.id), code: str(s.seatCode), ticketClass, priceMultiplier: num(s.priceMultiplier, 1), status, free: s.free === true || (s.free === undefined && status === 'AVAILABLE'), heldByMe: s.heldByMe === true };
};

export const flightService = {
  /** Admin table: GET /api/admin/flights (admin session required). */
  async adminList(): Promise<ResourceRow[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/admin/flights');
    assertSuccess(data);
    return toList(data).map(toRow);
  },
  /** GET /api/admin/airlines, for the dropdown of the flight form: POST needs the id. */
  async airlineDirectory(): Promise<Airline[]> {
    const { data } = await api.get<Envelope<Raw[]>>('/admin/airlines');
    assertSuccess(data);
    return toList(data).map((a) => {
      const name = str(pick(a, 'name', 'nameEn', 'airlineName'));
      return { id: str(pick(a, 'id', 'airlineId')), name, nameAr: str(pick(a, 'nameAr')) || name };
    }).filter((a) => a.id && a.name);
  },
  /**
   * Checked against app/api/admin/[...slug]/route.ts: POST and PATCH exist (bodies above).
   * On a failure axios rejects and the form explains why (see lib/write-error.ts). The page reloads after a save.
   */
  async create(input: FlightCreateInput): Promise<void> {
    assertWrite((await api.post<Raw>('/admin/flights', input)).data);
  },
  async update(apiId: string | number, input: FlightUpdateInput): Promise<void> {
    assertWrite((await api.patch<Raw>(`/admin/flights/${encodeURIComponent(String(apiId))}`, input)).data);
  },
  /** DELETE /api/admin/flights/:id. 409 while the flight has bookings (the page explains why). */
  async remove(apiId: string | number): Promise<void> {
    assertWrite((await api.delete<Envelope<Raw>>(`/admin/flights/${encodeURIComponent(String(apiId))}`)).data);
  },
  /**
   * GET /api/flights/search?from&to&date[&returnDate][&passengers][&airline]: airport codes (RUH, JED...), Riyadh days "YYYY-MM-DD".
   * Flights with fewer free seats than `passengers` are left out. With returnDate, `returnFlights` are the flights back. 400 for a past day.
   */
  async search(params: FlightSearchParams = {}): Promise<{ outbound: FlightOption[]; returnFlights: FlightOption[] | null }> {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    const { data } = await api.get<Envelope<Raw[]> & { returnFlights?: Raw[] }>('/flights/search', { params: clean });
    assertSuccess(data);
    return { outbound: toList(data).map(toOption), returnFlights: Array.isArray(data.returnFlights) ? data.returnFlights.map(toOption) : null };
  },
  /** GET /api/flights/:id: the flight, its airline and the full seat map. 404 when the flight does not exist. */
  async getById(id: string | number): Promise<FlightDetails> {
    const { data } = await api.get<Envelope<Raw>>(`/flights/${encodeURIComponent(String(id))}`);
    assertSuccess(data);
    const d = data.data;
    return { ...toOption(d), seats: ((d.seats as Raw[]) ?? []).map(toSeat) };
  },
  /**
   * POST /api/flights/:id/hold { seatIds }: keeps the seats for this traveler for 10 minutes and releases their other holds on the flight.
   * Needs a login (401). 409 when a seat was taken, 404 when a seat is not on this flight.
   */
  async hold(flightId: string, seatIds: string[]): Promise<{ heldUntil: string }> {
    const { data } = await api.post<Envelope<Raw>>(`/flights/${encodeURIComponent(flightId)}/hold`, { seatIds });
    assertWrite(data);
    return { heldUntil: str(pick(data.data ?? {}, 'heldUntil')) };
  },
};
