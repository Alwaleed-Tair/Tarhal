# Tarhal — Demo Script (about 8 minutes)

> Run on the deployed site or on `npm run build:frontend && npm run dev` (one origin). Before the demo: fresh seed, `npm run test:e2e` passes, chat key set, browser zoom 110%, two tabs open (traveler, admin).

| # | Time | Who | Screen | Say / do |
|---|---|---|---|---|
| 1 | 0:00 | Lead | Home `/` | "Tarhal is a Saudi travel platform: flights, hotels, cars, and an AI assistant, in Arabic and English." Toggle **العربية** and dark mode |
| 2 | 0:45 | Auth | `/register` → `/login` | Register a new traveler live (password ≥ 12 chars). Log in. Mention: hashed passwords, signed session cookie |
| 3 | 1:45 | Passenger | Flight search | Search **RUH → JED, 10 Jan 2027**. Show airline (Saudia), seats left, lowest price |
| 4 | 2:30 | Passenger | Seat map | Pick **1A (Business)**. Price = 420 × 1.8 = **756 SAR**, calculated on the server |
| 5 | 3:15 | Flights/bookings | Confirm booking | Book. Then, in a second browser, try the same seat → **"seat taken" (409)**: atomic seat locking |
| 6 | 4:00 | Passenger | My bookings | Show the booking; cancel it; the seat is available again |
| 7 | 4:45 | Catalog | `/stays`, `/rentals` | Filter hotels by city; cars by transmission; show insurance price per day |
| 8 | 5:30 | AI | Chat widget | Ask in Arabic: «أبغى رحلة من الرياض إلى جدة يوم 10 يناير» → real flight cards from Tarhal. Ask: "Do I need a visa for Umrah from Egypt?" → web answer |
| 9 | 6:45 | Admin | Admin tab `/dashboard` → `/flights` → `/bookings` | Log in as admin: flights with airlines, the booking made in step 5 |
| 10 | 7:30 | Lead | Slide / SDD | Architecture (one origin, Next.js API, PostgreSQL, DeepSeek), tests (28-check E2E), what's next |

**Backup plan:** if the chat is slow, show a prepared answer screenshot. If the site is down, run locally. Steps 3–6 can be shown with `npm run test:e2e` output if the passenger pages are not ready.

**Accounts:** traveler created live; admin `admin@tarhal.com` (password set before the demo).
