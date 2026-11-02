import { tool } from 'ai';
import { z } from 'zod';

export type FlightCard = {
  id: string; flightNumber: string; from: string; to: string;
  departureTime: string; arrivalTime: string; priceSar: number; availableSeats: number;
};

// Shape returned by app/api/flights/search (Prisma Flight + available seats).
export function normalizeFlight(f: any): FlightCard {
  return {
    id: String(f.id),
    flightNumber: String(f.flightNumber),
    from: String(f.from),
    to: String(f.to),
    departureTime: new Date(f.departureTime).toISOString(),
    arrivalTime: new Date(f.arrivalTime).toISOString(),
    priceSar: Number(f.basePrice),
    availableSeats: Array.isArray(f.seats) ? f.seats.length : 0,
  };
}

export type SearchFlights = (q: { from: string; to: string; date: string }) => Promise<unknown[]>;

export function makeFlightTool(searchFlights: SearchFlights) {
  return tool({
    description: 'Search real Tarhal flights by origin, destination (IATA codes) and date.',
    inputSchema: z.object({
      from: z.string().length(3).describe('Origin IATA code, e.g. RUH'),
      to: z.string().length(3).describe('Destination IATA code, e.g. JED'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
    }),
    execute: async ({ from, to, date }) => {
      const today = new Date().toISOString().slice(0, 10);
      if (date < today) return { error: 'Date is in the past', flights: [] };
      const rows = await searchFlights({ from: from.toUpperCase(), to: to.toUpperCase(), date });
      return { flights: rows.slice(0, 5).map(normalizeFlight) };
    },
  });
}
