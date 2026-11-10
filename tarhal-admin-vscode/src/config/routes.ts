/**
 * Single place to rename routes. The traveler site is Tariq's design (src/pages/passenger); the admin pages keep their own paths.
 * Old traveler URLs (/travel/..., /stays, /rentals and Tariq's own /flightbooking, /travelguide, /city/:slug, /signup)
 * redirect to these in App.tsx, so saved links keep working.
 */
export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  passenger: {
    home: '/',
    flights: '/book-flight',
    bookings: '/my-bookings',
    hotels: '/hotel-stays',
    cars: '/car-rentals',
    guide: '/travel-guide',
    city: (slug: string) => `/travel-guide/${slug}`,
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
