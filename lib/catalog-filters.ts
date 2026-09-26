import type { Prisma } from '@prisma/client';

export class FilterError extends Error {}

function read(params: URLSearchParams, key: string): string | undefined {
  const values = params.getAll(key);
  if (!values.length) return undefined;
  if (values.length !== 1 || !values[0].trim()) {
    throw new FilterError(`${key} must have one non-empty value`);
  }
  return values[0].trim();
}

function price(params: URLSearchParams, key: string): string | undefined {
  const value = read(params, key);
  if (value === undefined) return undefined;
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) {
    throw new FilterError(`${key} must be between 0 and 99999999.99 with at most two decimal places`);
  }
  return value;
}

function priceRange(params: URLSearchParams) {
  const min = price(params, 'minPrice');
  const max = price(params, 'maxPrice');
  if (min !== undefined && max !== undefined && Number(min) > Number(max)) {
    throw new FilterError('minPrice must not exceed maxPrice');
  }
  return { ...(min !== undefined && { gte: min }), ...(max !== undefined && { lte: max }) };
}

function textFilter(params: URLSearchParams, key: string) {
  const value = read(params, key);
  if (value === undefined) return undefined;
  if (value.length > 100) throw new FilterError(`${key} must be at most 100 characters`);
  return { equals: value, mode: 'insensitive' as const };
}

function checkKeys(params: URLSearchParams, allowed: string[]) {
  for (const key of params.keys()) {
    if (!allowed.includes(key)) throw new FilterError(`Unknown filter: ${key}`);
  }
}

export function hotelFilters(params: URLSearchParams): Prisma.HotelWhereInput {
  checkKeys(params, ['minPrice', 'maxPrice', 'minRating', 'roomType', 'city']);
  const rawRating = read(params, 'minRating');
  if (rawRating !== undefined &&
      (!/^\d(\.\d+)?$/.test(rawRating) || Number(rawRating) < 1 || Number(rawRating) > 5)) {
    throw new FilterError('minRating must be between 1 and 5');
  }
  return {
    pricePerNight: priceRange(params),
    ...(rawRating !== undefined && { rating: { gte: Number(rawRating) } }),
    roomType: textFilter(params, 'roomType'),
    city: textFilter(params, 'city'),
  };
}

export function carFilters(params: URLSearchParams): Prisma.CarWhereInput {
  checkKeys(params, ['minPrice', 'maxPrice', 'category']);
  return { pricePerDay: priceRange(params), category: textFilter(params, 'category') };
}
