# 🗄️ Tarhal — Database Update (Schema v3)

> **Design:** Abdulelah · **Implementation:** Saud (schema, migration, seed) · **Applies in:** MVP sprint, day 1 (2/11) · **Status:** proposed, validated with Prisma
>
> This file lists every change to `prisma/schema.prisma` and the class diagram, why it is needed, and who is affected. The complete target schema is at the bottom ([§ Target Schema](#-target-schema-v3)); it passes `prisma validate`.

---

## 📌 Summary

| # | Change | Why | Type |
|---|---|---|---|
| 1 | New **`Airline`** model; `Flight.airlineId` (required) | Show the airline (Saudia, Qatar Airways…) with logo; filter by airline | New model + new FK |
| 2 | **`Car`**: `make`, `model`, `year`, `seats`, `transmission`, `city`, `insurancePricePerDay`, `isAvailable`, `imageUrl`; **remove** `insuranceOption` | A car was only a category + price; users need to know what they are renting and where | Fields added / removed |
| 3 | New **`HotelBooking`** and **`CarRental`** models | Hotels and cars had **no link to `User` or `Booking`**: nobody could book them | New models |
| 4 | `Hotel`: `address`, `imageUrl` | Needed for listing cards | Fields added |
| 5 | `Seat`: `heldUntil`, `heldByUserId` | A `HELD` seat currently stays held forever | Fields added |
| 6 | Enums **`Role`**, **`TicketClass`**, **`Transmission`** | `role` and `ticketClass` were free text (`'traveler'`, `'Business'`) — typos break auth and pricing | String → enum |
| 7 | `createdAt` / `updatedAt` on `Hotel`, `Car`, `BookingTraveler` | Every other model already has them | Fields added |
| 8 | Indexes on search columns | Faster flight / hotel / car search | Indexes |

**Unchanged:** `User` fields (except `role` type), `Booking`, `BookingTraveler` relations, `SeatStatus`, `PaymentStatus`, all price types (already `Decimal` in the database).

---

## 1️⃣ Airline (new)

| Field | Type | Notes |
|---|---|---|
| `id` | String PK | uuid |
| `name` | String | `Qatar Airways` |
| `nameAr` | String | `الخطوط القطرية` |
| `iataCode` | String **UK** | `QR`, `SV`, `EK`, `XY`, `F3` |
| `logoUrl` | String? | Path under `public/images/airlines/` |
| `createdAt` / `updatedAt` | DateTime | |

**Flight** gets `airlineId String FK` → `Airline` (required). Relationship: **Airline 1 ── 0..\* Flight** ("operates").

> Convention: `flightNumber` starts with the airline's IATA code (`QR1185`, `SV1020`).

---

## 2️⃣ Car (changed)

| Field | Before | After |
|---|---|---|
| `make` | — | **String** — `Toyota` |
| `model` | — | **String** — `Camry` |
| `year` | — | **Int** — `2024` |
| `seats` | — | **Int** — passenger capacity, `5` |
| `category` | String | String (unchanged) — `Economy`, `SUV`, `Luxury` |
| `transmission` | — | **Transmission** enum, default `AUTOMATIC` |
| `city` | — | **String** — pickup city |
| `pricePerDay` | Decimal | Decimal (unchanged) |
| `insuranceOption` | Boolean | ❌ **removed** |
| `insurancePricePerDay` | — | **Decimal**, default `0` — daily insurance price |
| `isAvailable` | — | **Boolean**, default `true` |
| `imageUrl` | — | **String?** |
| `createdAt` / `updatedAt` | — | DateTime |

**Insurance design:** the *price* of insurance belongs to the car (`insurancePricePerDay`); whether the customer *chose* insurance belongs to the rental (`CarRental.withInsurance`). The old boolean only said "insurance exists".

---

## 3️⃣ HotelBooking & CarRental (new)

These close the gap where `Hotel` and `Car` were isolated. `Booking` stays flight-only (its `flightId` is required).

| HotelBooking | Type | | CarRental | Type |
|---|---|---|---|---|
| `id` | String PK | | `id` | String PK |
| `userId` | String FK → User | | `userId` | String FK → User |
| `hotelId` | String FK → Hotel | | `carId` | String FK → Car |
| `checkIn` | DateTime | | `pickupDate` | DateTime |
| `checkOut` | DateTime | | `returnDate` | DateTime |
| `guests` | Int (default 1) | | `withInsurance` | Boolean (default false) |
| `totalPrice` | Decimal | | `totalPrice` | Decimal |
| `paymentStatus` | PaymentStatus | | `paymentStatus` | PaymentStatus |
| `isActive` | Boolean | | `isActive` | Boolean |
| `createdAt` / `updatedAt` | DateTime | | `createdAt` / `updatedAt` | DateTime |

**Relationships:**
- User 1 ── 0..\* HotelBooking 0..\* ── 1 Hotel
- User 1 ── 0..\* CarRental 0..\* ── 1 Car
- Deleting a user cascades to their bookings; deleting a hotel/car that has bookings is **blocked** (`Restrict`) so booking history is never lost.

> ⏸️ **Scope:** the tables are created in this sprint so the data model (and the SDD) is complete. The booking **APIs and pages** for hotels and cars remain deferred until after 6/11.

---

## 4️⃣ Other changes

| Model | Change |
|---|---|
| `Hotel` | + `address String?`, `imageUrl String?`, `createdAt`, `updatedAt`, index on `city` |
| `Seat` | + `heldUntil DateTime?`, `heldByUserId String?`; `ticketClass` → `TicketClass` enum (default `ECONOMY`) |
| `User` | `role` → `Role` enum (default `TRAVELER`) |
| `BookingTraveler` | + `createdAt`, `updatedAt` |
| `Flight` | + index on `(from, to, departureTime)` and on `airlineId` |
| `Booking` | + index on `userId` (for "My bookings") |

**New enums:**

```
Role         { TRAVELER, ADMIN }
TicketClass  { ECONOMY, BUSINESS, FIRST }
Transmission { AUTOMATIC, MANUAL }
```

**Seat hold rule:** when a user selects a seat it becomes `HELD` with `heldUntil = now + 10 min`. A held seat whose `heldUntil` has passed is treated as `AVAILABLE`. Booking confirmation turns it `BOOKED`.

---

## 🔁 Migration

Existing data does **not** fit the new required columns (`Flight.airlineId`, `Car.make/model/year/seats/city`) and the old text values (`'traveler'`, `'Business'`) do not match the enums. Since the shared database only holds seed data, the plan is:

1. Update `schema.prisma` to the target schema below.
2. Remove or fix `20261015052336_sync_final_schema` (it adds a required `dateOfBirth` with no default and fails on a non-empty table).
3. `npx prisma migrate dev --name schema_v3` on a **clean local database** → one migration.
4. On the shared Neon database: `npx prisma migrate reset` (drops data, applies all migrations, runs the seed).
5. Update the seed to match:
   - 5 airlines: Saudia `SV`, Qatar Airways `QR`, Emirates `EK`, flynas `XY`, flyadeal `F3`
   - Flights linked to an airline, **future** dates, flight numbers prefixed with the IATA code
   - Seats use `TicketClass.ECONOMY / BUSINESS / FIRST`
   - Users use `Role.TRAVELER` / `Role.ADMIN` (1 admin + 2 travelers)
   - `cars.json`: replace `insuranceOption` with `make`, `model`, `year`, `seats`, `transmission`, `city`, `insurancePricePerDay`
   - `hotels.json`: add `address`, `imageUrl`

> ⚠️ Never run `migrate reset` against a database with real user data.

---

## 💥 Code Impact

| Area | What breaks / needs updating | Owner | Day |
|---|---|---|---|
| Schema v3 design (this file) | Final review and sign-off before implementation | Abdulelah | 2/11 |
| `prisma/schema.prisma`, migrations, `seed.ts`, `seeds/*.json` | Implement everything above | Saud | 2–3/11 |
| `lib/db/` | Shared queries (flights with airline, bookings, airlines, create flight with seats) | Saud | 4/11 |
| `app/api/flights/search`, `GET /api/flights/[id]` | Include `airline` in results; optional `airline` filter | Abdulelah | 3/11 |
| Booking price calculation | `ticketClass` is now an enum — compare with `TicketClass.BUSINESS`, not `'Business'` | Abdulelah | 2–4/11 |
| `lib/catalog-filters.ts` (`carFilters`, `hotelFilters`) + `tests/auth-catalog.test.ts` | New car filters (`city`, `make`, `minSeats`, `minYear`, `transmission`, available only); hotel fields | Mohammed Alasad | 5/11 |
| Auth / middleware role checks | Use `Role.ADMIN` / `Role.TRAVELER` instead of strings | Mohammed Alasad | 4/11 |
| Admin APIs | `POST /api/admin/flights` requires `airlineId`; `GET /api/admin/airlines` | Saud | 5/11 |
| Flight results page | Airline logo + name on cards; airline filter | Tariq | 3/11 |
| Cars / hotels pages, admin flight form | New car fields on cards; airline dropdown in admin | Omar | 4–5/11 |
| `docs/api-documentation.md` | New fields in flight, car and hotel responses | **Unassigned** | 3/11 |

---

## 📐 Class Diagram

Update the class diagram to **v3** (owner: Abdulelah, 6/11; feeds the SDD due 14/11):

- [ ] Add **Airline** class and *Airline 1 ── 0..\* Flight* ("operates"); add `airlineId FK` to Flight
- [ ] Add **HotelBooking** and **CarRental** classes with their four associations
- [ ] Update **Car** and **Hotel** attributes as above
- [ ] Add `heldUntil`, `heldByUserId` to **Seat**
- [ ] Add `«enumeration»` boxes for **Role**, **TicketClass**, **Transmission**; change `role` / `ticketClass` types
- [ ] Change every price from `Float` to **`Decimal`** (the database already uses `Decimal`; `rating` stays `Float`)
- [ ] Add the constraint `{unique: flightId + seatCode}` on Seat
- [ ] Underline class-level (static) methods: `searchFlights`, `createAtomicBooking`, `filterByCityAndBudget`, `filterByInsurance` (rename to `filterCars(...)`)
- [ ] Widen the enum boxes — values are currently cut off (`PENDINC`, `BOOKEI`, `HELI`, `REFUNDE`)
- [ ] Add `createdAt` / `updatedAt` to Hotel, Car, BookingTraveler

---

## 🕓 Not in this update (decide later)

| Idea | Reason to wait |
|---|---|
| `Airport` model (`code`, `city`, `name`) instead of free-text `from` / `to` | Cleaner search (RUH vs "Riyadh" vs "الرياض"), but touches search + seed + UI. **Minimum now:** store IATA airport codes (`RUH`, `JED`, `DOH`) in `from` / `to`. |
| Separate `Room` model per hotel | Real hotels have several room types; needed only when hotel booking is built |
| Rename `User.password` → `passwordHash` | Values are already hashed (`lib/passwords.ts`); rename is cosmetic and touches auth code |
| Link `HotelBooking` / `CarRental` to a flight `Booking` | Only needed for Bundle & Save |

---

## 📄 Target Schema (v3)

Validated with Prisma's schema engine (no errors). Copy into `prisma/schema.prisma`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────

enum SeatStatus {
  AVAILABLE
  HELD
  BOOKED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum Role {
  TRAVELER
  ADMIN
}

enum TicketClass {
  ECONOMY
  BUSINESS
  FIRST
}

enum Transmission {
  AUTOMATIC
  MANUAL
}

// ─── Users ───────────────────────────────────────────────

model User {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  phoneNumber String   @unique
  password    String
  dateOfBirth DateTime
  role        Role     @default(TRAVELER)

  bookings      Booking[]
  hotelBookings HotelBooking[]
  carRentals    CarRental[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ─── Flights ─────────────────────────────────────────────

model Airline {
  id       String  @id @default(uuid())
  name     String
  nameAr   String
  iataCode String  @unique
  logoUrl  String?

  flights Flight[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Flight {
  id            String   @id @default(uuid())
  flightNumber  String   @unique
  airlineId     String
  airline       Airline  @relation(fields: [airlineId], references: [id])
  from          String
  to            String
  departureTime DateTime
  arrivalTime   DateTime
  basePrice     Decimal  @db.Decimal(10, 2)

  seats    Seat[]
  bookings Booking[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([from, to, departureTime])
  @@index([airlineId])
}

model Seat {
  id              String      @id @default(uuid())
  flightId        String
  flight          Flight      @relation(fields: [flightId], references: [id], onDelete: Cascade)
  seatCode        String
  ticketClass     TicketClass @default(ECONOMY)
  priceMultiplier Decimal     @default(1.0) @db.Decimal(4, 2)
  status          SeatStatus  @default(AVAILABLE)
  heldUntil       DateTime?
  heldByUserId    String?

  traveler BookingTraveler?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([flightId, seatCode])
}

model Booking {
  id            String        @id @default(uuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  flightId      String
  flight        Flight        @relation(fields: [flightId], references: [id], onDelete: Cascade)
  basePrice     Decimal       @db.Decimal(10, 2)
  luggageFee    Decimal       @default(0) @db.Decimal(10, 2)
  discount      Decimal       @default(0) @db.Decimal(10, 2)
  totalPrice    Decimal       @db.Decimal(10, 2)
  paymentStatus PaymentStatus @default(PENDING)
  isActive      Boolean       @default(true)

  travelers BookingTraveler[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

model BookingTraveler {
  id             String   @id @default(uuid())
  bookingId      String
  booking        Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  seatId         String   @unique
  seat           Seat     @relation(fields: [seatId], references: [id], onDelete: Cascade)
  fullName       String
  passportNumber String
  dateOfBirth    DateTime

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ─── Hotels ──────────────────────────────────────────────

model Hotel {
  id            String  @id @default(uuid())
  name          String
  city          String
  address       String?
  pricePerNight Decimal @db.Decimal(10, 2)
  rating        Float
  roomType      String
  imageUrl      String?

  bookings HotelBooking[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([city])
}

model HotelBooking {
  id            String        @id @default(uuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  hotelId       String
  hotel         Hotel         @relation(fields: [hotelId], references: [id], onDelete: Restrict)
  checkIn       DateTime
  checkOut      DateTime
  guests        Int           @default(1)
  totalPrice    Decimal       @db.Decimal(10, 2)
  paymentStatus PaymentStatus @default(PENDING)
  isActive      Boolean       @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([hotelId, checkIn, checkOut])
}

// ─── Cars ────────────────────────────────────────────────

model Car {
  id                   String       @id @default(uuid())
  make                 String
  model                String
  year                 Int
  seats                Int
  category             String
  transmission         Transmission @default(AUTOMATIC)
  city                 String
  pricePerDay          Decimal      @db.Decimal(10, 2)
  insurancePricePerDay Decimal      @default(0) @db.Decimal(10, 2)
  isAvailable          Boolean      @default(true)
  imageUrl             String?

  rentals CarRental[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([city])
}

model CarRental {
  id            String        @id @default(uuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  carId         String
  car           Car           @relation(fields: [carId], references: [id], onDelete: Restrict)
  pickupDate    DateTime
  returnDate    DateTime
  withInsurance Boolean       @default(false)
  totalPrice    Decimal       @db.Decimal(10, 2)
  paymentStatus PaymentStatus @default(PENDING)
  isActive      Boolean       @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([carId, pickupDate, returnDate])
}
```
