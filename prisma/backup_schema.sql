generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String    @id @default(uuid())
  name        String
  email       String    @unique
  phoneNumber String    @unique
  password    String
  role        String    @default("traveler")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  dateOfBirth DateTime
  bookings    Booking[]
}

model Flight {
  id            String    @id @default(uuid())
  flightNumber  String    @unique
  from          String
  to            String
  departureTime DateTime
  arrivalTime   DateTime
  basePrice     Decimal   @db.Decimal(10, 2)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  bookings      Booking[]
  seats         Seat[]
}

model Seat {
  id              String           @id @default(uuid())
  flightId        String
  seatCode        String
  ticketClass     String
  priceMultiplier Decimal          @default(1.0) @db.Decimal(4, 2)
  status          SeatStatus       @default(AVAILABLE)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  traveler        BookingTraveler?
  flight          Flight           @relation(fields: [flightId], references: [id], onDelete: Cascade)

  @@unique([flightId, seatCode])
}

model Booking {
  id            String            @id @default(uuid())
  userId        String
  flightId      String
  basePrice     Decimal           @db.Decimal(10, 2)
  luggageFee    Decimal           @default(0) @db.Decimal(10, 2)
  discount      Decimal           @default(0) @db.Decimal(10, 2)
  totalPrice    Decimal           @db.Decimal(10, 2)
  paymentStatus PaymentStatus     @default(PENDING)
  isActive      Boolean           @default(true)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  flight        Flight            @relation(fields: [flightId], references: [id], onDelete: Cascade)
  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  travelers     BookingTraveler[]
}

model BookingTraveler {
  id             String   @id @default(uuid())
  bookingId      String
  seatId         String   @unique
  fullName       String
  passportNumber String
  dateOfBirth    DateTime
  booking        Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  seat           Seat     @relation(fields: [seatId], references: [id], onDelete: Cascade)
}

model Hotel {
  id            String  @id @default(uuid())
  name          String
  city          String
  pricePerNight Decimal @db.Decimal(10, 2)
  rating        Float
  roomType      String
}

model Car {
  id              String  @id @default(uuid())
  category        String
  pricePerDay     Decimal @db.Decimal(10, 2)
  insuranceOption Boolean
}

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


