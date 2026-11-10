import { api, assertSuccess, num, str, toList, type Paginated, type Raw } from '@/services/api';
import type { User } from '@/data/demoData';

/** The most rows GET /api/admin/users returns per page. */
const PAGE_SIZE = 100;
const asRaw = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});

const toUser = (r: Raw): User => {
  const counts = asRaw(r._count);
  return {
    id: str(r.id), name: str(r.name), email: str(r.email), date: str(r.createdAt).slice(0, 10),
    // Flight, hotel and car bookings together.
    bookings: num(counts.bookings) + num(counts.hotelBookings) + num(counts.carRentals),
    status: 'Active', phone: str(r.phoneNumber) || undefined, role: str(r.role) || undefined,
  };
};

export const userService = {
  /**
   * Every account from GET /api/admin/users (admin only, never a password), all pages, newest first.
   * If the pages do not add up to the API's total, the load fails rather than showing a partial list.
   */
  async all(): Promise<User[]> {
    const page = async (n: number) => {
      const { data } = await api.get<Paginated<Raw>>('/admin/users', { params: { page: n, pageSize: PAGE_SIZE } });
      assertSuccess(data);
      return data;
    };
    const first = await page(1);
    const rest = await Promise.all(Array.from({ length: Math.max(0, (first.pagination?.totalPages ?? 1) - 1) }, (_, i) => page(i + 2)));
    const rows = [first, ...rest].flatMap((d) => toList(d));
    const total = first.pagination?.total ?? rows.length;
    if (rows.length !== total) throw new Error('The user list changed while it was loading.');
    return rows.map(toUser);
  },
};
