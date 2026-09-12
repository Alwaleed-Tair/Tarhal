# 📋 Tarhal — Task Plan (Sept 13 – Sept 17, 2026)

> Goal: submit **Project 2 (Proposal / Process & Feasibility)** on **9/17** — the same day as the weekly meeting (Thursday), so the meeting doubles as the final review right before submission.

---

## 👤 Abdulelah Alshareef — Backend: Database Design & Flights/Bookings

| Day | Task | Expected Deliverable |
|---|---|---|
| **13/9** | Review the current ERD (Users, Flights, Bookings, Seats) and confirm it's complete, then prepare a simple walkthrough for Saud before he starts | Documented ERD, ready to hand to Saud |
| **14/9** | Short sync meeting (20 min) with Saud: walk him through the ERD and assign his first concrete task (e.g., write the Users and Flights tables in `schema.prisma`) | Saud has started on a clear task |
| **15/9** | Review Saud's first Pull Request (even if partial) — confirm the fields match the ERD | Written review comments on the PR |
| **16/9** | Final review of Saud's work + send Mohamed a paragraph on the booking/seats module scope | Schema fully reviewed + paragraph ready |
| **17/9** | Attend the weekly/final review meeting | Participated in review |

---

## 👤 Saud Mohammed — Backend: Database Implementation (under Abdulelah's supervision)

| Day | Task | Expected Deliverable |
|---|---|---|
| **13/9** | Set up dev environment (Node.js, Git, clone the repo) | Working environment |
| **14/9** | Attend the sync meeting with Abdulelah + start writing the first two tables in `schema.prisma` (Users, Flights) exactly as explained | Initial partial schema draft |
| **15/9** | Complete the remaining tables (Bookings, Seats) + open a Pull Request for review | PR ready for Abdulelah's review |
| **16/9** | Apply Abdulelah's feedback on the PR + run a trial migration (`npx prisma migrate dev`) and confirm no errors | Final schema working error-free |
| **17/9** | Attend the weekly meeting | Participated in review |

---

## 👤 Mohammed Alasad — Backend: Auth & Hotels/Cars

| Day | Task | Expected Deliverable |
|---|---|---|
| **13/9** | Sketch the Login/Register flow (Landing → Register form → Validate → Dashboard) | Auth flow diagram |
| **14/9** | Finalize the hotel/car data source (seed data or a small provider) + prepare `hotels.json`/`cars.json` if going with seed data | Final data source ready |
| **15/9** | Send the Hotel/Car field list to Saud and Abdulelah so it's added to the schema | Fields sent and confirmed |
| **16/9** | Send Mohamed a paragraph on the Auth + Hotels/Cars scope | Paragraph ready |
| **17/9** | Attend the weekly meeting | Participated in review |

---

## 👤 Alwaleed Tair — Backend: AI Integration

| Day | Task | Expected Deliverable |
|---|---|---|
| **13/9** | Update the destination-guide System Prompt to **explicitly include Saudi context** (visa requirements for Saudi passport holders, prayer times/nearby mosques, halal food availability, cultural tips) — top priority due to the professor's feedback | Updated and tested System Prompt |
| **14/9** | Test the System Prompt on 3 different countries (verify Saudi-visa info accuracy specifically) | 3 tested, documented JSON examples |
| **15/9** | Set up the initial router (fixed rule: Flash for simple questions/destination guide, Pro for the itinerary generator) | Working initial router logic |
| **16/9** | Test the itinerary generator + send Mohamed a paragraph on the AI scope (chatbot + Saudi-context destination guide + router) | Paragraph ready |
| **17/9** | Attend the weekly meeting | Participated in review |

---

## 👤 Tariq Alghamdi — Frontend: Passenger UI

| Day | Task | Expected Deliverable |
|---|---|---|
| **13/9** | Wireframes for the search page + seat selection | 2 wireframes |
| **14/9** | Wireframes for the booking page + "My Bookings" + digital ticket | 3 more wireframes |
| **15/9** | Wireframe for the destination guide page (showing Saudi context: visa, halal food, prayer times) | Destination guide page wireframe |
| **16/9** | Coordinate with Omar on shared design values (colors/fonts) + send his paragraph to Mohamed | Confirmed consistency + paragraph ready |
| **17/9** | Attend the weekly meeting | Participated in review |

---

## 👤 Omar Faraj — Frontend: Admin UI & Design

| Day | Task | Expected Deliverable |
|---|---|---|
| **13/9** | Decide the visual identity (colors, fonts) + prepare an initial Tailwind theme | Initial theme |
| **14/9** | Wireframe for the admin dashboard (overview + flights table) | Admin wireframe |
| **15/9** | Wireframe for the analytics section (3 charts: revenue, top destinations, cancellation rate) | Analytics wireframe |
| **16/9** | Coordinate with Tariq + send his paragraph to Mohamed | Confirmed consistency + paragraph ready |
| **17/9** | Attend the weekly meeting | Participated in review |

---

## 🔗 Key Dependencies

- **Abdulelah and Saud** sync on 14/9  — Saud does not start real code before fully understanding the ERD from Abdulelah.
- **Mohammed Alasad** sends the Hotels/Cars fields on 15/9 — timed exactly for when Saud is working on the remaining tables, so there's no blocking delay.
- **Alwaleed's** top priority this week is the Saudi context in the destination guide — directly tied to the professor's feedback, non-negotiable.
- **9/17's single meeting serves two purposes:** the regular weekly meeting + the final review right before submission.

---

## 📅 Week Summary

| Day | Main Event |
|---|---|
| 13–15/9 | Each member executes their tasks; Saud starts under Abdulelah's supervision |
| 16/9 | All paragraphs collected and merged into one Proposal document |
| **17/9 (Thu)** | **Weekly meeting = final review → submit Project 2 before 11:59 PM** |
