import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runPerformanceTests() {
  console.log('--- Starting Database Performance Tests (Neon DB) ---\n');

  // 1. Test: Flight Search (Filtering by Route)
  console.time('Flight Search Query Time');
  const flights = await prisma.flight.findMany({
    where: {
      from: 'RUH',
      to: 'JED',
    },
    include: {
      seats: true, // Fetch related seats to test join performance
    },
  });
  console.timeEnd('Flight Search Query Time');
  console.log(`Found ${flights.length} flights from RUH to JED.\n`);

  // 2. Test: Hotel Search (Filtering by City and Price)
  console.time('Hotel Filter Query Time');
  const budgetHotels = await prisma.hotel.findMany({
    where: {
      city: 'Riyadh',
      pricePerNight: {
        lte: 400, // Less than or equal to 400
      },
    },
  });
  console.timeEnd('Hotel Filter Query Time');
  console.log(`Found ${budgetHotels.length} budget hotels in Riyadh.\n`);

  // 3. Test: Car Rentals (Filtering by Insurance)
  console.time('Car Rental Query Time');
  const insuredCars = await prisma.car.findMany({
    where: {
      insuranceOption: true,
    },
  });
  console.timeEnd('Car Rental Query Time');
  console.log(`Found ${insuredCars.length} cars with insurance options.\n`);

  console.log('--- Performance Tests Completed Successfully ---');
}

runPerformanceTests()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });