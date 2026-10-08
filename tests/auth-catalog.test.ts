import test from 'node:test';
import assert from 'node:assert/strict';
import { hotelFilters, carFilters, FilterError, catalogPagination, paginationMetadata } from '../lib/catalog-filters.ts';
import { hashPassword, verifyPassword, validNewPassword } from '../lib/passwords.ts';
import { issueResetToken, readResetToken, matchesPassword } from '../lib/password-reset.ts';

const secret = 'unit-test-secret-only-'.repeat(3);

test('inclusive decimal prices and combined hotel filters', () => {
  const where = hotelFilters(new URLSearchParams('minPrice=190.00&maxPrice=510&minRating=4.2&roomType= suite &city= riyadh '));
  assert.deepEqual(where, {
    pricePerNight: { gte: '190.00', lte: '510' }, rating: { gte: 4.2 },
    roomType: { equals: 'suite', mode: 'insensitive' }, city: { equals: 'riyadh', mode: 'insensitive' },
  });
  assert.deepEqual(carFilters(new URLSearchParams('category=SUV&minPrice=0')), {
    pricePerDay: { gte: '0' }, category: { equals: 'SUV', mode: 'insensitive' },
  });
});

for (const query of ['minPrice=-1', 'maxPrice=NaN', 'minPrice=1e2', 'maxPrice=100000000',
  'minPrice=1.001', 'minPrice=', 'maxPrice=Infinity', 'minPrice=5&maxPrice=4',
  'minPrice=1&minPrice=2', 'minRating=0', 'minRating=5.1', 'minRating=NaN',
  'roomType=', 'roomType=a&roomType=b', 'roomType=' + 'a'.repeat(101), 'typo=4']) {
  test(`reject invalid hotel query: ${query.slice(0, 60)}`, () => {
    assert.throws(() => hotelFilters(new URLSearchParams(query)), FilterError);
  });
}

test('cars reject unsupported rating, duplicate category and reversed prices', () => {
  for (const query of ['minRating=4', 'category=a&category=b', 'minPrice=3&maxPrice=2']) {
    assert.throws(() => carFilters(new URLSearchParams(query)), FilterError);
  }
});

test('salted password hashes support login and reject wrong/malformed values', async () => {
  const password = 'Example testing password';
  const hash = await hashPassword(password);
  assert.notEqual(hash, await hashPassword(password));
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
  assert.equal(await verifyPassword('old', 'old'), true);
  assert.equal(await verifyPassword('wrong', 'old'), false);
  assert.equal(await verifyPassword(password, 'scrypt$invalid'), false);
  assert.equal(validNewPassword('short'), false);
  assert.equal(validNewPassword('x'.repeat(129)), false);
});

test('reset tokens expire, detect tampering, reject wrong secret and bind to current password', () => {
  const now = 1_800_000_000_000;
  const user = { id: 'test-user', password: 'old' };
  const token = issueResetToken(user, secret, now);
  const payload = readResetToken(token, secret, now)!;
  assert.equal(payload.sub, user.id);
  assert.equal(matchesPassword(payload, 'old', secret), true);
  assert.equal(matchesPassword(payload, 'new', secret), false);
  assert.equal(readResetToken(token, secret, now + 900_000), null);
  assert.equal(readResetToken(token, secret + 'different', now), null);
  assert.equal(readResetToken('x' + token, secret, now), null);
  assert.equal(readResetToken(token + '.extra', secret, now), null);
  assert.equal(readResetToken('garbage', secret, now), null);
});


test('pagination defaults, bounds, offsets and navigation metadata', () => {
  assert.deepEqual(catalogPagination(new URLSearchParams()), { page: 1, pageSize: 20, skip: 0, take: 20 });
  assert.deepEqual(catalogPagination(new URLSearchParams('page=3&pageSize=2')), { page: 3, pageSize: 2, skip: 4, take: 2 });
  assert.equal(catalogPagination(new URLSearchParams('pageSize=100')).take, 100);
  assert.deepEqual(paginationMetadata(2, 3, 8), { page: 2, pageSize: 3, total: 8, totalPages: 3, hasNextPage: true, hasPreviousPage: true });
  assert.deepEqual(paginationMetadata(1, 20, 0), { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
});

for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=1e2', 'page=', 'page=NaN',
  'page=1&page=2', 'pageSize=0', 'pageSize=101', 'pageSize=1&pageSize=2',
  'pageSize=Infinity', 'page=9007199254740992', 'page=2147483647&pageSize=100']) {
  test(`reject invalid pagination: ${query}`, () => {
    assert.throws(() => catalogPagination(new URLSearchParams(query)), FilterError);
  });
}
