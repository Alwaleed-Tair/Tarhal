import { tool } from 'ai';
import { z } from 'zod';

export type FlightCard = {
  id: string; flightNumber: string; from: string; to: string;
  airline: string; departureTime: string; arrivalTime: string; lowestPrice: number; availableSeats: number;
};

// Same day window the existing /api/flights/search uses (UTC day).
export async function findFlights(from: string, to: string, date: string): Promise<FlightCard[]> {
  // Loaded lazily so the chat still works when the database client is unavailable.
  const { prisma } = await import('../prisma.ts');
  const flights = await prisma.flight.findMany({
    where: {
      from: from.toUpperCase(), to: to.toUpperCase(),
      departureTime: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) },
    },
    include: { airline: true, seats: { where: { status: 'AVAILABLE' } } },
    orderBy: { departureTime: 'asc' },
    take: 5,
  });
  return flights.map((f) => {
    const base = Number(f.basePrice);
    const prices = f.seats.map((s) => base * Number(s.priceMultiplier));
    return {
      id: f.id, flightNumber: f.flightNumber, from: f.from, to: f.to, airline: f.airline?.name ?? '',
      departureTime: f.departureTime.toISOString(), arrivalTime: f.arrivalTime.toISOString(),
      lowestPrice: Math.round(prices.length ? Math.min(...prices) : base), availableSeats: f.seats.length,
    };
  });
}

// Tool the model can call. Cards are collected so the route can return them next to the text.
export function flightTool(cards: FlightCard[]) {
  return {
    searchFlights: tool({
      description: 'Search real Tarhal flights for a route on one date. Use 3-letter IATA airport codes.',
      inputSchema: z.object({
        from: z.string().regex(/^[A-Za-z]{3}$/).describe('Origin IATA code, e.g. RUH'),
        to: z.string().regex(/^[A-Za-z]{3}$/).describe('Destination IATA code, e.g. JED'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Departure date YYYY-MM-DD'),
      }),
      execute: async ({ from, to, date }) => {
        if (Number.isNaN(new Date(date).getTime())) return { error: 'Invalid date' };
        if (date < new Date().toISOString().slice(0, 10)) return { error: 'Cannot search past dates' };
        try {
          const found = await findFlights(from, to, date);
          cards.push(...found);
          return { count: found.length, flights: found.map((f) => ({ flightNumber: f.flightNumber, airline: f.airline, departs: f.departureTime, lowestPriceSAR: f.lowestPrice, seatsLeft: f.availableSeats })) };
        } catch { return { error: 'Flight search is unavailable right now' }; }
      },
    }),
  };
}
