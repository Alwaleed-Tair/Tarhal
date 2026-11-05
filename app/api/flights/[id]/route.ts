import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma'; 

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const flightId = (await params).id;

    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: {
        airline: true, // Includes full airline details (name, nameAr, IATA code, logo)
        seats: true    // Includes the full seat map with status per seat
      }
    });

    if (!flight) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: flight }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch flight details" }, { status: 500 });
  }
}