/** Single place to rename routes. Admin paths are unchanged except the dashboard, which moved from "/" to "/dashboard". */
export const routes = {
  home: '/',
  stays: '/stays',
  rentals: '/rentals',
  login: '/login',
  register: '/register',
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
