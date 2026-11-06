import { PrismaClient, SeatStatus, Role, TicketClass } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define variables for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  // 1. Read JSON fixtures for Hotels and Cars
  const hotelsPath = path.join(__dirname, 'seeds', 'hotels.json');
  const carsPath = path.join(__dirname, 'seeds', 'cars.json');
  const hotelsData = JSON.parse(fs.readFileSync(hotelsPath, 'utf-8'));
  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf-8'));

  // 2. Clear ALL tables to prevent duplication (Order matters for foreign keys)
  await prisma.bookingTraveler.deleteMany();
  await prisma.hotelBooking.deleteMany();
  await prisma.carRental.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.airline.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.car.deleteMany();
  await prisma.user.deleteMany();

  // 3. Seed Hotels and Cars from JSON files
  // Note: createMany automatically handles createdAt/updatedAt
  await prisma.hotel.createMany({ data: hotelsData });
  await prisma.car.createMany({ data: carsData });

  // 4. Seed Airlines
  const airlines = await Promise.all([
    prisma.airline.create({ data: { name: 'Saudia', nameAr: 'السعودية', iataCode: 'SV', logoUrl: '/images/airlines/sv.png' } }),
    prisma.airline.create({ data: { name: 'Qatar Airways', nameAr: 'الخطوط القطرية', iataCode: 'QR', logoUrl: '/images/airlines/qr.png' } }),
    prisma.airline.create({ data: { name: 'Emirates', nameAr: 'طيران الإمارات', iataCode: 'EK', logoUrl: '/images/airlines/ek.png' } }),
    prisma.airline.create({ data: { name: 'flynas', nameAr: 'طيران ناس', iataCode: 'XY', logoUrl: '/images/airlines/xy.png' } }),
    prisma.airline.create({ data: { name: 'flyadeal', nameAr: 'طيران أديل', iataCode: 'F3', logoUrl: '/images/airlines/f3.png' } })
  ]);

  // 5. Seed Users (1 Admin + 2 Travelers)
  await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@tarhal.com',
      phoneNumber: '+966500000000',
      password: 'hashed_password_123',
      role: Role.ADMIN,
      dateOfBirth: new Date("1990-01-01")
    }
  });

  await prisma.user.create({
    data: {
      name: 'Test Traveler 1',
      email: 'traveler1@tarhal.com',
      phoneNumber: '+966500000001',
      password: 'hashed_password_123',
      role: Role.TRAVELER,
      dateOfBirth: new Date("1998-05-15")
    }
  });

  await prisma.user.create({
    data: {
      name: 'Test Traveler 2',
      email: 'traveler2@tarhal.com',
      phoneNumber: '+966500000002',
      password: 'hashed_password_123',
      role: Role.TRAVELER,
      dateOfBirth: new Date("1995-08-20")
    }
  });

  // 6. Seed Flights and Seats (Future dated, linked to Airlines)
  const svAirline = airlines.find(a => a.iataCode === 'SV')!;
  const xyAirline = airlines.find(a => a.iataCode === 'XY')!;

  await prisma.flight.create({
    data: {
      flightNumber: 'SV1020',
      airlineId: svAirline.id,
      from: 'RUH', 
      to: 'JED',  
      departureTime: new Date('2027-01-10T08:00:00Z'),
      arrivalTime: new Date('2027-01-10T09:40:00Z'),
      basePrice: 420.00,
      seats: {
        create: [
          { seatCode: '1A', ticketClass: TicketClass.BUSINESS, priceMultiplier: 1.8, status: SeatStatus.AVAILABLE },
          { seatCode: '1B', ticketClass: TicketClass.BUSINESS, priceMultiplier: 1.8, status: SeatStatus.AVAILABLE },
          { seatCode: '12A', ticketClass: TicketClass.ECONOMY, priceMultiplier: 1.0, status: SeatStatus.AVAILABLE },
        ],
      },
    },
  });

  await prisma.flight.create({
    data: {
      flightNumber: 'XY205',
      airlineId: xyAirline.id,
      from: 'DMM', 
      to: 'AHB',  
      departureTime: new Date('2027-01-15T14:30:00Z'),
      arrivalTime: new Date('2027-01-15T16:45:00Z'),
      basePrice: 310.50,
      seats: {
        create: [
          { seatCode: '2A', ticketClass: TicketClass.BUSINESS, priceMultiplier: 1.5, status: SeatStatus.AVAILABLE },
          { seatCode: '15C', ticketClass: TicketClass.ECONOMY, priceMultiplier: 1.0, status: SeatStatus.AVAILABLE },
        ],
      },
    },
  });

  console.log('✅ All seed data (Hotels, Cars, Users, Airlines, Flights, Seats) successfully loaded for Schema v3!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });