# Tarhal API Reference

> **Version:** schema v3 · **Updated:** 10 Nov 2026 · **Base URL:** same origin as the app (e.g. `http://localhost:3000`)
>
> Shapes below were checked against a local server with the seed data. Run the whole flow yourself with
> `BASE_URL=http://localhost:3000 npm run test:e2e`. The schema is described in `prisma/SCHEMA_REFERENCE.md`.

## Contents

| Area | Endpoint | Login |
|---|---|---|
| [Auth](#1-auth) | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | – |
| | `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` | – |
| [Profile](#2-profile) | `GET /api/profile` · `PATCH /api/profile` | Traveler |
| [Flights](#3-flights) | `GET /api/flights/search` · `GET /api/flights/:id` · `POST /api/flights/:id/hold` | – / hold: Traveler |
| [Flight bookings](#4-flight-bookings) | `POST /api/bookings` · `GET /api/bookings` · `GET /api/bookings/:id` · `POST /api/bookings/:id/cancel` | Traveler |
| [Hotels & cars](#5-hotels-and-cars) | `GET /api/hotels` · `GET /api/cars` | – |
| [Hotel bookings](#6-hotel-bookings) | `POST /api/hotel-bookings` · `GET /api/hotel-bookings` · `GET /api/hotel-bookings/:id` · `POST /api/hotel-bookings/:id/cancel` | Traveler |
| [Car rentals](#7-car-rentals) | `POST /api/car-rentals` · `GET /api/car-rentals` · `GET /api/car-rentals/:id` · `POST /api/car-rentals/:id/cancel` | Traveler |
| [Payments](#8-simulated-payment) | `POST /api/payments` | Traveler |
| [Admin](#9-admin) | `GET` airlines · flights · bookings · users · cars; `POST` flights · hotels · cars; `PATCH` flights · hotels · cars · bookings; `DELETE` flights · hotels · cars | Admin |
| [AI](#10-ai) | `POST /api/ai/chat` · `POST /api/ai/guide` · `POST /api/ai/itinerary` | – |

---

## 0. Rules for every client

**Sessions.** Login sets an HTTP-only cookie `tarhal_session` (7 days, `SameSite=Lax`). The browser sends it automatically; never read or store it in JavaScript. Send requests with `credentials: 'include'` (or `'same-origin'`).

**Same origin only.** `POST`, `PATCH` and `DELETE` requests from another origin are rejected with `403 INVALID_ORIGIN` on auth, profile, bookings, hotel bookings, car rentals, payments and admin. The frontend must be served from the same domain as the API (see `docs/deployment.md`).

**Money is a string.** `Decimal` fields (`basePrice`, `totalPrice`, `priceMultiplier`, `pricePerNight`, `pricePerDay`, `insurancePricePerDay`) are returned as strings, e.g. `"basePrice": "420"`. Convert with `Number(value)`. All amounts are **SAR**.

**Dates.** Times are ISO 8601 in UTC (`2027-01-10T08:00:00.000Z`); show them in Riyadh time (UTC+3). Calendar days (`date`, `checkIn`, `pickupDate`…) are `YYYY-MM-DD` Riyadh days; hotel and car days are stored as midnight UTC of that day.

**Errors** are JSON and never contain database messages, stack traces or passwords:

| Endpoints | Success | Error |
|---|---|---|
| Auth, profile, hotels, cars, hotel bookings, car rentals, payments, AI | `{ "success": true, ... }` | `{ "success": false, "error": "message", "code"?: "CODE", "field"?: "name" }` |
| Flights, flight bookings | `{ "success": true, "data": ... }` | `{ "success"?: false, "error": "message" }` |
| Admin lists (airlines, flights, bookings) | the raw array | `{ "success": false, "error", "code", "field"? }` |
| Admin users, cars, and all admin writes | `{ "success": true, "data", "pagination"? }` | same |

**Status codes:** `400` invalid input · `401` login required / wrong credentials · `403` wrong role or other origin · `404` not found (also someone else's booking) · `409` conflict (duplicate, seat or car taken, already paid or cancelled, flight has bookings) · `429` too many AI requests · `500` server error · `502/503/504` AI unavailable / not configured / too slow.

---

## 1. Auth

### `POST /api/auth/register`
Creates a traveler account. Does **not** log in; call login afterwards.

| Field | Rule |
|---|---|
| `name` | 1–100 characters |
| `email` | valid email (stored lower-case, unique) |
| `phone` | `+` optional, 8–15 digits (unique) |
| `password` | 12–128 characters |
| `dateOfBirth` | `YYYY-MM-DD`, not in the future; the person must be **21 or older** (Riyadh calendar day) → otherwise `400 UNDER_21` (`field: "dateOfBirth"`). Travelers inside a booking can be any age. |

```json
// 201
{ "success": true, "user": { "id": "bbe22788-…", "name": "Sara Ahmed", "email": "doc@example.com", "role": "TRAVELER" } }
// 400
{ "success": false, "error": "Use a password between 12 and 128 characters.", "code": "INVALID_FIELD", "field": "password" }
// 409
{ "success": false, "error": "An account already uses this email or phone.", "code": "ACCOUNT_EXISTS" }
```

### `POST /api/auth/login`
Body: `{ "email": "...", "password": "..." }` (or `"username"` instead of `"email"`). Sets the session cookie.

```json
// 200
{ "success": true, "message": "Login successful!", "user": { "id": "bbe22788-…", "name": "Sara Ahmed", "email": "doc@example.com", "role": "TRAVELER" } }
// 401
{ "success": false, "error": "We could not sign you in. …", "code": "INVALID_CREDENTIALS" }
```
Use `user.role` to send admins to the dashboard (`"ADMIN"`) and travelers to the home page (`"TRAVELER"`).

### `GET /api/auth/me`
The logged-in user, to check the cookie is still valid.
```json
// 200
{ "success": true, "user": { "id": "bbe22788-…", "name": "Sara Ahmed", "email": "doc@example.com", "role": "TRAVELER" } }
// 401
{ "success": false, "error": "Login required", "code": "UNAUTHORIZED" }
```

### `POST /api/auth/logout`
No body. Clears the cookie. `200 { "success": true }`

### `POST /api/auth/forgot-password` · `POST /api/auth/reset-password`
- forgot: `{ "email": "..." }` → always `200` (does not reveal whether the email exists); `503 RECOVERY_UNAVAILABLE` until `PASSWORD_RESET_SECRET` and `PASSWORD_RESET_SUPPORT_EMAIL` are set.
- reset: `{ "token": "...", "newPassword": "..." }` → `200`, or `400 INVALID_RESET_TOKEN` / `INVALID_NEW_PASSWORD`. Tokens are issued by support with `npm run auth:reset-token`.

---

## 2. Profile

### `GET /api/profile`
```json
{ "success": true, "user": { "id": "…", "name": "Sara Ahmed", "email": "doc@example.com", "phoneNumber": "+966500000001",
  "dateOfBirth": "1998-03-14T00:00:00.000Z", "role": "TRAVELER", "createdAt": "…" } }
```

### `PATCH /api/profile`
Body: any of `{ "name", "phone", "dateOfBirth" }` (same rules as register). Returns the profile as above.
`400` for any other field (email, role and password cannot be changed here) or a bad value (`UNDER_21` for a date of birth under 21) · `409 PHONE_IN_USE` · `401` without login.

---

## 3. Flights

### `GET /api/flights/search?from=RUH&to=JED&date=2027-01-10[&returnDate=2027-01-14][&passengers=2][&airline=<airlineId>]`

| Parameter | Rule |
|---|---|
| `from`, `to` | 3-letter airport codes, different |
| `date` | Riyadh day `YYYY-MM-DD`, not in the past |
| `returnDate` | optional, on or after `date`: adds `returnFlights` (`to` → `from` that day) |
| `passengers` | optional 1–9 (default 1): flights with fewer free seats are left out |
| `airline` | optional airline id |

Free seats are `AVAILABLE` seats plus holds that ran out (they are released first).

```json
// 200
{ "success": true, "passengers": 2,
  "data": [ { "id": "83586479-…", "flightNumber": "SV1020", "airlineId": "0455b510-…", "from": "RUH", "to": "JED",
    "departureTime": "2027-01-10T08:00:00.000Z", "arrivalTime": "2027-01-10T09:40:00.000Z", "basePrice": "420",
    "airline": { "id": "0455b510-…", "name": "Saudia", "nameAr": "السعودية", "iataCode": "SV", "logoUrl": "/images/airlines/sv.png" },
    "availableSeatsCount": 3, "lowestPrice": 420 } ],
  "returnFlights": [ … same shape … ] }
// 400
{ "success": false, "error": "passengers must be a whole number from 1 to 9" }
```

### `GET /api/flights/:id`
Flight + airline + seat map. Seats **never** say who holds them.
```json
{ "success": true, "data": { "id": "83586479-…", "flightNumber": "SV1020", "basePrice": "420", "airline": { … },
  "seats": [
    { "id": "1eb7ea14-…", "flightId": "83586479-…", "seatCode": "1A", "ticketClass": "BUSINESS", "priceMultiplier": "1.8",
      "status": "AVAILABLE", "free": true, "heldByMe": false, "heldUntil": null },
    { "id": "8c48702a-…", "seatCode": "12A", "ticketClass": "ECONOMY", "priceMultiplier": "1",
      "status": "HELD", "free": false, "heldByMe": true, "heldUntil": "2027-01-01T10:10:00.000Z" }
  ] } }
```
`status` is `AVAILABLE`, `HELD` or `BOOKED` (an expired hold is shown as `AVAILABLE`). `heldByMe` is true only for the logged-in traveler's own holds, and only they see `heldUntil`. Seat price = `Number(basePrice) × Number(priceMultiplier)`.

### `POST /api/flights/:id/hold`
Body `{ "seatIds": ["…", "…"] }` (1–9 different seats). Keeps them for this traveler for 10 minutes and releases their other holds on the flight.
`200 { "success": true, "data": { "heldUntil": "…" } }` · `400 INVALID_INPUT` · `401` · `404 SEAT_NOT_FOUND` · `409 SEAT_UNAVAILABLE`.

---

## 4. Flight bookings
All need a logged-in traveler (`401 { "error": "Login required" }` otherwise).

### `POST /api/bookings`
```json
{ "flightId": "83586479-…",
  "travelers": [ { "seatId": "1eb7ea14-…", "fullName": "Sara Ahmed", "passportNumber": "P1234567", "dateOfBirth": "1998-03-14" } ] }
```
1–9 travelers, one different seat each; `fullName` up to 100 and `passportNumber` up to 20 characters; `dateOfBirth` a past `YYYY-MM-DD`. The server ignores any `userId`, `basePrice` or `totalPrice` from the client. All seats are booked in one transaction, or none.

```json
// 201
{ "success": true, "data": { "id": "740a0458-…", "userId": "bbe22788-…", "flightId": "83586479-…",
  "basePrice": "420", "luggageFee": "0", "discount": "0", "totalPrice": "756", "paymentStatus": "PENDING", "isActive": true } }
// 400 bad JSON or traveler details · 404 unknown flight or seat · 409 seat taken by someone else
{ "error": "One or more seats are unavailable or held by another user" }
```

### `GET /api/bookings` · `GET /api/bookings/:id`
The user's own flight bookings (newest first), or one of them (`type: "flight"`), with flight, airline, travelers and their seats (`id, seatCode, ticketClass, priceMultiplier`). Someone else's id → `404`. `isActive: false` means cancelled.

### `POST /api/bookings/:id/cancel`
Cancels the user's own booking and makes its seats available. A `PAID` booking becomes `REFUNDED`.
`200 { "success": true, "data": { …, "isActive": false } }` · `404` not theirs · `409 ALREADY_CANCELED`.

---

## 5. Hotels and cars
Public. Unknown query parameters return `400 { "success": false, "error": "Unknown filter: foo" }`. Both support `page` (default 1) and `pageSize` (default 20, max 100).

### `GET /api/hotels`
Filters: `city`, `roomType`, `minPrice`, `maxPrice`, `minRating` (1–5). Sorted by price.
```json
{ "success": true,
  "data": [ { "id": "1000…0001", "name": "Tarhal Palm Hotel (Sample)", "city": "Riyadh", "address": "King Fahd Road, Riyadh",
              "pricePerNight": "320", "rating": 4.2, "roomType": "Single", "imageUrl": "/images/hotels/palm.jpg" } ],
  "pagination": { "page": 1, "pageSize": 1, "total": 2, "totalPages": 2, "hasNextPage": true, "hasPreviousPage": false } }
```

### `GET /api/cars`
Filters: `city`, `make`, `category`, `transmission` (`AUTOMATIC` | `MANUAL`), `minSeats`, `minYear`, `minPrice`, `maxPrice`. **Only available cars**; admins see all cars with `GET /api/admin/cars`.
`pickupDate` + `returnDate` (`YYYY-MM-DD`, sent together, the same rules as `POST /api/car-rentals`): only cars with no active rental on any of those days, so every car listed can be booked for them. Wrong or half-sent dates: `400`.

---

## 6. Hotel bookings

### `POST /api/hotel-bookings`
```json
{ "hotelId": "1000…0001", "checkIn": "2027-01-10", "checkOut": "2027-01-13", "guests": 2 }
```
`checkIn` from today (Riyadh) up to a year ahead, `checkOut` after it, at most 30 nights; `guests` 1–10 (default 1).
Price on the server: nights × `pricePerNight`.
```json
// 201
{ "success": true, "data": { "id": "…", "type": "hotel", "nights": 3, "hotelId": "…", "checkIn": "2027-01-10T00:00:00.000Z",
  "checkOut": "2027-01-13T00:00:00.000Z", "guests": 2, "totalPrice": "960", "paymentStatus": "PENDING", "isActive": true, "hotel": { … } } }
// 400
{ "success": false, "error": "checkOut must be after checkIn", "field": "checkOut" }
// 404
{ "success": false, "error": "Hotel not found", "field": "hotelId" }
```

### `GET /api/hotel-bookings` · `GET /api/hotel-bookings/:id` · `POST /api/hotel-bookings/:id/cancel`
Own bookings with `hotel` and `type: "hotel"`; someone else's id → `404`. Cancel: `200`, paid → `REFUNDED`, twice → `409`.
The Hotel table has no room count, so the API does not limit bookings per hotel.

---

## 7. Car rentals

### `POST /api/car-rentals`
```json
{ "carId": "2000…0001", "pickupDate": "2027-01-10", "returnDate": "2027-01-12", "withInsurance": true }
```
Same date rules as hotels. Price on the server: days × (`pricePerDay` + `insurancePricePerDay` when `withInsurance`).
`201 { "success": true, "data": { …, "type": "car", "days": 2, "car": { … } } }` · `400` bad dates or `withInsurance` · `404` unknown car ·
`409` car switched off (`isAvailable: false`) or already rented on overlapping days (returning on the day the next rental starts is allowed).

### `GET /api/car-rentals` · `GET /api/car-rentals/:id` · `POST /api/car-rentals/:id/cancel`
Same as hotel bookings, with `car` and `type: "car"`.

---

## 8. Simulated payment

### `POST /api/payments`
```json
{ "type": "flight", "bookingId": "740a0458-…" }
```
**No real payment and no card details**: the user's own active booking (`flight`, `hotel` or `car`) is marked `PAID`.
```json
// 200
{ "success": true, "simulated": true, "data": { "id": "740a0458-…", "type": "flight", "paymentStatus": "PAID", "totalPrice": "756" } }
// 400 bad type or bookingId · 401 · 404 not theirs
// 409
{ "success": false, "error": "Booking is already paid", "code": "ALREADY_PAID" }
```
Other 409 codes: `BOOKING_CANCELED`, `BOOKING_REFUNDED`.

---

## 9. Admin
Admin role only: no session → `401`, a traveler → `403 { "success": false, "error": "Admin access required" }`. Any path or method not listed here → `404`.

| Endpoint | Body / result |
|---|---|
| `GET /api/admin/airlines` | Array of airlines |
| `GET /api/admin/flights` | Array of flights with `airline` and their `AVAILABLE` seats |
| `GET /api/admin/bookings` | Array of **all** bookings, newest first, each with `type`: `"flight"` (with `flight.airline`, `travelers.seat`), `"hotel"` (with `hotel`) or `"car"` (with `car`), and `user` (`id, name, email, phoneNumber, role` — never the password) |
| `GET /api/admin/users?page&pageSize` | `{ success, data: [{ id, name, email, phoneNumber, role, createdAt, _count: { bookings, hotelBookings, carRentals } }], pagination }`, newest first; pageSize 1–100 |
| `GET /api/admin/cars?page&pageSize` | `{ success, data, pagination }`: every car, including unavailable ones |
| `POST /api/admin/flights` | `{ flightNumber, airlineId, from, to, departureTime, arrivalTime, basePrice, seats: [{ seatCode, ticketClass?, priceMultiplier? }] }` → `201 { success, data }` |
| `PATCH /api/admin/flights/:id` | any of `{ basePrice, departureTime, arrivalTime }` → `{ success, data }` |
| `DELETE /api/admin/flights/:id` | `200 { success, data: { id } }`; `409 HAS_BOOKINGS` while the flight has any booking (even cancelled) |
| `POST /api/admin/hotels` | `{ name, city, pricePerNight, rating, roomType, address?, imageUrl? }` → `201` |
| `PATCH /api/admin/hotels/:id` | any of the hotel fields → `200` |
| `DELETE /api/admin/hotels/:id` · `DELETE /api/admin/cars/:id` | `200 { success, data: { id } }`; `409 HAS_BOOKINGS` while it has any booking (even cancelled); `404` unknown |
| `POST /api/admin/cars` | `{ make, model, year, seats, category, city, pricePerDay, transmission?, insurancePricePerDay?, isAvailable?, imageUrl? }` → `201` |
| `PATCH /api/admin/cars/:id` | any of the car fields (e.g. `{ "isAvailable": false }`) → `200` |
| `PATCH /api/admin/bookings/:id` | `{ "type": "flight" \| "hotel" \| "car", "action": "cancel" \| "markPaid" }`. Cancel releases flight seats and refunds a paid booking; `409` if already cancelled or paid |

Validation (`400` with `field`): flight numbers letters, digits and dashes; airports 3 letters and different; departure in the future and before arrival; prices above 0 with at most 2 decimals; 1–500 seats with unique codes of up to 10 characters, `ticketClass` `ECONOMY` | `BUSINESS` | `FIRST`, multiplier above 0 and below 100; hotel rating 1–5; car year 1900 to next year, seats 1–100, `transmission` `AUTOMATIC` | `MANUAL`; `imageUrl` an `http(s)` link or a path starting with `/`; unknown fields are refused. Duplicate flight number → `409 DUPLICATE`; unknown id → `404`.

Seeded admin for local testing: `admin@tarhal.com` / `hashed_password_123` (the plain-text seed password is upgraded to a hash on first login). Change it on any shared database.

---

## 10. AI

All three need `DEEPSEEK_API_KEY` on the server (`503 AI_NOT_CONFIGURED` otherwise) and share one request limit: **30 requests per 10 minutes for a logged-in user, 10 for a guest (per IP)**, then `429 RATE_LIMITED` with a `Retry-After` header. Each request has 30 seconds (`504 AI_TIMEOUT`). See `docs/AI_COST.md`.

### `POST /api/ai/chat`
```json
{ "messages": [ { "role": "user", "content": "أبغى رحلة من الرياض إلى جدة يوم 10 يناير" } ] }
```
Send the whole conversation (last 24 messages are used, each up to 1000 characters); the last message must be from the user. A single `{ "message": "..." }` also works. Guests can chat.

```json
// 200
{ "success": true, "reply": "…text…", "flights": [ { "flightNumber": "SV1020", "lowestPrice": 420, … } ], "hotels": [ … ], "cars": [ … ],
  "toolsUsed": [ "searchFlights" ], "searchedWeb": false, "truncated": false, "languageBlocked": false, "usage": { … } }
// 400
{ "success": false, "error": "Send {\"messages\":[{\"role\":\"user\",\"content\":\"...\"}]}.", "code": "INVALID_MESSAGE" }
```
Card prices are SAR.

### `POST /api/ai/guide`
`{ "city": "Jeddah", "language": "en" | "ar" }`: `city` must be a Saudi city (English, common spellings or Arabic, e.g. `"العلا"`).
```json
{ "success": true, "aiGenerated": true, "data": { "city": "Jeddah", "summary": "…", "bestTime": "…",
  "places": [ { "name": "Al-Balad", "description": "…" } ], "tips": [ "…" ] } }
```
3–6 places and 2–5 tips, checked against a schema; the same city and language are answered from a 1-hour cache.

### `POST /api/ai/itinerary`
`{ "city": "Riyadh", "days": 3, "interests": ["food", "history"], "language": "en" }`: `days` 1–7; up to 5 interests from
`culture, history, nature, food, shopping, beach, adventure, family, religious`.
```json
{ "success": true, "aiGenerated": true, "data": { "city": "Riyadh", "days": [
  { "day": 1, "title": "…", "morning": "…", "afternoon": "…", "evening": "…", "tip": "…" } ] } }
```
Exactly `days` days, numbered from 1. `400 INVALID_FIELD` for bad input, `502 AI_BAD_OUTPUT` when the model's answer does not fit.

---

## 11. Typical frontend flow

```
login → search (round trip, passengers) → seat map → hold → POST /api/bookings
      → POST /api/hotel-bookings → POST /api/car-rentals → POST /api/payments (each) → My bookings → cancel
```

```js
const api = async (path, options = {}) => {
  const res = await fetch(path, { credentials: 'include', headers: { 'content-type': 'application/json' }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status, body });
  return body.data ?? body;
};

await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
const flights = await api(`/api/flights/search?from=RUH&to=JED&date=2027-01-10&passengers=1`);
const flight  = await api(`/api/flights/${flights[0].id}`);
const booking = await api('/api/bookings', { method: 'POST', body: JSON.stringify({ flightId: flight.id, travelers }) });
await api('/api/payments', { method: 'POST', body: JSON.stringify({ type: 'flight', bookingId: booking.id }) });
```
