import { NextResponse } from 'next/server.js';
import { prisma } from '../../../lib/prisma.ts';
import { FilterError, carFilters } from '../../../lib/catalog-filters.ts';

export async function GET(request: Request) {
  try {
    const where = carFilters(new URL(request.url).searchParams);
    const data = await prisma.car.findMany({
      where, orderBy: [{ pricePerDay: 'asc' }, { id: 'asc' }],
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const invalid = error instanceof FilterError;
    return NextResponse.json({ success: false, error: invalid ? error.message : 'Unable to load cars' },
      { status: invalid ? 400 : 500 });
  }
}
