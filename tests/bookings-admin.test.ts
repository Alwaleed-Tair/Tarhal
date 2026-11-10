import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { prisma } from '../lib/prisma.ts';
import { carTotal, guestCount, hotelTotal, stayRange, StayError, riyadhToday } from '../lib/stays.ts';
import { publicSeat, seatIsFree } from '../lib/seats.ts';
import { ValidationError, adminPage, carCreate, carUpdate, flightCreate, flightUpdate, hotelCreate, hotelUpdate } from '../lib/admin-validation.ts';
import { isBookingType } from '../lib/bookings.ts';
import { issueSession, SESSION_COOKIE } from '../lib/session-token.ts';
import { DELETE as adminDelete, GET as adminGet, PATCH as adminPatch, POST as adminPost } from '../app/api/admin/[...slug]/route.ts';

process.env.SESSION_SECRET = 'bookings-admin-test-secret'.repeat(2);
const now = new Date('2027-01-10T09:00:00Z'); // 12:00 in Riyadh

test('stay dates: from today (Riyadh), end after start, at most 30 nights, real dates only', () => {
  assert.equal(riyadhToday(new Date('2027-01-09T22:30:00Z')), '2027-01-10');
  assert.equal(stayRange('2027-01-10', '2027-01-13', ['checkIn', 'checkOut'], now).nights, 3);
  for (const [a, b] of [['2027-01-09', '2027-01-11'], ['2027-01-12', '2027-01-12'], ['2027-01-12', '2027-01-11'], ['2027-01-10', '2027-02-10'], ['2027-02-30', '2027-03-02'], ['10/01/2027', '2027-01-12'], [undefined, '2027-01-12'], ['2028-02-01', '2028-02-03']]) {
    assert.throws(() => stayRange(a, b, ['checkIn', 'checkOut'], now), StayError, `${a} -> ${b}`);
  }
});

test('server prices: nights x price, days x (price + insurance when chosen)', () => {
  assert.equal(hotelTotal(299.99, 3), 899.97);
  assert.equal(carTotal(175, 35, 2, true), 420);
  assert.equal(carTotal(175, 35, 2, false), 350);
  assert.equal(guestCount(undefined), 1);
  for (const bad of [0, 11, 1.5, '2']) assert.throws(() => guestCount(bad), StayError);
});

const seat = (over: Record<string, unknown> = {}) => ({ id: 's1', flightId: 'f1', seatCode: '1A', ticketClass: 'ECONOMY', priceMultiplier: 1, status: 'AVAILABLE', heldUntil: null, heldByUserId: null, createdAt: now, updatedAt: now, ...over }) as any;

test('seats never show who holds them; expired holds are free; holders see their own hold', () => {
  const later = new Date(now.getTime() + 60_000), earlier = new Date(now.getTime() - 60_000);
  const held = seat({ status: 'HELD', heldUntil: later, heldByUserId: 'u1' });
  assert.equal('heldByUserId' in publicSeat(held, 'u2', now), false);
  assert.deepEqual([publicSeat(held, 'u2', now).heldByMe, publicSeat(held, 'u2', now).heldUntil], [false, null]);
  assert.deepEqual([publicSeat(held, 'u1', now).heldByMe, publicSeat(held, 'u1', now).heldUntil], [true, later]);
  const expired = seat({ status: 'HELD', heldUntil: earlier, heldByUserId: 'u1' });
  assert.equal(seatIsFree(expired, now), true);
  assert.equal(publicSeat(expired, 'u1', now).status, 'AVAILABLE');
  assert.equal(publicSeat(seat({ status: 'BOOKED' }), null, now).free, false);
  assert.equal(isBookingType('hotel'), true);
  assert.equal(isBookingType('boat'), false);
});

const flight = { flightNumber: 'test-1', airlineId: 'a1', from: 'ruh', to: 'JED', departureTime: '2027-02-01T06:00:00Z', arrivalTime: '2027-02-01T07:30:00Z', basePrice: 420, seats: [{ seatCode: '1a', ticketClass: 'BUSINESS', priceMultiplier: 1.5 }, { seatCode: '2A' }] };

test('admin flight body: normalised, and every bad field is named', () => {
  const ok = flightCreate(flight, now);
  assert.equal(ok.flightNumber, 'TEST-1'); assert.equal(ok.from, 'RUH');
  assert.deepEqual(ok.seats.map((s) => [s.seatCode, s.ticketClass, s.priceMultiplier]), [['1A', 'BUSINESS', 1.5], ['2A', 'ECONOMY', 1]]);
  const field = (body: Record<string, unknown>) => { try { flightCreate(body, now); return 'ok'; } catch (e) { return (e as ValidationError).field; } };
  assert.equal(field({ ...flight, flightNumber: 'bad number' }), 'flightNumber');
  assert.equal(field({ ...flight, to: 'RUH' }), 'to');
  assert.equal(field({ ...flight, departureTime: '2026-01-01T00:00:00Z' }), 'departureTime');
  assert.equal(field({ ...flight, arrivalTime: flight.departureTime }), 'arrivalTime');
  assert.equal(field({ ...flight, basePrice: 19.999 }), 'basePrice');
  assert.equal(field({ ...flight, basePrice: 19.99 }), 'ok');
  assert.equal(field({ ...flight, seats: [] }), 'seats');
  assert.equal(field({ ...flight, seats: [{ seatCode: '1A' }, { seatCode: '1a' }] }), 'seats[1].seatCode');
  assert.equal(field({ ...flight, seats: [{ seatCode: '1A', ticketClass: 'VIP' }] }), 'seats[0].ticketClass');
  assert.equal(field({ ...flight, extra: 1 }), 'extra');
  assert.deepEqual(Object.keys(flightUpdate({ basePrice: '450.50' })), ['basePrice']);
  assert.throws(() => flightUpdate({}), ValidationError);
});

test('admin hotel and car bodies use the real columns and their limits', () => {
  assert.deepEqual(hotelCreate({ name: ' Inn ', city: 'Jeddah', pricePerNight: 300, rating: 4.5, roomType: 'Deluxe' }), { name: 'Inn', city: 'Jeddah', address: null, pricePerNight: 300, rating: 4.5, roomType: 'Deluxe' });
  for (const bad of [{ rating: 0 }, { rating: 6 }, { pricePerNight: 0 }, { imageUrl: 'javascript:alert(1)' }, { stars: 5 }, {}]) assert.throws(() => hotelUpdate(bad), ValidationError, JSON.stringify(bad));
  assert.equal(hotelUpdate({ address: '' }).address, null);
  const car = { make: 'Toyota', model: 'Camry', year: 2024, seats: 5, category: 'Sedan', city: 'Riyadh', pricePerDay: 180 };
  assert.deepEqual(Object.keys(carCreate(car, now)).sort(), Object.keys(car).sort());
  for (const bad of [{ year: 1899 }, { year: 2029 }, { seats: 0 }, { transmission: 'CVT' }, { isAvailable: 'no' }, { insurancePricePerDay: -1 }]) assert.throws(() => carUpdate(bad, now), ValidationError, JSON.stringify(bad));
  assert.equal(carUpdate({ insurancePricePerDay: 0, isAvailable: false }, now).isAvailable, false);
  assert.deepEqual(adminPage(new URLSearchParams('page=2&pageSize=10')), { page: 2, pageSize: 10, skip: 10, take: 10 });
  assert.throws(() => adminPage(new URLSearchParams('pageSize=101')), ValidationError);
});

const users: Record<string, { id: string; name: string; email: string; role: string; password: string }> = {
  admin: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN', password: 'hash-a' },
  traveler: { id: 'user-1', name: 'Traveler', email: 't@example.com', role: 'TRAVELER', password: 'hash-t' },
};
const request = (method: string, path: string, who?: keyof typeof users, body?: unknown) => new NextRequest(`http://localhost/api/admin/${path}`, {
  method, body: body === undefined ? undefined : JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...(who && { cookie: `${SESSION_COOKIE}=${issueSession(users[who], process.env.SESSION_SECRET!)}` }) },
});
const ctx = (path: string) => ({ params: Promise.resolve({ slug: path.split('/') }) });
const call = (handler: typeof adminGet, method: string, path: string, who?: keyof typeof users, body?: unknown) => handler(request(method, path, who, body), ctx(path));

test('admin router: 401, 403, 404 for unknown paths, 409 duplicates and flights with bookings', async () => {
  const saved = { user: prisma.user.findUnique, airline: prisma.airline.findUnique, flight: prisma.flight.findUnique, del: prisma.flight.delete, hotel: prisma.hotel.update };
  try {
    prisma.user.findUnique = (async ({ where }: any) => Object.values(users).find((u) => u.id === where.id) ?? null) as any;
    assert.equal((await call(adminGet, 'GET', 'flights')).status, 401);
    assert.equal((await call(adminGet, 'GET', 'flights', 'traveler')).status, 403);
    for (const [handler, method, path] of [[adminGet, 'GET', 'unknown'], [adminPost, 'POST', 'airlines'], [adminPatch, 'PATCH', 'flights'], [adminDelete, 'DELETE', 'hotels/h1'], [adminGet, 'GET', 'flights/a/b']] as const) {
      assert.equal((await call(handler, method, path, 'admin', method === 'GET' ? undefined : {})).status, 404, `${method} ${path}`);
    }
    prisma.airline.findUnique = (async () => ({ id: 'a1' })) as any;
    prisma.flight.findUnique = (async ({ where }: any) => (where.flightNumber ? { id: 'existing' } : { id: where.id, _count: { bookings: 2 } })) as any;
    const body = { ...flight, departureTime: '2099-02-01T06:00:00Z', arrivalTime: '2099-02-01T07:30:00Z' };
    const dupe = await call(adminPost, 'POST', 'flights', 'admin', body);
    assert.equal(dupe.status, 409);
    assert.equal((await dupe.json()).field, 'flightNumber');
    const bad = await call(adminPost, 'POST', 'flights', 'admin', { ...body, from: 'R' });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).field, 'from');
    let deleted = false;
    prisma.flight.delete = (async () => { deleted = true; }) as any;
    assert.equal((await call(adminDelete, 'DELETE', 'flights/f1', 'admin')).status, 409);
    assert.equal(deleted, false);
    prisma.hotel.update = (async () => { throw Object.assign(Object.create((await import('@prisma/client')).Prisma.PrismaClientKnownRequestError.prototype), { code: 'P2025', message: 'secret db detail' }); }) as any;
    const missing = await call(adminPatch, 'PATCH', 'hotels/nope', 'admin', { rating: 3 });
    assert.equal(missing.status, 404);
    assert.doesNotMatch(JSON.stringify(await missing.json()), /secret db detail/);
    assert.equal((await call(adminPatch, 'PATCH', 'bookings/b1', 'admin', { type: 'boat', action: 'cancel' })).status, 400);
  } finally {
    prisma.user.findUnique = saved.user; prisma.airline.findUnique = saved.airline; prisma.flight.findUnique = saved.flight; prisma.flight.delete = saved.del; prisma.hotel.update = saved.hotel;
    await prisma.$disconnect();
  }
});
