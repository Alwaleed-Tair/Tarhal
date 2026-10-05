import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { issueResetToken } from '../lib/password-reset.ts';

if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to a dedicated local PostgreSQL test database');
const connection = new URL(process.env.TEST_DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname)) {
  throw new Error('Integration tests require a local PostgreSQL test database');
}
// Never use the application schema: migrate, populate, and clean up a unique test schema.
const schema = 'tarhal_test_' + randomUUID().replaceAll('-', '');
connection.searchParams.set('schema', schema);
process.env.DATABASE_URL = connection.toString();
process.env.PASSWORD_RESET_SECRET = 'integration-test-only-secret-'.repeat(2);
process.env.PASSWORD_RESET_SUPPORT_EMAIL = 'support@example.test';
const { prisma } = await import('../lib/prisma.ts');
const hotels = await import('../app/api/hotels/route.ts');
const cars = await import('../app/api/cars/route.ts');
const login = await import('../app/api/auth/login/route.ts');
const forgot = await import('../app/api/auth/forgot-password/route.ts');
const reset = await import('../app/api/auth/reset-password/route.ts');
const hotelSeeds = JSON.parse(readFileSync(new URL('../prisma/seeds/hotels.json', import.meta.url), 'utf8'));
const carSeeds = JSON.parse(readFileSync(new URL('../prisma/seeds/cars.json', import.meta.url), 'utf8'));
let userId: string;
const oldPassword = 'hashed_password_123'; // Plaintext fixture value despite its name.
const newPassword = 'Replacement test password';
const post = (value: unknown) => new Request('http://localhost/api', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
});
const get = (query = '') => new Request('http://localhost/api?' + query);

before(async () => {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'pipe', env: process.env });
  // Saud's loader deletes tables, so run it ONLY after isolating DATABASE_URL to our random schema.
  execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], { stdio: 'pipe', env: process.env });
  userId = (await prisma.user.findUniqueOrThrow({ where: { email: 'traveler@tarhal.com' } })).id;

});

after(async () => {
  try { await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
  finally { await prisma.$disconnect(); }
});

describe('catalogs against migrated PostgreSQL and committed seed fixtures', () => {
  it('lists the first seed page in deterministic price order, serializing decimal prices as strings', async () => {
    for (const [route, seeds, price] of [[hotels, hotelSeeds, 'pricePerNight'], [cars, carSeeds, 'pricePerDay']] as const) {
      const response = await route.GET(get());
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.data.length, Math.min(20, seeds.length));
      assert.equal(body.pagination.total, seeds.length);
      assert.equal(typeof body.data[0][price], 'string');
      assert.deepEqual(body.data.map((row: any) => row.id), [...seeds].sort((a, b) => a[price] - b[price] || a.id.localeCompare(b.id)).slice(0, 20).map(row => row.id));
    }
  });
  it('combines all hotel filters and includes price/rating boundaries', async () => {
    const response = await hotels.GET(get('minPrice=510&maxPrice=510&minRating=4.6&roomType=sUiTe&city=riyadh'));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data.map((row: any) => row.id), [hotelSeeds[1].id]);
  });
  it('combines car filters case-insensitively with inclusive bounds', async () => {
    const response = await cars.GET(get('category=suv&minPrice=290&maxPrice=290'));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data.map((row: any) => row.id), [carSeeds[3].id]);
  });
  it('returns empty arrays for valid unmatched filters', async () => {
    for (const route of [hotels, cars]) {
      const response = await route.GET(get('maxPrice=1'));
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).data, []);
    }
  });
  it('returns 400 for invalid, repeated and unknown filters', async () => {
    for (const route of [hotels, cars]) {
      for (const query of ['minPrice=-1', 'minPrice=2&maxPrice=1', 'maxPrice=1&maxPrice=2', 'unknown=1']) {
        assert.equal((await route.GET(get(query))).status, 400);
      }
    }
    assert.equal((await hotels.GET(get('minRating=6'))).status, 400);
  });
  it('paginates both catalogs without duplicates and counts filtered rows', async () => {
    for (const [route, seeds, price] of [[hotels, hotelSeeds, 'pricePerNight'], [cars, carSeeds, 'pricePerDay']] as const) {
      const expected = [...seeds].sort((a, b) => a[price] - b[price] || a.id.localeCompare(b.id));
      const ids: string[] = [];
      const pages = Math.ceil(expected.length / 3);
      for (let page = 1; page <= pages; page++) {
        const response = await route.GET(get(`page=${page}&pageSize=3`));
        assert.equal(response.status, 200);
        const body = await response.json();
        ids.push(...body.data.map((row: any) => row.id));
        assert.deepEqual(body.pagination, { page, pageSize: 3, total: expected.length, totalPages: pages,
          hasNextPage: page < pages, hasPreviousPage: page > 1 });
      }
      assert.deepEqual(ids, expected.map(row => row.id));
      const beyond = await (await route.GET(get('page=999&pageSize=3'))).json();
      assert.deepEqual(beyond.data, []);
      assert.equal(beyond.pagination.total, seeds.length);
      assert.equal(beyond.pagination.hasNextPage, false);
      const matching = expected.filter(row => row[price] >= 200 && row[price] <= 600);
      const filtered = await (await route.GET(get('minPrice=200&maxPrice=600&page=2&pageSize=1'))).json();
      assert.equal(filtered.pagination.total, matching.length);
      assert.deepEqual(filtered.data.map((row: any) => row.id), matching.slice(1, 2).map(row => row.id));
      const empty = await (await route.GET(get('maxPrice=1'))).json();
      assert.equal(empty.pagination.totalPages, 0);
      assert.equal(empty.pagination.hasNextPage, false);
    }
  });
  it('rejects invalid pagination on both endpoints', async () => {
    for (const route of [hotels, cars]) {
      for (const query of ['page=0', 'pageSize=101', 'page=2&page=3', 'page=1.2', 'page=2147483647&pageSize=100']) {
        assert.equal((await route.GET(get(query))).status, 400);
      }
    }
  });
  it('uses ID as tie-breaker for equal prices across pages', async () => {
    const hotel = { ...hotelSeeds[0], id: randomUUID() };
    const car = { ...carSeeds[0], id: randomUUID() };
    await prisma.hotel.create({ data: hotel });
    await prisma.car.create({ data: car });
    try {
      for (const [route, row, first, price] of [[hotels, hotel, hotelSeeds[0], 'pricePerNight'], [cars, car, carSeeds[0], 'pricePerDay']] as const) {
        const ids = [];
        for (const page of [1, 2]) {
          const body = await (await route.GET(get(`minPrice=${row[price]}&maxPrice=${row[price]}&pageSize=1&page=${page}`))).json();
          ids.push(body.data[0].id);
          assert.equal(body.pagination.total, 2);
        }
        assert.deepEqual(ids, [row.id, first.id].sort());
      }
    } finally {
      await prisma.hotel.delete({ where: { id: hotel.id } });
      await prisma.car.delete({ where: { id: car.id } });
    }
  });
  it('limits default responses to 20 rows even when more inventory exists', async () => {
    const extraHotels = Array.from({ length: 22 }, (_, i) => ({ ...hotelSeeds[0], id: randomUUID(), name: `Pagination fixture ${i}` }));
    const extraCars = Array.from({ length: 22 }, () => ({ ...carSeeds[0], id: randomUUID() }));
    await prisma.hotel.createMany({ data: extraHotels });
    await prisma.car.createMany({ data: extraCars });
    try {
      for (const [route, count] of [[hotels, hotelSeeds.length + 22], [cars, carSeeds.length + 22]] as const) {
        const first = await (await route.GET(get())).json();
        const second = await (await route.GET(get('page=2'))).json();
        assert.equal(first.data.length, 20);
        assert.equal(first.pagination.pageSize, 20);
        assert.equal(first.pagination.total, count);
        assert.equal(second.data.length, count - 20);
        assert.equal(new Set([...first.data, ...second.data].map(row => row.id)).size, count);
      }
    } finally {
      await prisma.hotel.deleteMany({ where: { id: { in: extraHotels.map(row => row.id) } } });
      await prisma.car.deleteMany({ where: { id: { in: extraCars.map(row => row.id) } } });
    }
  });
  it('handles unavailable database without leaking internals', async () => {
    for (const [model, route] of [[prisma.hotel, hotels], [prisma.car, cars]] as const) {
      const original = model.findMany;
      model.findMany = () => { throw new Error('private connection detail'); };
      try {
        const response = await route.GET(get());
        assert.equal(response.status, 500);
        assert.ok(!(await response.text()).includes('private connection detail'));
      } finally { model.findMany = original; }
    }
  });
});

describe('authentication and support-assisted recovery', () => {
  it('rejects malformed payloads and invalid credentials', async () => {
    for (const route of [login, forgot, reset]) {
      for (const raw of ['{', 'null', '[]', '{}']) {
        assert.equal((await route.POST(new Request('http://localhost', { method: 'POST', body: raw }))).status, 400);
      }
      assert.equal(route.OPTIONS().headers.get('Access-Control-Allow-Origin'), '*');
    }
    assert.equal((await login.POST(post({ username: 'Test Traveler', password: 'wrong' }))).status, 401);
    assert.equal((await login.POST(post({ username: 'Unknown', password: 'wrong' }))).status, 401);
  });
  it('returns actionable field errors and stable machine-readable codes', async () => {
    for (const [route, body, code, field] of [
      [login, { email: 'bad', password: oldPassword }, 'INVALID_EMAIL', 'email'],
      [login, { username: 'Test Traveler' }, 'INVALID_PASSWORD', 'password'],
      [login, { password: oldPassword }, 'INVALID_USERNAME', 'username'],
      [forgot, { email: 'bad' }, 'INVALID_EMAIL', 'email'],
      [reset, { newPassword }, 'RESET_TOKEN_REQUIRED', 'token'],
      [reset, { token: 'abc', newPassword: 'short' }, 'INVALID_NEW_PASSWORD', 'newPassword'],
    ] as const) {
      const response = await route.POST(post(body));
      assert.equal(response.status, 400);
      const result = await response.json();
      assert.equal(result.code, code);
      assert.equal(result.field, field);
      assert.ok(result.error.length > 10);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
    const conflict = await login.POST(post({ username: 'Test Traveler', email: 'traveler@tarhal.com', password: oldPassword }));
    assert.equal((await conflict.json()).code, 'IDENTITY_CONFLICT');
  });
  it('does not reveal account existence through credential error messages', async () => {
    const known = await login.POST(post({ email: 'traveler@tarhal.com', password: 'wrong' }));
    const unknown = await login.POST(post({ email: 'missing@example.test', password: 'wrong' }));
    assert.equal(known.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(await known.json(), await unknown.json());
  });
  it('preserves username login and upgrades plaintext password without returning it', async () => {
    const response = await login.POST(post({ username: 'Test Traveler', password: oldPassword }));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).user, { id: userId, name: 'Test Traveler' });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.ok(user.password.startsWith('scrypt$'));
    assert.equal((await login.POST(post({ email: user.email, password: oldPassword }))).status, 200);
  });
  it('returns identical recovery instructions for known and unknown accounts', async () => {
    const existing = await forgot.POST(post({ email: 'traveler@tarhal.com' }));
    const unknown = await forgot.POST(post({ email: 'unknown@example.test' }));
    assert.equal(existing.status, 200);
    assert.deepEqual(await existing.json(), await unknown.json());
    assert.equal(existing.headers.get('Cache-Control'), 'no-store');
  });
  it('fails explicitly when recovery is not configured', async () => {
    const saved = process.env.PASSWORD_RESET_SECRET;
    delete process.env.PASSWORD_RESET_SECRET;
    try {
      assert.equal((await forgot.POST(post({ email: 'traveler@tarhal.com' }))).status, 503);
      assert.equal((await reset.POST(post({ token: 'abc', newPassword }))).status, 503);
    } finally { process.env.PASSWORD_RESET_SECRET = saved; }
  });
  it('rejects expired, tampered and nonexistent-user tokens', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = process.env.PASSWORD_RESET_SECRET!;
    for (const token of [issueResetToken(user, secret, Date.now() - 901_000),
      issueResetToken(user, secret) + 'x', issueResetToken({ ...user, id: randomUUID() }, secret)]) {
      assert.equal((await reset.POST(post({ token, newPassword }))).status, 400);
    }
  });
  it('allows one concurrent reset, blocks reuse and accepts only the new password', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const output = execFileSync(process.execPath, ['scripts/issue-password-reset.ts', user.email, '--identity-verified'], { env: process.env, encoding: 'utf8' });
    const token = output.trim().split('\n').at(-1)!;
    const responses = await Promise.all([reset.POST(post({ token, newPassword })), reset.POST(post({ token, newPassword }))]);
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 400]);
    assert.equal((await reset.POST(post({ token, newPassword }))).status, 400);
    assert.equal((await login.POST(post({ email: user.email, password: oldPassword }))).status, 401);
    assert.equal((await login.POST(post({ email: user.email, password: newPassword }))).status, 200);
  });
  it('requires email when two accounts share a name', async () => {
    await prisma.user.create({ data: { name: 'Test Traveler', email: 'second@example.test', phoneNumber: '+966500000002', password: oldPassword } });
    assert.equal((await login.POST(post({ username: 'Test Traveler', password: newPassword }))).status, 401);
    assert.equal((await login.POST(post({ email: 'traveler@tarhal.com', password: newPassword }))).status, 200);
  });
  it('handles database errors on login and reset without exposing internals', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    for (const [method, route, body] of [
      ['findMany', login, { username: user.name, password: newPassword }],
      ['findUnique', reset, { token: issueResetToken(user, process.env.PASSWORD_RESET_SECRET!), newPassword }],
    ] as const) {
      const original = prisma.user[method];
      prisma.user[method] = () => { throw new Error('private connection detail'); };
      try {
        const response = await route.POST(post(body));
        assert.equal(response.status, 500);
        assert.ok(!(await response.text()).includes('private connection detail'));
      } finally { (prisma.user as any)[method] = original; }
    }
  });
});
