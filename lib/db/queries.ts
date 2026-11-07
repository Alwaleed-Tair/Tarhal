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
export async function getBookings() {
  return await prisma.booking.findMany({
    include: {
      // Never return the password hash.
      user: { select: { id: true, name: true, email: true, phoneNumber: true, role: true } },
      flight: {
        include: { airline: true }
      },
      travelers: {
        include: { seat: true }
      },
    },
  });
}