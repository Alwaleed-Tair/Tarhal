import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Armchair,
  BedDouble,
  CalendarDays,
  CarFront,
  Clock3,
  Plane,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import "./Bookings.css";

const STORAGE_KEY = "tarhal.bookings";

function readBookings() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return { bookings: [], error: "" };
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error("Saved bookings are not a list.");
    }

    return { bookings: parsed, error: "" };
  } catch {
    return {
      bookings: [],
      error: "Could not read saved itineraries from this browser.",
    };
  }
}

function formatDate(value) {
  if (!value) return "Date not set";

  const date = new Date(
    String(value).length === 10 ? `${value}T12:00:00` : value
  );

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function BookingCard({ booking, index }) {
  const flight = booking.flight || {};
  const selectedFlight = flight.selectedFlight || {};
  const seats = Array.isArray(booking.seats) ? booking.seats : [];
  const hotel = booking.hotel;
  const car = booking.car;

  const price = Number(selectedFlight.price);
  const passengers = Number(flight.passengers) || 1;
  const estimatedFare = Number.isFinite(price)
    ? `SAR ${(price * passengers).toLocaleString("en")}`
    : "";

  return (
    <article className="booking-card">
      <div className="booking-card-heading">
        <div>
          <span className="booking-kicker">
            SAVED ITINERARY {String(index + 1).padStart(2, "0")}
          </span>

          <h2 className="booking-route">
            {flight.from || "Departure"}
            <ArrowRight size={18} aria-hidden="true" />
            {flight.to || "Destination"}
          </h2>

          <p className="booking-date">
            <CalendarDays size={15} aria-hidden="true" />
            {formatDate(flight.departure)}
            {flight.tripType === "Round trip" && flight.returnDate
              ? ` — ${formatDate(flight.returnDate)}`
              : ""}
          </p>
        </div>

        <span className="booking-status">Saved itinerary</span>
      </div>

      <section className="booking-flight">
        <div className="booking-section-title">
          <span className="booking-icon"><Plane size={17} /></span>
          <span>Flight</span>
        </div>

        <div className="booking-flight-times">
          <div className="booking-time">
            <strong>{selectedFlight.departureTime || "—"}</strong>
            <span>{flight.from || "Departure"}</span>
          </div>

          <div className="booking-flight-line" aria-hidden="true">
            <span />
            <Plane size={15} />
            <span />
          </div>

          <div className="booking-time booking-arrival-time">
            <strong>{selectedFlight.arrivalTime || "—"}</strong>
            <span>{flight.to || "Destination"}</span>
          </div>
        </div>

        <div className="booking-flight-info">
          <span>
            {selectedFlight.airline || "Airline not set"}
            {selectedFlight.flightNumber
              ? ` · ${selectedFlight.flightNumber}`
              : ""}
          </span>
          <span>{flight.cabinClass || "Cabin not set"}</span>
          <span>
            {passengers} {passengers === 1 ? "traveler" : "travelers"}
          </span>
          {estimatedFare && (
            <strong className="booking-fare">
              Estimated flight fare: {estimatedFare}
            </strong>
          )}
        </div>
      </section>

      <div className="booking-services">
        <section className="booking-service">
          <div className="booking-section-title">
            <span className="booking-icon"><Armchair size={17} /></span>
            <span>Seats</span>
          </div>
          <strong>{seats.length ? seats.join(", ") : "No seat selected"}</strong>
        </section>

        <section className="booking-service">
          <div className="booking-section-title">
            <span className="booking-icon"><BedDouble size={17} /></span>
            <span>Hotel</span>
          </div>

          {hotel ? (
            <>
              <strong>{hotel.name || "Hotel selected"}</strong>
              <span className="booking-subtitle">
                {[hotel.city, hotel.nights && `${hotel.nights} nights`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {hotel.checkIn && hotel.checkOut && (
                <span className="booking-subtitle">
                  {formatDate(hotel.checkIn)} — {formatDate(hotel.checkOut)}
                </span>
              )}
            </>
          ) : (
            <strong className="booking-muted">Not selected</strong>
          )}
        </section>

        <section className="booking-service">
          <div className="booking-section-title">
            <span className="booking-icon"><CarFront size={17} /></span>
            <span>Car</span>
          </div>

          {car ? (
            <>
              <strong>{car.car || "Car selected"}</strong>
              <span className="booking-subtitle">
                {[car.location, car.dailyRate && `SAR ${car.dailyRate}/day`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {car.pickup && car.returnDate && (
                <span className="booking-subtitle">
                  {formatDate(car.pickup)} — {formatDate(car.returnDate)}
                </span>
              )}
            </>
          ) : (
            <strong className="booking-muted">Not selected</strong>
          )}
        </section>
      </div>

      <footer className="booking-card-footer">
        <span>
          <Clock3 size={14} aria-hidden="true" />
          Saved {formatDate(booking.createdAt)}
        </span>
        <span>Reference: {String(booking.id || "—").slice(0, 8)}</span>
      </footer>
    </article>
  );
}

export default function Bookings() {
  const [savedData] = useState(readBookings);
  const { bookings, error } = savedData;

  return (
    <div className="bookings-page">
      <Sidebar />

      <main className="bookings-shell">
        <header className="bookings-header">
          <div className="bookings-brand" aria-label="Tarhal">
            <span className="bookings-brand-mark" aria-hidden="true" />
            <span>TARHAL</span>
          </div>

          <span className="bookings-header-note">
            <span className="bookings-header-dot" />
            Your journeys, in one place
          </span>
        </header>

        <section className="bookings-intro">
          <div>
            <p className="bookings-eyebrow">YOUR TRAVEL PLANS</p>
            <h1>Bookings</h1>
            <p>Your saved flights, seats, stays, and car details.</p>
          </div>

          <span className="bookings-count">
            {String(bookings.length).padStart(2, "0")}{" "}
            {bookings.length === 1 ? "ITINERARY" : "ITINERARIES"}
          </span>
        </section>

        {error && (
          <p className="bookings-error" role="alert">
            {error}
          </p>
        )}

        {!error && bookings.length === 0 && (
          <section className="bookings-empty">
            <span className="booking-icon bookings-empty-icon">
              <Plane size={22} />
            </span>
            <h2>No saved itineraries yet</h2>
            <p>
              Complete the flight booking flow and your trip details will
              appear here.
            </p>
            <Link className="bookings-button" to="/flightbooking">
              Plan a journey <ArrowRight size={16} />
            </Link>
          </section>
        )}

        <div className="bookings-list">
          {bookings.map((booking, index) => (
            <BookingCard
              key={booking.id || index}
              booking={booking}
              index={index}
            />
          ))}
        </div>

        {bookings.length > 0 && (
          <div className="bookings-bottom-link">
            <span>Planning another journey?</span>
            <Link to="/flightbooking">
              Start a new itinerary <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}