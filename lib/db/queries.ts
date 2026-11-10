import { SeatStatus, Role, TicketClass } from '@prisma/client';
import { prisma } from '../prisma.ts';

// --- Flight Queries ---
export async function getFlights(filters?: { airlineId?: string }) {
  return await prisma.flight.findMany({
    where: filters,
    include: {
      airline: true,
      seats: {
        where: { status: SeatStatus.AVAILABLE },
      },
    },
  });
}

export async function createFlightWithSeats(data: {
  flightNumber: string;
  airlineId: string;
  from: string;
  to: string;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number;
  seats: { seatCode: string; ticketClass: TicketClass; priceMultiplier: number }[];
}) {
  return await prisma.flight.create({
    data: {
      flightNumber: data.flightNumber,
      airlineId: data.airlineId,
      from: data.from,
      to: data.to,
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      basePrice: data.basePrice,
      seats: {
        create: data.seats.map(s => ({
          seatCode: s.seatCode,
          ticketClass: s.ticketClass,
          priceMultiplier: s.priceMultiplier,
          status: SeatStatus.AVAILABLE,
        })),
      },
    },
    include: { seats: true },
  });
}

export async function updateFlight(id: string, data: { basePrice?: number; departureTime?: Date }) {
  return await prisma.flight.update({
    where: { id },
    data,
  });
}

// --- Airline Queries ---
export async function getAirlines() {
  return await prisma.airline.findMany();
}

// --- Booking Queries ---
// Never return the password hash.
const bookingUser = { select: { id: true, name: true, email: true, phoneNumber: true, role: true } } as const;

/**
 * Every booking for the admin: flights (Booking), hotels (HotelBooking) and cars (CarRental), newest first.
 * Each row has `type`: "flight", "hotel" or "car", plus the related flight, hotel or car.
 */
export async function getBookings() {
  const [flights, hotels, cars] = await Promise.all([
    prisma.booking.findMany({
      include: {
        user: bookingUser,
        flight: { include: { airline: true } },
        travelers: { include: { seat: { select: { id: true, seatCode: true, ticketClass: true, priceMultiplier: true } } } },
      },
    }),
    prisma.hotelBooking.findMany({ include: { user: bookingUser, hotel: true } }),
    prisma.carRental.findMany({ include: { user: bookingUser, car: true } }),
  ]);
  return [
    ...flights.map((b) => ({ ...b, type: 'flight' as const })),
    ...hotels.map((b) => ({ ...b, type: 'hotel' as const })),
    ...cars.map((b) => ({ ...b, type: 'car' as const })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
