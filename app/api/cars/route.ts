import { NextResponse } from 'next/server.js';
import { prisma } from '../../../lib/prisma.ts';
import { FilterError, carFilters, catalogPagination, paginationMetadata } from '../../../lib/catalog-filters.ts';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const where = carFilters(params);
    const { page, pageSize, skip, take } = catalogPagination(params);
    // Count and rows share one database snapshot, including during inventory updates.
    const [data, total] = await prisma.$transaction([
      prisma.car.findMany({
        where, skip, take, orderBy: [{ pricePerDay: 'asc' }, { id: 'asc' }],
      }),
      prisma.car.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return NextResponse.json({ success: true, data, pagination: paginationMetadata(page, pageSize, total) });
  } catch (error) {
    const invalid = error instanceof FilterError;
    return NextResponse.json({ success: false, error: invalid ? error.message : 'Unable to load cars' },
      { status: invalid ? 400 : 500 });
  }
}
