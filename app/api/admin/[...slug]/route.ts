import { NextRequest, NextResponse } from 'next/server';
import { getFlights, createFlightWithSeats, updateFlight, getAirlines, getBookings } from '../../../../lib/db/queries';

// Helper to check admin role (simplified for demo)
function isAdmin(req: NextRequest) {
  // In a real app, verify the token/session and user role
  const role = req.headers.get('x-user-role');
  return role === 'ADMIN';
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { pathname } = new URL(req.url);

  if (pathname.includes('/airlines')) {
    const airlines = await getAirlines();
    return NextResponse.json(airlines);
  }

  if (pathname.includes('/bookings')) {
    const bookings = await getBookings();
    return NextResponse.json(bookings);
  }

  if (pathname.includes('/flights')) {
    const flights = await getFlights();
    return NextResponse.json(flights);
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { flightNumber, airlineId, from, to, departureTime, arrivalTime, basePrice, seats } = body;

  if (!airlineId) return NextResponse.json({ error: 'airlineId is required' }, { status: 400 });

  try {
    const flight = await createFlightWithSeats({
      flightNumber, airlineId, from, to,
      departureTime: new Date(departureTime),
      arrivalTime: new Date(arrivalTime),
      basePrice, seats
    });
    return NextResponse.json(flight, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();
  if (!id) return NextResponse.json({ error: 'Flight ID required' }, { status: 400 });

  const body = await req.json();
  try {
    const flight = await updateFlight(id, {
      basePrice: body.basePrice,
      departureTime: body.departureTime ? new Date(body.departureTime) : undefined
    });
    return NextResponse.json(flight);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}