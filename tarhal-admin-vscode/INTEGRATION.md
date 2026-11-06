# Tarhal – where each teammate's work plugs in

Everything the frontend gets from a server goes through `src/services/`. Pages never call `fetch`/`axios` directly.
If a request fails (server off, wrong path, 5xx) the page falls back to demo data and the admin pages show a
yellow **"Demo data · <reason>"** badge, so you can always see whether you are on live data.

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
| Mohammed | Hotels (public + admin) | `src/services/hotelService.ts` | field names in `toHotel` / `toRow` (`pick(...)` keys) |
| Mohammed | Cars (public + admin) | `src/services/carService.ts` | field names in `toCar` / `toRow` |
| Saud | Admin flights + airlines | `flightService.adminList` (`GET /admin/flights`), `flightService.airlines` (`GET /admin/airlines`) | field names in `toRow`; airline may be a nested object |
| Abdulelah / Tariq | Passenger booking (public site, not admin) | `flightService.search/getById`, `bookingService.create` | 409 = seat taken |
| Saud | Admin bookings table | `bookingService.list` (`GET /admin/bookings`, ready) → wire into `src/pages/bookings.tsx` | response shape |
| Saud | Admin flight add / edit | `src/pages/admin-resource.tsx` (`saveRecord`) → `POST /admin/flights` (needs `airlineId`), `PATCH /admin/flights/[id]` | form is local only and has no time fields yet |
| Tariq | Trip search form | `src/components/search-form-slot.tsx` | drop `<TripSearchForm />` in as children on `pages/home.tsx` |
| Tariq | Search API | `src/components/listing-view.tsx` (local text filter) | replace with a request if search should be server-side |

## Page → data map
| Page | Data source | Fallback |
|---|---|---|
| `/login`, `/register` | `authService` | `mockLogin` / `mockRegister` in `store/authStore.ts` |
| `/stays` | `hotelService.listPublic()` | `data/listings.ts` |
| `/rentals` | `carService.listPublic()` | `data/listings.ts` |
| `/flights`, `/hotels`, `/cars` (admin) | `flightService.search()`, `hotelService.list()`, `carService.list()` | `initialResources` in `data/demoData.ts` |
| `/bookings` list, `/users`, `/revenue`, `/dashboard` | demo store | (no endpoints yet) |

## Debugging "why is it not live?"
1. Look for the **Demo data · <reason>** badge (`HTTP 404` = wrong path, `Server unreachable / CORS` = server off or CORS).
2. Browser DevTools → Network → click the failing request. Console also logs `[api] request failed ...`.
3. Wrong/blank fields = field names differ: edit the `pick('a','b',...)` keys in the matching service.

## Conventions
- Components: `src/components/` (design-system primitives in `components/ui/`). Pages: `src/pages/`.
- Colors/theme tokens: `src/index.css`. Routes: `src/config/routes.ts`. Texts (EN + AR): `src/i18n/translations.ts`.
- New text = add the key to **both** `en` and `ar`.
