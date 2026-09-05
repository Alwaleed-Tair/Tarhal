# 📋 Tarhal — Task Plan (Sept 5 – Sept 10, 2026)

> Goal for this period: prepare **Project 2 (Proposal / Process & Feasibility)**, due **9/12 at 11:59 PM**, so the full draft is ready by 9/10, leaving 9/11 purely for team review — no last-minute pressure.

---


## 👤 Abdulelah Alshareef — Backend: Database & Flights/Bookings

| Day | Task | Expected Deliverable |
|---|---|---|
| **5/9** | Set up dev environment (Node.js, Git, clone the repo once created) | Working local environment |
| **6/9** | Draft an initial ERD (Users, Flights, Bookings, Seats) — coordinate directly with Mohamed for review | Initial ERD file/diagram |
| **7/9** | Revise ERD based on feedback + start initial `schema.prisma` | Finalized ERD (for this stage) |
| **8/9** | Complete `schema.prisma` (core tables: Users, Flights, Bookings, Seats) | Working initial schema locally |
| **9/9** | Test the schema (trial migration against an empty database) | Confirmed the DB runs without errors |
| **10/9** | Send Mohamed a short paragraph on the booking/seats module scope | Paragraph ready for the Feasibility section |

---

## 👤 Mohammed Alasad — Backend: Auth & Hotels/Cars

| Day | Task | Expected Deliverable |
|---|---|---|
| **5/9** | Set up environment + read core NextAuth.js documentation | Basic understanding of setup |
| **6/9** | Sketch the Login/Register flow — even a simple diagram | Auth flow diagram |
| **7/9** | ⚠️ **Important:** Amadeus (originally planned for hotel/car data) **has been shut down** — decide on an alternative: either a smaller RapidAPI provider with a real free tier, or the safer, simpler option: **seed/mock data** for a limited set of hotels/cars | Final decision on hotel/car data source |
| **8/9** | Start designing the Hotels/Cars schema tables (coordinate with Abdulelah) | Hotels/Cars tables added to the ERD |
| **9/9** | Review the final Auth + Hotels/Cars scope with Mohamed | Confirmed scope for this stage |
| **10/9** | Send Mohamed a short paragraph on the Auth + Hotels/Cars scope | Paragraph ready for the Feasibility section |

---

## 👤 Alwaleed Tair — Backend: AI Integration

> The most technically uncertain part of the project — must start on day one, not be delayed.

| Day | Task | Expected Deliverable |
|---|---|---|
| **5/9** | Open a trial account with Claude API or OpenAI API + read Structured Outputs/Function Calling docs | API account ready + basic understanding |
| **6/9** | Run a standalone test (separate from the project): send a query and get back a structured JSON response | Proof the approach technically works |
| **7/9** | Write an initial System Prompt for the destination guide (e.g., returns JSON with weather, currency, visa info, cultural tips) | Tested initial System Prompt |
| **8/9** | Test a System Prompt for the basic chatbot (simple natural-language search) | Initial chatbot prototype |
| **9/9** | Document the cost strategy (which model, whether caching is used) — note: **voice is deferred to a later phase, focus on text only for now** | Written strategy note |
| **10/9** | Send Mohamed a short paragraph on the current AI feature scope (text only, no voice) | Paragraph ready for the Feasibility section |

---

## 👤 Tariq Alghamdi — Frontend: Passenger UI

| Day | Task | Expected Deliverable |
|---|---|---|
| **5/9** | Set up environment (Next.js + Tailwind) + explore core shadcn/ui components | Working frontend environment |
| **6/9** | Sketch a wireframe for the flight search page | Initial wireframe |
| **7/9** | Sketch wireframes for seat selection + booking page | Additional wireframes |
| **8/9** | Sketch wireframes for "My Bookings" + digital ticket | Full passenger flow wireframe |
| **9/9** | Share all wireframes with the team for feedback (especially from Omar, for design consistency) | Team feedback collected |
| **10/9** | Send Mohamed a short paragraph on the passenger UI scope | Paragraph ready for the Feasibility section |

---

## 👤 Omar Faraj — Frontend: Admin UI & Design

| Day | Task | Expected Deliverable |
|---|---|---|
| **5/9** | Set up environment + decide on the initial visual identity (colors, fonts, whether to keep the look similar to the old Swing project or redesign entirely) | Initial visual identity decision |
| **6/9** | Prepare an initial Tailwind theme file (core colors + dark/light mode) | Usable initial theme |
| **7/9** | Sketch a wireframe for the admin dashboard (overview, flight management) | Initial admin wireframe |
| **8/9** | Sketch a wireframe for the analytics/charts section of the dashboard | Full admin wireframe |
| **9/9** | Coordinate with Tariq to ensure visual consistency between passenger and admin UI | Confirmed consistency between both UIs |
| **10/9** | Send Mohamed a short paragraph on the admin UI/design scope | Paragraph ready for the Feasibility section |

---

## 🔗 Key Dependencies Between Members (don't skip these)

- **Abdulelah (ERD)** must share the draft with **Mohamed** on 6/9 before continuing — any ERD change after everyone starts building on it costs double the time.
- **Mohammed Alasad**'s decision on hotel/car data source (7/9) directly affects Abdulelah's tables — they must coordinate the same day.
- **Tariq and Omar** (Frontend) start with independent wireframes, but must sync on 9/9 to confirm design consistency before any real coding starts next week.

---

## 📅 Sept 10 — The Sync Point

Every member sends their short paragraph to Mohamed by end of day. Mohamed merges them into one Proposal document, ready for full team review on 9/11, and a relaxed submission on 9/12.
