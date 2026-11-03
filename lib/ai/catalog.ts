import { tool } from 'ai';
import { z } from 'zod';

export type HotelCard = { id: string; name: string; city: string; address: string | null; pricePerNight: number; rating: number; roomType: string; imageUrl: string | null };
export type CarCard = { id: string; make: string; model: string; year: number; seats: number; category: string; city: string; pricePerDay: number; imageUrl: string | null };

const city = z.string().min(2).max(60).optional().describe('City in English, e.g. Dammam, Riyadh, Jeddah');

// Tarhal's own hotels and cars. Prisma is loaded lazily so the chat still starts without a DB client.
export async function findHotels(f: { city?: string; maxPricePerNight?: number; minRating?: number }): Promise<HotelCard[]> {
  const { prisma } = await import('../prisma.ts');
  const rows = await prisma.hotel.findMany({
    where: {
      ...(f.city && { city: { contains: f.city.trim(), mode: 'insensitive' } }),
      ...(f.maxPricePerNight !== undefined && { pricePerNight: { lte: f.maxPricePerNight } }),
      ...(f.minRating !== undefined && { rating: { gte: f.minRating } }),
    },
    orderBy: [{ rating: 'desc' }, { pricePerNight: 'asc' }], take: 5,
  });
  return rows.map((h) => ({ id: h.id, name: h.name, city: h.city, address: h.address ?? null, pricePerNight: Number(h.pricePerNight), rating: h.rating, roomType: h.roomType, imageUrl: h.imageUrl ?? null }));
}

export async function findCars(f: { city?: string; category?: string; maxPricePerDay?: number; minSeats?: number }): Promise<CarCard[]> {
  const { prisma } = await import('../prisma.ts');
  const rows = await prisma.car.findMany({
    where: {
      isAvailable: true,
      ...(f.city && { city: { contains: f.city.trim(), mode: 'insensitive' } }),
      ...(f.category && { category: { contains: f.category.trim(), mode: 'insensitive' } }),
      ...(f.maxPricePerDay !== undefined && { pricePerDay: { lte: f.maxPricePerDay } }),
      ...(f.minSeats !== undefined && { seats: { gte: f.minSeats } }),
    },
    orderBy: { pricePerDay: 'asc' }, take: 5,
  });
  return rows.map((c) => ({ id: c.id, make: c.make, model: c.model, year: c.year, seats: c.seats, category: c.category, city: c.city, pricePerDay: Number(c.pricePerDay), imageUrl: c.imageUrl ?? null }));
}

export function catalogTools(hotels: HotelCard[], cars: CarCard[]) {
  return {
    searchHotels: tool({
      description: "Search Tarhal's own hotel listings. Use this FIRST for any hotel question. Returns count 0 when the app has nothing.",
      inputSchema: z.object({ city, maxPricePerNight: z.number().positive().optional().describe('SAR'), minRating: z.number().min(1).max(5).optional() }),
      execute: async (args) => {
        try {
          const found = await findHotels(args);
          hotels.push(...found);
          return { count: found.length, hotels: found.map(({ imageUrl, id, ...h }) => h) };
        } catch (e) { console.error('[ai] searchHotels failed:', e instanceof Error ? e.message.split('\n').pop() : e); return { error: 'Tarhal hotel data is unavailable right now' }; }
      },
    }),
    searchCars: tool({
      description: "Search Tarhal's own rental cars (available ones). Use this FIRST for any car-rental question. Returns count 0 when the app has nothing.",
      inputSchema: z.object({ city, category: z.string().max(40).optional().describe('e.g. SUV, Sedan, Economy'), maxPricePerDay: z.number().positive().optional().describe('SAR'), minSeats: z.number().int().min(1).max(12).optional() }),
      execute: async (args) => {
        try {
          const found = await findCars(args);
          cars.push(...found);
          return { count: found.length, cars: found.map(({ imageUrl, id, ...c }) => c) };
        } catch (e) { console.error('[ai] searchCars failed:', e instanceof Error ? e.message.split('\n').pop() : e); return { error: 'Tarhal car data is unavailable right now' }; }
      },
    }),
  };
}
