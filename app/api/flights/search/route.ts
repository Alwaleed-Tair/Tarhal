import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const dateString = searchParams.get('date');
  const airlineId = searchParams.get('airline'); // Optional airline filter

  if (!from || !to || !dateString) {
    return NextResponse.json(
      { error: "Missing required search parameters: from, to, or date" }, 
      { status: 400 }
    );
  }

  // 1. VALIDATION & TIMEZONE FIX
  // Using explicit +03:00 offset to map the search date bounds to Riyadh local time
  const startOfDay = new Date(`${dateString}T00:00:00.000+03:00`);
  const endOfDay = new Date(`${dateString}T23:59:59.999+03:00`);
  
  const today = new Date();

  if (isNaN(startOfDay.getTime())) {
    return NextResponse.json({ error: "Invalid date format provided" }, { status: 400 });
  }
  if (endOfDay < today) {
    return NextResponse.json({ error: "Cannot search for past flights" }, { status: 400 });
  }

  try {
    // Build query conditions
    const whereClause: any = {
      from: from,
      to: to,
      departureTime: {
        gte: startOfDay,
        lt: endOfDay,
      },
    };

    // Apply optional airline filter if provided in the URL
    if (airlineId) {
      whereClause.airlineId = airlineId;
    }

    const flights = await prisma.flight.findMany({
      where: whereClause,
      include: {
        airline: true, // Include full airline object (name, logo, IATA, etc.)
        seats: {
          where: { status: 'AVAILABLE' }
        }
      }
    });

    // 2. TRANSFORM RESULTS
    // Remove the raw seats array and replace it with aggregate stats
    const formattedFlights = flights.map((flight) => {
      const availableSeatsCount = flight.seats.length;
      let lowestPrice = null;

      if (availableSeatsCount > 0) {
        const lowestMultiplier = Math.min(...flight.seats.map((s) => Number(s.priceMultiplier)));
        lowestPrice = Number(flight.basePrice) * lowestMultiplier;
      }

      // Destructure to separate seats from the rest of the flight data
      const { seats, ...flightData } = flight;

      return {
        ...flightData,
        availableSeatsCount,
        lowestPrice
      };
    });

    return NextResponse.json({ success: true, data: formattedFlights }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Failed to search flights" }, { status: 500 });
  }
}