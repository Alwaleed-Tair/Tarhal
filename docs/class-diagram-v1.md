```mermaid
classDiagram
    direction TB

    class User {
        +String id PK
        +String name
        +String email UK
        +String phoneNumber
        +String password
        +DateTime dateOfBirth
        /Int age (Derived from dateOfBirth)
        +String role
        +DateTime createdAt
        +DateTime updatedAt
        +authenticate(password: String) Boolean
        +getAge() Int
        +getBookings() Booking~List~
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
        +searchFlights(from: String, to: String, date: DateTime) Flight~List~
        +getAvailableSeats() Seat~List~
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
        +String hotelId FK (Nullable)
        +String carId FK (Nullable)
        +BookingStatus status
        +Float totalPrice
        +DateTime createdAt
        +DateTime updatedAt
        +createAtomicBooking(travelers: BookingTraveler~List~) Booking
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
        /Int age (Derived from dateOfBirth)
        +getAge() Int
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
        +filterByCityAndBudget(city: String, maxPrice: Float) Hotel~List~
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
        +filterByInsurance(insured: Boolean) Car~List~
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