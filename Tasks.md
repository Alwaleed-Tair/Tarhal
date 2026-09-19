# 📋 Tarhal — Task Plan (Sept 20 – Sept 26, 2026)

---

## 👤 Abdulelah Alshareef — Backend: Database & Flights/Bookings

| Day | Task | Expected Deliverable |
|---|---|---|
| **20/9** | Fully connect the search endpoint with the booking endpoint (complete flow: search → result → booking) | Integrated backend flow |
| **21/9** | Add validation/error handling to every endpoint (invalid dates, non-existent seats) | Comprehensive error handling |
| **22/9** | Test edge cases: booking the last available seat, concurrent booking attempts from different users | Confirmed logic integrity under load |
| **23/9** | Coordinate with Tariq to connect the frontend to all endpoints for real (End-to-End) | Full working flow from the UI |
| **24-26/9** | Review Saud's work on the Hotels/Cars tables and document the final schema | Fully documented schema |

---

## 👤 Saud Mohammed — Backend: Database Implementation

| Day | Task | Expected Deliverable |
|---|---|---|
| **20/9** | Expand seed data (more flights and hotels across different cities for broader test coverage) | Richer sample data |
| **21/9** | Write the migration for the Hotels/Cars tables (coordinating with Mohammed Alasad) | Migration ready |
| **22/9** | Test common queries against the database (search, filtering) and confirm acceptable performance | Confirmed acceptable performance |
| **23/9** | Write a short documentation of the schema structure (each table and its purpose) — useful later for the SRS | Initial documentation |
| **24-26/9** | Fix anything flagged in Abdulelah's review | Final approved schema |

---

## 👤 Mohammed Alasad — Backend: Auth & Hotels/Cars

| Day | Task | Expected Deliverable |
|---|---|---|
| **20/9** | Add a "forgot password" flow (or simplify it to fit the MVP scope if time is tight) | More complete Auth flow |
| **21/9** | Add filtering to the hotels endpoint (price, rating, room type) | Working filters |
| **22/9** | Add similar filtering to the cars endpoint (category, price) | Working filters |
| **23/9** | Full test of all endpoints (Auth + Hotels + Cars) using Saud's new seed data | Confirmed overall stability |
| **24-26/9** | Write a short paragraph documenting the filtering logic used (useful later for the SRS) | Documentation paragraph ready |

---

## 👤 Alwaleed Tair — Backend: AI Integration

| Day | Task | Expected Deliverable |
|---|---|---|
| **20/9** | Extend Saudi-context testing to 5 more countries (10 total tested) | Broader, documented coverage |
| **21/9** | Add token-usage logging for every request — so you can actually track real cost | Working cost-tracking mechanism |
| **22/9** | Improve the router: add a "number of constraints in the request" criterion (as discussed) instead of a fixed rule only | Smarter router |
| **23/9** | Build a standalone endpoint for the itinerary generator (`/api/itinerary`) | Working itinerary endpoint |
| **24-26/9** | Write documented examples (input/output) for each AI feature — directly useful for the SRS later | Documented examples |

---

## 👤 Tariq Alghamdi — Frontend: Passenger UI

| Day | Task | Expected Deliverable |
|---|---|---|
| **20/9** | Connect the full booking flow to the real backend (search → seat → booking → ticket) | Working End-to-End flow |
| **21/9** | Add loading and error states to every page | More complete user experience |
| **22/9** | Build the destination guide page and connect it to Alwaleed's endpoint | Working destination guide page |
| **23/9** | Full flow testing together with Abdulelah (joint session) | Integration bugs found and fixed |
| **24-26/9** | Visual polish across all passenger pages | Polished passenger UI |

---

## 👤 Omar Faraj — Frontend: Admin UI & Design

| Day | Task | Expected Deliverable |
|---|---|---|
| **20/9** | Finish bilingual support (Arabic/English) across all admin pages and confirm RTL works correctly | Fully stable bilingual support |
| **21/9** | Integrate the chatbot widget into the passenger UI, coordinating with Tariq | Chatbot widget integrated |
| **22/9** | Implement the senior-accessibility mode (larger text + high contrast) as a real, working option | Working accessibility mode |
| **23/9** | Test responsiveness across different screen sizes (mobile/tablet/desktop) | Confirmed responsive design |
| **24-26/9** | Visual polish across the entire admin dashboard | Polished admin dashboard |

---

## 🔗 Key Dependencies This Week

- **Tariq and Abdulelah** hold a joint testing session on 23/9 — this is the first time the full flow runs from UI to database; expect to find integration bugs here, that's exactly the point of the session.
- **Omar needs the chatbot endpoint from Alwaleed** on 21/9 to integrate the widget — if Alwaleed is delayed, Omar builds the UI with mock data temporarily.
- **Everyone documents small examples/paragraphs by the end of the week** — this is a direct investment in the upcoming SRS (11/12); documenting as you go saves a lot of time later.

---

## 📅 Week Summary

| Day | Main Event |
|---|---|
| 20-23/9 | Deepen cross-module integration + handle edge cases + continued SPMP work |
| 25-26/9 | Polish and documentation (more flexible, no hard deadline pressure) |
