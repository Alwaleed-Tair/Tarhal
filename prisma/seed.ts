import { PrismaClient, SeatStatus } from '@prisma/client';
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
  await prisma.booking.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.car.deleteMany();
  await prisma.user.deleteMany();

  // 3. Seed Hotels and Cars from JSON files
  await prisma.hotel.createMany({ data: hotelsData });
  await prisma.car.createMany({ data: carsData });

  // 4. Seed a Test User
  await prisma.user.create({
    data: {
      name: 'Test Traveler',
      email: 'traveler@tarhal.com',
      phoneNumber: '+966500000000',
      password: 'hashed_password_123',
      role: 'traveler',
    },
  });

  // 5. Seed Flights and Seats
  await prisma.flight.create({
    data: {
      flightNumber: 'SV-1020',
      from: 'RUH', // Riyadh
      to: 'JED',   // Jeddah
      departureTime: new Date('2026-10-01T08:00:00Z'),
      arrivalTime: new Date('2026-10-01T09:40:00Z'),
      basePrice: 420.00,
      seats: {
        create: [
          { seatCode: '1A', ticketClass: 'Business', priceMultiplier: 1.8, status: SeatStatus.AVAILABLE },
          { seatCode: '1B', ticketClass: 'Business', priceMultiplier: 1.8, status: SeatStatus.AVAILABLE },
          { seatCode: '12A', ticketClass: 'Economy', priceMultiplier: 1.0, status: SeatStatus.AVAILABLE },
        ],
      },
    },
  });

  await prisma.flight.create({
    data: {
      flightNumber: 'XY-205',
      from: 'DMM', // Dammam
      to: 'AHB',   // Abha
      departureTime: new Date('2026-10-02T14:30:00Z'),
      arrivalTime: new Date('2026-10-02T16:45:00Z'),
      basePrice: 310.50,
      seats: {
        create: [
          { seatCode: '2A', ticketClass: 'Business', priceMultiplier: 1.5, status: SeatStatus.AVAILABLE },
          { seatCode: '15C', ticketClass: 'Economy', priceMultiplier: 1.0, status: SeatStatus.AVAILABLE },
        ],
      },
    },
  });

  console.log('✅ All seed data (Hotels, Cars, Users, Flights, Seats) successfully loaded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });