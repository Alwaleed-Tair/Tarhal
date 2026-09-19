import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  // 1. Extract the search criteria from the URL (e.g., /api/flights/search?from=Riyadh&to=Jeddah&date=2026-09-25)
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const dateString = searchParams.get('date');

  // 2. Validate that the user provided all required fields
  if (!from || !to || !dateString) {
    return NextResponse.json(
      { error: "Missing required search parameters: from, to, or date" }, 
      { status: 400 }
    );
  }

  try {
    // 3. Use findMany with the where clause to filter the database
    const flights = await prisma.flight.findMany({
      where: {
        from: from,
        to: to,
        // Since departureTime is a DateTime, we check for flights on that specific day
        departureTime: {
          gte: new Date(`${dateString}T00:00:00.000Z`), // Start of day
          lt: new Date(`${dateString}T23:59:59.999Z`),  // End of day
        },
      },
      // Include the seats relation so the frontend knows what is available to book
      include: {
        seats: {
          where: { status: 'AVAILABLE' }
        }
      }
    });

    // 4. Return the results to the frontend
    return NextResponse.json({ success: true, data: flights }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to search flights" }, 
      { status: 500 }
    );
  }
}