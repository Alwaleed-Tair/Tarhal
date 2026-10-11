# Tarhal Database Layer — Class Diagram v1

This class diagram models the core database entities (`User`, `Flight`, `Seat`, `Booking`, `BookingTraveler`, `Hotel`, and `Car`), their attributes, data types, domain methods, and multiplicities as implemented in `schema.prisma`.

```mermaid
classDiagram
    direction TB

    class User {
        +String id PK
        +String name
        +String email UK
        +String phoneNumber
        +String password
        +String role
        +DateTime createdAt
        +DateTime updatedAt
        +authenticate(password: String) Boolean
        +getBookings() Booking[]
    }

    class Flight {
        +String id PK
        +String flightNumber UK
        +String from
        +String to
        +DateTime departureTime
        +DateTime arrivalTime
        +Float basePrice
        +DateTime createdAt
        +DateTime updatedAt
        +searchFlights(from: String, to: String, date: DateTime) Flight[]
        +getAvailableSeats() Seat[]
    }

    class Seat {
        +String id PK
        +String flightId FK
        +String seatCode
        +String ticketClass
        +Float priceMultiplier
        +SeatStatus status
        +calculateSeatPrice(basePrice: Float) Float
        +lockSeat() Boolean
    }

    class SeatStatus {
        <<enumeration>>
        AVAILABLE
        BOOKED
        LOCKED
    }

    class Booking {
        +String id PK
        +String userId FK
        +String flightId FK
        +String hotelId FK "Nullable"
        +String carId FK "Nullable"
        +BookingStatus status
        +Float totalPrice
        +DateTime createdAt
        +DateTime updatedAt
        +createAtomicBooking(travelers: BookingTraveler[]) Booking
        +cancelBooking() void
    }

    class BookingStatus {
        <<enumeration>>
        PENDING
        CONFIRMED
        CANCELLED
    }

    class BookingTraveler {
        +String id PK
        +String bookingId FK
        +String seatId FK
        +String fullName
        +String passportNumber
        +DateTime dateOfBirth
    }

    class Hotel {
        +String id PK
        +String name
        +String city
        +Float pricePerNight
        +Float rating
        +Boolean available
        +DateTime createdAt
        +DateTime updatedAt
        +filterByCityAndBudget(city: String, maxPrice: Float) Hotel[]
    }

    class Car {
        +String id PK
        +String model
        +String brand
        +String city
        +Float pricePerDay
        +Boolean insuranceOption
        +Boolean available
        +DateTime createdAt
        +DateTime updatedAt
        +filterByInsurance(insured: Boolean) Car[]
    }

    %% Entity Relationships & Multiplicities
    User "1" --> "0..*" Booking : places
    Flight "1" *-- "1..*" Seat : contains
    Flight "1" --> "0..*" Booking : reserved in
    Booking "1" *-- "1..*" BookingTraveler : includes
    Seat "1" --> "0..1" BookingTraveler : assigned to
    Hotel "0..1" --> "0..*" Booking : included in
    Car "0..1" --> "0..*" Booking : rented in
    Seat ..> SeatStatus : uses
    Booking ..> BookingStatus : uses
```

---

## Entity Relationship Summary

| Source Entity | Target Entity | Multiplicity | Relationship Type & Description |
| :--- | :--- | :--- | :--- |
| **User** | **Booking** | `1` to `0..*` | **Association:** A registered user can place zero or many bookings; each booking belongs to exactly one user. |
| **Flight** | **Seat** | `1` to `1..*` | **Composition:** A flight contains multiple seats; seats cannot exist independently without a parent flight. |
| **Flight** | **Booking** | `1` to `0..*` | **Association:** A flight can be referenced across multiple bookings. |
| **Booking** | **BookingTraveler** | `1` to `1..*` | **Composition:** A booking consists of one or more passenger records (`BookingTraveler`). |
| **Seat** | **BookingTraveler** | `1` to `0..1` | **Association:** Each specific seat on a flight is assigned to at most one traveler per active booking. |
| **Hotel** | **Booking** | `0..1` to `0..*` | **Association:** A booking may optionally include a hotel reservation (and a hotel can be booked many times). |
| **Car** | **Booking** | `0..1` to `0..*` | **Association:** A booking may optionally include a car rental (and a car can be rented across multiple bookings). |