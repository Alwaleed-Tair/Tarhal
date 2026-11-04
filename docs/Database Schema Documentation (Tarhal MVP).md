### Database Schema Documentation (Tarhal MVP)

| Table / Entity | Primary Purpose | Key Fields | Relationships |
| :--- | :--- | :--- | :--- |
| **`User`** | Manages traveler accounts and authentication. | `id`, `email`, `phoneNumber`, `password`, `role` | 1-to-Many with `Booking`. |
| **`Flight`** | Catalogs airline schedules, routes, and baseline pricing. | `flightNumber`, `from`, `to`, `departureTime`, `basePrice` | 1-to-Many with `Seat` and `Booking`. |
| **`Seat`** | Maps individual aircraft seating and cabin classes. | `seatCode`, `ticketClass`, `status` | Belongs to `Flight`. |
| **`Booking`** | Serves as the central transaction ledger for users. | `basePrice`, `totalPrice`, `paymentStatus` | Belongs to `User` and `Flight`. |
| **`BookingTraveler`** | Stores the passenger manifest and identity metadata. | `fullName`, `passportNumber`, `dateOfBirth` | Belongs to `Booking` and `Seat`. |
| **`Hotel`** | Standalone catalog for accommodation offerings. | `id`, `name`, `city`, `pricePerNight`, `rating` | Independent entity (MVP phase). |
| **`Car`** | Standalone catalog for vehicle rentals. | `id`, `category`, `pricePerDay`, `insuranceOption` | Independent entity (MVP phase). |