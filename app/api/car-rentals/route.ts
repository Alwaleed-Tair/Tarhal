import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '../../../lib/auth.ts';
import { jsonObject } from '../../../lib/auth-http.ts';
import { prisma } from '../../../lib/prisma.ts';
import { StayError, carTotal, stayRange } from '../../../lib/stays.ts';

const fail = (status: number, error: string, field?: string) => NextResponse.json({ success: false, error, ...(field && { field }) }, { status });

// POST /api/car-rentals { carId, pickupDate: "YYYY-MM-DD", returnDate: "YYYY-MM-DD", withInsurance? }
// Price: days x (pricePerDay + insurancePricePerDay when withInsurance). 409 when the car is unavailable or already rented for those days.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Login required');
  const body = await jsonObject(request);
  if (!body) return fail(400, 'Send a valid JSON object');
  if (typeof body.carId !== 'string' || !body.carId) return fail(400, 'carId is required', 'carId');
  if (body.withInsurance !== undefined && typeof body.withInsurance !== 'boolean') return fail(400, 'withInsurance must be true or false', 'withInsurance');
  const withInsurance = body.withInsurance === true;
  const carId = body.carId;
  try {
    const { start, end, nights: days } = stayRange(body.pickupDate, body.returnDate, ['pickupDate', 'returnDate']);
    const rental = await prisma.$transaction(async (tx) => {
      const car = await tx.car.findUnique({ where: { id: carId } });
      if (!car) throw new StayError('NOT_FOUND');
      if (!car.isAvailable) throw new StayError('UNAVAILABLE');
      // Same car, overlapping days, still active: the car is taken.
      const clash = await tx.carRental.count({ where: { carId: car.id, isActive: true, pickupDate: { lt: end }, returnDate: { gt: start } } });
      if (clash) throw new StayError('TAKEN');
      return tx.carRental.create({
        data: { userId: user.id, carId: car.id, pickupDate: start, returnDate: end, withInsurance, totalPrice: carTotal(Number(car.pricePerDay), Number(car.insurancePricePerDay), days, withInsurance) },
        include: { car: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ success: true, data: { ...rental, type: 'car', days } }, { status: 201 });
  } catch (error) {
    if (error instanceof StayError) {
      if (error.message === 'NOT_FOUND') return fail(404, 'Car not found', 'carId');
      if (error.message === 'UNAVAILABLE') return fail(409, 'This car is not available right now', 'carId');
      if (error.message === 'TAKEN') return fail(409, 'This car is already rented for some of those days', 'pickupDate');
      return fail(400, error.message, error.field);
    }
    // Two rentals of the same car at the same moment: the database refuses one of them.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return fail(409, 'This car was just rented by someone else; please try again', 'carId');
    return fail(500, 'Failed to rent the car');
  }
}

// GET /api/car-rentals — the logged-in traveler's own car rentals, newest first.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail(401, 'Login required');
  try {
    const data = await prisma.carRental.findMany({ where: { userId: user.id }, include: { car: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: data.map((r) => ({ ...r, type: 'car' })) });
  } catch {
    return fail(500, 'Failed to fetch car rentals');
  }
}
