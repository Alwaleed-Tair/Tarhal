classDiagram
    direction LR

    class User {
        +String id
        +String name
        +String email
        +String phoneNumber
        +String password
        +DateTime dateOfBirth
        +Role role
        +get_bookings()
    }

    class Airline {
        +String id
        +String name
        +String nameAr
        +String iataCode
        +String logoUrl
    }

    class Flight {
        +String id
        +String flightNumber
        +String airlineId
        +String from
        +String to
        +DateTime departureTime
        +DateTime arrivalTime
        +Decimal basePrice
    }

    class Seat {
        +String id
        +String flightId
        +String seatCode
        +TicketClass ticketClass
        +Decimal priceMultiplier
        +SeatStatus status
        +DateTime heldUntil
        +String heldByUserId
    }

    class Booking {
        +String id
        +String userId
        +String flightId
        +Decimal basePrice
        +Decimal luggageFee
        +Decimal discount
        +Decimal totalPrice
        +PaymentStatus paymentStatus
        +Boolean isActive
    }

    class BookingTraveler {
        +String id
        +String bookingId
        +String seatId
        +String fullName
        +String passportNumber
        +DateTime dateOfBirth
    }

    class Hotel {
        +String id
        +String name
        +String city
        +String address
        +Decimal pricePerNight
        +Float rating
        +String roomType
        +String imageUrl
    }

    class HotelBooking {
        +String id
        +String userId
        +String hotelId
        +DateTime checkIn
        +DateTime checkOut
        +Int guests
        +Decimal totalPrice
        +PaymentStatus paymentStatus
        +Boolean isActive
    }

    class Car {
        +String id
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
    }

    class CarRental {
        +String id
        +String userId
        +String carId
        +DateTime pickupDate
        +DateTime returnDate
        +Boolean withInsurance
        +Decimal totalPrice
        +PaymentStatus paymentStatus
        +Boolean isActive
    }

    User "1" --> "*" Booking : makes
    User "1" --> "*" HotelBooking : places
    User "1" --> "*" CarRental : rents
    Airline "1" --> "*" Flight : operates
    Flight "1" --> "*" Seat : contains
    Flight "1" --> "*" Booking : reserves
    Booking "1" --> "*" BookingTraveler : includes
    Seat "1" --> "*" BookingTraveler : assigned_to
    Hotel "1" --> "*" HotelBooking : reserves
    Car "1" --> "*" CarRental : reserves