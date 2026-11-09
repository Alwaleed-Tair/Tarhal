# Tarhal – where each teammate's work plugs in

Everything the frontend gets from a server goes through `src/services/`. Pages never call `fetch`/`axios` directly.
What an admin page does when a request fails depends on why (`src/hooks/use-admin-data.ts`):
- **401 or 403:** the session is cleared and the page goes to `/login`.
- **The server cannot be reached:** demo rows with a yellow **"Demo data · server unreachable"** badge. Nothing can be saved.
- **Any other answer (400, 404, 500...):** an error state with a Try again button. Demo rows are never shown as if they were real.

The demo login (`mockLogin`, `mockRegister`) only works in local development (`import.meta.env.DEV`), never in a production build.

## Setup
```bash
npm install
cp .env.example .env      # VITE_API_BASE_URL=/api  (dev proxy in vite.config.ts → http://localhost:3000)
npm run dev
```
Backend on another address: `BACKEND_URL=http://host:port npm run dev`. Production: set `VITE_API_BASE_URL` to the full URL.
Login uses Mohammed's HTTP-only session cookie, so every request is sent with `withCredentials: true` (`src/services/api.ts`). A Bearer token is also sent if one is saved in `localStorage.token`. If the frontend is deployed on a different domain than the API, the backend CORS must allow that origin with credentials.

## Who / what / where
| Owner | Feature | File to edit | What to confirm |
|---|---|---|---|
| Mohammed | Login / register / logout | `src/services/authService.ts` | paths (`/auth/login`, `/auth/register`, `/auth/logout`); register sends name, email, phone, dateOfBirth, password |
| Mohammed | Hotels list and filters | `src/services/hotelService.ts` (`GET /hotels`) | connected; admin filters in `src/lib/catalog-query.ts` follow `lib/catalog-filters.ts` |
| Mohammed | Cars list and filters | `src/services/carService.ts` (`GET /cars`) | connected; the API only lists available cars |
| Saud | Admin hotel and car add / edit | not connected: `WRITE_ACTIONS` in `src/pages/admin-resource.tsx` keeps the buttons hidden | waiting for `POST` and `PATCH /admin/hotels` and `/admin/cars`. The hidden form was never tested against a real route |
| Saud | Admin flights + airlines | `flightService.adminList` (`GET /admin/flights`), `flightService.airlineDirectory` (`GET /admin/airlines`) | connected; re-check field names in `toRow` against Saud's new code |
| Abdulelah / Tariq | Passenger booking (public site, not admin) | `flightService.search/getById/hold`, `bookingService.create/mine/cancel` | connected: search, seat map, hold, book, my bookings, cancel. 409 = seat taken |
| Saud | Admin bookings table | `bookingService.list` (`GET /admin/bookings`) | connected; re-check the response shape against Saud's new code |
| Saud | Admin flight add / edit | `src/components/resource-modal.tsx` (`send`) → `POST /admin/flights` (needs `airlineId`), `PATCH /admin/flights/[id]` | connected; PATCH only changes price and departure time |
| Tariq | Passenger pages | `src/pages/passenger/` (his pages from `User-Fixes`), styles in `src/pages/passenger/styles/` | his CSS files are unchanged; `vite-plugins/passenger-css.ts` scopes them and adds dark mode, RTL and Senior Mode at build time |
| Tariq | Hotel and car steps of the booking page | `hotelService.list`, `carService.list` with `city` | real listings; hotel and car **booking** is not connected (no API yet): the steps say so |

## Page → data map
| Page | Data source | Fallback |
|---|---|---|
| `/login`, `/register` | `authService` | `mockLogin` / `mockRegister` in `store/authStore.ts` |
| `/stays` | `hotelService.listPublic()` | `data/listings.ts` |
| `/rentals` | `carService.listPublic()` | `data/listings.ts` |
| `/flights` (admin) | `flightService.adminList()` | `initialResources` in `data/demoData.ts` |
| `/hotels`, `/cars` (admin) | `hotelService.list()`, `carService.list()`: filters and page go to the API | `initialResources` in `data/demoData.ts` |
| `/bookings`, `/revenue` | `bookingService.list()` (`GET /admin/bookings`) | demo store |
| `/dashboard` | `GET /admin/bookings` and `GET /admin/flights` | demo store and demo flights |
| `/users` | customers found in `GET /admin/bookings` (there is no users endpoint yet) | demo store |
| `/travel` (traveler home) | `bookingService.mine()` (`GET /bookings`) for the last and upcoming bookings | none: a message |
| `/travel/flights` | `GET /flights/search`, `GET /flights/:id`, `POST /flights/:id/hold`, `POST /bookings`; hotels and cars from `GET /hotels`, `GET /cars` | none: friendly error messages by status |
| `/travel/bookings` | `GET /bookings`, `POST /bookings/:id/cancel` (signed-out visitors go to `/login?next=...`) | none |
| `/travel/guide`, `/travel/guide/:city` | Tariq's city content in `src/pages/passenger/data/cities.ts` | none needed |

Admin pages need a signed-in user who is not a traveler (`AdminOnly` in `src/App.tsx`). That only hides the pages; the server's 401 on `/api/admin/*` is the real protection.

## Debugging "why is it not live?"
1. A **Demo data** badge means no answer reached the browser: the server is off, or CORS. An error state means the server answered with an error.
2. Browser DevTools → Network → click the failing request.
3. Wrong/blank fields = field names differ: edit the `pick('a','b',...)` keys in the matching service.

## Conventions
- Components: `src/components/` (design-system primitives in `components/ui/`). Pages: `src/pages/`.
- Colors/theme tokens: `src/index.css`. Routes: `src/config/routes.ts`. Texts (EN + AR): `src/i18n/translations.ts`.
- New text = add the key to **both** `en` and `ar`.
- Show amounts with `<Money sar={...} />`: it draws the official Saudi Riyal symbol (`public/Saudi_Riyal_Symbol-2.svg`) by SAMA's rules. `format.currency()` is plain text, only for places that cannot hold an icon (`aria-label`, `<option>`).
