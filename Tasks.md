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

---

## 👤 Mohamed Elshiekh — Team Lead: Setup, Integration & Merging

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | Install and configure Tailwind + shadcn/ui; set the folder structure (`app/(passenger)`, `app/admin`, `components/`); create the shared Neon database and share one `.env` template; connect the repo to Netlify | Project runs for everyone; preview link live |
| **3/11** | Agree on one API response shape with the backend (`{ success, data }` / `{ success, error, code }`); update `docs/api-documentation.md` to match the real endpoints | API contract the frontend can trust |
| **4/11** | Review and merge PRs daily; unblock dependencies; start the SDD draft from the current schema and diagrams | Clean `main`; SDD outline |
| **5/11** | Integration day: connect the remaining mock pages to real APIs with Tariq and Omar | All pages on real data |
| **6/11** | Run the full end-to-end demo on the deployed link; log bugs; final merge and deploy; write a short demo script | Deployed MVP + demo script |

---

## 👤 Saud Mohammed — Backend: Database

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | **Schema freeze (first thing in the morning):** add `heldUntil` and `heldByUserId` to `Seat`; add `Role` (TRAVELER, ADMIN) and `TicketClass` (ECONOMY, BUSINESS, FIRST) enums; add `model`, `city` and `isAvailable` to `Car`; fix the `dateOfBirth` migration so it runs on a non-empty database; one clean migration | Schema merged by end of day |
| **3/11** | Run the migration on Neon; update the seed: future-dated flights with seats, 1 admin + 2 traveler demo accounts, hotels and cars; remove test files from `main` (`test-queries.ts` ×2, `load-test.js` ×2, `app/test-popup`, `outputs/`, `prisma/backup_schema.sql`) | Shared database seeded and demo-ready |
| **4/11** | Admin APIs (admin role only): `GET /api/admin/flights`, `GET /api/admin/bookings` (with user and flight info) | Admin read APIs |
| **5/11** | `POST /api/admin/flights` (create flight + auto-generate its seats); `PATCH /api/admin/flights/[id]` (edit price/time) | Admin can add and edit flights |
| **6/11** | Reset and re-seed the demo database; help fix bugs from the end-to-end test | Clean data for the demo |

---

## 👤 Abdulelah Alshareef — Backend: Flights & Bookings

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | Fix booking security in `POST /api/bookings`: calculate the price on the server (`flight.basePrice × seat.priceMultiplier`), never trust `basePrice` from the client; check all seats belong to the requested flight; validate traveler fields; switch to the shared `lib/prisma.ts` | Secure booking endpoint |
| **3/11** | `GET /api/flights/[id]` returning flight details + full seat map (status per seat); search results return available seat count and lowest price instead of every seat; fix the UTC/Riyadh date issue in search | APIs for the results and seat pages |
| **4/11** | Take `userId` from the session (using Mohammed's `getCurrentUser`); seat hold flow: `HELD` with `heldUntil` (10 min), expired holds become available again | Bookings tied to the logged-in user |
| **5/11** | `GET /api/bookings` (my bookings); `POST /api/bookings/[id]/cancel` (sets `isActive=false` and releases seats) | My bookings + cancel |
| **6/11** | Fix bugs found in the end-to-end test with Tariq | Stable booking flow |

---

## 👤 Mohammed Alasad — Backend: Auth & Hotels/Cars

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | `POST /api/auth/register` (name, email, phone, password, date of birth) with the same validation style as login | Users can sign up |
| **3/11** | Real sessions: login sets a secure HTTP-only session cookie (NextAuth credentials provider or a signed cookie); `getCurrentUser()` helper in `lib/`; `POST /api/auth/logout`; restrict CORS (remove `*`) | Logged-in state works across pages |
| **4/11** | Middleware protecting routes: `/bookings` and booking APIs need login; `/admin` and `/api/admin/*` need ADMIN role | Role-based protection |
| **5/11** | Update hotels/cars filters for the new `Car` fields (`city`, `isAvailable`); help Omar connect the listing pages | Hotels/cars pages on real data |
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
| **3/11** | Connect search and results to the real API; flight details page | Real search results |
| **4/11** | Seat selection page (seat map, class colors, price update) + traveler details form; connect to booking API | Users can book |
| **5/11** | Booking confirmation page + "My bookings" page with cancel button | Full passenger journey |
| **6/11** | End-to-end test of the passenger journey with Abdulelah; loading/error/empty states on every page | Demo-ready passenger flow |

---

## 👤 Omar Faraj — Frontend: Layout, Design & Admin

| Day | Tasks | Expected Deliverable |
|---|---|---|
| **2/11** | Main layout: navbar (logged-in/out states), footer, color tokens, dark/light toggle; shared components (button, input, card, table) on shadcn | Design system everyone builds on |
| **3/11** | Login and register pages connected to Mohammed's APIs; home page with the search form slot for Tariq | Auth pages working |
| **4/11** | Hotels and cars listing pages with filters and pagination (APIs already exist) | Browse hotels & cars |
| **5/11** | Admin pages: flights table (+ add/edit form) and bookings table, using Saud's APIs | Basic admin dashboard |
| **6/11** | Responsive and visual QA across all pages on the deployed link | Polished demo |

---

## 🔗 Key Dependencies

- **2/11 is blocking for everyone:** Mohamed's setup and Saud's schema must be merged by end of day. Frontend works on mock data until the APIs are ready.
- **Mohammed's `getCurrentUser()` (3/11) unblocks** Abdulelah's session-based booking and Saud's admin APIs (4/11).
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
