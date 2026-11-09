/** Single place to rename routes. Admin paths are unchanged except the dashboard, which moved from "/" to "/dashboard". */
export const routes = {
  home: '/',
  stays: '/stays',
  rentals: '/rentals',
  login: '/login',
  register: '/register',
  /** Tariq's passenger pages. Under /travel so they never clash with /login, /dashboard or the admin pages. */
  passenger: {
    home: '/travel',
    flights: '/travel/flights',
    bookings: '/travel/bookings',
    guide: '/travel/guide',
    city: (slug: string) => `/travel/guide/${slug}`,
  },
  admin: {
    dashboard: '/dashboard',
    flights: '/flights',
    hotels: '/hotels',
    cars: '/cars',
    bookings: '/bookings',
    revenue: '/revenue',
    users: '/users',
    settings: '/settings',
  },
} as const;
