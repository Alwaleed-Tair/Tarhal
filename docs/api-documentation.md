# Tarhal Backend API — Technical Documentation (Flights, Bookings & Auth)

This document defines the request and response structures for the core backend endpoints to support frontend integration and the Software Requirements Specification (SRS).

---

## 1. User Login
Authenticates a user by matching their username and password against the PostgreSQL database.

* **Endpoint:** /api/auth/login
* **Method:** POST
* **Headers:** Content-Type: application/json

### Request Body
{
  "username": "test",
  "password": "hashed_password_123"
}

### Responses
// 200 OK — Success
// {
//   "success": true,
//   "message": "Login successful!",
//   "user": {
//     "id": "78b1a95f-4f1d-4274-9d18-2930265f7f51",
//     "name": "test"
//   }
// }

// 401 Unauthorized — Incorrect Password
// {
//   "success": false,
//   "error": "Incorrect password"
// }

// 404 Not Found — User Does Not Exist
// {
//   "success": false,
//   "error": "User not found"
// }

// 500 Internal Server Error
// {
//   "error": "Failed to process login"
// }

---

## 2. Flight Search
Searches for available flights matching origin, destination, and departure date, returning flight details along with available seats.

* **Endpoint:** /api/flights/search
* **Method:** GET

### Query Parameters
| Parameter | Type   | Required | Description                                           | Example    |
| :---      | :---   | :---     | :---                                                  | :---       |
| from      | string | Yes      | 3-letter IATA origin airport code                     | RUH        |
| to        | string | Yes      | 3-letter IATA destination airport code                | JED        |
| date      | string | Yes      | Departure date (YYYY-MM-DD, cannot be in the past)    | 2026-10-01 |

Example Request URL:
GET /api/flights/search?from=RUH&to=JED&date=2026-10-01

### Responses
// 200 OK — Success
// [
//   {
//     "id": "7a27369b-65f9-4284-9e9d-e13708b8caec",
//     "flightNumber": "SV-1020",
//     "from": "RUH",
//     "to": "JED",
//     "departureTime": "2026-10-01T08:00:00.000Z",
//     "arrivalTime": "2026-10-01T09:40:00.000Z",
//     "basePrice": 420.00,
//     "seats": [
//       {
//         "id": "5ed783b7-5338-43ad-b75c-a321888a6f9f",
//         "seatCode": "1A",
//         "ticketClass": "Business",
//         "priceMultiplier": 1.8,
//         "status": "AVAILABLE"
//       }
//     ]
//   }
// ]

// 400 Bad Request — Missing or Invalid Parameters (or date in the past)
// {
//   "error": "Missing required search parameters: from, to, or date"
// }

// 500 Internal Server Error
// {
//   "error": "Failed to search flights"
// }

---

## 3. Create Flight Booking
Creates a new flight booking and locks the selected seats using an atomic Prisma database transaction to prevent double-booking under concurrent requests.

* **Endpoint:** /api/bookings
* **Method:** POST
* **Headers:** Content-Type: application/json

### Request Body
{
  "userId": "78b1a95f-4f1d-4274-9d18-2930265f7f51",
  "flightId": "7a27369b-65f9-4284-9e9d-e13708b8caec",
  "basePrice": 500,
  "travelers": [
    {
      "seatId": "5ed783b7-5338-43ad-b75c-a321888a6f9f",
      "fullName": "Abdulelah Alshareef",
      "passportNumber": "X123456",
      "dateOfBirth": "1995-05-05"
    }
  ]
}

### Responses
// 201 Created (or 200 OK) — Booking Confirmed
// {
//   "message": "Booking created successfully",
//   "booking": {
//     "id": "booking-uuid-1234",
//     "userId": "78b1a95f-4f1d-4274-9d18-2930265f7f51",
//     "flightId": "7a27369b-65f9-4284-9e9d-e13708b8caec",
//     "status": "CONFIRMED",
//     "totalPrice": 900.00,
//     "travelers": [
//       {
//         "id": "traveler-uuid-5678",
//         "seatId": "5ed783b7-5338-43ad-b75c-a321888a6f9f",
//         "fullName": "Abdulelah Alshareef",
//         "passportNumber": "X123456"
//       }
//     ]
//   }
// }

// 400 Bad Request — Missing Fields
// {
//   "error": "Missing required booking fields"
// }

// 409 Conflict — Seat Already Booked (Concurrency Protection)
// {
//   "error": "One or more selected seats are no longer available"
// }

// 500 Internal Server Error
// {
//   "error": "Failed to create booking"
// }