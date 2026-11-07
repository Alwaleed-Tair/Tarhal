# Tarhal API Reference

> **Version:** schema v3 · **Updated:** 7 Nov 2026 · **Base URL:** same origin as the app (e.g. `http://localhost:3000`)
>
> Every example below is a real response captured from a local server running the seed data. Run the whole flow yourself with `BASE_URL=http://localhost:3000 npm run test:e2e`.

## Contents

| Area | Endpoint | Login |
|---|---|---|
| [Auth](#1-auth) | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` | – |
| | `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` | – |
| [Flights](#2-flights) | `GET /api/flights/search` · `GET /api/flights/:id` | – |
| [Bookings](#3-bookings) | `POST /api/bookings` · `GET /api/bookings` · `POST /api/bookings/:id/cancel` | Traveler |
| [Hotels & cars](#4-hotels-and-cars) | `GET /api/hotels` · `GET /api/cars` | – |
| [Admin](#5-admin) | `GET /api/admin/flights` · `GET /api/admin/bookings` · `GET /api/admin/airlines` · `POST /api/admin/flights` · `PATCH /api/admin/flights/:id` | Admin |
| [AI chat](#6-ai-chat) | `POST /api/ai/chat` | – |

---

## 0. Rules for every client

**Sessions.** Login sets an HTTP-only cookie `tarhal_session` (7 days, `SameSite=Lax`). The browser sends it automatically; never read or store it in JavaScript. Send requests with `credentials: 'include'` (or `'same-origin'`).

**Same origin only.** `POST`, `PATCH` and `DELETE` requests from another origin are rejected with `403 INVALID_ORIGIN`. The frontend must be served from the same domain as the API (see `docs/deployment.md`).

**Money is a string.** `Decimal` fields (`basePrice`, `totalPrice`, `priceMultiplier`, `pricePerNight`, `pricePerDay`, `insurancePricePerDay`) are returned as strings, e.g. `"basePrice": "420"`. Convert with `Number(value)` before doing math; display with `toFixed(2)`.

**Dates** are ISO 8601 in UTC (`2027-01-10T08:00:00.000Z`). Show them in Riyadh time (`Asia/Riyadh`, UTC+3).

**Response shapes.** Two shapes exist today:

| Endpoints | Success | Error |
|---|---|---|
| Auth, hotels, cars, AI chat | `{ "success": true, ... }` | `{ "success": false, "error": "message", "code": "CODE", "field"?: "name" }` |
| Flights, bookings | `{ "success": true, "data": ... }` | `{ "error": "message" }` |
| Admin | the raw object or array | `{ "error": "message" }` |

A frontend can handle all of them with: *ok if `response.ok`; message = `body.error`; data = `body.data ?? body`.* Recommended next step: move flights, bookings and admin to the first shape.

**Status codes:** `400` invalid input · `401` login required / wrong credentials · `403` not allowed (role or origin) · `404` not found · `409` conflict (duplicate account, seat taken) · `500` server error · `503` feature not configured.

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
| `dateOfBirth` | `YYYY-MM-DD`, not in the future |

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
{ "success": true, "message": "Login successful!", "user": { "id": "bbe22788-…", "name": "Sara Ahmed", "role": "TRAVELER" } }
// 401
{ "success": false, "error": "We could not sign you in. …", "code": "INVALID_CREDENTIALS" }
```
Use `user.role` to send admins to the dashboard (`"ADMIN"`) and travelers to the home page (`"TRAVELER"`).

### `POST /api/auth/logout`
No body. Clears the cookie. `200 { "success": true }`

### `POST /api/auth/forgot-password` · `POST /api/auth/reset-password`
- forgot: `{ "email": "..." }` → always `200` (does not reveal whether the email exists); `503 RECOVERY_UNAVAILABLE` until `PASSWORD_RESET_SECRET` and `PASSWORD_RESET_SUPPORT_EMAIL` are set.
- reset: `{ "token": "...", "newPassword": "..." }` → `200`, or `400 INVALID_RESET_TOKEN` / `INVALID_NEW_PASSWORD`. Tokens are issued by support with `npm run auth:reset-token`.

---

## 2. Flights

### `GET /api/flights/search?from=RUH&to=JED&date=2027-01-10[&airline=<airlineId>]`
`from` / `to` are airport codes; `date` is a **Riyadh** calendar day. Past dates return `400`. Each result has the airline, the number of available seats and the cheapest available seat price.

```json
// 200
{ "success": true, "data": [ {
  "id": "83586479-…", "flightNumber": "SV1020", "airlineId": "0455b510-…",
  "from": "RUH", "to": "JED",
  "departureTime": "2027-01-10T08:00:00.000Z", "arrivalTime": "2027-01-10T09:40:00.000Z",
  "basePrice": "420",
  "airline": { "id": "0455b510-…", "name": "Saudia", "nameAr": "السعودية", "iataCode": "SV", "logoUrl": "/images/airlines/sv.png" },
  "availableSeatsCount": 3, "lowestPrice": 420
} ] }
// 400
{ "error": "Missing required search parameters: from, to, or date" }
```

### `GET /api/flights/:id`
Flight + airline + the full seat map.

```json
{ "success": true, "data": { "id": "83586479-…", "flightNumber": "SV1020", "basePrice": "420", "airline": { … },
  "seats": [
    { "id": "1eb7ea14-…", "seatCode": "1A", "ticketClass": "BUSINESS", "priceMultiplier": "1.8", "status": "AVAILABLE", "heldUntil": null },
    { "id": "8c48702a-…", "seatCode": "12A", "ticketClass": "ECONOMY", "priceMultiplier": "1", "status": "AVAILABLE", "heldUntil": null }
  ] } }
```
Seat price = `Number(basePrice) × Number(priceMultiplier)` (1A above = 420 × 1.8 = **756**). `status` is `AVAILABLE`, `HELD` or `BOOKED`; a `HELD` seat whose `heldUntil` is in the past counts as available.

---

## 3. Bookings
All booking endpoints need a logged-in traveler (`401 { "error": "Login required" }` otherwise).

### `POST /api/bookings`
```json
{ "flightId": "83586479-…",
  "travelers": [ { "seatId": "1eb7ea14-…", "fullName": "Sara Ahmed", "passportNumber": "P1234567", "dateOfBirth": "1998-03-14" } ] }
```
One traveler per seat. The server ignores any `userId`, `basePrice` or `totalPrice` sent by the client: the user comes from the session and the price is calculated from the seats. All seats are reserved in one transaction, or none are.

```json
// 201
{ "success": true, "data": { "id": "740a0458-…", "userId": "bbe22788-…", "flightId": "83586479-…",
  "basePrice": "420", "luggageFee": "0", "discount": "0", "totalPrice": "756", "paymentStatus": "PENDING", "isActive": true } }
// 409 – someone else has the seat
{ "error": "One or more seats are unavailable or held by another user" }
// 400 – a seat is not on this flight / missing traveler fields
{ "error": "One or more seats do not belong to the requested flight" }
```

### `GET /api/bookings`
The logged-in user's own bookings, newest first, with flight, airline, travelers and seats. Query parameters are ignored.

```json
{ "success": true, "data": [ { "id": "740a0458-…", "totalPrice": "756", "isActive": true, "paymentStatus": "PENDING",
  "flight": { "flightNumber": "SV1020", "from": "RUH", "to": "JED", "departureTime": "…", "airline": { "name": "Saudia", … } },
  "travelers": [ { "fullName": "Sara Ahmed", "passportNumber": "P1234567", "seat": { "seatCode": "1A", "ticketClass": "BUSINESS", "status": "BOOKED" } } ] } ] }
```
`isActive: false` means cancelled.

### `POST /api/bookings/:id/cancel`
Cancels the user's own booking and makes its seats available again. Someone else's booking returns `404`.
```json
// 200
{ "success": true, "data": { "id": "740a0458-…", "isActive": false, … } }
// 400
{ "error": "Booking is already canceled" }
```
> The older path `POST /api/flights/:id/cancel` (where `:id` is a **booking** id) still works and runs the same checks. New code should use `/api/bookings/:id/cancel`.

---

## 4. Hotels and cars
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
Filters: `city`, `make`, `category`, `transmission` (`AUTOMATIC` | `MANUAL`), `minSeats`, `minYear`, `minPrice`, `maxPrice`. Only available cars are returned.
```json
{ "success": true,
  "data": [ { "id": "2000…0001", "make": "Hyundai", "model": "Accent", "year": 2023, "seats": 5, "category": "Economy",
              "transmission": "AUTOMATIC", "city": "Riyadh", "pricePerDay": "95", "insurancePricePerDay": "20",
              "isAvailable": true, "imageUrl": "/images/cars/accent.jpg" } ],
  "pagination": { "page": 1, "pageSize": 1, "total": 5, "totalPages": 5, "hasNextPage": true, "hasPreviousPage": false } }
```
Rental total = days × (`pricePerDay` + `insurancePricePerDay` if insured). Hotel and car **booking** endpoints are not built yet (tables exist in schema v3).

---

## 5. Admin
Admin role only. A traveler gets `403 { "success": false, "error": "Admin access required" }`; no session gets `401`. Responses are raw objects/arrays (no `success` wrapper).

| Endpoint | Body / result |
|---|---|
| `GET /api/admin/flights` | Array of flights with `airline` and available `seats` |
| `GET /api/admin/bookings` | Array of bookings with `user` (`id, name, email, phoneNumber, role` — never the password), `flight.airline`, `travelers.seat` |
| `GET /api/admin/airlines` | Array of airlines |
| `POST /api/admin/flights` | `{ flightNumber, airlineId, from, to, departureTime, arrivalTime, basePrice, seats: [{ seatCode, ticketClass, priceMultiplier }] }` → `201` flight with seats; `400` if `airlineId` is missing |
| `PATCH /api/admin/flights/:id` | `{ basePrice?, departureTime? }` → updated flight |

Seeded admin for local testing: `admin@tarhal.com` / `hashed_password_123` (the plain-text seed password is upgraded to a hash on first login). Change it on any shared database.

---

## 6. AI chat

### `POST /api/ai/chat`
```json
{ "messages": [ { "role": "user", "content": "أبغى رحلة من الرياض إلى جدة يوم 10 يناير" } ] }
```
Send the whole conversation (last 24 messages are used, each up to 1000 characters); the last message must be from the user. A single `{ "message": "..." }` also works.

```json
// 200
{ "success": true, "reply": "…markdown text…", "flights": [ … ], "hotels": [ … ], "cars": [ … ],
  "toolsUsed": [ "searchFlights" ], "searchedWeb": false, "truncated": false, "languageBlocked": false, "usage": { … } }
// 400
{ "success": false, "error": "Send {\"messages\":[{\"role\":\"user\",\"content\":\"...\"}]}.", "code": "INVALID_MESSAGE" }
```
`flights` / `hotels` / `cars` contain real Tarhal records the assistant used, so the UI can show them as cards. Needs `DEEPSEEK_API_KEY` on the server. See `docs/AI_COST.md` for token costs.

---

## 7. Typical frontend flow

```
register → login → search → flight details (seat map) → POST /api/bookings → GET /api/bookings → cancel
```

```js
const api = async (path, options = {}) => {
  const res = await fetch(path, { credentials: 'include', headers: { 'content-type': 'application/json' }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status, body });
  return body.data ?? body;
};

await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
const flights = await api(`/api/flights/search?from=RUH&to=JED&date=2027-01-10`);
const flight  = await api(`/api/flights/${flights[0].id}`);
const booking = await api('/api/bookings', { method: 'POST', body: JSON.stringify({ flightId: flight.id, travelers }) });
```
