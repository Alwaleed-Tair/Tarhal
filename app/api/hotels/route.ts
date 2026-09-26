import { NextResponse } from 'next/server.js';
import { prisma } from '../../../lib/prisma.ts';
import { FilterError, hotelFilters } from '../../../lib/catalog-filters.ts';

export async function GET(request: Request) {
  try {
    const where = hotelFilters(new URL(request.url).searchParams);
    const data = await prisma.hotel.findMany({
      where, orderBy: [{ pricePerNight: 'asc' }, { id: 'asc' }],
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const invalid = error instanceof FilterError;
    return NextResponse.json({ success: false, error: invalid ? error.message : 'Unable to load hotels' },
      { status: invalid ? 400 : 500 });
  }
}
