# 📋 Tarhal — Task Plan (Sept 7 – Sept 12, 2026)

> Goal: prepare and submit **Project 2 (Proposal / Process & Feasibility)** by its final deadline, **9/12 at 11:59 PM**. The last day of this plan is the submission day itself.

---


## 👤 Abdulelah Alshareef — Backend: Database & Flights/Bookings

| Day | Task | Expected Deliverable |
|---|---|---|
| **7/9** | Install Node.js and Git if not already installed, clone the repo, and draw an ERD with these exact entities: User, Flight, Seat, Booking, BookingTraveler — showing the relationship between each (e.g., one Flight has many Seats, one Booking links one User to one Flight and a list of Seats) | An ERD diagram (drawn in draw.io, dbdiagram.io, or even hand-drawn and photographed) |
| **8/9** | Send the ERD to Mohamed for a 15-minute review call, then translate it into a `schema.prisma` file: define each entity's fields (e.g., Flight: id, flightNumber, from, to, departureTime, basePrice; Seat: id, seatCode, ticketClass, isBooked) | A `schema.prisma` file with all 5 entities and their fields defined |
| **9/9** | Add the booking-price and seat-status logic fields (e.g., Booking: totalPrice, luggageFee, isActive) and double-check every foreign key relationship matches the ERD | Fully field-complete `schema.prisma` |
| **10/9** | Run `npx prisma migrate dev --name init` against a local/test PostgreSQL database and confirm all 5 tables are created without errors; then write a 3–4 sentence paragraph describing what the Flights/Bookings module will do in the MVP | Screenshot/confirmation of a successful migration + paragraph sent to Mohamed |
| **11/9** | Attend the review meeting; if anyone questions the data model, be ready to explain or adjust a field on the spot | Participated, and applied any agreed schema wording changes |
| **12/9** | Confirm the final Scope wording accurately reflects the schema (e.g., doesn't promise a feature with no matching table) | Sign-off that the Scope section matches the schema |

---

## 👤 Mohammed Alasad — Backend: Auth & Hotels/Cars

| Day | Task | Expected Deliverable |
|---|---|---|
| **7/9** | Read the NextAuth.js "Credentials Provider" quickstart, then draw a simple flow diagram with these exact steps: Landing → Register form (name, phone, email, password) → validation → account created → redirect to dashboard; and separately: Login form → validate credentials → session created → redirect | A one-page flow diagram (boxes and arrows is enough) |
| **8/9** | Amadeus is no longer available. Spend max 1 hour checking RapidAPI for a free-tier hotel/car API; if nothing usable turns up by midday, default to seed data: write a JSON file with 8 sample hotels (name, city, price, rating, room types) and 5 sample cars (category, price/day, insurance option) | A working data source decided — either an API key in hand, or `hotels.json`/`cars.json` seed files ready to load into the database |
| **9/9** | Send Abdulelah the exact fields needed for the Hotel table (name, city, pricePerNight, rating, roomType) and Car table (category, pricePerDay, insuranceOption) so he can add them to the schema | Field list sent and confirmed added to `schema.prisma` |
| **10/9** | Write a 3–4 sentence paragraph stating exactly what Auth + Hotels/Cars will do in the MVP (e.g., "Users can register/login; hotels and cars are browsed from seed data with no live pricing; no real payment is processed") | Paragraph sent to Mohamed |
| **11/9** | Attend the review meeting; be ready to justify the seed-data decision if questioned | Participated, applied any agreed wording changes |
| **12/9** | Final check that the Scope section correctly states hotels/cars use seed data, not a live API (unless a real API was actually secured) | Sign-off on accuracy of this section |

---

## 👤 Alwaleed Tair — Backend: AI Integration

> The most technically challenging part — start immediately, no delay.

| Day | Task | Expected Deliverable |
|---|---|---|
| **7/9** | Create an account at console.anthropic.com (or platform.openai.com), generate an API key, and read the documentation page on structured/JSON outputs (tool use / function calling) | A working API key + notes on how structured outputs work |
| **8/9** | Write a small standalone script (Python or Node, outside the main project) that sends one test prompt and asks for a JSON response with 3 fields (e.g., country, capital, currency); confirm the response actually parses as valid JSON | A working test script with a successful JSON output printed to console |
| **9/9** | Extend the same script into a proper destination-guide prompt returning exactly these fields: country, capital, currency, visa_required_for_saudi, best_time_to_visit, top_attractions (list), cultural_tips (list); test it with 2 different countries | Two sample JSON outputs saved as examples |
| **10/9** | Test the same setup as a basic chatbot: try 3 sample user messages (e.g., "cheap beach destination under 800 SAR", "3-day trip to Istanbul", "what's the weather in Tokyo") and check the responses make sense; then write a 3–4 sentence paragraph on what the AI feature will do in the MVP (text-only chatbot + destination guide, no voice yet) | 3 sample conversations logged + paragraph sent to Mohamed |
| **11/9** | Attend the review meeting; be ready to explain what the AI can and can't reliably do yet | Participated, applied any agreed wording changes |
| **12/9** | Final check that the Scope section's AI description matches what was actually tested (don't let it overstate capability) | Sign-off on accuracy of this section |

---

## 👤 Tariq Alghamdi — Frontend: Passenger UI

| Day | Task | Expected Deliverable |
|---|---|---|
| **7/9** | Run `npx create-next-app`, install Tailwind CSS, and add 4 shadcn/ui components: Button, Input, Card, Dialog | A running Next.js project with the 4 components importable |
| **8/9** | Sketch a wireframe (Figma, or hand-drawn + photographed) for: (1) the flight search screen with fields for origin, destination, dates, and passenger count; (2) the seat-selection screen showing a seat grid with a highlighted selected seat and running total price | 2 wireframe images |
| **9/9** | Sketch wireframes for: (1) the booking confirmation/traveler-details form; (2) the "My Bookings" list screen; (3) the digital ticket view with QR code placeholder | 3 more wireframe images |
| **10/9** | Send all 5 wireframes to Omar and agree on: the exact primary color, font, and spacing scale to use across both passenger and admin screens; then write a 3–4 sentence paragraph on what the passenger UI will cover in the MVP | Written agreement on shared design values + paragraph sent to Mohamed |
| **11/9** | Attend the review meeting | Participated, applied any agreed wording changes |
| **12/9** | Final check that the Scope section's passenger-UI description matches the actual wireframed screens | Sign-off on accuracy of this section |

---

## 👤 Omar Faraj — Frontend: Admin UI & Design

| Day | Task | Expected Deliverable |
|---|---|---|
| **7/9** | Decide and write down: primary color (hex code), secondary/accent color, font family, and whether the visual style stays close to the old Swing app's gold/beige theme or is fully redesigned | A one-page style decision note with actual hex codes and font name |
| **8/9** | Create a `tailwind.config` color palette based on that decision (light + dark mode values), then sketch a wireframe for the admin dashboard home screen with: a summary/KPI cards row, a flights table, and quick-action buttons (add flight, edit price, cancel flight) | A working Tailwind theme file + 1 wireframe image |
| **9/9** | Sketch a wireframe for the analytics screen showing exactly 3 charts: revenue by month, top 5 destinations by bookings, and cancellation rate | 1 wireframe image with the 3 specified charts |
| **10/9** | Meet with Tariq and confirm the shared color/font/spacing values are applied consistently in both sets of wireframes; then write a 3–4 sentence paragraph on what the admin dashboard will cover in the MVP | Confirmed consistency + paragraph sent to Mohamed |
| **11/9** | Attend the review meeting | Participated, applied any agreed wording changes |
| **12/9** | Final check that the Scope section's admin-dashboard description matches the actual wireframed screens | Sign-off on accuracy of this section |

---

## 🔗 Key Dependencies

- **Abdulelah's ERD** must be reviewed by **Mohamed** on 7/9 itself, same day it's drawn — any change after the schema is built costs double the time.
- **Mohammed Alasad's** hotel/car field list (9/9) is required before Abdulelah can finalize those two tables — this is a hard blocker, not optional.
- **Tariq and Omar** must agree on shared design values (color/font/spacing) on 10/9 before either writes production code next week.
- **11/9 is fully dedicated to team review** — no one starts new build tasks that day; everyone reviews and edits the same document together.

---

## 📅 Timeline Summary

| Day | Main Event |
|---|---|
| 7–9/9 | Each member executes their concrete module tasks (setup, ERD/schema, wireframes, AI testing) |
| 10/9 | All 6 paragraphs collected and merged into one Proposal document |
| 12/9 | Full team review meeting (45–60 min) |
| **12/9** | **Project 2 submission — 11:59 PM** |
