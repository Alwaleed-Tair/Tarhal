# Tarhal — Demo Script (about 10 minutes)

> Run on the deployed site or locally (`npm run dev` for the API on 3000, and the site on 5173 or `npm run build:frontend` for one origin).
> Before the demo: `npm test` and `BASE_URL=http://localhost:3000 npm run test:e2e` pass; `DEEPSEEK_API_KEY` set for the AI steps;
> two flights exist for the round trip (outbound and return, with free seats), and the destination has a hotel and a car; browser zoom 110%;
> two windows open (traveler, admin). Payment in this version is a **simulation**: no card is asked for and nothing is charged.

| # | Time | Who | Screen | Say / do |
|---|---|---|---|---|
| 1 | 0:00 | Lead | Home `/` (signed out) | "Tarhal is a Saudi travel platform: book a flight and add a hotel and a car in the same trip, with an AI assistant, in Arabic and English." Use the controls at the top: **العربية**, light/dark, currency **SAR/USD**, **Larger text** |
| 2 | 0:45 | Passenger | Book a flight `/book-flight` | Trip type **Round trip**, 2 passengers, pick the departure and return dates, search. Choose the outbound flight, then the flight back |
| 3 | 1:45 | Passenger | Seat maps | Pick 2 seats on each flight. Signed out, the site asks to log in (or register) and comes back to the same seats. Seats are kept for 10 minutes (timer) |
| 4 | 2:45 | Passenger | Travelers → Hotel → Car | Fill in both travelers once (they keep their seats on both flights). Hotel: nights already match the stay until the flight home. Car: pick-up on arrival day, return on the day of the flight home |
| 5 | 3:45 | Flights/bookings | Summary → Ready | Confirm: the flights, hotel and car are booked, each priced again on the server. Press **Pay now (simulated)**: everything becomes **Paid** and the **boarding passes** appear (name, flight, seat, class, reference, QR code). Print one |
| 6 | 4:45 | Passenger | My bookings `/my-bookings` | The trip with its hotel and car, boarding passes, and cancel the car (a paid booking becomes **Refunded**). In a second browser, try a taken seat → "seat taken" (409) |
| 7 | 5:30 | AI | Chat widget, then a city page `/travel-guide/al-bahah` | Ask the chat about a flight price (cards show SAR, or USD after the switch). On the city page: **Get a guide** and **Make my plan** (3 days) — both marked AI-generated |
| 8 | 6:45 | Security | `/dashboard` as the traveler | Refused (back to the home page). The API answers 401 / 403 the same way |
| 9 | 7:15 | Admin | Admin window: log in → `/dashboard` | Dashboard filters (All / Flights / Hotels / Cars) with the hotel and car bookings just made. Hotels: add and edit a **TEST-** hotel. Cars: add a **TEST-** car and switch it off (still listed, marked Unavailable) |
| 10 | 8:30 | Admin | `/flights`, `/bookings`, `/users`, `/revenue` | Add a **TEST-** flight, try the same number again (refused), delete it. Try deleting a flight with bookings (refused). Bookings: **Mark paid** / **Cancel**. Users: every account with its role. Switch to Arabic and dark mode |
| 11 | 9:30 | Lead | Slide / SDD | Architecture (one origin, Next.js API, PostgreSQL, DeepSeek), tests (unit tests, 45-check E2E), what's next (real payments, room and car stock) |

**Backup plan:** if the AI is slow or not configured, the pages say so in a friendly message; show a prepared screenshot. If the site is down, run locally. Steps 2–6 can be shown with the `npm run test:e2e` output.

**Accounts:** traveler created live; admin `admin@tarhal.com` (password set before the demo, never the seed default on a shared database).
