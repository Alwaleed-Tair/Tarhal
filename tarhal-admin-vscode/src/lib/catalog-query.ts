import type { Service } from '@/data/demoData';
import type { TranslationKey } from '@/i18n/translations';

// Filters of the admin Hotels and Cars pages. The rules copy lib/catalog-filters.ts on the server,
// so a value the API would refuse with 400 is explained at the field and never sent.

export type CatalogFilters = { city: string; minPrice: string; maxPrice: string; minRating: string; transmission: string; minSeats: string };
export type FilterKey = keyof CatalogFilters;
export type FilterProblems = Partial<Record<FilterKey, TranslationKey>>;

export const NO_FILTERS: CatalogFilters = { city: '', minPrice: '', maxPrice: '', minRating: '', transmission: '', minSeats: '' };

const SUPPORTED: Record<Exclude<Service, 'flight'>, FilterKey[]> = {
  hotel: ['city', 'minPrice', 'maxPrice', 'minRating'],
  car: ['city', 'minPrice', 'maxPrice', 'transmission', 'minSeats'],
};
const keysOf = (kind: Service): FilterKey[] => (kind === 'flight' ? [] : SUPPORTED[kind]);

const PRICE = /^\d{1,8}(\.\d{1,2})?$/;

export function filterProblems(kind: Service, filters: CatalogFilters): FilterProblems {
  const problems: FilterProblems = {};
  const value = (key: FilterKey) => (keysOf(kind).includes(key) ? filters[key].trim() : '');
  const min = value('minPrice'), max = value('maxPrice');
  if (min && !PRICE.test(min)) problems.minPrice = 'filterPriceInvalid';
  if (max && !PRICE.test(max)) problems.maxPrice = 'filterPriceInvalid';
  if (!problems.minPrice && !problems.maxPrice && min && max && Number(min) > Number(max)) problems.maxPrice = 'filterPriceRange';
  const rating = value('minRating');
  if (rating && (!/^\d(\.\d+)?$/.test(rating) || Number(rating) < 1 || Number(rating) > 5)) problems.minRating = 'filterRatingInvalid';
  const seats = value('minSeats');
  if (seats && (!/^[1-9]\d*$/.test(seats) || Number(seats) > 100)) problems.minSeats = 'filterSeatsInvalid';
  return problems;
}

/** The query parameters for one page: only filters this API supports, and only the ones that have a value. */
export function catalogQuery(kind: Service, filters: CatalogFilters): Partial<CatalogFilters> {
  return Object.fromEntries(keysOf(kind).map((key) => [key, filters[key].trim()]).filter(([, value]) => value));
}
