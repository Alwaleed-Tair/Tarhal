# Tarhal database schema reference

The source of truth is [`schema.prisma`](schema.prisma). This page explains it in plain words. Migrations live in
[`migrations/`](migrations) (`20260917110554_init_airlines_schema`, `20261107120000_schema_v3`). Database: PostgreSQL.

All ids are UUID strings (`@default(uuid())`). Every table has `createdAt` (set on insert) and `updatedAt` (set on every change).
Money columns are `Decimal(10,2)` in **SAR** (Prisma returns them as strings in JSON, for example `"420"`).

## Enums

| Enum | Values | Used by |
|---|---|---|
| `Role` | `TRAVELER` (default), `ADMIN` | `User.role` |
| `SeatStatus` | `AVAILABLE` (default), `HELD`, `BOOKED` | `Seat.status` |
| `PaymentStatus` | `PENDING` (default), `PAID`, `FAILED`, `REFUNDED` | `Booking`, `HotelBooking`, `CarRental` |
| `TicketClass` | `ECONOMY` (default), `BUSINESS`, `FIRST` | `Seat.ticketClass` |
| `Transmission` | `AUTOMATIC` (default), `MANUAL` | `Car.transmission` |

## Tables

### User
| Column | Type | Notes |
|---|---|---|
| `name` | String | Not unique (login by name works only when it is unique). |
| `email` | String | **Unique.** Stored lower-case by the register route. |
| `phoneNumber` | String | **Unique.** |
| `password` | String | Salted `scrypt$...` hash. Never returned by any API. |
| `dateOfBirth` | DateTime | |
| `role` | Role | Default `TRAVELER`. Registration cannot set it. |

Relations: `bookings` (Booking), `hotelBookings` (HotelBooking), `carRentals` (CarRental).

### Airline
| Column | Type | Notes |
|---|---|---|
| `name`, `nameAr` | String | English and Arabic name. |
| `iataCode` | String | **Unique**, for example `SV`. |
| `logoUrl` | String? | |

Relation: `flights`.

### Flight
| Column | Type | Notes |
|---|---|---|
| `flightNumber` | String | **Unique**, for example `SV1020`. |
| `airlineId` | String | → `Airline.id`. |
| `from`, `to` | String | 3-letter airport codes (`RUH`, `JED`, `DMM`...). |
| `departureTime`, `arrivalTime` | DateTime | Stored in UTC; the site shows Riyadh time (UTC+3). |
| `basePrice` | Decimal(10,2) | SAR, before the seat multiplier. |

Indexes: `(from, to, departureTime)` for search, `(airlineId)`. Relations: `seats`, `bookings` (both deleted with the flight).

### Seat
| Column | Type | Notes |
|---|---|---|
| `flightId` | String | → `Flight.id`, deleted with the flight. |
| `seatCode` | String | Unique per flight (`@@unique([flightId, seatCode])`), for example `12A`. |
| `ticketClass` | TicketClass | |
| `priceMultiplier` | Decimal(4,2) | Default 1.0. Seat price = `basePrice × priceMultiplier`. |
| `status` | SeatStatus | `HELD` = kept for one traveler for 10 minutes; `BOOKED` = in an active booking. |
| `heldUntil` | DateTime? | End of the hold. A `HELD` seat past this time counts as available. |
| `heldByUserId` | String? | Who holds it. Plain column, no relation. Never sent to travelers. |

Relation: `travelers` (BookingTraveler). A seat can appear in several bookings over time, because a cancelled
booking keeps its traveler rows; double booking is prevented by the atomic status update in `POST /api/bookings`.

### Booking (flight booking)
| Column | Type | Notes |
|---|---|---|
| `userId` | String | → `User.id`, deleted with the user. |
| `flightId` | String | → `Flight.id`, deleted with the flight. |
| `basePrice` | Decimal(10,2) | Flight base price at booking time. |
| `luggageFee`, `discount` | Decimal(10,2) | Default 0. Not used by the API yet. |
| `totalPrice` | Decimal(10,2) | Calculated on the server: sum of each seat's price. |
| `paymentStatus` | PaymentStatus | `PENDING` → `PAID` (simulated payment); cancelled paid bookings become `REFUNDED`. |
| `isActive` | Boolean | `false` once cancelled. |

Index: `(userId)`. Relation: `travelers`.

### BookingTraveler
One row per passenger of a flight booking.

| Column | Type | Notes |
|---|---|---|
| `bookingId` | String | → `Booking.id`, deleted with the booking. |
| `seatId` | String | → `Seat.id`. |
| `fullName`, `passportNumber` | String | |
| `dateOfBirth` | DateTime | |

Index: `(seatId)`.

### Hotel
| Column | Type | Notes |
|---|---|---|
| `name`, `city`, `roomType` | String | `city` uses English names (`Riyadh`, `Jeddah`...). |
| `address` | String? | |
| `pricePerNight` | Decimal(10,2) | SAR. |
| `rating` | Float | 1 to 5 (checked by the admin API). |
| `imageUrl` | String? | |

Index: `(city)`. Relation: `bookings` (HotelBooking). A hotel with bookings cannot be deleted (`onDelete: Restrict`).
There is no room count, so the API does not limit how many bookings a hotel takes.

### HotelBooking
| Column | Type | Notes |
|---|---|---|
| `userId` | String | → `User.id`, deleted with the user. |
| `hotelId` | String | → `Hotel.id` (Restrict). |
| `checkIn`, `checkOut` | DateTime | Stored as midnight UTC of the day. |
| `guests` | Int | Default 1. |
| `totalPrice` | Decimal(10,2) | Server: nights × `pricePerNight`. |
| `paymentStatus` | PaymentStatus | Default `PENDING`. |
| `isActive` | Boolean | `false` once cancelled. |

Indexes: `(userId)`, `(hotelId, checkIn, checkOut)`.

### Car
| Column | Type | Notes |
|---|---|---|
| `make`, `model`, `category`, `city` | String | |
| `year`, `seats` | Int | |
| `transmission` | Transmission | Default `AUTOMATIC`. |
| `pricePerDay` | Decimal(10,2) | SAR. |
| `insurancePricePerDay` | Decimal(10,2) | Default 0. |
| `isAvailable` | Boolean | Default `true`. Public `GET /api/cars` lists only available cars; admins see all. |
| `imageUrl` | String? | |

Index: `(city)`. Relation: `rentals` (CarRental, Restrict).

### CarRental
| Column | Type | Notes |
|---|---|---|
| `userId` | String | → `User.id`, deleted with the user. |
| `carId` | String | → `Car.id` (Restrict). |
| `pickupDate`, `returnDate` | DateTime | Stored as midnight UTC of the day. |
| `withInsurance` | Boolean | Default `false`. |
| `totalPrice` | Decimal(10,2) | Server: days × (`pricePerDay` + `insurancePricePerDay` when insured). |
| `paymentStatus` | PaymentStatus | Default `PENDING`. |
| `isActive` | Boolean | `false` once cancelled. |

Indexes: `(userId)`, `(carId, pickupDate, returnDate)`. The API refuses overlapping active rentals of the same car.

## Relations at a glance

```
User 1─* Booking *─1 Flight *─1 Airline
          │            │
          *            *
   BookingTraveler *─1 Seat
User 1─* HotelBooking *─1 Hotel
User 1─* CarRental    *─1 Car
```

## Not in the schema (known gaps)
- No payment table: payments are simulated by changing `paymentStatus`.
- No per-user AI usage table: AI request counts are kept in memory and logs.
- No hotel room inventory or car stock count.
