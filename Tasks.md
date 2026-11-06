# 📋 Tarhal — MVP Sprint (Nov 2 – Nov 6, 2026) — 5 DAYS TO A WORKING PLATFORM

> **Goal:** by the end of 6/11, a user can register, log in, search flights, pick seats, book, and see their bookings — on a deployed link. Hotels/cars can be browsed, an admin can see flights and bookings, and a basic AI chat answers travel questions.
>
> **Rule for this sprint:** every task ends as **merged code on `main`**, not a document.

---

## 🎯 MVP Scope

| ✅ In scope (must work by 6/11) | ⏸️ Deferred (do NOT start this sprint) |
|---|---|
| Register, login with a real session, logout | Hotel & car **booking** (browse only for now) |
| Flight search → results → seat selection → traveler details → confirm | Destination guide & itinerary generator |
| "My bookings" page + cancel booking | QR boarding pass / PDF export |
| Hotels & cars listing with filters (APIs already exist) | Full Arabic/English translation |
| Simple admin: flights table + bookings table | Senior-accessibility mode, voice |
| AI chat widget answering travel questions | Wallet, subscriptions, SkyMiles, Bundle & Save, Cultural Compass |
| Deployed on Netlify with a shared database | Sub/Super admin, extra roles |

> 🗄️ **Database changes this sprint** (airlines, new car fields, hotel/car booking tables, enums, seat holds) are specified in **[`Update.md`](./Update.md)**. Hotel/car **booking tables are created now** so the design is complete for the SDD, but their APIs and pages stay deferred.

---


## 👤 Abdulelah Alshareef — Database Design & Flights/Bookings

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | **Schema design (first thing in the morning):** review and finalize the schema v3 design in `Update.md` (Airline, new Car fields, HotelBooking/CarRental, seat holds, enums) and hand it to Saud; review Saud's migration PR against the design. Then fix booking security in `POST /api/bookings`: calculate the price on the server (`flight.basePrice × seat.priceMultiplier`), never trust `basePrice` from the client; check all seats belong to the requested flight; validate traveler fields; switch to the shared `lib/prisma.ts` | Final schema design + secure booking endpoint |
| **3/11** | `GET /api/flights/[id]` returning flight details + airline (name, nameAr, IATA code, logo) + full seat map (status per seat); search results include the airline, available seat count and lowest price instead of every seat; optional `airline` filter in search; fix the UTC/Riyadh date issue in search | APIs for the results and seat pages |
| **4/11** | Take `userId` from the session (using Mohammed's `getCurrentUser`); seat hold logic: `HELD` with `heldUntil` (10 min), expired holds become available again | Bookings tied to the logged-in user |
| **5/11** | `GET /api/bookings` (my bookings); `POST /api/bookings/[id]/cancel` (sets `isActive=false` and releases seats) | My bookings + cancel |
| **6/11** | Fix bugs found in the end-to-end test with Tariq; update the class diagram to v3 per `Update.md` § Class Diagram (Airline, HotelBooking, CarRental, new enums, `Decimal` prices) | Stable booking flow + class diagram v3 |

---

## 👤 Saud Mohammed — Database Implementation

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | **Implement schema v3** in `prisma/schema.prisma` from the design in `Update.md`, as one clean migration: new `Airline` model + `Flight.airlineId`; new `Car` fields (`make`, `model`, `year`, `seats`, `transmission`, `city`, `insurancePricePerDay`, `isAvailable`, `imageUrl`) replacing `insuranceOption`; `Hotel.address` + `imageUrl`; new `HotelBooking` and `CarRental` models; `Seat.heldUntil` + `heldByUserId`; `Role`, `TicketClass`, `Transmission` enums; timestamps and indexes; fix the `dateOfBirth` migration; run `prisma validate` and the migration on a clean local database | Schema merged by end of day |
| **3/11** | Run the migration on Neon (reset + re-seed, see `Update.md` § Migration); update the seed: 5 airlines (Saudia, Qatar Airways, Emirates, flynas, flyadeal) with logos, future-dated flights linked to airlines with seats using the `TicketClass` enum, cars with make/model/year/seats/city/insurance price, hotels with address/image, 1 admin + 2 traveler accounts; remove test files from `main` (`test-queries.ts` ×2, `load-test.js` ×2, `app/test-popup`, `outputs/`, `prisma/backup_schema.sql`) | Shared database seeded and demo-ready |
| **4/11** | Implement the shared data-access layer in `lib/db/` (replaces the empty placeholder): flight queries with airline and available seat count, bookings with travelers/user/flight, airlines list, create a flight with auto-generated seats, update a flight | Reusable Prisma queries |
| **5/11** | Admin endpoints on top of `lib/db` (admin role only): `GET /api/admin/flights`, `GET /api/admin/bookings`, `GET /api/admin/airlines`, `POST /api/admin/flights` (requires `airlineId`), `PATCH /api/admin/flights/[id]` (edit price/time) | Admin data APIs |
| **6/11** | Reset and re-seed the demo database; check data integrity (no orphan seats, expired holds cleared, every flight has an airline); help fix database bugs from the end-to-end test | Clean data for the demo |

---

## 👤 Mohammed Alasad — Backend: Auth & Hotels/Cars

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | `POST /api/auth/register` (name, email, phone, password, date of birth) with the same validation style as login | Users can sign up |
| **3/11** | Real sessions: login sets a secure HTTP-only session cookie (NextAuth credentials provider or a signed cookie); `getCurrentUser()` helper in `lib/`; `POST /api/auth/logout`; restrict CORS (remove `*`) | Logged-in state works across pages |
| **4/11** | Middleware protecting routes: `/bookings` and booking APIs need login; `/admin` and `/api/admin/*` need the `Role.ADMIN` enum value (replaces the old `'traveler'` string) | Role-based protection |
| **5/11** | Update car filters in `lib/catalog-filters.ts` for the new fields: `city`, `make`, `minSeats`, `minYear`, `transmission`, only `isAvailable` cars; return `insurancePricePerDay`; add `address`/`imageUrl` to hotel responses; update the catalog tests; help Omar connect the listing pages | Hotels/cars pages on real data |
| **6/11** | Regression test of auth + hotels/cars on the deployed link; update the auth tests | Auth confirmed stable |

---

## 👤 Alwaleed Tair — Backend: AI

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | Add the AI SDK to `package.json`; `POST /api/ai/chat` calling the chosen model; API key from `.env` only | Chat endpoint returns answers |
| **3/11** | System prompt for Saudi-context travel help; keep conversation history in the request; basic limits (max message length, max tokens per reply) | Useful, bounded answers |
| **4/11** | Chat widget component (floating button + panel) with Omar's styling; loading and error states | Chat usable on every page |
| **5/11** | Let the chat suggest real flights: when the user asks for a route/date, call the flight search and return results as cards | AI connected to real data |
| **6/11** | Test 15–20 typical questions; fix bad answers; note token cost per conversation for the SDD | AI ready for the demo |

---

## 👤 Tariq Alghamdi — Frontend: Passenger Flow

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | Flight search form (from, to, date, passengers) + results page, on mock data matching `docs/api-documentation.md` | Search UI |
| **3/11** | Connect search and results to the real API; show airline logo and name (AR/EN) on each result card; airline filter on the results page; flight details page | Real search results |
| **4/11** | Seat selection page (seat map, class colors, price update) + traveler details form; connect to booking API | Users can book |
| **5/11** | Booking confirmation page + "My bookings" page with cancel button | Full passenger journey |
| **6/11** | End-to-end test of the passenger journey with Abdulelah; loading/error/empty states on every page | Demo-ready passenger flow |

---

## 👤 Omar Faraj — Frontend: Layout, Design & Admin

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | Main layout: navbar (logged-in/out states), footer, color tokens, dark/light toggle; shared components (button, input, card, table) on shadcn | Design system everyone builds on |
| **3/11** | Login and register pages connected to Mohammed's APIs; home page with the search form slot for Tariq | Auth pages working |
| **4/11** | Hotels and cars listing pages with filters and pagination (APIs already exist). Car cards show make + model + year, seats, transmission, price per day and insurance price per day; hotel cards show image, address and rating | Browse hotels & cars |
| **5/11** | Admin pages: flights table with airline column (+ add/edit form with an airline dropdown) and bookings table, using Saud's APIs | Basic admin dashboard |
| **6/11** | Responsive and visual QA across all pages on the deployed link | Polished demo |

---

## 🔗 Key Dependencies

- **2/11 is blocking for everyone:** Abdulelah finalizes the schema design in the morning; Mohamed's setup and Saud's schema migration must be merged by end of day. Frontend works on mock data until the APIs are ready.
- **Mohammed's `getCurrentUser()` (3/11) unblocks** Abdulelah's session-based booking (4/11) and Saud's admin endpoints (5/11).
- **Saud's `lib/db` queries (4/11) unblock** his admin endpoints (5/11), which Omar's admin pages use.
- **Omar's layout and components (2/11) unblock** Tariq's pages and Alwaleed's chat widget.
- **Abdulelah's flight details API (3/11) unblocks** Tariq's seat selection page (4/11).

---

## ⚙️ Working Rules

- Small PRs, at least one per person per day. Mohamed merges; one approval is enough.
- Never push directly to `main`. Branch name: `name/short-task` (e.g. `tariq/seat-page`).
- Short check-in every day (10 minutes): what merged, what's blocked.
- Anything not in the MVP scope table waits until after 6/11.

---

## 📅 After the Sprint

> SDD is due **14/11**: Mohamed drafts it during the sprint, and everyone updates their diagrams to match the code during 7–13/11. Deferred features are planned after that, toward the implementation evidence deadline on **5/12**.
