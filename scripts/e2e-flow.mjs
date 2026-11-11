// End-to-end check of the MVP flow against a running Tarhal server.
//
//   BASE_URL=http://localhost:3000 npm run test:e2e
//
// Needs a seeded database (npx prisma db seed). Creates two traveler accounts,
// books and cancels a seat, and checks the admin endpoints with the seeded admin.
// Never point this at a production database.

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@tarhal.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'hashed_password_123';
const FROM = process.env.E2E_FROM || 'RUH';
const TO = process.env.E2E_TO || 'JED';
const DATE = process.env.E2E_DATE || '2027-01-10';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  -> ${detail}` : ''}`);
}

class Client {
  constructor() { this.cookie = ''; }
  async call(method, path, body) {
    const headers = { origin: BASE };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.cookie) headers.cookie = this.cookie;
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const pair = c.split(';')[0];
      if (pair.startsWith('tarhal_session=')) this.cookie = pair.endsWith('=') ? '' : pair;
    }
    let json = null;
    try { json = await res.json(); } catch { /* empty body */ }
    return { status: res.status, json };
  }
  get(p) { return this.call('GET', p); }
  post(p, b) { return this.call('POST', p, b ?? {}); }
}

const stamp = Date.now();
const phone = (n) => `+9665${String(stamp + n).slice(-8)}`;
async function newTraveler(n) {
  const c = new Client();
  const email = `e2e.${stamp}.${n}@example.com`;
  const reg = await c.post('/api/auth/register', { name: `E2E Traveler ${n}`, email, phone: phone(n), password: 'e2e-password-123', dateOfBirth: '1999-05-20' });
  const login = await c.post('/api/auth/login', { email, password: 'e2e-password-123' });
  return { c, email, reg, login, id: login.json?.user?.id };
}
const seatsOf = (flight) => flight?.seats ?? [];
const statusOf = async (c, flightId, seatId) => seatsOf((await c.get(`/api/flights/${flightId}`)).json?.data).find((s) => s.id === seatId)?.status;

async function main() {
  console.log(`Tarhal end-to-end check against ${BASE}\n`);
  const anon = new Client();

  // Catalog
  const hotels = await anon.get('/api/hotels?pageSize=5');
  check('Hotels list loads', hotels.status === 200 && Array.isArray(hotels.json?.data), `status ${hotels.status}`);
  const cars = await anon.get('/api/cars?transmission=AUTOMATIC');
  check('Cars filter by transmission', cars.status === 200 && cars.json?.data?.every((c) => c.transmission === 'AUTOMATIC' && c.isAvailable), `status ${cars.status}`);

  // Accounts
  const a = await newTraveler(1);
  check('Register a new traveler', a.reg.status === 201, `status ${a.reg.status} ${JSON.stringify(a.reg.json)}`);
  const dup = await a.c.post('/api/auth/register', { name: 'Dup', email: a.email, phone: phone(1), password: 'e2e-password-123', dateOfBirth: '1999-05-20' });
  check('Duplicate registration is rejected (409)', dup.status === 409, `status ${dup.status}`);
  check('Login sets a session cookie', a.login.status === 200 && a.c.cookie, `status ${a.login.status}`);
  const b = await newTraveler(2);
  check('Second traveler can log in', b.login.status === 200 && b.c.cookie, `status ${b.login.status}`);

  // Search and flight details
  const search = await anon.get(`/api/flights/search?from=${FROM}&to=${TO}&date=${DATE}`);
  const flight = search.json?.data?.[0];
  check(`Search ${FROM}->${TO} on ${DATE} returns a flight`, search.status === 200 && flight, `status ${search.status} ${JSON.stringify(search.json)}`);
  if (!flight) return;
  check('Search result includes airline, seat count and lowest price', flight.airline?.iataCode && flight.availableSeatsCount > 0 && flight.lowestPrice > 0);
  const details = await anon.get(`/api/flights/${flight.id}`);
  const seat = seatsOf(details.json?.data).find((s) => s.status === 'AVAILABLE');
  check('Flight details include the seat map', details.status === 200 && seat, `status ${details.status}`);
  if (!seat) return;
  const traveler = { seatId: seat.id, fullName: 'E2E Traveler One', passportNumber: 'A1234567', dateOfBirth: '1999-05-20' };

  // Booking
  const noAuth = await anon.post('/api/bookings', { flightId: flight.id, travelers: [traveler] });
  check('Booking without login is rejected (401)', noAuth.status === 401, `status ${noAuth.status}`);
  const book = await a.c.post('/api/bookings', { flightId: flight.id, userId: b.id, basePrice: 1, totalPrice: 1, travelers: [traveler] });
  const booking = book.json?.data;
  check('Logged-in traveler can book a seat', book.status === 201 && booking?.id, `status ${book.status} ${JSON.stringify(book.json)}`);
  if (!booking) return;
  const expected = Number(flight.basePrice) * Number(seat.priceMultiplier);
  check('Price is calculated on the server (client price ignored)', Math.abs(Number(booking.totalPrice) - expected) < 0.01, `got ${booking.totalPrice}, expected ${expected}`);
  check('Booking belongs to the logged-in user (client userId ignored)', booking.userId === a.id, `userId ${booking.userId}`);
  check('Seat becomes BOOKED', await statusOf(anon, flight.id, seat.id) === 'BOOKED');
  const again = await b.c.post('/api/bookings', { flightId: flight.id, travelers: [{ ...traveler, fullName: 'Someone Else' }] });
  check('Same seat cannot be booked twice (409)', again.status === 409, `status ${again.status}`);

  // My bookings
  const mine = await a.c.get('/api/bookings');
  check('My bookings lists the new booking', mine.status === 200 && mine.json?.data?.some((x) => x.id === booking.id), `status ${mine.status} ${JSON.stringify(mine.json)?.slice(0, 160)}`);
  const peek = await b.c.get(`/api/bookings?userId=${a.id}`);
  check("A traveler cannot read another traveler's bookings", !(peek.json?.data ?? []).some((x) => x.id === booking.id), `status ${peek.status}: returned the other user's booking`);

  // Cancellation
  const cancelPath = process.env.E2E_CANCEL_PATH || '/api/bookings/{id}/cancel';
  const cancelUrl = cancelPath.replace('{id}', booking.id);
  const anonCancel = await anon.post(cancelUrl);
  check('Cancel without login is rejected (401)', anonCancel.status === 401, `status ${anonCancel.status} on ${cancelUrl}`);
  const otherCancel = await b.c.post(cancelUrl);
  check("A traveler cannot cancel someone else's booking", [403, 404].includes(otherCancel.status), `status ${otherCancel.status}`);
  const cancel = await a.c.post(cancelUrl);
  check('Owner can cancel the booking', cancel.status === 200, `status ${cancel.status}`);
  check('Cancelled seat is AVAILABLE again', await statusOf(anon, flight.id, seat.id) === 'AVAILABLE');

  // Admin
  const travelerAdmin = await a.c.get('/api/admin/flights');
  check('Traveler is blocked from admin endpoints (403)', travelerAdmin.status === 403, `status ${travelerAdmin.status}`);
  const admin = new Client();
  const adminLogin = await admin.post('/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  check('Seeded admin can log in', adminLogin.status === 200 && adminLogin.json?.user?.role === 'ADMIN', `status ${adminLogin.status}`);
  if (adminLogin.status === 200) {
    const af = await admin.get('/api/admin/flights');
    check('Admin flights list includes airlines', af.status === 200 && Array.isArray(af.json) && af.json[0]?.airline, `status ${af.status}`);
    const al = await admin.get('/api/admin/airlines');
    check('Admin airlines list loads', al.status === 200 && Array.isArray(al.json) && al.json.length > 0, `status ${al.status}`);
    const ab = await admin.get('/api/admin/bookings');
    const leaked = JSON.stringify(ab.json ?? '').includes('"password"');
    check('Admin bookings list does not expose password hashes', ab.status === 200 && !leaked, leaked ? 'response contains "password"' : `status ${ab.status}`);
  }

  // Session check, simulated payment, hotel and car bookings
  const me = await a.c.get('/api/auth/me');
  check('/api/auth/me returns the logged-in user', me.status === 200 && me.json?.user?.email === a.email && me.json.user.role === 'TRAVELER', `status ${me.status}`);
  check('/api/auth/me without login is 401', (await anon.get('/api/auth/me')).status === 401);
  const seat2 = seatsOf((await a.c.get(`/api/flights/${flight.id}`)).json?.data).find((s) => s.free);
  check('Flight details do not expose who holds a seat', !JSON.stringify(details.json).includes('heldByUserId'));
  if (seat2) {
    const paid = await a.c.post('/api/bookings', { flightId: flight.id, travelers: [{ ...traveler, seatId: seat2.id }] });
    const pay = await a.c.post('/api/payments', { type: 'flight', bookingId: paid.json?.data?.id });
    check('Simulated payment marks the booking PAID', pay.status === 200 && pay.json?.data?.paymentStatus === 'PAID', `status ${pay.status}`);
    check('Paying twice is refused (409)', (await a.c.post('/api/payments', { type: 'flight', bookingId: paid.json?.data?.id })).status === 409);
    await a.c.post(cancelUrl.replace(booking.id, paid.json?.data?.id));
  }
  const day = (n) => new Date(Date.now() + 3 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
  const hotel = (await anon.get('/api/hotels?pageSize=1')).json?.data?.[0];
  if (hotel) {
    const hb = await a.c.post('/api/hotel-bookings', { hotelId: hotel.id, checkIn: day(30), checkOut: day(32), guests: 2 });
    check('Hotel booking is priced on the server (2 nights)', hb.status === 201 && Math.abs(Number(hb.json?.data?.totalPrice) - 2 * Number(hotel.pricePerNight)) < 0.01, `status ${hb.status}`);
    check('Hotel booking in the past is refused (400)', (await a.c.post('/api/hotel-bookings', { hotelId: hotel.id, checkIn: day(-3), checkOut: day(-1) })).status === 400);
    check('My hotel bookings lists it', (await a.c.get('/api/hotel-bookings')).json?.data?.some((x) => x.id === hb.json?.data?.id));
    check("A traveler cannot cancel someone else's hotel booking (404)", (await b.c.post(`/api/hotel-bookings/${hb.json?.data?.id}/cancel`)).status === 404);
    check('Owner cancels the hotel booking', (await a.c.post(`/api/hotel-bookings/${hb.json?.data?.id}/cancel`)).status === 200);
  }
  const car = (await anon.get('/api/cars?pageSize=1')).json?.data?.[0];
  if (car) {
    // A random far-off day, so repeated runs do not overlap an earlier rental of the same car.
    let rental;
    for (let i = 0; i < 4 && rental?.status !== 201; i++) {
      const start = 60 + Math.floor(Math.random() * 280);
      rental = await a.c.post('/api/car-rentals', { carId: car.id, pickupDate: day(start), returnDate: day(start + 1), withInsurance: true });
      rental.start = start;
    }
    check('Car rental is priced on the server (1 day with insurance)', rental.status === 201 && Math.abs(Number(rental.json?.data?.totalPrice) - Number(car.pricePerDay) - Number(car.insurancePricePerDay)) < 0.01, `status ${rental.status}`);
    if (rental.status === 201) {
      const clash = await b.c.post('/api/car-rentals', { carId: car.id, pickupDate: day(rental.start), returnDate: day(rental.start + 1) });
      check('The same car cannot be rented twice for the same day (409)', clash.status === 409, `status ${clash.status}`);
      check('Owner cancels the car rental', (await a.c.post(`/api/car-rentals/${rental.json.data.id}/cancel`)).status === 200);
    }
  }
  if (adminLogin.status === 200) {
    const types = new Set(((await admin.get('/api/admin/bookings')).json ?? []).map((x) => x.type));
    check('Admin bookings include flight, hotel and car types', types.has('flight') && (!hotel || types.has('hotel')) && (!car || types.has('car')), [...types].join(','));
    const users = await admin.get('/api/admin/users?page=1&pageSize=5');
    check('Admin users list is paged and has no passwords', users.status === 200 && users.json?.data?.length <= 5 && users.json?.pagination?.total > 0 && !JSON.stringify(users.json).includes('password'), `status ${users.status}`);
    check('Unknown admin path is 404', (await admin.get('/api/admin/nothing-here')).status === 404);
    if (hotel) check('A hotel with bookings cannot be deleted (409)', (await admin.call('DELETE', `/api/admin/hotels/${hotel.id}`)).status === 409);
    check('Admin POST to a path without a handler is 404 (no flight is created)', (await admin.post('/api/admin/airlines', {})).status === 404);
  }

  // Security and logout
  const evil = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ email: a.email, password: 'e2e-password-123' }) });
  check('Cross-origin login is rejected (403)', evil.status === 403, `status ${evil.status}`);
  const out = await a.c.post('/api/auth/logout');
  const after = await a.c.get('/api/bookings');
  check('Logout ends the session', out.status === 200 && after.status === 401, `logout ${out.status}, then bookings ${after.status}`);
}

main()
  .catch((error) => check('Run completed without crashing', false, error.message))
  .finally(() => {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    process.exitCode = failed.length ? 1 : 0;
  });
