classDiagram
    direction TB

    class Role {
        <<enumeration>>
        TRAVELER      
        ADMIN         
    }

    class TicketClass {
        <<enumeration>>
        ECONOMY       
        BUSINESS      
        FIRST         
    }

    class Transmission {
        <<enumeration>>
        AUTOMATIC     
        MANUAL        
    }

    class SeatStatus {
        <<enumeration>>
        AVAILABLE     
        HELD          
        BOOKED        
    }

    class PaymentStatus {
        <<enumeration>>
        PENDING       
        PAID          
        FAILED        
        REFUNDED      
    }

    class User {
        +String id PK
        +String name
        +String email UK
        +String phoneNumber UK
        +String password
        +DateTime dateOfBirth
        +/Int age (Derived from dateOfBirth)
        +Role role
        +DateTime createdAt
        +DateTime updatedAt
        +authenticate(password: String) Boolean
        +getAge() Int
        +getBookings() Booking~List~
    }

    class Airline {
        +String id PK
        +String name
        +String nameAr
        +String iataCode UK
        +String logoUrl
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Flight {
        +String id PK
        +String flightNumber UK
        +String airlineId FK
        +String from
        +String to
        +DateTime departureTime
        +DateTime arrivalTime
        +Decimal basePrice
        +DateTime createdAt
        +DateTime updatedAt
        +searchFlights(from: String, to: String, date: DateTime)$ Flight~List~
        +getAvailableSeats() Seat~List~
    }

    class Seat {
        +String id PK
        +String flightId FK
        +String seatCode
        +TicketClass ticketClass
        +Float priceMultiplier
        +SeatStatus status
        +DateTime heldUntil
        +String heldByUserId
        +calculateSeatPrice(basePrice: Decimal) Decimal
        +lockSeat() Boolean
    }
    note for Seat "UK: flightId + seatCode"

    class Booking {
        +String id PK
        +String userId FK
        +String flightId FK
        +Decimal basePrice
        +Decimal luggageFee
        +Decimal discount
        +Decimal totalPrice
        +PaymentStatus paymentStatus
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
        +createAtomicBooking(travelers: BookingTraveler~List~)$ Booking
        +cancelBooking() void
    }

    class BookingTraveler {
        +String id PK
        +String bookingId FK
        +String seatId FK UK
        +String fullName
        +String passportNumber
        +DateTime dateOfBirth
        +/Int age (Derived from dateOfBirth)
        +DateTime createdAt
        +DateTime updatedAt
        +getAge() Int
    }

    class Hotel {
        +String id PK
        +String name
        +String city
        +String address
        +Decimal pricePerNight
        +Float rating
        +String roomType
        +String imageUrl
        +DateTime createdAt
        +DateTime updatedAt
        +filterByCityAndBudget(city: String, maxPrice: Decimal)$ Hotel~List~
    }

    class Car {
        +String id PK
        +String make
        +String model
        +Int year
        +Int seats
        +String category
        +Transmission transmission
        +String city
        +Decimal pricePerDay
        +Decimal insurancePricePerDay
        +Boolean isAvailable
        +String imageUrl
        +DateTime createdAt
        +DateTime updatedAt
        +filterCars(...)$ Car~List~
    }

    class HotelBooking {
        +String id PK
        +String userId FK
        +String hotelId FK
        +DateTime checkIn
        +DateTime checkOut
        +Int guests
        +Decimal totalPrice
        +PaymentStatus paymentStatus
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
    }

    class CarRental {
        +String id PK
        +String userId FK
        +String carId FK
        +DateTime pickupDate
        +DateTime returnDate
        +Boolean withInsurance
        +Decimal totalPrice
        +PaymentStatus paymentStatus
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
    }

    %% Entity Relationships & Multiplicities
    User "1" --> "0..*" Booking : places
    User "1" --> "0..*" HotelBooking : places
    User "1" --> "0..*" CarRental : places
    Airline "1" --> "0..*" Flight : operates
    Flight "1" *-- "1..*" Seat : contains
    Flight "1" --> "0..*" Booking : reserved in
    Booking "1" *-- "1..*" BookingTraveler : includes
    Seat "1" --> "0..1" BookingTraveler : assigned to
    HotelBooking "0..*" --> "1" Hotel : reserves
    CarRental "0..*" --> "1" Car : reserves
    
    Seat ..> SeatStatus : uses
    Booking ..> PaymentStatus : uses
    HotelBooking ..> PaymentStatus : uses
    CarRental ..> PaymentStatus : uses
    User ..> Role : uses
    Seat ..> TicketClass : uses
    Car ..> Transmission : uses