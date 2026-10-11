import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const dateString = searchParams.get('date');

  if (!from || !to || !dateString) {
    return NextResponse.json(
      { error: "Missing required search parameters: from, to, or date" }, 
      { status: 400 }
    );
  }

  // 1. VALIDATION: Prevent searching for past dates
  const searchDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for an accurate comparison

  if (isNaN(searchDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format provided" }, { status: 400 });
  }
  if (searchDate < today) {
    return NextResponse.json({ error: "Cannot search for past flights" }, { status: 400 });
  }

  try {
    const flights = await prisma.flight.findMany({
      where: {
        from: from,
        to: to,
        departureTime: {
          gte: new Date(`${dateString}T00:00:00.000Z`),
          lt: new Date(`${dateString}T23:59:59.999Z`),
        },
      },
      include: {
        seats: {
          where: { status: 'AVAILABLE' }
        }
      }
    });

    return NextResponse.json({ success: true, data: flights }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: "Failed to search flights" }, { status: 500 });
  }
}