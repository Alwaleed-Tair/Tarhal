import { PrismaClient, SeatStatus, Role, TicketClass } from '@prisma/client';
import { hashPassword } from '../lib/passwords.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define variables for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  // 1. Check for Environment Passwords
  const adminPassPlain = process.env.SEED_ADMIN_PASSWORD;
  const travelerPassPlain = process.env.SEED_TRAVELER_PASSWORD;

  if (!adminPassPlain || !travelerPassPlain) {
    throw new Error("Missing SEED_ADMIN_PASSWORD or SEED_TRAVELER_PASSWORD in .env file.");
  }

  const hashedAdminPassword = await hashPassword(adminPassPlain);
  const hashedTravelerPassword = await hashPassword(travelerPassPlain);

  // 2. Read JSON fixtures for Hotels and Cars
  const hotelsPath = path.join(__dirname, 'seeds', 'hotels.json');
  const carsPath = path.join(__dirname, 'seeds', 'cars.json');
  const hotelsData = JSON.parse(fs.readFileSync(hotelsPath, 'utf-8'));
  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf-8'));

  // 3. Clear ALL tables to prevent duplication (Order matters for foreign keys)
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

  // 4. Seed Hotels and Cars from JSON files
  await prisma.hotel.createMany({ data: hotelsData });
  await prisma.car.createMany({ data: carsData });

  // 5. Seed Airlines (Updated to working external URLs)
  const airlines = await Promise.all([
    prisma.airline.create({ data: { name: 'Saudia', nameAr: 'السعودية', iataCode: 'SV', logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e0/Saudia_logo.svg/300px-Saudia_logo.svg.png" } }),
    prisma.airline.create({ data: { name: 'Qatar Airways', nameAr: 'الخطوط القطرية', iataCode: 'QR', logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/Qatar_Airways_Logo.svg/300px-Qatar_Airways_Logo.svg.png" } }),
    prisma.airline.create({ data: { name: 'Emirates', nameAr: 'طيران الإمارات', iataCode: 'EK', logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Emirates_logo.svg/300px-Emirates_logo.svg.png" } }),
    prisma.airline.create({ data: { name: 'flynas', nameAr: 'طيران ناس', iataCode: 'XY', logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Flynas_logo.svg/300px-Flynas_logo.svg.png" } }),
    prisma.airline.create({ data: { name: 'flyadeal', nameAr: 'طيران أديل', iataCode: 'F3', logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Flyadeal_Logo.svg/300px-Flyadeal_Logo.svg.png" } })
  ]);

  // 6. Seed Users (1 Admin + 2 Travelers) with secure environment variables passwords
  await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@tarhal.com',
      phoneNumber: '+966500000000',
      password: hashedAdminPassword,
      role: Role.ADMIN,
      dateOfBirth: new Date("1990-01-01")
    }
  });

  await prisma.user.create({
    data: {
      name: 'Test Traveler 1',
      email: 'traveler1@tarhal.com',
      phoneNumber: '+966500000001',
      password: hashedTravelerPassword,
      role: Role.TRAVELER,
      dateOfBirth: new Date("1998-05-15")
    }
  });

  await prisma.user.create({
    data: {
      name: 'Test Traveler 2',
      email: 'traveler2@tarhal.com',
      phoneNumber: '+966500000002',
      password: hashedTravelerPassword,
      role: Role.TRAVELER,
      dateOfBirth: new Date("1995-08-20")
    }
  });

  // 7. Generate 20 Flights with dynamically generated Seats
  const generateSeats = () => {
    const seats = [];
    ['1A', '1B'].forEach(s => seats.push({ seatCode: s, ticketClass: TicketClass.FIRST, priceMultiplier: 3.0, status: SeatStatus.AVAILABLE }));
    for(let i=2; i<=3; i++) ['A','B','C','D'].forEach(l => seats.push({ seatCode: `${i}${l}`, ticketClass: TicketClass.BUSINESS, priceMultiplier: 1.8, status: SeatStatus.AVAILABLE }));
    for(let i=4; i<=8; i++) ['A','B','C','D','E','F'].forEach(l => seats.push({ seatCode: `${i}${l}`, ticketClass: TicketClass.ECONOMY, priceMultiplier: 1.0, status: SeatStatus.AVAILABLE }));
    return seats;
  };

  const routes = [
    { from: 'RUH', to: 'JED', duration: 1.5 }, { from: 'JED', to: 'DMM', duration: 2.0 },
    { from: 'DMM', to: 'MED', duration: 1.8 }, { from: 'MED', to: 'AHB', duration: 1.2 },
    { from: 'AHB', to: 'ULH', duration: 2.5 }, { from: 'ULH', to: 'RUH', duration: 1.5 }
  ];

  const flightsData = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 10); // Start 10 days from now

  for (let i = 0; i < 20; i++) {
    const route = routes[i % routes.length];
    const airline = airlines[i % airlines.length];
    const depTime = new Date(baseDate.getTime() + (i * 12 * 60 * 60 * 1000));
    const arrTime = new Date(depTime.getTime() + (route.duration * 60 * 60 * 1000));

    flightsData.push(prisma.flight.create({
      data: {
        flightNumber: `${airline.iataCode}${1000 + i}`,
        airlineId: airline.id,
        from: route.from, to: route.to,
        departureTime: depTime, arrivalTime: arrTime,
        basePrice: 300 + (Math.random() * 200),
        seats: { create: generateSeats() }
      }
    }));
  }

  await Promise.all(flightsData);
  console.log('✅ All seed data successfully loaded with hashed passwords! 20 flights seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });